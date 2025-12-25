// =======================
// ETHERS BASE CONFIG
// =======================
import { ethers } from "./ethers-5.7.esm.min.js"; // opsional jika tidak pakai CDN

// -----------------------------
// Ambil signer & address dari wallet
// -----------------------------
const { signer, address: userAddress } = await window.getConnectedAddress();
console.log("Signer:", signer);
console.log("User Address:", userAddress);

// -----------------------------
// Load ABI JSON
// -----------------------------
async function loadABI(path) {
  const res = await fetch(path);
  return await res.json();
}

const CONTRACT_ARTIFACTS = {
  AccessControl: "../contracts/system/AccesControl.sol/EmployeeAssignment.json",
  StateVariable: '../contracts/system/StateVariable.sol/stateVariable.json',
  SystemWallet: '../contracts/system/Wallet.sol/System_wallet.json',
  TrustlessTeamProtocol: '../contracts/User/TrustlessTeamProtocol.sol/TrustlessTeamProtocol.json'
};

// -----------------------------
// Address Deploy
// -----------------------------
const CONTRACT_ADDRESS = {
  AccessControl: "0x1111111111111111111111111111111111111111",
  StateVariable: "0x2222222222222222222222222222222222222222",
  SystemWallet: "0x3333333333333333333333333333333333333333",
  TrustlessTeamProtocol: "0x4444444444444444444444444444444444444444" // contoh
};

// -----------------------------
// Buat instance contract dengan signer
// -----------------------------
async function createContractInstance(artifactPath, contractAddress) {
  const artifact = await loadABI(artifactPath);
  return new ethers.Contract(contractAddress, artifact.abi, signer);
}

// ==============================
// Buat semua instance
// ==============================
const AccessControl = await createContractInstance(
  CONTRACT_ARTIFACTS.AccessControl,
  CONTRACT_ADDRESS.AccessControl
);

const StateVariable = await createContractInstance(
  CONTRACT_ARTIFACTS.StateVariable,
  CONTRACT_ADDRESS.StateVariable
);

const SystemWallet = await createContractInstance(
  CONTRACT_ARTIFACTS.SystemWallet,
  CONTRACT_ADDRESS.SystemWallet
);

const TrustlessTeamProtocol = await createContractInstance(
  CONTRACT_ARTIFACTS.TrustlessTeamProtocol,
  CONTRACT_ADDRESS.TrustlessTeamProtocol
);

console.log("Contracts ready:");
console.log({ AccessControl, StateVariable, SystemWallet, TrustlessTeamProtocol });


/*
let provider, signer, contract;

// Connect Wallet
async function connectWallet() {
  if (!window.ethereum) {
    alert("Install MetaMask!");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();

  console.log("Connected wallet:", await signer.getAddress());

  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}

// Call helper: pastikan wallet connect dulu
async function requireSigner() {
  if (!signer) return await connectWallet();
  return signer;
}*/

