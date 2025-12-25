import { modal } from "../global/connectwallet.js";
import { ethers, BrowserProvider } from "ethers";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";
import {
  _getMinDeadline,
  _getMaxRevisionTime,
  _getMaxReward,
  isRegistered,
  _calculatePoint
} from "../global/helper.js";
import { withUI } from "../global-Ux/loading-ui.js";

// ==============================
// STATE
// ==============================
let pageActive = false;
let walletWatcherInterval = null;
let lastLoadedAddress = null;

let createdTasks = [];
let joinedTasks = [];

let cachedABI = null;

const ARTIFACT_PATH = "../global/artifact/TrustlessTeamProtocol.json";

// ==============================
// INIT / DESTROY
// ==============================
export async function init() {
  console.log("📦 task page init");
  pageActive = true;

  await loadABI();
  setupEventListeners();
  startWalletWatcher();
}

export function destroy() {
  console.log("🧹 task page destroy");
  pageActive = false;

  if (walletWatcherInterval) {
    clearInterval(walletWatcherInterval);
    walletWatcherInterval = null;
  }

  lastLoadedAddress = null;
  createdTasks = [];
  joinedTasks = [];
}

// ==============================
// WALLET ACCESS (REOWN)
// ==============================
async function getSigner() {
  const walletProvider = modal.getWalletProvider();
  if (!walletProvider) return null;

  const provider = new BrowserProvider(walletProvider);
  return provider.getSigner();
}

// ==============================
// WALLET WATCHER (AUTO LOAD)
// ==============================
function startWalletWatcher() {
  if (walletWatcherInterval) return;

  walletWatcherInterval = setInterval(async () => {
    try {
      if (!pageActive) return;

      const signer = await getSigner();
      if (!signer) return;

      const addr = (await signer.getAddress()).toLowerCase();
      if (addr !== lastLoadedAddress) {
        await tryLoadTasks();
      }
    } catch {
      // wallet belum connect
    }
  }, 800);
}

// ==============================
// GATE LOADER
// ==============================
async function tryLoadTasks() {
  if (!pageActive) return;

  const signer = await getSigner();
  if (!signer) return;

  const address = (await signer.getAddress()).toLowerCase();
  if (address === lastLoadedAddress) return;

  lastLoadedAddress = address;
  console.log("🔄 Loading tasks for", address);

  await loadCreatedTasks();
  await loadJoinedTasks();
  await loadMyPendingJoinRequests();
}

// ==============================
// CONTRACT HELPERS
// ==============================
/*
async function loadABI() {
  const res = await fetch(ARTIFACT_PATH);
  cachedABI = await res.json();
  return cachedABI;
}*/

async function loadABI() {
  const res = await fetch(ARTIFACT_PATH);

  console.log("ABI fetch url:", res.url);
  console.log("ABI status:", res.status);
  console.log("Content-Type:", res.headers.get("content-type"));

  const text = await res.text();
  console.log("ABI raw response:", text.slice(0, 200));

  cachedABI = JSON.parse(text);
  return cachedABI;
}


