
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { PRIVATE_KEY, ALCHEMY_API_KEY } from "./config.js";

console.log("📦 systemWallet.js loaded");

/***************************************
 * 1. Wallet Setup
 ***************************************/
const privatekey = PRIVATE_KEY; // System wallet private key
const provider = new ethers.JsonRpcProvider(ALCHEMY_API_KEY); // Ethereum provider
const signer = new ethers.Wallet(privatekey, provider); // Signer instance
console.log("signer address:", signer.address);

/***************************************
 * 2. Load Smart Contract ABI
 ***************************************/
async function loadABI(path) {
  // Fetches ABI JSON file from given path
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "./artifact/TrustlessTeamProtocol.json"; // Path to contract ABI
const CONTRACT_ADDRESS = "0x643733A7Dc50a793AdCC462E9F9Af90d71Df46eF"; // Contract address

/***************************************
 * 3. Get Contract Instance
 ***************************************/
async function getContract() {
  // Returns ethers.js Contract instance connected to the signer
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

/***************************************
 * 4. Custom Error Handling
 ***************************************/
// Custom human-readable messages for known smart contract errors
const errors_messages = {
  InvalidMemberStakePercentReward: "Main Contract: Action failed — Member Stake Percent From Creator Stake Invalid.",
  NoFunds: "Main Contract: Action failed — No funds available for withdrawal."
};

// Selector map for decoding custom errors from revert data
const selectorMap = {
  "0x12345678": "InsufficientFunds"
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
 * 6. DOM + Event Listeners
 ***************************************/
document.addEventListener("DOMContentLoaded", () => {
  console.log("📌 Main Contract DOM ready");
  // ============================================================
  // ====================== ONLY ADMIN ==========================
  // ============================================================

  // ---------- Set Member Stake From Reward ----------
  document.querySelector(".setMemberStakeFromReward")?.addEventListener("submit", async (e) => {
  e.prefentDefault();
      try {
        const value = e.target.MemberStakePercentageFromReward.value;

        const contract = await getContract();
        const tx = await contract.setMemberStakePercentageFromStake(value);
        const receipt = await tx.wait();

        console.log("Member Stake Percentag From Reward Updated:", receipt);

        // Parse emitted events
              for (const log of receipt.logs) {
                try {
                  const parsed = iface.parseLog(log);
                  if (parsed?.name === "memberStakePercentRewardChanged") {
                    console.log("📌 Member Stake Percent Reward Updated:", parsed.args.value);
                    alert(
                      `✔ Member Stake Percent Reward Updated:", ${parsed.args.value}`
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
        
              alert("An error occurred while updated member stake percent from reward.");
            }
          });

  // ---------- Withdraw Fee to System Wallet ----------
  document.addEventListener("submit", async () => {
  prefentDefault();
      try {
        const contract = await getContract();
        const tx = await contract.withdrawToSystemWallet();
        const receipt = await tx.wait();

        console.log("Funds Withdrawed to System Wallet:", receipt);

        // Parse emitted events
              for (const log of receipt.logs) {
                try {
                  const parsed = iface.parseLog(log);
                  if (parsed?.name === "FeeWithdrawnToSystemWallet") {
                    alert(
                      `✔ Funds Withdrawed to System Wallet.`
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
        
              alert("An error occurred while transfering funds to system wallet.");
            }
          });

  // ============================================================
  // ====================== ONLY OWNER ==========================
  // ============================================================

  // ---------- Change System Wallet ----------
 
  document.querySelector(".changeSystemWallet")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const contract = await getContract();

      // Get form values
      const newSystemWallet = e.target.SystemWalletAddress.value;

      // Execute transfer
      const tx = await contract.changeSystemwallet(SystemWalletChanged);
      const receipt = await tx.wait(); // Wait for confirmation

      console.log("System Wallet Changed:", receipt);

      // Parse emitted events
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "SystemWalletChanged") {
            console.log("📌 System Wallet Changed:", parsed.args.SystemWalletChanged);
            alert(
              `✔ System Wallet Changed To: ${parsed.args.SystemWalletChanged}`
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

      alert("An error occurred while changed system wallet address.");
    }
  });

  // ---------- Change AccessControl ----------
 
  document.querySelector(".changeAccessControl")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const contract = await getContract();

      // Get form values
      const newAccesControl = e.target.changeAccessControlAddress.value;

      // Execute transfer
      const tx = await contract.changeAccessControl(newAccesControl);
      const receipt = await tx.wait(); // Wait for confirmation

      console.log("Access Control Changed:", receipt);

      // Parse emitted events
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "AccessControlChanged") {
            console.log("📌 Access Control Changed:", parsed.args.newAccesControl);
            alert(
              `✔ Access Control Changed To: ${parsed.args.newAccesControl}`
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

      alert("An error occurred while changed access control address.");
    }
  });

  // ---------- Change State Variable ----------
  
  document.querySelector(".changeStateVar")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const contract = await getContract();

      // Get form values
      const newStateVariable = e.target.changeStateVariableAddress.value;

      // Execute transfer
      const tx = await contract.changeStateVarAddress(newStateVariable);
      const receipt = await tx.wait(); // Wait for confirmation
      
      console.log("State Variable Changed:", receipt);

      // Parse emitted events
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "StateVarChanged") {
            console.log("📌 State Variable Conteract Changed:", parsed.args.newStateVariable);
            alert(
              `✔ State Variable Conteract Changed To: ${parsed.args.newStateVariable}`
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

      alert("An error occurred while changed state variable address.");
    }
  });


  // pause & unpause contract

  document.addEventListener("pauseBtn", async () => {
    preventDefault();
    try {
      const contract = await getContract();
      const tx = await contract.pause();
      const receipt = await tx.wait();

      console.log("Contract Paused:", receipt);

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "ContractPaused") {
            console.log("Contract is paused");
            alert("✔ Contract is paused");
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

      alert("An error occurred while paused contract.");
    }
  });

  
  document.addEventListener("unpauseBtn", async () => {
    preventDefault();
    try {
      const contract = await getContract();
      const tx = await contract.unpause();
      const receipt = await tx.wait();

      console.log("Contract Unpaused:", receipt);

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "ContractUnpaused") {
            console.log("Contract is Unpause");
            alert("✔ Contract is Unpause");
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

      alert("An error occurred while Unpaused contract.");
    }
  });


});