// =======================
// EVENT LISTENER
// =======================
document.addEventListener("DOMContentLoaded", () => {

  // =====================================
  // ============= ACCESS CONTROL =========
  // =====================================

  // ---- Assign Employee ----
document.querySelector(".assign-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
        // 🔥 Ambil address & signer dengan cara yang sama seperti tombol Get Address
        const { address, signer } = await window.getConnectedAddress();

        if (!address || !signer) {
            alert("Wallet not connected");
            return;
        }

        console.log("Using signer:", signer);
        console.log("Using address:", address);

        // Ambil input dari form
        const employeeAddr = e.target.assignEmployee.value.trim();

        // Pastikan contract pakai signer
        const signedContract = contract.connect(signer);  //instance contract

        const tx = await signedContract.assignNewEmployee(employeeAddr);  //nama contract
        await tx.wait();

        alert("Employee Assigned");
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
});


  // ---- Remove Employee ----
  document.querySelector(".remove-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await requireSigner();

    const addr = e.target.removeEmployee.value.trim();
    try {
      const tx = await contract.removeEmployee(addr);
      await tx.wait();
      alert("Employee Removed");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // ---- Change Owner ----
  document.querySelector(".change-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await requireSigner();

    const addr = e.target.changeOwner.value.trim();
    try {
      const tx = await contract.changeOwner(addr);
      await tx.wait();
      alert("Owner changed!");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // =====================================
  // =========== SYSTEM WALLET ===========
  // =====================================

  // Transfer eth ke system wallet
  document.querySelector(".transfer-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await requireSigner();

    const to = e.target.toAddress.value.trim();
    try {
      const tx = await signer.sendTransaction({
        to,
        value: ethers.utils.parseEther("0.05") // contoh
      });
      await tx.wait();
      alert("Transfer success");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // Check Contract Balance
  document.getElementById("checkBalanceBtn").addEventListener("click", async () => {
    await requireSigner();

    const balance = await provider.getBalance(CONTRACT_ADDRESS);
    alert("Balance: " + ethers.utils.formatEther(balance) + " ETH");
  });

  // =====================================
  // ======== STATE VARIABLE SECTION =====
  // =====================================

  // -- Component Weight Percentages --
  document.querySelector(".WeightPercentages").addEventListener("submit", async (e) => {
    e.preventDefault();
    await requireSigner();

    const {
      rewardScore,
      reputationScore,
      deadlineScore,
      revisionScore
    } = e.target;

    try {
      const tx = await contract.setWeightPercentages(
        rewardScore.value,
        reputationScore.value,
        deadlineScore.value,
        revisionScore.value
      );
      await tx.wait();
      alert("Weight updated!");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // ---- Stake Amounts ----
  document.querySelector(".stakeAmounts").addEventListener("submit", async (e) => {
    e.preventDefault();
    await requireSigner();

    const v = e.target;
    const args = [
      v.low.value,
      v.midLow.value,
      v.mid.value,
      v.midHigh.value,
      v.high.value,
      v.ultraHigh.value
    ];
    try {
      const tx = await contract.setStakeAmounts(...args);
      await tx.wait();
      alert("Stake amounts updated");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // ---- Reputation Points ----
  document.querySelector(".reputationPoints").addEventListener("submit", async (e) => {
    e.preventDefault();
    await requireSigner();

    const v = e.target;
    try {
      const tx = await contract.setReputationPoints(
        v.CancelByMeRP.value,
        v.revisionRP.value,
        v.taskAcceptCreatorRP.value,
        v.taskAcceptMemberRP.value,
        v.deadlineHitCreatorRP.value,
        v.deadlineHitMemberRP.value
      );
      await tx.wait();
      alert("Reputation updated");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // ---- Additional Variables ----
  document.querySelector(".aditionalStateVar").addEventListener("submit", async (e) => {
    e.preventDefault();
    await requireSigner();

    const v = e.target;
    try {
      const tx = await contract.setAdditionalState(
        v.maxStakeInEther.value,
        v.maxRewardInEther.value,
        v.cooldownInHour.value,
        v.minRevisionTimeInHour.value,
        v.NegPenalty.value,
        v.feePercentage.value,
        v.maxRevision.value,
      );
      await tx.wait();
      alert("State updated!");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // ---- Stake Categories ----
  document.querySelector(".stakeCategorys").addEventListener("submit", async (e) => {
    e.preventDefault();
    await requireSigner();

    const v = e.target;
    try {
      const tx = await contract.setStakeCategories(
        v.low.value,
        v.midLow.value,
        v.mid.value,
        v.midHigh.value,
        v.high.value,
        v.ultraHigh.value
      );
      await tx.wait();
      alert("Stake Categories Updated");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // =========================================
  // ============== ADMIN SECTION ============
  // =========================================

  // Set Stake % from Reward
  document.querySelector(".setMemberStakeFromReward button").addEventListener("click", async () => {
    await requireSigner();
    const val = document.querySelector("[name='SetMemberStakePercentageFromReward']").value;
    try {
      const tx = await contract.setMemberStakePercentageFromReward(val);
      await tx.wait();
      alert("Updated!");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // Withdraw Fee
  document.querySelector(".WithdrawFeeToSystemWallet button").addEventListener("click", async () => {
    await requireSigner();
    try {
      const tx = await contract.withdrawFee();
      await tx.wait();
      alert("Withdraw OK!");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  document.querySelector(".pause button").addEventListener("click", async () => {
    await requireSigner();
    try {
      const tx = await contract.pause();
      await tx.wait();
      alert("Paused");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  document.querySelector(".unpause button").addEventListener("click", async () => {
    await requireSigner();
    try {
      const tx = await contract.unpause();
      await tx.wait();
      alert("Unpaused");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // =========================================
  // ============== OWNER SECTION ============
  // =========================================

  document.querySelector(".changeSystemWallet button").addEventListener("click", async () => {
    await requireSigner();
    const addr = document.querySelector("[name='changeSystemWalletAddress']").value.trim();
    try {
      const tx = await contract.setSystemWallet(addr);
      await tx.wait();
      alert("Wallet Changed");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  document.querySelector(".changeAccessControl button").addEventListener("click", async () => {
    await requireSigner();
    const addr = document.querySelector("[name='changeAccessControlAddress']").value.trim();
    try {
      const tx = await contract.setAccessControl(addr);
      await tx.wait();
      alert("Access Control Updated");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  document.querySelector(".changeStateVar button").addEventListener("click", async () => {
    await requireSigner();
    const addr = document.querySelector("[name='changeStateVariableAddress']").value.trim();
    try {
      const tx = await contract.setStateVariables(addr);
      await tx.wait();
      alert("StateVar Updated");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });
});
















document.addEventListener('DOMContentLoaded', () => {
    const out = document.getElementById('wallet-output-text');

    const btnAddress = document.getElementById('btn-get-address');
    const btnSigner = document.getElementById('btn-get-signer');

    // ------------------------------
    // BUTTON 1 → GET ADDRESS
    // ------------------------------
    btnAddress.addEventListener('click', async () => {
        out.textContent = "Loading address...";

        try {
            const { address } = await window.getConnectedAddress();
            out.textContent = address || "No wallet connected";
        } catch (err) {
            out.textContent = "Error: " + (err.message || err);
        }
    });

    // ------------------------------
    // BUTTON 2 → GET SIGNER
    // ------------------------------
    btnSigner.addEventListener('click', async () => {
        out.textContent = "Loading signer...";

        try {
            const { signer, address } = await window.getConnectedAddress();

            if (!signer) {
                out.textContent = "Signer unavailable";
                return;
            }

            // Show signer info
            out.textContent = "Signer OK (" + address + ")";
            console.log("Signer object:", signer);

        } catch (err) {
            out.textContent = "Error: " + (err.message || err);
        }
    });

});