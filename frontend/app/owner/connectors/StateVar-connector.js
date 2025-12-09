import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { PRIVATE_KEY, ALCHEMY_API_KEY } from "./config.js";

console.log("📦 State Variable loaded");

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
const ARTIFACT_PATH = "./artifact/stateVariable.json";
const CONTRACT_ADDRESS = "0x2d6410f1cF12998CEC5eD1F95C484ca395818773";

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
  TotalMustBe100: "State Variable: The total percentage must equal 100.",
  InvalidMaxStakeAmount: "State Variable: Amount provided is invalid.",
  FeeCantBe100: "State Variable: The fee percentage cannot exceed 100%.",
  NegPenaltyCantBe100: "State Variable: The negative penalty percentage cannot exceed 100%.",
  NotEmployee: "State Variable: Caller is not an employee."
};

const selectorMap = {
  "0xc4a9262a": "TotalMustBe100",
  "0x948d8f32": "InvalidMaxStakeAmount",
  "0x1c6d3b15": "InvalidMaxStakeAmount",
  "0x6b4dc3b2": "FeeCantBe100",
  "0x2f0d5e90": "NegPenaltyCantBe100",
  "0x08c379a0": "NotEmployee"
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
 * 7. EVENT LISTENERS - STATE VARIABLES
 ***************************************/

// ========== COMPONENT WEIGHT PERCENTAGES ==========
document.querySelector(".WeightPercentages")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const rs = parseInt(e.target.rewardScore.value);
    const rep = parseInt(e.target.reputationScore.value);
    const dl = parseInt(e.target.deadlineScore.value);
    const rev = parseInt(e.target.revisionScore.value);

    if ([rs, rep, dl, rev].some(v => isNaN(v))) {
      alert("Input must be a number!");
      return;
    }

    const contract = await getContract();
    const tx = await contract.setComponentWeightPercentages(rs, rep, dl, rev);
    const receipt = await tx.wait();

    console.log("Component weight percentages changed:", receipt);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "componentWeightPercentagesChanged") {
          console.log(
            `✅ Component weight percentages changed:\n` +
            `Reward Score: ${rs}%\n` +
            `Reputation Score: ${rep}%\n` +
            `Deadline Score: ${dl}%\n` +
            `Revision Score: ${rev}%\n`
          );
          alert(
            `✅ Component weight percentages changed:\n` +
            `Reward Score: ${rs}%\n` +
            `Reputation Score: ${rep}%\n` +
            `Deadline Score: ${dl}%\n` +
            `Revision Score: ${rev}%\n`
          );
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

    alert("An error occurred while changing component weight percentages.");
  }
});

// ========== STAKE AMOUNTS ==========
document.querySelector(".stakeAmounts")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const form = e.target;
    const low = ethers.parseEther(form.low.value);
    const midLow = ethers.parseEther(form.midLow.value);
    const mid = ethers.parseEther(form.mid.value);
    const midHigh = ethers.parseEther(form.midHigh.value);
    const high = ethers.parseEther(form.high.value);
    const ultraHigh = ethers.parseEther(form.ultraHigh.value);

    const contract = await getContract();
    const tx = await contract.setStakeAmounts(low, midLow, mid, midHigh, high, ultraHigh);
    const receipt = await tx.wait();

    console.log("Stake amounts changed:", receipt);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "stakeAmountsChanged") {
          console.log(
            `✅ Stake amounts submitted:\n` +
            `Low: ${ethers.formatEther(low)} ETH\n` +
            `Mid-Low: ${ethers.formatEther(midLow)} ETH\n` +
            `Mid: ${ethers.formatEther(mid)} ETH\n` +
            `Mid-High: ${ethers.formatEther(midHigh)} ETH\n` +
            `High: ${ethers.formatEther(high)} ETH\n` +
            `Ultra High: ${ethers.formatEther(ultraHigh)} ETH`
          );

          alert(
            `✅ Stake amounts submitted:\n` +
            `Low: ${ethers.formatEther(low)} ETH\n` +
            `Mid-Low: ${ethers.formatEther(midLow)} ETH\n` +
            `Mid: ${ethers.formatEther(mid)} ETH\n` +
            `Mid-High: ${ethers.formatEther(midHigh)} ETH\n` +
            `High: ${ethers.formatEther(high)} ETH\n` +
            `Ultra High: ${ethers.formatEther(ultraHigh)} ETH`
          );
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

    alert("An error occurred while changing stake amounts.");
  }
});

