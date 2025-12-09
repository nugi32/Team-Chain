import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { PRIVATE_KEY, ALCHEMY_API_KEY } from "./config.js";

console.log("📦 Main contract loaded");

/***************************************
 * 1. WALLET SETUP
 ***************************************/
const privatekey = PRIVATE_KEY;
const provider = new ethers.JsonRpcProvider(ALCHEMY_API_KEY);
const signer = new ethers.Wallet(privatekey, provider);
console.log("Signer address:", signer.address);

/***************************************
 * 2. CONTRACT CONFIGURATION
 ***************************************/
const ARTIFACT_PATH = "./artifact/TrustlessTeamProtocol.json";
const CONTRACT_ADDRESS = "0x80e7F58aF8b9E99743a1a20cd0e706B9F6c3149d";
let SYSTEM_WALLET_ADDRESS;
let STATE_VAR_ADDRESS;

/***************************************
 * 3. ABI LOADER
 ***************************************/
async function loadABI(path) {
  const response = await fetch(path);
  return response.json();
}

/***************************************
 * 4. CONTRACT INSTANCE GETTER
 ***************************************/
async function getContract() {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

/***************************************
 * 5. ERROR HANDLING UTILITIES
 ***************************************/
const errorMessages = {
  NoFunds: "Main Contract: Action failed — No funds available for withdrawal.",
  NotOwner: "Main Contract: Action failed — Caller is not the owner."
};

const selectorMap = {
  "0x43f9e110": "NoFunds",
  "0x08c379a0": "NotOwner"
};

function decodeErrorSelector(err) {
  console.log("Raw error:", err);

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
  console.log("Decoded error name:", errorName);

  return errorName;
}

/***************************************
 * 6. CONTRACT INTERFACE INITIALIZATION
 ***************************************/
let iface;
(async () => {
  const artifact = await loadABI(ARTIFACT_PATH);
  iface = new ethers.Interface(artifact.abi);
})();

/***************************************
 * 7. EVENT LISTENERS - ADMIN FUNCTIONS
 ***************************************/

// ---------- Set Member Stake From Reward ----------
document.querySelector(".setMemberStakeFromReward")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const value = e.target.MemberStakePercentageFromReward.value.trim();

    if (value == 100) {
      alert("Main Contract: Action failed — Member stake percentage from creator stake is invalid.");
      console.log("Main Contract: Action failed — Member stake percentage from creator stake is invalid.");
      return;
    }

    const contract = await getContract();
    const tx = await contract.setMemberStakePercentageFromStake(value);
    const receipt = await tx.wait();

    console.log("Member stake percentage from reward updated:", receipt);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "memberStakePercentRewardChanged") {
          console.log("📌 Member stake percent reward updated:", value);
          alert(`✅ Member stake percent reward updated: ${value}%`);
        }
      } catch (e) {
        // Silent fail for non-relevant logs
      }
    }
  } catch (err) {
    const errorName =
      decodeErrorSelector(err) ||
      err?.data?.errorName ||
      err?.errorName ||
      err?.info?.errorName ||
      err?.reason ||
      err?.shortMessage?.replace("execution reverted: ", "") ||
      null;

    console.log("Final detected error name:", errorName);

    if (errorName && errorMessages[errorName]) {
      alert(errorMessages[errorName]);
      return;
    }

    alert("An error occurred while updating member stake percentage from reward.");
  }
});

// ---------- Withdraw Fee to System Wallet ----------
document.getElementById("TransferToSystemWallet")?.addEventListener("click", async () => {
  try {
    const balance = await provider.getBalance(CONTRACT_ADDRESS);
    console.log(`Transferring ${ethers.formatEther(balance)} to: ${SYSTEM_WALLET_ADDRESS}`);

    const contract = await getContract();
    const tx = await contract.withdrawToSystemWallet();
    const receipt = await tx.wait();

    console.log("Funds withdrawn to system wallet:", receipt);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "FeeWithdrawnToSystemWallet") {
          alert("✅ Funds withdrawn to system wallet.");
        }
      } catch (e) {
        // Silent fail for non-relevant logs
      }
    }
  } catch (err) {
    const errorName =
      decodeErrorSelector(err) ||
      err?.data?.errorName ||
      err?.errorName ||
      err?.info?.errorName ||
      err?.reason ||
      err?.shortMessage?.replace("execution reverted: ", "") ||
      null;

    console.log("Final detected error name:", errorName);

    if (errorName && errorMessages[errorName]) {
      alert(errorMessages[errorName]);
      return;
    }

    alert("An error occurred while transferring funds to system wallet.");
  }
});

