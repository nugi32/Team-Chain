import { ethers, BrowserProvider } from "ethers";
import { modal } from "../../global/connectwallet.js";
import { STATE_VAR_ADDRESS } from "../../global/AddressConfig.js";
import { withUI } from "../../global-Ux/loading-ui";

console.log("📦 State Variable loaded");

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

  const provider = new BrowserProvider(walletProvider);
  cachedSigner = await provider.getSigner();
  return cachedSigner;
}

// ==============================
// CONTRACT CONFIGURATION
// ==============================
const ARTIFACT_PATH = "../global/artifact/stateVariable.json";

// ==============================
// LOAD ABI
// ==============================
async function loadABI(path) {
  const response = await fetch(path);
  return response.json();
}

// ==============================
// CONTRACT INSTANCE
// ==============================
async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(STATE_VAR_ADDRESS, artifact.abi, signer);
}

// ==============================
// CONTRACT INTERFACE INITIALIZATION
// ==============================
let iface;
(async () => {
  const artifact = await loadABI(ARTIFACT_PATH);
  iface = new ethers.Interface(artifact.abi);
})();

// =====================================================
// EXPORTED FUNCTIONS
// =====================================================

/**
 * Set component weight percentages
 * @param {number} rewardScore - Reward score percentage
 * @param {number} reputationScore - Reputation score percentage
 * @param {number} deadlineScore - Deadline score percentage
 * @param {number} revisionScore - Revision score percentage
 */
export async function setComponentWeightPercentages(rewardScore, reputationScore, deadlineScore, revisionScore) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const contract = await getContract(signer);
    const tx = await contract.setComponentWeightPercentages(rewardScore, reputationScore, deadlineScore, revisionScore);
    const receipt = await tx.wait();

    // Parse logs for event
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "componentWeightPercentagesChanged") {
          Notify.success(
            `✅ Component weight percentages changed:\n` +
            `Reward Score: ${rewardScore}%\n` +
            `Reputation Score: ${reputationScore}%\n` +
            `Deadline Score: ${deadlineScore}%\n` +
            `Revision Score: ${revisionScore}%\n`
          );
        }
      } catch (e) {
        // Silent fail for non-relevant logs
      }
    }

    return receipt;
  });
}

/**
 * Set stake amounts
 * @param {string} low - Low stake amount in ETH
 * @param {string} midLow - Mid-low stake amount in ETH
 * @param {string} mid - Mid stake amount in ETH
 * @param {string} midHigh - Mid-high stake amount in ETH
 * @param {string} high - High stake amount in ETH
 * @param {string} ultraHigh - Ultra high stake amount in ETH
 */
export async function setStakeAmounts(low, midLow, mid, midHigh, high, ultraHigh) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const lowWei = ethers.parseEther(low);
    const midLowWei = ethers.parseEther(midLow);
    const midWei = ethers.parseEther(mid);
    const midHighWei = ethers.parseEther(midHigh);
    const highWei = ethers.parseEther(high);
    const ultraHighWei = ethers.parseEther(ultraHigh);

    const contract = await getContract(signer);
    const tx = await contract.setStakeAmounts(lowWei, midLowWei, midWei, midHighWei, highWei, ultraHighWei);
    const receipt = await tx.wait();

    // Parse logs for event
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "stakeAmountsChanged") {
          Notify.success(
            `✅ Stake amounts submitted:\n` +
            `Low: ${low} ETH\n` +
            `Mid-Low: ${midLow} ETH\n` +
            `Mid: ${mid} ETH\n` +
            `Mid-High: ${midHigh} ETH\n` +
            `High: ${high} ETH\n` +
            `Ultra High: ${ultraHigh} ETH`
          );
        }
      } catch (e) {
        // Silent fail for non-relevant logs
      }
    }

    return receipt;
  });
}

/**
 * Set reputation points
 * @param {number} cancelByMe - Cancel by me reputation points
 * @param {number} revisionPenalty - Revision penalty reputation points
 * @param {number} taskAcceptCreator - Task accept creator reputation points
 * @param {number} taskAcceptMember - Task accept member reputation points
 * @param {number} deadlineHitCreator - Deadline hit creator reputation points
 * @param {number} deadlineHitMember - Deadline hit member reputation points
 */