// ========== REPUTATION POINTS ==========
document.querySelector(".reputationPoints")?.addEventListener("submit", async (e) => {
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

    console.log("Reputation points updated:", receipt);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "reputationPointsChanged") {
          console.log(
            `✅ Reputation points updated:\n` +
            `Cancel By Me: ${cMy} point\n` +
            `Revision: ${rRP} point\n` +
            `Task Accept Creator: ${tac} point\n` +
            `Task Accept Member: ${tam} point\n` +
            `Deadline Hit Creator: ${dhc} point\n` +
            `Deadline Hit Member: ${dhm} point`
          );

          alert(
            `✅ Reputation points updated:\n` +
            `Cancel By Me: ${cMy} point\n` +
            `Revision: ${rRP} point\n` +
            `Task Accept Creator: ${tac} point\n` +
            `Task Accept Member: ${tam} point\n` +
            `Deadline Hit Creator: ${dhc} point\n` +
            `Deadline Hit Member: ${dhm} point`
          );
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

    alert("An error occurred while changing reputation points.");
  }
});

// ========== ADDITIONAL STATE VARIABLES ==========
document.querySelector(".aditionalStateVar")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const f = e.target;

    const maxStake = ethers.parseEther(f.maxStakeInEther.value);
    const maxReward = ethers.parseEther(f.maxRewardInEther.value);
    const minRevTime = parseInt(f.minRevisionTimeInHour.value);
    const negPenalty = parseInt(f.NegPenalty.value);
    const fee = parseInt(f.feePercentage.value);
    const maxRevision = parseInt(f.maxRevision.value);

    if (negPenalty == 100) {
      alert(errorMessages.NegPenaltyCantBe100);
      return;
    }

    if (fee == 100) {
      alert(errorMessages.FeeCantBe100);
      return;
    }

    const contract = await getContract();
    const stakeAmount = await contract.__getStakeUltraHigh();
    
    if (maxStake < stakeAmount) {
      alert("State Variable: Maximum stake must be greater than or equal to the highest stake amount.");
      return;
    }

    const tx = await contract.setStateVars(
      maxStake,
      maxReward,
      minRevTime,
      negPenalty,
      fee,
      maxRevision
    );
    const receipt = await tx.wait();

    console.log("Additional state variables updated:", receipt);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "StateVarsChanged") {
          console.log(
            `✅ State variables updated:\n` +
            `Max Stake: ${ethers.formatEther(maxStake)} ETH\n` +
            `Max Reward: ${ethers.formatEther(maxReward)} ETH\n` +
            `Min Revision Time: ${minRevTime} hours\n` +
            `Negative Penalty: ${negPenalty}%\n` +
            `Fee Percentage: ${fee}%\n` +
            `Maximum Revision: ${maxRevision} times`
          );

          alert(
            `✅ State variables updated:\n` +
            `Max Stake: ${ethers.formatEther(maxStake)} ETH\n` +
            `Max Reward: ${ethers.formatEther(maxReward)} ETH\n` +
            `Min Revision Time: ${minRevTime} hours\n` +
            `Negative Penalty: ${negPenalty}%\n` +
            `Fee Percentage: ${fee}%\n` +
            `Maximum Revision: ${maxRevision} times`
          );
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

    alert("An error occurred while setting additional state variables.");
  }
});

// ========== STAKE CATEGORIES ==========
document.querySelector(".stakeCategorys")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const f = e.target;
    const low = ethers.parseEther(f.low.value);
    const midLow = ethers.parseEther(f.midLow.value);
    const mid = ethers.parseEther(f.mid.value);
    const midHigh = ethers.parseEther(f.midHigh.value);
    const high = ethers.parseEther(f.high.value);
    const ultraHigh = ethers.parseEther(f.ultraHigh.value);

    const contract = await getContract();
    const tx = await contract.setStakeCategorys(
      low, midLow, mid, midHigh, high, ultraHigh
    );
    const receipt = await tx.wait();

    console.log("Stake categories updated:", receipt);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "stakeCategorysChanged") {
          console.log(
            `✅ Stake categories updated:\n` +
            `Low: ${ethers.formatEther(low)} ETH\n` +
            `Mid-Low: ${ethers.formatEther(midLow)} ETH\n` +
            `Mid: ${ethers.formatEther(mid)} ETH\n` +
            `Mid-High: ${ethers.formatEther(midHigh)} ETH\n` +
            `High: ${ethers.formatEther(high)} ETH\n` +
            `Ultra High: ${ethers.formatEther(ultraHigh)} ETH`
          );

          alert(
            `✅ Stake categories updated:\n` +
            `Low: ${ethers.formatEther(low)} ETH\n` +
            `Mid-Low: ${ethers.formatEther(midLow)} ETH\n` +
            `Mid: ${ethers.formatEther(mid)} ETH\n` +
            `Mid-High: ${ethers.formatEther(midHigh)} ETH\n` +
            `High: ${ethers.formatEther(high)} ETH\n` +
            `Ultra High: ${ethers.formatEther(ultraHigh)} ETH`
          );
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

    alert("An error occurred while setting stake categories.");
  }
});

