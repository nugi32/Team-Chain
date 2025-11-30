import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

console.log("📦 mainContract.js loaded");

const ARTIFACT_PATH = "./artifact/TrustlessTeamProtocol.json";
const CONTRACT_ADDRESS = "0xB9431eA629D0a325cacF58ece2d6BbAcd0B8705C";

// ==================================================
// ============= CONTRACT INSTANCE ==================
// ==================================================
async function getContract() {
  const { signer } = await window.getConnectedAddress();
  const res = await fetch(ARTIFACT_PATH);
  const artifact = await res.json();
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ==================================================
// ================== DOM READY =====================
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("📌 DOM Ready: Main Contract");

  // ============================================================
  // ====================== ONLY ADMIN ==========================
  // ============================================================

  // ---------- Set Member Stake From Reward ----------
  const adminSetStake = document.querySelector(".setMemberStakeFromReward");
  if (adminSetStake) {
    adminSetStake.querySelector("button").addEventListener("click", async () => {
      try {
        await requireSigner();
        const f = adminSetStake.querySelector("input");
        const val = parseInt(f.value);

        if (isNaN(val)) throw new Error("⚠ Value tidak valid");

        const contract = await getContract();
        const tx = await contract.setMemberStakePercentageFromStake(val);
        await tx.wait();

        alert("✔ Member Stake Percentage From Reward updated");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal update Member Stake Percentage");
      }
    });
  }

  // ---------- Withdraw Fee to System Wallet ----------
  const withdrawBtn = document.querySelector(".WithdrawFeeToSystemWallet");
  if (withdrawBtn) {
    withdrawBtn.querySelector("button").addEventListener("click", async () => {
      try {
        await requireSigner();
        const contract = await getContract();

        const tx = await contract.withdrawToSystemWallet();
        await tx.wait();

        alert("✔ Fee withdrawn to System Wallet");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal withdraw fee");
      }
    });
  }

  // ---------- Pause Contract ----------
  const pauseBtn = document.querySelector(".pause");
  if (pauseBtn) {
    pauseBtn.querySelector("button").addEventListener("click", async () => {
      try {
        await requireSigner();
        const contract = await getContract();

        const tx = await contract.pause();
        await tx.wait();

        alert("✔ Contract Paused");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal pause");
      }
    });
  }

  // ---------- Unpause Contract ----------
  const unpauseBtn = document.querySelector(".unpause");
  if (unpauseBtn) {
    unpauseBtn.querySelector("button").addEventListener("click", async () => {
      try {
        await requireSigner();
        const contract = await getContract();

        const tx = await contract.unpause();
        await tx.wait();

        alert("✔ Contract Unpaused");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal unpause");
      }
    });
  }

  // ============================================================
  // ====================== ONLY OWNER ==========================
  // ============================================================

  // ---------- Change System Wallet ----------
  const changeSys = document.querySelector(".changeSystemWallet");
  if (changeSys) {
    changeSys.querySelector("button").addEventListener("click", async () => {
      try {
        await requireSigner();
        const addr = changeSys.querySelector("input").value.trim();

        if (!ethers.utils.isAddress(addr))
          throw new Error("⚠ Address tidak valid");

        const contract = await getContract();
        const tx = await contract.changeSystemwallet(addr);
        await tx.wait();

        alert("✔ System Wallet Updated");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal update System Wallet");
      }
    });
  }

  // ---------- Change AccessControl ----------
  const changeAC = document.querySelector(".changeAccessControl");
  if (changeAC) {
    changeAC.querySelector("button").addEventListener("click", async () => {
      try {
        await requireSigner();
        const addr = changeAC.querySelector("input").value.trim();

        if (!ethers.utils.isAddress(addr))
          throw new Error("⚠ Address tidak valid");

        const contract = await getContract();
        const tx = await contract.changeAccessControl(addr);
        await tx.wait();

        alert("✔ AccessControl Updated");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal update AccessControl");
      }
    });
  }

  // ---------- Change State Variable ----------
  const changeSV = document.querySelector(".changeStateVar");
  if (changeSV) {
    changeSV.querySelector("button").addEventListener("click", async () => {
      try {
        await requireSigner();
        const addr = changeSV.querySelector("input").value.trim();

        if (!ethers.utils.isAddress(addr))
          throw new Error("⚠ Address tidak valid");

        const contract = await getContract();
        const tx = await contract.changeStateVarAddress(addr);
        await tx.wait();

        alert("✔ StateVariable Updated");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal update StateVariable");
      }
    });
  }
});
