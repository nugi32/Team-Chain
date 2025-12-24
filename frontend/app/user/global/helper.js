import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { STATE_VAR_ADDRESS } from "./AddressConfig.js";

const ARTIFACT_PATH = "../../artifact/stateVariable.json";

async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(STATE_VAR_ADDRESS, artifact.abi, signer);
}

export async function _getMinDeadline(signer) {
    const contract = await getContract(signer);
    const data = await contract.__getMinRevisionTimeInHour();
    return data;
}

export async function _getMaxRevisionTime(signer) {
    const contract = await getContract(signer);
    const data = await contract.__getMaxRevision();
    return data;
}

export async function _getMaxReward(signer) {
    const contract = await getContract(signer);
    const data = await contract.__getMaxReward();
    return data;
}



export async function isRegistered(Contract, addr) {
      const user = await Contract.Users(addr);
      const isRegistered = user[5];

      return {
        isRegistered,
        message: isRegistered
          ? "Team Chain: Your address IS registered."
          : "Team Chain: Your address is NOT registered."
      };
}
/*
export async function _hasRequestedJoin(contract, taskId, userAddress) {
  const count = Number(await contract.getJoinRequestCount(taskId));
  const target = userAddress.toLowerCase();

  for (let i = 0; i < count; i++) {
    const req = await contract.joinRequests(taskId, i);

    if (req.applicant.toLowerCase() === target) {
      return {
        exists: true,
        index: i,
        request: req
      };
    }
  }

  return {
    exists: false,
    index: -1,
    request: null
  };
}*/
export async function _hasRequestedJoin(contract, taskId, userAddress) {
  const count = Number(await contract.getJoinRequestCount(taskId));
  const target = userAddress.toLowerCase();

  for (let i = 0; i < count; i++) {
    const req = await contract.joinRequests(taskId, i);

    if (req.applicant.toLowerCase() === target) {
      return req.isPending === true;
    }
  }

  return false;
}

/**
 * Reject all pending join requests except one selected address
 *
 * @param {Contract} contract        ethers v6 Contract instance
 * @param {bigint | number} taskId
 * @param {string} keepAddress       address yang TIDAK direject
 */
export async function _rejectAllPendingExcept(
  contract,
  taskId,
  keepAddress
) {
  const keep = keepAddress.toLowerCase();

  const count = await contract.getJoinRequestCount(taskId);

  for (let i = 0n; i < count; i++) {
    const request = await contract.joinRequests(taskId, i);

    const applicant = request.applicant;
    const isPending = request.isPending;

    if (
      isPending &&
      applicant.toLowerCase() !== keep
    ) {
      const tx = await contract.rejectJoinRequest(
        taskId,
        applicant
      );

      await tx.wait(); // tunggu konfirmasi agar state sinkron
    }
  }
}

/**
 * Reject all pending join requests for a task
 *
 * @param {Contract} contract        ethers v6 Contract instance
 * @param {bigint | number} taskId
 */
export async function _rejectAllPending(
  contract,
  taskId
) {
  const count = await contract.getJoinRequestCount(taskId);

  for (let i = 0n; i < count; i++) {
    const request = await contract.joinRequests(taskId, i);

    if (request.isPending) {
      const tx = await contract.rejectJoinRequest(
        taskId,
        request.applicant
      );

      await tx.wait();
    }
  }
}



function rewardScoreFromWei(rewardWei) {
  if (rewardWei < 1e15) return 20;
  if (rewardWei < 5e15) return 40;
  if (rewardWei < 1e16) return 60;
  if (rewardWei < 5e16) return 80;
  return 100;
}

function reputationScore(reputation) {
  if (reputation <= 100) return reputation;
  return 100 + (reputation - 100) * 0.25;
}

function deadlineScoreFromHours(actualHours) {
  if (actualHours <= 24) return 100;
  if (actualHours >= 72) return 40;

  return (
    100 - ((actualHours - 24) / (72 - 24)) * 60
  );
}

export async function _calculatePoint({
  rewardWei,
  creatorReputation,
  actualHours,
  revisionCount
}) {
  const R = rewardScoreFromWei(rewardWei);
  const CR = reputationScore(creatorReputation);
  const D = deadlineScoreFromHours(actualHours);
  const RV = Math.max(0, 100 - (revisionCount * 20));

  const POINT =
    (30 * R +
     25 * CR +
     25 * D +
     20 * RV) / 100;

  return Math.round(POINT);
}


