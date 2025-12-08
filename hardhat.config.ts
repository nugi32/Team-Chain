import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

// Load environment variables (be permissive here; warn if missing)
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "";
const LISK_SEPOLIA_RPC_URL = process.env.LISK_SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

if (!PRIVATE_KEY) {
  console.warn("Warning: PRIVATE_KEY not set. Some networks may not have deploy accounts configured.");
}
if (!SEPOLIA_RPC_URL) {
  console.warn("Warning: SEPOLIA_RPC_URL not set. `sepolia` network will not be usable until provided.");
}
if (!MAINNET_RPC_URL) {
  // don't spam warning for mainnet if user doesn't plan to use it
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || undefined,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    eth: {
      url: MAINNET_RPC_URL || undefined,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 1,
    },
    // Lisk Sepolia is added as a custom chain (non-EVM explorers may not support verification)
    liskSepolia: {
      url: LISK_SEPOLIA_RPC_URL || "https://rpc.sepolia-api.lisk.com",
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 4202,
    },
  },
  etherscan: {
  apiKey: ETHERSCAN_API_KEY,
  customChains: [
    {
      network: "liskSepolia",
      chainId: 4202,
      urls: {
        apiURL: "https://sepolia-blockscout.lisk.com/api",
        browserURL: "https://sepolia-blockscout.lisk.com",
      },
    },
  ],
},
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