export async function setReputationPoints(cancelByMe, revisionPenalty, taskAcceptCreator, taskAcceptMember, deadlineHitCreator, deadlineHitMember) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const contract = await getContract(signer);
    const tx = await contract.setReputationPoints(cancelByMe, revisionPenalty, taskAcceptCreator, taskAcceptMember, deadlineHitCreator, deadlineHitMember);
    const receipt = await tx.wait();

    // Parse logs for event
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "reputationPointsChanged") {
          Notify.success(
            `✅ Reputation points updated:\n` +
            `Cancel By Me: ${cancelByMe} point\n` +
            `Revision: ${revisionPenalty} point\n` +
            `Task Accept Creator: ${taskAcceptCreator} point\n` +
            `Task Accept Member: ${taskAcceptMember} point\n` +
            `Deadline Hit Creator: ${deadlineHitCreator} point\n` +
            `Deadline Hit Member: ${deadlineHitMember} point`
          );
        }
      } catch (e) {
        // Silent fail for non-relevant logs
      }
    }

    return receipt;
  });
}

/**
 * Set state variables
 * @param {string} maxStake - Maximum stake in ETH
 * @param {string} maxReward - Maximum reward in ETH
 * @param {number} minRevisionTimeInHour - Minimum revision time in hours
 * @param {number} negPenalty - Negative penalty percentage
 * @param {number} feePercentage - Fee percentage
 * @param {number} maxRevision - Maximum revision count
 */
export async function setStateVars(maxStake, maxReward, minRevisionTimeInHour, negPenalty, feePercentage, maxRevision) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    if (negPenalty == 100) throw new Error(errorMessages.NegPenaltyCantBe100);
    if (feePercentage == 100) throw new Error(errorMessages.FeeCantBe100);

    const maxStakeWei = ethers.parseEther(maxStake);
    const maxRewardWei = ethers.parseEther(maxReward);

    const contract = await getContract(signer);
    const stakeAmount = await contract.__getStakeUltraHigh();
    
    if (maxStakeWei < stakeAmount) {
      throw new Error("State Variable: Maximum stake must be greater than or equal to the highest stake amount.");
    }

    const tx = await contract.setStateVars(maxStakeWei, maxRewardWei, minRevisionTimeInHour, negPenalty, feePercentage, maxRevision);
    const receipt = await tx.wait();

    // Parse logs for event
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "StateVarsChanged") {
          Notify.success(
            `✅ State variables updated:\n` +
            `Max Stake: ${maxStake} ETH\n` +
            `Max Reward: ${maxReward} ETH\n` +
            `Min Revision Time: ${minRevisionTimeInHour} hours\n` +
            `Negative Penalty: ${negPenalty}%\n` +
            `Fee Percentage: ${feePercentage}%\n` +
            `Maximum Revision: ${maxRevision} times`
          );
        }
      } catch (e) {
        // Silent fail for non-relevant logs
      }
    }

    return receipt;
  });
}

/**
 * Set stake categories
 * @param {string} low - Low category in ETH
 * @param {string} midLow - Mid-low category in ETH
 * @param {string} mid - Mid category in ETH
 * @param {string} midHigh - Mid-high category in ETH
 * @param {string} high - High category in ETH
 * @param {string} ultraHigh - Ultra high category in ETH
 */
export async function setStakeCategories(low, midLow, mid, midHigh, high, ultraHigh) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const lowWei = ethers.parseEther(low);
    const midLowWei = ethers.parseEther(midLow);
    const midWei = ethers.parseEther(mid);
    const midHighWei = ethers.parseEther(midHigh);
    const highWei = ethers.parseEther(high);
    const ultraHighWei = ethers.parseEther(ultraHigh);

    const contract = await getContract(signer);
    const tx = await contract.setStakeCategorys(lowWei, midLowWei, midWei, midHighWei, highWei, ultraHighWei);
    const receipt = await tx.wait();

    // Parse logs for event
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "stakeCategorysChanged") {
          Notify.success(
            `✅ Stake categories updated:\n` +
            `Low: ${low} ETH\n` +
            `Mid-Low: ${midLow} ETH\n` +
            `Mid: ${mid} ETH\n` +
            `Mid-High: ${midHigh} ETH\n` +
            `High: ${high} ETH\n` +
            `Ultra High: ${ultraHigh} ETH`
          );
        }
      } catch (e) {
        // Silent fail for non-relevant logs
      }
    }

    return receipt;
  });
}

/**
 * Get all contract settings
 */
export async function getAllContractSettings() {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const contract = await getContract(signer);

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
    console.log(settings);
    Notify.success("✅ All contract getters returned successfully.");
    return settings;
  });
}