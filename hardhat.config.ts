import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

// Check for required environment variables
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY as string | undefined;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
// Optional separate deployer key for Lisk deployments (falls back to PRIVATE_KEY)
const deployerPrivateKey = (process.env.DEPLOYER_PRIVATE_KEY || PRIVATE_KEY) as string;

if (!SEPOLIA_RPC_URL || !PRIVATE_KEY || !ETHERSCAN_API_KEY) {
  throw new Error("Please set your environment variables in a .env file");
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
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY as string],
      chainId: 11155111,
    },
    // "liskSepolia"
   liskSepolia: {
      url: "https://rpc.sepolia-api.lisk.com",
      chainId: 4202,
    accounts: [deployerPrivateKey],
    },
  },
  etherscan: {
    apiKey: {
      // Map the liskSepolia network to the ETHERSCAN/Blockscout API key
      liskSepolia: ETHERSCAN_API_KEY,
    },
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
