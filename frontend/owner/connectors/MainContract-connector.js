import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { modal } from "../../global/connectwallet.js";
import { CONTRACT_ADDRESS } from "../../global/AddressConfig.js";
import { withUI } from "../../global-Ux/loading-ui";
import { MAIN } from "../index.js";

console.log("📦 Main contract loaded");

// ==============================
// CONFIGURATION
// ==============================
let SYSTEM_WALLET_ADDRESS;
let STATE_VAR_ADDRESS;

// ==============================
// STATE
// ==============================
let cachedSigner = null;
let iface = null;

// ==============================
// WALLET HELPERS
// ==============================
async function getSigner() {
  if (cachedSigner) return cachedSigner;

  const walletProvider = modal.getWalletProvider();
  if (!walletProvider) return null;

  const provider = new ethers.BrowserProvider(walletProvider);
  cachedSigner = await provider.getSigner();
  return cachedSigner;
}

// ==============================
// ABI LOADER
// ==============================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

// ==============================
// CONTRACT INSTANCE
// ==============================
async function getContract(signer) {
  const artifact = await loadABI(MAIN);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ==============================
// INITIALIZE INTERFACE
// ==============================
(async () => {
  const artifact = await loadABI(MAIN);
  iface = new ethers.Interface(artifact.abi);
})();

// ==============================
// EVENT PARSER
// ==============================
function parseLogs(receipt, eventName) {
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === eventName) {
        return parsed;
      }
    } catch {}
  }
  return null;
}

// =====================================================
// EXPORTED FUNCTIONS - ADMIN
// =====================================================

/**
 * Set member stake percentage from reward
 * @param {number} percentage - Percentage value (0-99)
 */
export async function setMemberStakeFromReward(percentage) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    if (percentage >= 100) {
      throw new Error("Member stake percentage from creator stake is invalid");
    }

    const contract = await getContract(signer);
    const tx = await contract.setMemberStakePercentageFromStake(percentage);
    const receipt = await tx.wait();

    const parsed = parseLogs(receipt, "memberStakePercentRewardChanged");
    if (parsed) {
      Notify.success(`Member stake percent reward updated: ${percentage}%`);
    }

    return receipt;
  });
}

/**
 * Withdraw fee to system wallet
 */
export async function withdrawToSystemWallet() {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const contract = await getContract(signer);
    const tx = await contract.withdrawToSystemWallet();
    const receipt = await tx.wait();

    const parsed = parseLogs(receipt, "FeeWithdrawnToSystemWallet");
    if (parsed) {
      Notify.success("Funds withdrawn to system wallet");
    }

    return receipt;
  });
}

// =====================================================
// EXPORTED FUNCTIONS - OWNER
// =====================================================

/**
 * Change system wallet address
 * @param {string} newSystemWallet - New system wallet address
 */
export async function changeSystemWallet(newSystemWallet) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    if (!ethers.isAddress(newSystemWallet)) throw new Error("Invalid address");

    const contract = await getContract(signer);
    const tx = await contract.changeSystemwallet(newSystemWallet);
    const receipt = await tx.wait();

    SYSTEM_WALLET_ADDRESS = newSystemWallet;

    const parsed = parseLogs(receipt, "SystemWalletChanged");
    if (parsed) {
      Notify.success(`System wallet changed to: ${newSystemWallet}`);
    }

    return receipt;
  });
}

/**
 * Change state variable contract address
 * @param {string} newStateVariable - New state variable contract address
 */
export async function changeStateVarAddress(newStateVariable) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    if (!ethers.isAddress(newStateVariable)) throw new Error("Invalid address");

    const contract = await getContract(signer);
    const tx = await contract.changeStateVarAddress(newStateVariable);
    const receipt = await tx.wait();

    STATE_VAR_ADDRESS = newStateVariable;

    const parsed = parseLogs(receipt, "StateVarChanged");
    if (parsed) {
      Notify.success(`State variable contract changed to: ${newStateVariable}`);
    }

    return receipt;
  });
}

// =====================================================
// EXPORTED FUNCTIONS - READ-ONLY
// =====================================================

/**
 * Get contract information
 * @returns {Object} Contract data
 */
export async function getContractInfo() {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const contract = await getContract(signer);

    const taskCounter = await contract.taskCounter();
    const feeCollected = await contract.feeCollected();
    const memberStakePercentReward = await contract.memberStakePercentReward();
    const systemWallet = await contract.systemWallet();

    const info = {
      taskCounter: Number(taskCounter),
      feeCollected: ethers.formatEther(feeCollected),
      memberStakePercentReward: Number(memberStakePercentReward),
      systemWallet,
      stateVariable: STATE_VAR_ADDRESS || "Not loaded"
    };

    console.log(info)

    Notify.success("Contract information loaded successfully");
    return info;
  });
}

/**
 * Format contract info for display
 * @param {Object} info - Contract info object from getContractInfo()
 * @returns {string} Formatted string
 */
export function formatContractInfo(info) {
  return `📌 Contract Data Loaded:
• Task Counter: ${info.taskCounter}
• Fee Collected: ${info.feeCollected} ETH
• Member Stake Percent Reward: ${info.memberStakePercentReward}%
• System Wallet: ${info.systemWallet}
• State Variable: ${info.stateVariable}`;
}