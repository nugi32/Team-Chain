import { ethers, upgrades, network } from "hardhat";
import { verify } from "./utils";
import { parseEther, formatEther } from "ethers";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  // Pre-flight: check deployer balance so we fail with a clear message instead of low-level provider errors
  console.log("Starting deployment sequence: EmployeeAssignment -> System_wallet -> stateVariable -> TrustlessTeamProtocol");
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  const deployerBalance = await ethers.provider.getBalance(deployerAddr);
  console.log(`Deployer address: ${deployerAddr} — balance: ${formatEther(deployerBalance)} ETH`);
  const minBalance = parseEther("0.01");
  if (deployerBalance < minBalance) {
    throw new Error(
      `Deployer ${deployerAddr} has insufficient balance (${formatEther(deployerBalance)} ETH). Fund this account on ${network.name} or set PRIVATE_KEY to a funded account in your .env`,
    );
  }

  // 1) Deploy EmployeeAssignment as UUPS proxy
  console.log("Deploying EmployeeAssignment (UUPS proxy)...");
  const EmployeeAssignment = await ethers.getContractFactory("EmployeeAssignment");
  const employeeAssignment = await upgrades.deployProxy(EmployeeAssignment, [], {
    initializer: "initialize",
    kind: "uups",
  });
  await employeeAssignment.waitForDeployment();
  const employeeAssignmentAddress = await employeeAssignment.getAddress();
  console.log("EmployeeAssignment proxy deployed to:", employeeAssignmentAddress);

  // 2) Deploy System_wallet as UUPS proxy (requires accessControl address)
  console.log("Deploying System_wallet (UUPS proxy)...");
  const SystemWallet = await ethers.getContractFactory("System_wallet");
  const systemWallet = await upgrades.deployProxy(SystemWallet, [employeeAssignmentAddress], {
    initializer: "initialize",
    kind: "uups",
  });
  await systemWallet.waitForDeployment();
  const systemWalletAddress = await systemWallet.getAddress();
  console.log("System_wallet proxy deployed to:", systemWalletAddress);

  // 3) Deploy stateVariable (regular contract with constructor args)
  console.log("Deploying stateVariable (regular contract)...");
  const StateVariable = await ethers.getContractFactory("stateVariable");
  // Default/init values for stateVariable constructor (adjust if you need different tuning)
  const svArgs = [
    // Component weights (must sum to 10)
    4, // _rewardScore
    3, // _reputationScore
    2, // _deadlineScore
    1, // _revisionScore
    // Stake amounts (in ETH units)
    1, // lowStake
    2, // midLowStake
    3, // midStake
    4, // midHighStake
    5, // highStake
    10, // ultraHighStake
    // Reputation Points
    10, // CancelByMeRP
    5,  // requestCancelRP
    5,  // respondCancelRP
    2,  // revisionRP
    20, // taskAcceptCreatorRP
    20, // taskAcceptMemberRP
    15, // deadlineHitCreatorRP
    15, // deadlineHitMemberRP
    // State Vars (must be small enough so that value * 1 ether fits into uint64)
    10, // _maxStakeInEther
    10, // _maxRewardInEther
    24,  // _cooldownInHour
    24,  // _minRevisionTimeInHour
    10,  // _NegPenalty
    5,   // _feePercentage
    3,   // _maxRevision
    // Stake Categories (in ETH units)
    1, // lowCat
    2, // midLowCat
    3, // midCat
    4, // midHighCat
    5, // highCat
    10, // ultraHighCat
    // accessControl
    employeeAssignmentAddress,
  ];

  const stateVar = await StateVariable.deploy(...svArgs);
  await stateVar.waitForDeployment();
  const stateVarAddress = await stateVar.getAddress();
  console.log("stateVariable deployed to:", stateVarAddress);

  // 4) Deploy TrustlessTeamProtocol as UUPS proxy (uses accessControl, systemWallet, stateVar)
  console.log("Deploying TrustlessTeamProtocol (UUPS proxy)...");
  const TrustlessTeamProtocol = await ethers.getContractFactory("TrustlessTeamProtocol");
  const initialMemberStakePercent = 50; // default percent (adjust as needed)
  const trustlessTeamProtocol = await upgrades.deployProxy(
    TrustlessTeamProtocol,
    [employeeAssignmentAddress, systemWalletAddress, stateVarAddress, initialMemberStakePercent],
    {
      initializer: "initialize",
      kind: "uups",
    },
  );
  await trustlessTeamProtocol.waitForDeployment();
  const trustlessTeamProtocolAddress = await trustlessTeamProtocol.getAddress();
  console.log("TrustlessTeamProtocol proxy deployed to:", trustlessTeamProtocolAddress);

  // Only verify on real networks (not localhost or hardhat)
  const networkName = network.name;
  if (networkName !== "hardhat" && networkName !== "localhost") {
    // Wait for some blocks for verification
    console.log("Waiting for block confirmations...");
    await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 60 seconds

    // Verify contracts on Etherscan / Blockscout if API key provided
    console.log("\nVerifying contracts...");
    try {
      // For proxies, verify implementation then attempt proxy verification (some explorers require chainId)
      const empImpl = await upgrades.erc1967.getImplementationAddress(employeeAssignmentAddress);
      console.log("Verifying implementation:", empImpl);
      await verify(empImpl);
      try {
        await verify(employeeAssignmentAddress);
      } catch (err: any) {
        console.warn(
          "Proxy verification failed for EmployeeAssignment proxy, retrying with chainId...",
          err && err.message ? err.message : err,
        );
        await verify(employeeAssignmentAddress, [], { chainId: network.config?.chainId });
      }

      const sysImpl = await upgrades.erc1967.getImplementationAddress(systemWalletAddress);
      console.log("Verifying implementation:", sysImpl);
      await verify(sysImpl);
      try {
        await verify(systemWalletAddress);
      } catch (err: any) {
        console.warn(
          "Proxy verification failed for SystemWallet proxy, retrying with chainId...",
          err && err.message ? err.message : err,
        );
        await verify(systemWalletAddress, [], { chainId: network.config?.chainId });
      }

      const ttpImpl = await upgrades.erc1967.getImplementationAddress(trustlessTeamProtocolAddress);
      console.log("Verifying implementation:", ttpImpl);
      await verify(ttpImpl);
      try {
        await verify(trustlessTeamProtocolAddress);
      } catch (err: any) {
        console.warn(
          "Proxy verification failed for TrustlessTeamProtocol proxy, retrying with chainId...",
          err && err.message ? err.message : err,
        );
        await verify(trustlessTeamProtocolAddress, [], { chainId: network.config?.chainId });
      }
    } catch (error) {
      console.log("Error verifying contracts:", error);
    }
  }

  // Save the deployed addresses
  const addresses = {
    EmployeeAssignment: employeeAssignmentAddress,
    SystemWallet: systemWalletAddress,
    TrustlessTeamProtocol: trustlessTeamProtocolAddress,
  };

  // Save addresses to a file
  const addressesPath = join(__dirname, '..', 'frontend', 'src', 'contracts', 'addresses.json');
  writeFileSync(
    addressesPath,
    JSON.stringify(addresses, null, 2)
  );

  console.log("\nDeployment completed! Addresses saved to frontend/src/contracts/addresses.json");
  
  return addresses;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });