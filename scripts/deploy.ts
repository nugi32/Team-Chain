import { ethers, upgrades, network } from "hardhat";
import { verify } from "./utils";
import { parseEther, formatEther } from "ethers";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  // Deploy EmployeeAssignment first (UUPS proxy)
  console.log("Deploying EmployeeAssignment...");
  // Pre-flight: check deployer balance so we fail with a clear message instead of low-level provider errors
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
  const EmployeeAssignment = await ethers.getContractFactory("EmployeeAssignment");
  const employeeAssignment = await upgrades.deployProxy(EmployeeAssignment, [], {
    initializer: "initialize",
    kind: "uups"
  });
  await employeeAssignment.waitForDeployment();
  const employeeAssignmentAddress = await employeeAssignment.getAddress(); //addr proxy
  console.log("EmployeeAssignment deployed to:", employeeAssignmentAddress);

  // Deploy System Wallet with EmployeeAssignment address (UUPS proxy)
  console.log("Deploying System Wallet...");
  const SystemWallet = await ethers.getContractFactory("System_wallet");
  const systemWallet = await upgrades.deployProxy(SystemWallet, [employeeAssignmentAddress], {
    initializer: "initialize",
    kind: "uups"
  });
  await systemWallet.waitForDeployment();
  const systemWalletAddress = await systemWallet.getAddress();
  console.log("System Wallet deployed to:", systemWalletAddress);

  // Deploy TrustlessTeamProtocol with EmployeeAssignment and SystemWallet addresses (UUPS proxy)
  console.log("Deploying TrustlessTeamProtocol...");
  const TrustlessTeamProtocol = await ethers.getContractFactory("TrustlessTeamProtocol");
  const trustlessTeamProtocol = await upgrades.deployProxy(TrustlessTeamProtocol, [
    employeeAssignmentAddress, // _employeeAssignment
    systemWalletAddress,       // _systemWallet (payable)
    24n,                       // _cooldownInHour
    4294967295n,               // _maxStake (uint32 max)
    10n,                       // _NegPenalty
    100n,                      // _maxReward (ether units)
    24n,                       // _minRevisionTimeInHour
    5n,                        // _feePercentage
    3n,                        // _maxRevision
    10n,                       // _CancelByMe
    5n,                        // _requestCancel
    5n,                        // _respondCancel
    3n,                        // _revision
    20n,                       // _taskAcceptCreator
    20n,                       // _taskAcceptMember
    15n,                       // _deadlineHitCreator
    15n                        // _deadlineHitMember
  ], {
    initializer: "initialize",
    kind: "uups"
  });
  await trustlessTeamProtocol.waitForDeployment();
  const trustlessTeamProtocolAddress = await trustlessTeamProtocol.getAddress();
  console.log("TrustlessTeamProtocol deployed to:", trustlessTeamProtocolAddress);

  // Only verify on real networks (not localhost or hardhat)
  const networkName = network.name;
  if (networkName !== 'hardhat' && networkName !== 'localhost') {
    // Wait for some blocks for verification
    console.log("Waiting for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds

    // Verify contracts on Etherscan
    console.log("\nVerifying contracts...");
    try {
      // For proxies, verify implementation then attempt proxy verification (some explorers require chainId)
      const empImpl = await upgrades.erc1967.getImplementationAddress(employeeAssignmentAddress);
      console.log("Verifying implementation:", empImpl);
      await verify(empImpl);
      try {
        await verify(employeeAssignmentAddress);
      } catch (err: any) {
        console.warn("Proxy verification failed for EmployeeAssignment proxy, retrying with chainId...", err && err.message ? err.message : err);
        await verify(employeeAssignmentAddress, [], { chainId: network.config?.chainId });
      }

      const sysImpl = await upgrades.erc1967.getImplementationAddress(systemWalletAddress);
      console.log("Verifying implementation:", sysImpl);
      await verify(sysImpl);
      try {
        await verify(systemWalletAddress);
      } catch (err: any) {
        console.warn("Proxy verification failed for SystemWallet proxy, retrying with chainId...", err && err.message ? err.message : err);
        await verify(systemWalletAddress, [], { chainId: network.config?.chainId });
      }

      const ttpImpl = await upgrades.erc1967.getImplementationAddress(trustlessTeamProtocolAddress);
      console.log("Verifying implementation:", ttpImpl);
      await verify(ttpImpl);
      try {
        await verify(trustlessTeamProtocolAddress);
      } catch (err: any) {
        console.warn("Proxy verification failed for TrustlessTeamProtocol proxy, retrying with chainId...", err && err.message ? err.message : err);
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