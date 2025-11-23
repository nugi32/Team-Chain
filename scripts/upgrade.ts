import { ethers, upgrades } from "hardhat";
import { readFileSync } from "fs";
import { join } from "path";

const UPGRADEABLE_CONTRACTS = [
  "EmployeeAssignment",
  "System_wallet",
  "TrustlessTeamProtocol",
];

export async function upgradeContract(contractName: string, proxyAddress: string) {
  if (!UPGRADEABLE_CONTRACTS.includes(contractName)) {
    throw new Error(
      `${contractName} is not upgradeable. Only: ${UPGRADEABLE_CONTRACTS.join(", ")}`
    );
  }

  console.log(`\n🚀 Upgrading ${contractName}`);
  console.log(`🔗 Proxy Address: ${proxyAddress}`);

  const ContractFactory = await ethers.getContractFactory(contractName);

  // Perform upgrade
  const upgraded = await upgrades.upgradeProxy(proxyAddress, ContractFactory);
  await upgraded.waitForDeployment();

  // Proxy address remains the same
  const proxyAddr = await upgraded.getAddress();
  const implAddr = await upgrades.erc1967.getImplementationAddress(proxyAddr);

  console.log(`✅ Upgrade successful!`);
  console.log(`📌 Proxy Address (unchanged): ${proxyAddr}`);
  console.log(`🆕 New Implementation: ${implAddr}\n`);

  return upgraded;
}

async function main() {
  const contractName = process.env.CONTRACT_NAME || "TrustlessTeamProtocol";
  let proxyAddress = process.env.PROXY_ADDRESS;

  // If PROXY_ADDRESS not provided → load from frontend/addresses.json
  if (!proxyAddress) {
    const addressesPath = join(
      __dirname,
      "..",
      "frontend",
      "src",
      "contracts",
      "addresses.json"
    );

    try {
      const content = readFileSync(addressesPath, "utf8");
      const addresses = JSON.parse(content);

      if (contractName.toLowerCase() === "all") {
        console.log(`\n🔄 Upgrading ALL UUPS upgradeable contracts...\n`);
        for (const name of UPGRADEABLE_CONTRACTS) {
          const addr = addresses[name];
          if (!addr) {
            console.warn(
              `⚠️  Warning: No proxy address found for ${name} in ${addressesPath}, skipping.\n`
            );
            continue;
          }
          await upgradeContract(name, addr);
        }
        return;
      }

      proxyAddress = addresses[contractName];

      if (!proxyAddress) {
        throw new Error(
          `No proxy address found for ${contractName} in ${addressesPath}`
        );
      }

    } catch (err: any) {
      throw new Error(
        `❌ Cannot find proxy address. Provide PROXY_ADDRESS or ensure ${addressesPath} exists.\nError: ${err.message}`
      );
    }
  }

  await upgradeContract(contractName, proxyAddress);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Upgrade failed:", error);
      process.exit(1);
    });
}
