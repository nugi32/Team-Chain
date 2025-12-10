/****************************************************************************************
 * File: systemWallet.js
 * Description:
 *   JavaScript module for interacting with the System Wallet smart contract.
 *   This script provides functionality for:
 *     1. Connecting to the system wallet via a signer.
 *     2. Sending funds to a recipient.
 *     3. Checking the system wallet balance.
 *     4. Listening for received funds events.
 *     5. Decoding and handling custom smart contract errors.
 *
 * Dependencies:
 *   - ethers.js v6 (CDN import)
 *   - config.js containing PRIVATE_KEY and ALCHEMY_API_KEY
 *
 * Author: nugi
 ****************************************************************************************/

import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

console.log("📦 System Wallet loaded");

/***************************************
 * 1. Wallet Setup
 ***************************************/
const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/");
/***************************************
 * 2. Load Smart Contract ABI
 ***************************************/
async function loadABI(path) {
  // Fetches ABI JSON file from given path
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "./artifact/System_wallet.json"; // Path to contract ABI
const CONTRACT_ADDRESS = "0x1C6f816B036d389b76557CB9577E16C44360E029"; // Contract address

/***************************************
 * 3. Get Contract Instance
 ***************************************/
async function getContract(signer) {
  // Returns ethers.js Contract instance connected to the signer
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

/***************************************
 * 4. Custom Error Handling
 ***************************************/
// Custom human-readable messages for known smart contract errors
const errors_messages = {
  InsufficientFunds: "System Wallet: Action failed — insufficient funds in the system wallet to complete the transfer.",
  ZeroAddress: "System Wallet: Invalid address — the zero address (0x000...0) is not allowed.",
};

// Selector map for decoding custom errors from revert data
const selectorMap = {
  "0x08c379a0": "InsufficientFunds",
  "0x1b4ce173": "ZeroAddress"
};

// Decode error selector from raw error object
function decodeErrorSelector(err) {
  console.log("RAW ERROR:", err);

  const data =
    err?.data ||
    err?.error?.data ||
    err?.info?.error?.data ||
    err?.cause?.data ||
    null;

  if (!data || data.length < 10) {
    console.log("No selector found");
    return null;
  }

  const selector = data.slice(0, 10);
  console.log("Selector:", selector);

  const errorName = selectorMap[selector] || null;
  console.log("Decoded errorName:", errorName);

  return errorName;
}

/***************************************
 * 5. Load Contract Interface
 ***************************************/
let iface;
(async () => {
  // Load contract ABI interface once to parse events
  const artifact = await loadABI(ARTIFACT_PATH);
  iface = new ethers.Interface(artifact.abi);
})();

  /***************************************
   * 6. Transfer Form Submission
   ***************************************/
  document.querySelector(".transfer-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }
      const contract = await getContract(signer);

      // Get form values
      const toAddress = e.target.toAddress.value;
      const amountInEther = e.target.amount.value;
      const amount = ethers.parseEther(amountInEther); // Convert ETH to wei

      // Execute transfer
      const tx = await contract.transfer(toAddress, amount);
      const receipt = await tx.wait(); // Wait for confirmation

      // Parse emitted events
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "contract_transfered_fund") {
            console.log("📌 EVENT contract_transfered_fund:", parsed.args.to, parsed.args.amount);
            alert(
              `✔ Funds Transferred:\nTo: ${parsed.args.to}\nAmount: ${ethers.formatEther(parsed.args.amount)} ETH`
            );
          }
        } catch {}
      }
    } catch (err) {
      // Decode custom error or fallback to generic message
      const errorName =
        decodeErrorSelector(err) ||
        err?.data?.errorName ||
        err?.errorName ||
        err?.info?.errorName ||
        err?.reason ||
        err?.shortMessage?.replace("execution reverted: ", "") ||
        null;

      console.log("FINAL DETECTED errorName:", errorName);

      if (errorName && errors_messages[errorName]) {
        alert(errors_messages[errorName]);
        return;
      }

      alert("An error occurred while transfering funds.");
    }
  });

  /***************************************
   * 6.1 Check System Wallet Balance
   ***************************************/
  document.getElementById("checkBalanceBtn").addEventListener("click", async () => {
    try {
      const balance = await provider.getBalance(CONTRACT_ADDRESS);
      alert(`✔ System Wallet Balance: ${ethers.formatEther(balance)} ETH`);
      console.log("System Wallet Balance:", ethers.formatEther(balance), "ETH");
    } catch (err) {
      console.error(err);
    }
  });

  /***************************************
   * 6.2 Listen for Received Funds
   ***************************************/
  async function setupEventListener() {
    const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }
    const contract = await getContract(signer);

    // Remove previous listeners to prevent duplicates
    contract.removeAllListeners("contract_received_fund");

    // Listen for incoming funds
    contract.on("contract_received_fund", (sender, amount, event) => {
      console.log("=== Fund Received ===");
      alert(`✔ Funds Received: From ${sender} Amount: ${ethers.formatEther(amount)} ETH`);
      console.log("From:", sender);
      console.log("Amount:", ethers.formatEther(amount));
      console.log("Block:", event.blockNumber);
    });

    console.log("System Wallet Listener Refreshed!");
  }

  // Initialize listener on page load
  window.addEventListener("load", async () => {
    console.log("Page loaded, setting up event listener...");
    await setupEventListener();
  });