/***************************************
 * 8. CONTRACT DATA RETRIEVAL
 ***************************************/
document.getElementById("TestBTN")?.addEventListener("click", async () => {
  try {
    const contract = await getContract();

    // Get all contract data in parallel
    const [
      rewardScore,
      reputationScore,
      deadlineScore,
      revisionScore,
      stakeLow,
      stakeMidLow,
      stakeMid,
      stakeMidHigh,
      stakeHigh,
      stakeUltraHigh,
      cancelByMe,
      revisionPenalty,
      taskAcceptCreator,
      taskAcceptMember,
      deadlineHitCreator,
      deadlineHitMember,
      maxStake,
      maxReward,
      minRevisionTimeInHour,
      negPenalty,
      feePercentage,
      maxRevision,
      categoryLow,
      categoryMidLow,
      categoryMid,
      categoryMidHigh,
      categoryHigh,
      categoryUltraHigh,
    ] = await Promise.all([
      contract.__getRewardScore(),
      contract.__getReputationScore(),
      contract.__getDeadlineScore(),
      contract.__getRevisionScore(),
      contract.__getStakeLow(),
      contract.__getStakeMidLow(),
      contract.__getStakeMid(),
      contract.__getStakeMidHigh(),
      contract.__getStakeHigh(),
      contract.__getStakeUltraHigh(),
      contract.__getCancelByMe(),
      contract.__getRevisionPenalty(),
      contract.__getTaskAcceptCreator(),
      contract.__getTaskAcceptMember(),
      contract.__getDeadlineHitCreator(),
      contract.__getDeadlineHitMember(),
      contract.__getMaxStake(),
      contract.__getMaxReward(),
      contract.__getMinRevisionTimeInHour(),
      contract.__getNegPenalty(),
      contract.__getFeePercentage(),
      contract.__getMaxRevision(),
      contract.__getCategoryLow(),
      contract.__getCategoryMidleLow(),
      contract.__getCategoryMidle(),
      contract.__getCategoryMidleHigh(),
      contract.__getCategoryHigh(),
      contract.__getCategoryUltraHigh(),
    ]);

    // Organize data into structured object
    const settings = {
      componentWeights: {
        rewardScore: rewardScore.toString(),
        reputationScore: reputationScore.toString(),
        deadlineScore: deadlineScore.toString(),
        revisionScore: revisionScore.toString(),
      },
      stakeAmounts: {
        low: ethers.formatEther(stakeLow),
        midLow: ethers.formatEther(stakeMidLow),
        mid: ethers.formatEther(stakeMid),
        midHigh: ethers.formatEther(stakeMidHigh),
        high: ethers.formatEther(stakeHigh),
        ultraHigh: ethers.formatEther(stakeUltraHigh),
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
        maxStake: ethers.formatEther(maxStake),
        maxReward: ethers.formatEther(maxReward),
        minRevisionTimeInHour: minRevisionTimeInHour.toString(),
        negPenalty: negPenalty.toString(),
        feePercentage: feePercentage.toString(),
        maxRevision: maxRevision.toString(),
      },
      stakeCategories: {
        low: ethers.formatEther(categoryLow),
        midLow: ethers.formatEther(categoryMidLow),
        mid: ethers.formatEther(categoryMid),
        midHigh: ethers.formatEther(categoryMidHigh),
        high: ethers.formatEther(categoryHigh),
        ultraHigh: ethers.formatEther(categoryUltraHigh),
      },
    };

    console.log("Contract settings retrieved:", settings);
    alert("✅ All contract getters returned successfully. Check console for details.");
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

    alert("An error occurred while retrieving contract data.");
  }
});