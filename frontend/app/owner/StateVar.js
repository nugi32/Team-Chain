import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

console.log("📦 ownerWallet.js loaded");

// ----------------------
// LOAD ABI
// ----------------------
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "./artifact/stateVariable.json";
const CONTRACT_ADDRESS = "0x379f85F767b5fc2187fdC6E054C6196480fD649D";

// ----------------------
// CONTRACT INSTANCE
// ----------------------
async function getContract() {
  const { signer } = await window.getConnectedAddress();
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ----------------------
// DOM + EVENT LISTENER
// ----------------------


document.addEventListener("DOMContentLoaded", () => {
  console.log("📌 DOM ready");


  // ==================================================
  // ========== COMPONENT WEIGHT PERCENTAGES ==========
  // ==================================================
  const formWeight = document.querySelector(".WeightPercentages");
  if (formWeight) {
    formWeight.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await requireSigner();

        const rs = parseInt(e.target.rewardScore.value);
        const rep = parseInt(e.target.reputationScore.value);
        const dl = parseInt(e.target.deadlineScore.value);
        const rev = parseInt(e.target.revisionScore.value);

        const contract = await getContract();
        const tx = await contract.setComponentWeightPercentages(
          rs, rep, dl, rev
        );
        await tx.wait();

        alert("✔ Component weights updated");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal update weight");
      }
    });
  }

  // ==================================================
  // ================= STAKE AMOUNTS =================
  // ==================================================
  const formStakeAmount = document.querySelector(".stakeAmounts");
  if (formStakeAmount) {
    formStakeAmount.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await requireSigner();

        const form = e.target;
        const low = parseInt(form.low.value);
        const midLow = parseInt(form.midLow.value);
        const mid = parseInt(form.mid.value);
        const midHigh = parseInt(form.midHigh.value);
        const high = parseInt(form.high.value);
        const ultraHigh = parseInt(form.ultraHigh.value);

        const contract = await getContract();
        const tx = await contract.setStakeAmounts(
          low, midLow, mid, midHigh, high, ultraHigh
        );
        await tx.wait();

        alert("✔ Stake Amounts updated");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal update stake amounts");
      }
    });
  }

  // ==================================================
  // ================ REPUTATION POINTS ===============
  // ==================================================
  const formReputation = document.querySelector(".reputationPoints");
  if (formReputation) {
    formReputation.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await requireSigner();
        const f = e.target;

        const cMy = parseInt(f.CancelByMeRP.value);
        const rRP = parseInt(f.revisionRP.value);
        const tac = parseInt(f.taskAcceptCreatorRP.value);
        const tam = parseInt(f.taskAcceptMemberRP.value);
        const dhc = parseInt(f.deadlineHitCreatorRP.value);
        const dhm = parseInt(f.deadlineHitMemberRP.value);

        const contract = await getContract();
        const tx = await contract.setReputationPoints(
          cMy, rRP, tac, tam, dhc, dhm
        );
        await tx.wait();

        alert("✔ Reputation Points updated");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal update RP");
      }
    });
  }

  // ==================================================
  // ========== ADDITIONAL STATE VARIABLES ============
  // ==================================================
  const formAddState = document.querySelector(".aditionalStateVar");
  if (formAddState) {
    formAddState.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await requireSigner();

        const f = e.target;
        const maxStake = ethers.utils.parseEther(f.maxStakeInEther.value);
        const maxReward = ethers.utils.parseEther(f.maxRewardInEther.value);

        const cooldown = parseInt(f.cooldownInHour.value);
        const minRevTime = parseInt(f.minRevisionTimeInHour.value);
        const negPenalty = parseInt(f.NegPenalty.value);
        const fee = parseInt(f.feePercentage.value);
        const maxRevision = parseInt(f.maxRevision.value);

        const contract = await getContract();
        const tx = await contract.setStateVars(
          maxStake,
          maxReward,
          cooldown,
          minRevTime,
          negPenalty,
          fee,
          maxRevision
        );
        await tx.wait();

        alert("✔ Additional State Variables updated");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal update additional SV");
      }
    });
  }

  // ==================================================
  // =============== STAKE CATEGORIES =================
  // ==================================================
  const categoryForm = document.querySelector(".stakeCategorys");
  if (categoryForm) {
    categoryForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await requireSigner();

        const f = e.target;
        const low = parseInt(f.low.value);
        const midLow = parseInt(f.midLow.value);
        const mid = parseInt(f.mid.value);
        const midHigh = parseInt(f.midHigh.value);
        const high = parseInt(f.high.value);
        const ultraHigh = parseInt(f.ultraHigh.value);

        const contract = await getContract();
        const tx = await contract.setStakeCategorys(
          low, midLow, mid, midHigh, high, ultraHigh
        );
        await tx.wait();

        alert("✔ Stake Categories updated");
      } catch (err) {
        console.error(err);
        alert(err.message || "Gagal update stake categories");
      }
    });
  }

  //cahnge access control address