async function getContract(signer) {
  const artifact = await loadABI();
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ==============================
// DATA LOADERS
// ==============================
async function loadCreatedTasks() {
  const signer = await getSigner();
  if (!signer) return;

  const contract = await getContract(signer);
  const address = (await signer.getAddress()).toLowerCase();
  const taskCount = Number(await contract.taskCounter());

  createdTasks = [];

  for (let i = 0; i < taskCount; i++) {
    const task = await contract.Tasks(i);
    if (task.creator.toLowerCase() !== address) continue;

    const showStatus = [1, 2, 3, 4, 5];
    if (!task.exists) continue;
    if (!showStatus.includes(Number(task.status))) continue;

    const user = await contract.Users(task.creator);

    const point = await _calculatePoint({
      rewardWei: Number(task[8]),
      creatorReputation: Number(user.reputation),
      actualHours: Number(task[12]),
      revisionCount: Number(task[13])
    });

    createdTasks.push({
      id: task[0].toString(),
      title: task[5],
      status: Number(task.status),
      order: i,
      point
    });
  }

  renderCreatedTasks(createdTasks);
}

async function loadJoinedTasks() {
  const signer = await getSigner();
  if (!signer) return;

  const contract = await getContract(signer);
  const address = (await signer.getAddress()).toLowerCase();
  const taskCount = Number(await contract.taskCounter());

  joinedTasks = [];

  for (let i = 0; i < taskCount; i++) {
    const task = await contract.Tasks(i);
    if (task.member.toLowerCase() !== address) continue;

    const showStatus = [1, 2, 3, 4, 5];
    if (!task.exists) continue;
    if (!showStatus.includes(Number(task.status))) continue;

    const user = await contract.Users(task.creator);

    const point = await _calculatePoint({
      rewardWei: Number(task[8]),
      creatorReputation: Number(user.reputation),
      actualHours: Number(task[12]),
      revisionCount: Number(task[13])
    });

    joinedTasks.push({
      id: task[0].toString(),
      title: task[5],
      status: Number(task.status),
      order: i,
      point
    });
  }

  renderJoinedTasks(joinedTasks);
}

async function loadMyPendingJoinRequests() {
  try {
    const signer = await getSigner();
    if (!signer) return [];

    const contract = await getContract(signer);
    const myAddress = (await signer.getAddress()).toLowerCase();

    const taskCount = Number(await contract.taskCounter());
    const OPEN_REG = 3;
    const results = [];

    for (let taskId = 0; taskId < taskCount; taskId++) {
      const task = await contract.Tasks(taskId);
      if (!task.exists || Number(task.status) !== OPEN_REG) continue;

      const joinReqCount = Number(
        await contract.getJoinRequestCount(taskId)
      );

      const user = await contract.Users(task.creator);
      const point = await _calculatePoint({
        rewardWei: Number(task[8]),
        creatorReputation: Number(user.reputation),
        actualHours: Number(task[12]),
        revisionCount: Number(task[13])
      });

      for (let i = 0; i < joinReqCount; i++) {
        const req = await contract.joinRequests(taskId, i);
        if (req.applicant.toLowerCase() !== myAddress) continue;
        if (!req.isPending) continue;

        results.push({
          id: taskId,
          title: task[5],
          taskStatus: Number(task.status),
          requestStatus: Number(req.status),
          requestIndex: i,
          stakeAmount: req.stakeAmount,
          point
        });
      }
    }

    renderJoinedRequestTasks(results);
    return results;

  } catch (e) {
    console.error("loadMyPendingJoinRequests error:", e);
    return [];
  }
}

// ==============================
// UI
// ==============================
function decodeStatus(s) {
  return {
    0: "NonExistent",
    1: "Created",
    2: "Active",
    3: "OpenRegistration",
    4: "InProgress",
    5: "Completed",
    6: "Cancelled"
  }[s] || "Unknown";
}

function renderCreatedTasks(tasks) {
  const c = document.getElementById("activeList");
  const t = document.getElementById("taskCardTemplate");
  if (!c || !t) return;

  c.innerHTML = "";
  tasks.forEach(task => {
    const n = t.content.cloneNode(true);
    n.querySelector(".taskId").textContent = task.id;
    n.querySelector(".title").textContent = task.title;
    n.querySelector(".status").textContent = decodeStatus(task.status);
    n.querySelector(".Points").textContent = task.point;
    n.querySelector(".detailsBTN")?.addEventListener("click", () => {
      go(`/taskDetail?id=${task.id}`);
    });
    c.appendChild(n);
  });
}

function renderJoinedTasks(tasks) {
  const c = document.getElementById("JoinedList");
  const t = document.getElementById("JtaskCardTemplate");
  if (!c || !t) return;

  c.innerHTML = "";
  tasks.forEach(task => {
    const n = t.content.cloneNode(true);
    n.querySelector(".taskId").textContent = task.id;
    n.querySelector(".title").textContent = task.title;
    n.querySelector(".status").textContent = decodeStatus(task.status);
    n.querySelector(".Points").textContent = task.point;
    n.querySelector(".detailsBTN")?.addEventListener("click", () => {
      go(`/taskDetail?id=${task.id}`);
    });
    c.appendChild(n);
  });
}

function renderJoinedRequestTasks(results) {
  const c = document.getElementById("JoinRequestList");
  const t = document.getElementById("RtaskCardTemplate");
  if (!c || !t) return;

  c.innerHTML = "";
  results.forEach(req => {
    const n = t.content.cloneNode(true);
    n.querySelector(".taskId").textContent = req.id;
    n.querySelector(".title").textContent = req.title;
    n.querySelector(".status").textContent = decodeStatus(req.taskStatus);
    n.querySelector(".Points").textContent = req.point;
    n.querySelector(".detailsBTN")?.addEventListener("click", () => {
      go(`/../user/taskDetail?id=${req.id}`);
    });
    c.appendChild(n);
  });
}

// ==============================
// FORM SUBMIT (CREATE TASK)
// ==============================

function validateGithubIssueUrl(githubUrl) {
    try {
        let input = githubUrl.trim();

        // Auto-add protocol if missing
        if (!input.startsWith("http://") && !input.startsWith("https://")) {
            input = "https://" + input;
        }

        const url = new URL(input);

        // 1. Host validation
        if (url.hostname !== "github.com") {
            return false;
        }

        // 2. Path validation
        const parts = url.pathname.split("/").filter(Boolean);
        // Expected: [owner, repo, "issues", issueNumber]

        if (parts.length !== 4) {
            return false;
        }

        if (parts[2] !== "issues") {
            return false;
        }

        // 3. Issue number must be numeric
        if (!/^\d+$/.test(parts[3])) {
            return false;
        }

        return true;
        
    } catch {
        return false;
    }
}


async function handleTaskFormSubmit(e) {
  e.preventDefault();

  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) {
      throw new Error("Wallet not connected");
    }

    const form = e.target;

    const title = form.title.value.trim();
    const githubUrl = form.github.value.trim();
    const deadlineHours = Number(form.deadlineHours.value);
    const maxRevision = Number(form.maxRevision.value);
    const rewardInput = form.reward.value.trim();

    if (!validateGithubIssueUrl(githubUrl)) {
      throw new Error("Invalid GitHub Issue URL.");
    }

    if (isNaN(deadlineHours) || deadlineHours <= 0) {
      throw new Error("Deadline must be a positive number.");
    }

    if (isNaN(maxRevision) || maxRevision < 0) {
      throw new Error("Max revision must be a non-negative number.");
    }

    if (isNaN(rewardInput) || Number(rewardInput) <= 0) {
      throw new Error("Invalid reward amount.");
    }

    const rewardUnit =
      document.getElementById("rewardUnit")?.value || "eth";

    let rewardWei;
    if (rewardUnit === "eth") {
      rewardWei = ethers.parseEther(rewardInput);
    } else {
      rewardWei = BigInt(rewardInput);
    }

    const contract = await getContract(signer);
    const addr = await signer.getAddress();
    const registered =  await isRegistered(contract, addr);
    const maxReward = await _getMaxReward(signer);
    const minDeadline = await _getMinDeadline(signer);
    const MaxRevision = await _getMaxRevisionTime(signer);

    if (!registered) {
      throw new Error("You are not registered.");
    }

    if (deadlineHours < minDeadline) {
      throw new Error(
        `Deadline is too short, minimum allowed is ${minDeadline}.`
      );
    }

    if (maxRevision > MaxRevision) {
      throw new Error(
        `Too many revisions, maximum allowed is ${MaxRevision}.`
      );
    }

    if (rewardWei > maxReward) {
      throw new Error(
        `Reward too large. Maximum allowed is ${ethers.formatEther(
          maxReward
        )} ETH.`
      );
    }

    const balance = await signer.provider.getBalance(addr);
    if (balance < rewardWei) {
      throw new Error(
        `Insufficient balance.
Your balance: ${ethers.formatEther(balance)} ETH
Reward: ${ethers.formatEther(rewardWei)} ETH`
      );
    }

    const tx = await contract.createTask(
      title,
      githubUrl,
      deadlineHours,
      maxRevision,
      addr,
      { value: rewardWei }
    );

    await tx.wait();

    Notify.success("Task Created", "Task created successfully!");

    await loadCreatedTasks();
    await loadJoinedTasks();

    form.reset();

    return true;
  });
}

// ==============================
// EVENTS
// ==============================
function setupEventListeners() {
  const form = document.querySelector(".taskForm");
  if (form) form.addEventListener("submit", handleTaskFormSubmit);
}
