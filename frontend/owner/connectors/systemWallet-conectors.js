/****************************************************************************************
 * File: systemWallet.js
 * Description:
 *   JavaScript module for interacting with the System Wallet smart contract.
 ****************************************************************************************/

import { ethers, BrowserProvider } from "ethers";
import { modal } from "../../global/connectwallet.js";
import { SYSTEM_WALLET } from "../../global/AddressConfig.js";
import { withUI } from "../../global-Ux/loading-ui";

console.log("📦 System Wallet loaded");

// ==============================
// STATE
// ==============================
let cachedSigner = null;

// ==============================
// WALLET HELPERS (REOWN SAFE)
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
// LOAD ABI
// ==============================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "../global/artifact/System_wallet.json";

// ==============================
// CONTRACT INSTANCE
// ==============================
async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(SYSTEM_WALLET, artifact.abi, signer);
}

// ==============================
// CONTRACT INTERFACE
// ==============================
let iface;
(async () => {
  const artifact = await loadABI(ARTIFACT_PATH);
  iface = new ethers.Interface(artifact.abi);
})();

// ==============================
// EVENT LISTENER SETUP
// ==============================
async function setupEventListener() {
  const signer = await getSigner();
  if (!signer) return;

  const contract = await getContract(signer);
  contract.removeAllListeners("contract_received_fund");

  contract.on("contract_received_fund", (sender, amount, event) => {
    Notify.success(`Funds Received:\nFrom: ${sender}\nAmount: ${ethers.formatEther(amount)} ETH`);
    console.log("Block:", event.blockNumber);
  });

  console.log("System Wallet Listener Active");
}

// =====================================================
// EXPORTED FUNCTIONS
// =====================================================

/**
 * Transfer funds from system wallet
 * @param {string} toAddress - Recipient address
 * @param {string} amountInEther - Amount in ETH
 */
export async function transferFunds(toAddress, amountInEther) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    if (!ethers.isAddress(toAddress)) throw new Error("Invalid address");

    const contract = await getContract(signer);
    const amount = ethers.parseEther(amountInEther);
    
    const tx = await contract.transfer(toAddress, amount);
    const receipt = await tx.wait();

    // Parse events
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "contract_transfered_fund") {
          Notify.success(`Funds Transferred:\nTo: ${parsed.args.to}\nAmount: ${ethers.formatEther(parsed.args.amount)} ETH`);
        }
      } catch {}
    }

    return receipt;
  });
}

/**
 * Check system wallet balance
 */
export async function checkSystemBalance() {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const walletProvider = modal.getWalletProvider();
    if (!walletProvider) throw new Error("Wallet provider not available");

    const provider = new ethers.BrowserProvider(walletProvider);
    const balance = await provider.getBalance(SYSTEM_WALLET);
    
    Notify.success(`System Wallet Balance: ${ethers.formatEther(balance)} ETH`);
    return balance;
  });
}

/**
 * Listen for received funds events
 */
export async function startEventListener() {
  return withUI(async () => {
    await setupEventListener();
    Notify.success("System Wallet listener activated");
    return true;
  });
}