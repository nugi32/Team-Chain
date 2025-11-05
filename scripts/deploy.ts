import { ethers, upgrades, network } from "hardhat";
import { verify } from "./utils";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  // Deploy EmployeeAssignment first
  console.log("Deploying EmployeeAssignment...");
  const EmployeeAssignment = await ethers.getContractFactory("EmployeeAssignment");
  const employeeAssignment = await upgrades.deployProxy(EmployeeAssignment, [], {
    initializer: "__EmployeeAssignment_init",
    kind: "uups"
  });
  await employeeAssignment.waitForDeployment();
  const employeeAssignmentAddress = await employeeAssignment.getAddress();
  console.log("EmployeeAssignment deployed to:", employeeAssignmentAddress);

  // Deploy System Wallet with EmployeeAssignment address
  console.log("Deploying System Wallet...");
  const SystemWallet = await ethers.getContractFactory("System_wallet");
  const systemWallet = await upgrades.deployProxy(SystemWallet, [employeeAssignmentAddress], {
    initializer: "initialize",
    kind: "uups"
  });
  await systemWallet.waitForDeployment();
  const systemWalletAddress = await systemWallet.getAddress();
  console.log("System Wallet deployed to:", systemWalletAddress);

  // Deploy UserRegister with required dependencies
  console.log("Deploying UserRegister...");
  const UserRegister = await ethers.getContractFactory("UserRegister");
  const userRegister = await upgrades.deployProxy(UserRegister, [
    employeeAssignmentAddress,
    systemWalletAddress
  ], {
    initializer: "initialize",
    kind: "uups"
  });
  await userRegister.waitForDeployment();
  const userRegisterAddress = await userRegister.getAddress();
  console.log("UserRegister deployed to:", userRegisterAddress);

  // Deploy Main Protocol with all dependencies
  console.log("Deploying TrustlessTeamProtocol...");
  const MainContract = await ethers.getContractFactory("TrustlessTeamProtocol");
  const mainContract = await upgrades.deployProxy(MainContract, [
    employeeAssignmentAddress,  // _employeeAssignment
    24n,                        // _cooldownInHour
    1000n,                     // _maxStake
    systemWalletAddress,       // _systemWallet
    userRegisterAddress,       // _userRegistry
    10n,                       // _negPenalty
    48n                        // _minRevisionTime
  ], {
    initializer: "initialize",
    kind: "uups"
  });
  await mainContract.waitForDeployment();
  const mainContractAddress = await mainContract.getAddress();
  console.log("TrustlessTeamProtocol deployed to:", mainContractAddress);

  // Only verify on real networks (not localhost or hardhat)
  const networkName = network.name;
  if (networkName !== 'hardhat' && networkName !== 'localhost') {
    // Wait for some blocks for verification
    console.log("Waiting for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds

    // Verify contracts on Etherscan
    console.log("\nVerifying contracts...");
    try {
      await verify(employeeAssignmentAddress);
      await verify(systemWalletAddress);
      await verify(userRegisterAddress);
      await verify(mainContractAddress);
    } catch (error) {
      console.log("Error verifying contracts:", error);
    }
  }

  // Save the deployed addresses
  const addresses = {
    EmployeeAssignment: employeeAssignmentAddress,
    SystemWallet: systemWalletAddress,
    UserRegister: userRegisterAddress,
    TrustlessTeamProtocol: mainContractAddress,
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