document.querySelector(".changeAccessControl").addEventListener("submit", async (e) => {
  e.preventDefault(); // Mencegah reload page saat submit

  try {
    const toAddress = e.target.changeAccessControlAddress.value.trim();

    // Validasi address
    if (!ethers.utils.isAddress(toAddress)) throw new Error("⚠ Address tidak valid");

    const contract = await getContract(); // Ambil instance kontrak
    console.log("StateVar Access Control Changed:", changeAccessControlAddress);

    // Kirim transaksi ke blockchain
    const tx = await contract.changeAccessControl(changeAccessControlAddress);
    await tx.wait();

    alert("✔ StateVar Access Control Changed!");
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

  // ==================================================
  // ================== RETURN TEST ==================
  // ==================================================
const returnBtn = document.querySelector(".StateVariable button[type='submit']");

if (returnBtn) {
  returnBtn.addEventListener("click", async () => {
    try {
      await requireSigner();
      const c = await getContract();

      // ================================
      // CALL SEMUA GETTER
      // ================================
      const [
        // 1. Component weights
        rewardScore,
        reputationScore,
        deadlineScore,
        revisionScore,

        // 2. Stake Amounts
        stakeLow,
        stakeMidLow,
        stakeMid,
        stakeMidHigh,
        stakeHigh,
        stakeUltraHigh,

        // 3. Reputation
        cancelByMe,
        requestCancel,
        respondCancel,
        revisionPenalty,
        taskAcceptCreator,
        taskAcceptMember,
        deadlineHitCreator,
        deadlineHitMember,

        // 4. StateVars
        cooldownInHour,
        minRevisionTimeInHour,
        negPenalty,
        maxReward,
        feePercentage,
        maxStake,
        maxRevision,

        // 5. Stake Category
        categoryLow,
        categoryMidLow,
        categoryMid,
        categoryMidHigh,
        categoryHigh,
        categoryUltraHigh,
      ] = await Promise.all([
        // 1 Component
        c.__getRewardScore(),
        c.__getReputationScore(),
        c.__getDeadlineScore(),
        c.__getRevisionScore(),

        // 2 Stake
        c.__getStakeLow(),
        c.__getStakeMidLow(),
        c.__getStakeMid(),
        c.__getStakeMidHigh(),
        c.__getStakeHigh(),
        c.__getStakeUltraHigh(),

        // 3 Reputation
        c.__getCancelByMe(),
        c.__getRequestCancel(),
        c.__getRespondCancel(),
        c.__getRevisionPenalty(),
        c.__getTaskAcceptCreator(),
        c.__getTaskAcceptMember(),
        c.__getDeadlineHitCreator(),
        c.__getDeadlineHitMember(),

        // 4 State Var
        c.__getCooldownInHour(),
        c.__getMinRevisionTimeInHour(),
        c.__getNegPenalty(),
        c.__getMaxReward(),
        c.__getFeePercentage(),
        c.__getMaxStake(),
        c.__getMaxRevision(),

        // 5 Stake Category
        c.__getCategoryLow(),
        c.__getCategoryMidleLow(),
        c.__getCategoryMidle(),
        c.__getCategoryMidleHigh(),
        c.__getCategoryHigh(),
        c.__getCategoryUltraHigh(),
      ]);

      // ================================
      // GROUP RAPIH
      // ================================
      const settings = {
        componentWeights: {
          rewardScore: rewardScore.toString(),
          reputationScore: reputationScore.toString(),
          deadlineScore: deadlineScore.toString(),
          revisionScore: revisionScore.toString(),
        },
        stakeAmounts: {
          low: stakeLow.toString(),
          midLow: stakeMidLow.toString(),
          mid: stakeMid.toString(),
          midHigh: stakeMidHigh.toString(),
          high: stakeHigh.toString(),
          ultraHigh: stakeUltraHigh.toString(),
        },
        reputationPoints: {
          cancelByMe: cancelByMe.toString(),
          requestCancel: requestCancel.toString(),
          respondCancel: respondCancel.toString(),
          revisionPenalty: revisionPenalty.toString(),
          taskAcceptCreator: taskAcceptCreator.toString(),
          taskAcceptMember: taskAcceptMember.toString(),
          deadlineHitCreator: deadlineHitCreator.toString(),
          deadlineHitMember: deadlineHitMember.toString(),
        },
        stateVars: {
          cooldownInHour: cooldownInHour.toString(),
          minRevisionTimeInHour: minRevisionTimeInHour.toString(),
          negPenalty: negPenalty.toString(),
          maxReward: maxReward.toString(),
          feePercentage: feePercentage.toString(),
          maxStake: maxStake.toString(),
          maxRevision: maxRevision.toString(),
        },
        stakeCategories: {
          low: categoryLow.toString(),
          midLow: categoryMidLow.toString(),
          mid: categoryMid.toString(),
          midHigh: categoryMidHigh.toString(),
          high: categoryHigh.toString(),
          ultraHigh: categoryUltraHigh.toString(),
        },
      };

      console.log(settings);
      alert("✔ Semua getter sudah di return. Cek console.");

    } catch (err) {
      console.error(err);
      alert(err.message || "Gagal return data");
    }
  });
}



});

