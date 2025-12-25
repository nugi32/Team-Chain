import { ethers, upgrades, network } from "hardhat";
import { verify } from "./utils";
import { parseEther, formatEther } from "ethers";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("Starting deployment sequence: AccessControl -> System_wallet -> stateVariable -> TrustlessTeamProtocol");

  // ==== PRE-FLIGHT CHECK ====
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  const deployerBalance = await ethers.provider.getBalance(deployerAddr);

  console.log(`Deployer address: ${deployerAddr} — balance: ${formatEther(deployerBalance)} ETH`);

  const minBalance = parseEther("0.01");
  if (deployerBalance < minBalance) {
    throw new Error(
      `Deployer ${deployerAddr} has insufficient balance (${formatEther(
        deployerBalance
      )} ETH). Fund this account on ${network.name} or set PRIVATE_KEY to a funded account in your .env`
    );
  }

  // ======================================================
  // 1) AccessControl (EmployeeAssignment) — UUPS PROXY
  // ======================================================
  console.log("Deploying AccessControl (UUPS proxy)...");

  const AccessControlFactory = await ethers.getContractFactory("AccessControl");
  const accessControl = await upgrades.deployProxy(AccessControlFactory, [], {
    initializer: "initialize",
    kind: "uups",
  });

  await accessControl.waitForDeployment();
  const accessControlAddress = await accessControl.getAddress();

  console.log("AccessControl proxy deployed to:", accessControlAddress);

  // ======================================================
  // 2) System_wallet — UUPS PROXY
  // ======================================================
  console.log("Deploying System_wallet (UUPS proxy)...");

  const SystemWalletFactory = await ethers.getContractFactory("System_wallet");
  const systemWallet = await upgrades.deployProxy(
    SystemWalletFactory,
    [accessControlAddress],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await systemWallet.waitForDeployment();
  const systemWalletAddress = await systemWallet.getAddress();

  console.log("System_wallet proxy deployed to:", systemWalletAddress);

  // ======================================================
  // 3) stateVariable — NORMAL CONTRACT
  // ======================================================
  console.log("Deploying stateVariable (regular contract)...");

  const StateVariableFactory = await ethers.getContractFactory("stateVariable");

const svArgs = [
  // ------- Weight (4)
  40, // _rewardScore
  30, // _reputationScore
  20, // _deadlineScore
  10, // _revisionScore

  // ------- Stake Amounts (6)
  1,  // lowStake
  2,  // midLowStake
  3,  // midStake
  4,  // midHighStake
  5,  // highStake
  10, // ultraHighStake

  // ------- Reputation Points (6)
  10, // CancelByMeRP
  5,  // revisionRP
  5,  // taskAcceptCreatorRP
  2,  // taskAcceptMemberRP
  20, // deadlineHitCreatorRP
  20, // deadlineHitMemberRP

  // ------- State Vars (6) — sudah dibetulkan
  10, // _maxStakeInEther
  10, // _maxRewardInEther
  24, // _minRevisionTimeInHour
  10, // _NegPenalty
  5,  // _feePercentage
  3,  // _maxRevision

  // ------- Stake Categories (6)
  1,  // lowCat
  2,  // midLowCat
  3,  // midCat
  4,  // midHighCat
  5,  // highCat
  10, // ultraHighCat

  // ------- accessControl (1)
  accessControlAddress,
];



  const stateVar = await StateVariableFactory.deploy(...svArgs);
  await stateVar.waitForDeployment();
  const stateVarAddress = await stateVar.getAddress();

  console.log("stateVariable deployed to:", stateVarAddress);

  // ======================================================
  // 4) TrustlessTeamProtocol — UUPS PROXY
  // ======================================================
  console.log("Deploying TrustlessTeamProtocol (UUPS proxy)...");

  const TrustlessTeamProtocolFactory = await ethers.getContractFactory(
    "TrustlessTeamProtocol"
  );

  const initialMemberStakePercent = 50;

  const trustlessTeamProtocol = await upgrades.deployProxy(
    TrustlessTeamProtocolFactory,
    [
      accessControlAddress,
      systemWalletAddress,
      stateVarAddress,
      initialMemberStakePercent,
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await trustlessTeamProtocol.waitForDeployment();
  const trustlessTeamProtocolAddress = await trustlessTeamProtocol.getAddress();

  console.log("TrustlessTeamProtocol deployed:", trustlessTeamProtocolAddress);

  // ======================================================
  // OPTIONAL VERIFY FOR REAL NETWORK
  // ======================================================
  
  const networkName = network.name;

  if (networkName !== "hardhat" && networkName !== "localhost") {
    console.log("Waiting for confirmations...");
    await new Promise((r) => setTimeout(r, 60000));

    console.log("\nVerifying contracts...");

    try {
      // AccessControl
      const acImpl = await upgrades.erc1967.getImplementationAddress(
        accessControlAddress
      );
      console.log("Verifying AccessControl implementation:", acImpl);
      await verify(acImpl);

      try {
        await verify(accessControlAddress);
      } catch (err) {
        await verify(accessControlAddress, [], {
          chainId: network.config?.chainId,
        });
      }

      // SystemWallet
      const swImpl = await upgrades.erc1967.getImplementationAddress(
        systemWalletAddress
      );
      console.log("Verifying SystemWallet implementation:", swImpl);
      await verify(swImpl);

      try {
        await verify(systemWalletAddress);
      } catch (err) {
        await verify(systemWalletAddress, [], {
          chainId: network.config?.chainId,
        });
      }

      // TrustlessTeamProtocol
      const ttpImpl = await upgrades.erc1967.getImplementationAddress(
        trustlessTeamProtocolAddress
      );
      console.log("Verifying TrustlessTeamProtocol implementation:", ttpImpl);
      await verify(ttpImpl);

      try {
        await verify(trustlessTeamProtocolAddress);
      } catch (err) {
        await verify(trustlessTeamProtocolAddress, [], {
          chainId: network.config?.chainId,
        });
      }
    } catch (err) {
      console.log("Error during verification:", err);
    }
  }

  // ======================================================
  // SAVE ALL ADDRESS TO JSON (COMPLETE)
  // ======================================================

  const addresses = {
    network: network.name,
    deployer: deployerAddr,

    AccessControl: {
      proxy: accessControlAddress,
      implementation: await upgrades.erc1967.getImplementationAddress(
        accessControlAddress
      ),
    },
    SystemWallet: {
      proxy: systemWalletAddress,
      implementation: await upgrades.erc1967.getImplementationAddress(
        systemWalletAddress
      ),
    },
    StateVariable: {
      address: stateVarAddress,
    },
    TrustlessTeamProtocol: {
      proxy: trustlessTeamProtocolAddress,
      implementation: await upgrades.erc1967.getImplementationAddress(
        trustlessTeamProtocolAddress
      ),
    },
  };

  const addrPath = join(
    __dirname,
    "..",
    "frontend",
    "global",
    "address",
    "addresses.json"
  );

  writeFileSync(addrPath, JSON.stringify(addresses, null, 2));

  console.log("\nDeployment completed! Addresses saved to frontend/app/address/addresses.json");

  return addresses;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
