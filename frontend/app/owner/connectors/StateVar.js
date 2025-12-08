import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { PRIVATE_KEY, ALCHEMY_API_KEY } from "./config.js";

console.log("📦 StateVar.js loaded");

// ======================
// BASIC WALLET CONNECTION
// ======================
const privatekey = PRIVATE_KEY;
const provider = new ethers.JsonRpcProvider(ALCHEMY_API_KEY);
const signer = new ethers.Wallet(privatekey, provider);
console.log("signer address:", signer.address);

// ======================
// LOAD ABI FUNCTION
// ======================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "./artifact/stateVariable.json";
const CONTRACT_ADDRESS = "0x137a4013B700d35df33e8bCA8869F17CC9B5876C";

// ======================
// CONTRACT INSTANCE
// ======================
async function getContract() {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ======================
// CUSTOM ERROR MESSAGES
// ======================
const errors_messages = {
  TotalMustBe100: "State Variable: The total percentage must equal 100.",
  InvalidMaxStakeAmount: "State Variable: The maximum stake amount provided is invalid.",
  FeeCantBe100: "State Variable: The fee percentage cannot exceed 100%.",
  NegPenaltyCantBe100: "State Variable: The negative penalty percentage cannot exceed 100%."
};

// ======================
// ERROR SELECTOR MAP
// ======================
const selectorMap = {
  "0x3797687a": "NotOwner",
  "0x1b4ce173": "ZeroAddress",
  "0x69119ae0": "AlredyHaveRole",
  "0xC2d3accf": "DoesNotHaveRole",
  "0x4df6bedc": "OwnerCannotBeEmployee"
};

// ======================
// DECODE ERROR FUNCTION
// ======================
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

// ----------------------
// DOM + EVENT LISTENER
// ----------------------


document.addEventListener("DOMContentLoaded", () => {
  console.log("📌 StateVar DOM ready");


  // ==================================================
  // ========== COMPONENT WEIGHT PERCENTAGES ==========
  // ==================================================
  const formWeight = document.querySelector(".WeightPercentages")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const rs = parseInt(e.target.rewardScore.value);
        const rep = parseInt(e.target.reputationScore.value);
        const dl = parseInt(e.target.deadlineScore.value);
        const rev = parseInt(e.target.revisionScore.value);

        if ([rs, rep, dl, rev].some(v => isNaN(v))) {
        alert("Input must be number!");
      return;
      }

        const contract = await getContract();
        const tx = await contract.setComponentWeightPercentages(rs, rep, dl, rev);
        const receipt = await tx.wait();

        console.log("Component Weight Percentages Changed:", receipt);

        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "componentWeightPercentagesChanged") {
              console.log(`✔ Event Component Weight Percentages Changed:\nReward Score: ${parsed.args.rs}\nreputation Score: ${parsed.args.rep}\nDeadline Score: ${parsed.args.dl}\nRevision Score: ${parsed.args.rev}`);
              alert(`✔ Component Weight Percentages Changed:\nReward Score: ${parsed.args.rs}\nreputation Score: ${parsed.args.rep}\nDeadline Score: ${parsed.args.dl}\nRevision Score: ${parsed.args.rev}`);
            }
          } catch {}
        }

      } catch (err) {
     // --- Custom Error Decoder ---
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

        alert("An error occurred while Changing Component Weight Percentages.");
      }
    });
  });

  // ==================================================
  // ================= STAKE AMOUNTS =================
  // ==================================================
  document.querySelector(".stakeAmounts")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const form = e.target;
        const low = parseEther(form.low.value);
        const midLow = parseEther(form.midLow.value);
        const mid = parseEther(form.mid.value);
        const midHigh = parseEther(form.midHigh.value);
        const high = parseEther(form.high.value);
        const ultraHigh = parseEther(form.ultraHigh.value);

        const contract = await getContract();
        const tx = await contract.setStakeAmounts(low, midLow, mid, midHigh, high, ultraHigh);
        const receipt = await tx.wait();

        console.log("Stake Amounts Changed:", receipt);

        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "stakeAmountsChanged") {
                  console.log(
      `✔ Stake Amounts Submitted:\n` +
      `Low: ${low}ETH\n` +
      `Mid-Low: ${midLow}ETH\n` +
      `Mid: ${mid}ETH\n` +
      `Mid-High: ${midHigh}ETH\n` +
      `High: ${high}ETH\n` +
      `Ultra High: ${ultraHigh}ETH`
    );

    alert(
      `✔ Stake Amounts Submitted:\n` +
      `Low: ${low}ETH\n` +
      `Mid-Low: ${midLow}ETH\n` +
      `Mid: ${mid}ETH\n` +
      `Mid-High: ${midHigh}ETH\n` +
      `High: ${high}ETH\n` +
      `Ultra High: ${ultraHigh}ETH`
    );
         }
          } catch {}
        }
      } catch (err) {
// --- Custom Error Decoder ---
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

        alert("An error occurred while Changing Component Weight Percentages.");
      }
    });

  // ==================================================
  // ================ REPUTATION POINTS ===============
  // ==================================================
  const formReputation = document.querySelector(".reputationPoints")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const f = e.target;

        const cMy = parseInt(f.CancelByMeRP.value);
        const rRP = parseInt(f.revisionRP.value);
        const tac = parseInt(f.taskAcceptCreatorRP.value);
        const tam = parseInt(f.taskAcceptMemberRP.value);
        const dhc = parseInt(f.deadlineHitCreatorRP.value);
        const dhm = parseInt(f.deadlineHitMemberRP.value);

        const contract = await getContract();
        const tx = await contract.setReputationPoints(cMy, rRP, tac, tam, dhc, dhm);
        const receipt = await tx.wait();

        console.log("Reputation Points Updated:", receipt);

       
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "reputationPointsChanged") {
                  console.log(
      `✔ Reputation Points Updated:\n` +
      `Cancel By Me: ${cMy}\n` +
      `Revision: ${rRP}\n` +
      `Task Accept Creator: ${tac}\n` +
      `Task Accept Member: ${tam}\n` +
      `Deadline Hit Creator: ${dhc}\n` +
      `Deadline Hit Member: ${dhm}`
    );

    alert(
`✔ Reputation Points Updated:\n` +
      `Cancel By Me: ${cMy}\n` +
      `Revision: ${rRP}\n` +
      `Task Accept Creator: ${tac}\n` +
      `Task Accept Member: ${tam}\n` +
      `Deadline Hit Creator: ${dhc}\n` +
      `Deadline Hit Member: ${dhm}`
    );
         }
          } catch {}
        }
      } catch (err) {
// --- Custom Error Decoder ---
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

        alert("An error occurred while Changing Component Weight Percentages.");
      }
    });

  // ==================================================
  // ========== ADDITIONAL STATE VARIABLES ============
  // ==================================================
  const formAddState = document.querySelector(".aditionalStateVar")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {

        const f = e.target;

        const maxStake = ethers.utils.parseEther(f.maxStakeInEther.value);
        const maxReward = ethers.utils.parseEther(f.maxRewardInEther.value);
        const minRevTime = parseInt(f.minRevisionTimeInHour.value);
        const negPenalty = parseInt(f.NegPenalty.value);
        const fee = parseInt(f.feePercentage.value);
        const maxRevision = parseInt(f.maxRevision.value);

        const contract = await getContract();
        const tx = await contract.setStateVars(
          maxStake,
          maxReward,
          minRevTime,
          negPenalty,
          fee,
          maxRevision
        );
        const receipt = await tx.wait();

        console.log("Additional State Variables updated:", receipt);

       for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "StateVarsChanged") {
                  console.log(
      `✔ State Vars Updated:\n` +
      `Max Stake: ${maxStake}\n` +
      `Max Reward: ${maxReward}\n` +
      `Min Revision Time In Hour: ${minRevTime}\n` +
      `Negative Penalty Percent: ${negPenalty}%\n` +
      `Fee Percentage Percent: ${fee}%\n` +
      `Maximum Revision: ${maxRevision}Times`
    );

    alert(
      `✔ State Vars Updated:\n` +
      `Max Stake: ${maxStake}\n` +
      `Max Reward: ${maxReward}\n` +
      `Min Revision Time In Hour: ${minRevTime}\n` +
      `Negative Penalty Percent: ${negPenalty}%\n` +
      `Fee Percentage Percent: ${fee}%\n` +
      `Maximum Revision: ${maxRevision}Times`
    );
         }
          } catch {}
        }
      } catch (err) {
// --- Custom Error Decoder ---
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

        alert("An error occurred while Changing Component Weight Percentages.");
      }
    });

  // ==================================================
  // =============== STAKE CATEGORIES =================
  // ==================================================
  const categoryForm = document.querySelector(".stakeCategorys")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const f = e.target;
        const low = parseEther(f.low.value);
        const midLow = parseEther(f.midLow.value);
        const mid = parseEther(f.mid.value);
        const midHigh = parseEther(f.midHigh.value);
        const high = parseEther(f.high.value);
        const ultraHigh = parseEther(f.ultraHigh.value);

        const contract = await getContract();
        const tx = await contract.setStakeCategorys(
          low, midLow, mid, midHigh, high, ultraHigh
        );
        const receipt = await tx.wait();

        console.log("Stake Categories updated:", receipt);

        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "stakeCategorysChanged") {
                  console.log(
      `✔ Stake Categorys Updated:\n` +
      `Low: ${low}ETH\n` +
      `Mid-Low: ${midLow}ETH\n` +
      `Mid: ${mid}ETH\n` +
      `Mid-High: ${midHigh}ETH\n` +
      `High: ${high}ETH\n` +
      `Ultra High: ${ultraHigh}ETH`
    );

    alert(
      `✔ Stake Categorys Updated:\n` +
      `Low: ${low}ETH\n` +
      `Mid-Low: ${midLow}ETH\n` +
      `Mid: ${mid}ETH\n` +
      `Mid-High: ${midHigh}ETH\n` +
      `High: ${high}ETH\n` +
      `Ultra High: ${ultraHigh}ETH`
    );
         }
          } catch {}
        }
      } catch (err) {
// --- Custom Error Decoder ---
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

        alert("An error occurred while Changing Component Weight Percentages.");
      }
    });


  // change access control address (safe attach)

  document.querySelector(".changeAccessControl")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const contract = await getContract();

      // Get form values
      const newAccesControl = e.target.toAddress.value;

      // Execute transfer
      const tx = await contract.changeAccessControl(newAccesControl);
      const receipt = await tx.wait(); // Wait for confirmation

      console.log("Access Control Changed:", receipt);

      // Parse emitted events
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "AccessControlChanged") {
            console.log("📌 EVENT AccessControlChanged:", parsed.args.newAccesControl);
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

      alert("An error occurred while changing access control address.");
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

  // ==================================================
  // ================== RETURN TEST ==================
  // ==================================================
const returnBtn = document.querySelector(".StateVariable button[type='submit']")?.addEventListener("click", async () => {
  prefentDefault();
    try {
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
        revisionPenalty,
        taskAcceptCreator,
        taskAcceptMember,
        deadlineHitCreator,
        deadlineHitMember,

        // 4. StateVars        
        maxStake,
        maxReward,
        minRevisionTimeInHour,
        negPenalty,
        feePercentage,
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
        c.__getRevisionPenalty(),
        c.__getTaskAcceptCreator(),
        c.__getTaskAcceptMember(),
        c.__getDeadlineHitCreator(),
        c.__getDeadlineHitMember(),

        // 4 State Var
        c.__getMaxStake(),
        c.__getMaxReward(),
        c.__getMinRevisionTimeInHour(),
        c.__getNegPenalty(),
        c.__getFeePercentage(),
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
          revisionPenalty: revisionPenalty.toString(),
          taskAcceptCreator: taskAcceptCreator.toString(),
          taskAcceptMember: taskAcceptMember.toString(),
          deadlineHitCreator: deadlineHitCreator.toString(),
          deadlineHitMember: deadlineHitMember.toString(),
        },
        stateVars: {
          maxStake: maxStake.toString(),
          maxReward: maxReward.toString(),
          minRevisionTimeInHour: minRevisionTimeInHour.toString(),
          negPenalty: negPenalty.toString(),
          feePercentage: feePercentage.toString(),
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
      alert("✔ All getters returned in console.");

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