/***************************************
 * 8. EVENT LISTENERS - OWNER FUNCTIONS
 ***************************************/

// ---------- Change System Wallet ----------
document.querySelector(".changeSystemWallet")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const contract = await getContract();
    const newSystemWallet = e.target.SystemWalletAddress.value;

    const tx = await contract.changeSystemwallet(newSystemWallet);
    const receipt = await tx.wait();

    SYSTEM_WALLET_ADDRESS = newSystemWallet;
    console.log("System wallet changed:", receipt);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "SystemWalletChanged") {
          console.log("📌 System wallet changed:", newSystemWallet);
          alert(`✅ System wallet changed to: ${newSystemWallet}`);
        }
      } catch (e) {
        // Silent fail for non-relevant logs
      }
    }
  } catch (err) {
    const errorName =
      decodeErrorSelector(err) ||
      err?.data?.errorName ||
      err?.errorName ||
      err?.info?.errorName ||
      err?.reason ||
      err?.shortMessage?.replace("execution reverted: ", "") ||
      null;

    console.log("Final detected error name:", errorName);

    if (errorName && errorMessages[errorName]) {
      alert(errorMessages[errorName]);
      return;
    }

    alert("An error occurred while changing system wallet address.");
  }
});

// ---------- Change State Variable ----------
document.querySelector(".changeStateVar")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const contract = await getContract();
    const newStateVariable = e.target.changeStateVariableAddress.value;

    const tx = await contract.changeStateVarAddress(newStateVariable);
    const receipt = await tx.wait();

    STATE_VAR_ADDRESS = newStateVariable;
    console.log("State variable changed:", receipt);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "StateVarChanged") {
          console.log("📌 State variable contract changed:", newStateVariable);
          alert(`✅ State variable contract changed to: ${newStateVariable}`);
        }
      } catch (e) {
        // Silent fail for non-relevant logs
      }
    }
  } catch (err) {
    const errorName =
      decodeErrorSelector(err) ||
      err?.data?.errorName ||
      err?.errorName ||
      err?.info?.errorName ||
      err?.reason ||
      err?.shortMessage?.replace("execution reverted: ", "") ||
      null;

    console.log("Final detected error name:", errorName);

    if (errorName && errorMessages[errorName]) {
      alert(errorMessages[errorName]);
      return;
    }

    alert("An error occurred while changing state variable address.");
  }
});

/***************************************
 * 9. CONTRACT INFO RETRIEVAL
 ***************************************/
document.getElementById("ReturnInfo")?.addEventListener("click", async () => {
  try {
    const contract = await getContract();

    const _taskCounter = await contract.taskCounter();
    const _feeCollected = await contract.feeCollected();
    const _memberStakePercentReward = await contract.memberStakePercentReward();
    const _systemWallet = await contract.systemWallet();

    console.log("📌 Contract data loaded:");
    console.log("• Task Counter:", _taskCounter.toString());
    console.log("• Fee Collected:", ethers.formatEther(_feeCollected));
    console.log("• Member Stake Percent Reward:", _memberStakePercentReward.toString());
    console.log("• System Wallet:", _systemWallet);
    console.log("• State Variable:", STATE_VAR_ADDRESS);

    alert(
      "📌 Contract Data Loaded:\n" +
      `• Task Counter: ${_taskCounter.toString()}\n` +
      `• Fee Collected: ${ethers.formatEther(_feeCollected)} ETH\n` +
      `• Member Stake Percent Reward: ${_memberStakePercentReward.toString()}%\n` +
      `• System Wallet: ${_systemWallet}\n` +
      `• State Variable: ${STATE_VAR_ADDRESS || "Not loaded"}`
    );
  } catch (err) {
    console.error(err);
    alert("An error occurred while retrieving contract information.");
  }
});