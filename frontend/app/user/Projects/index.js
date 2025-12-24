import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";
import { _calculatePoint } from "../global/helper.js";

const ARTIFACT_PATH = "../../artifact/TrustlessTeamProtocol.json";

// ==============================
// STATE
// ==============================
let provider;
let allTasks = [];
let walletWatcher = null;
let lastAddress = null;

// DOM refs
let searchInput;
let filterSelect;

// ==============================
// LIFECYCLE
// ==============================
export function init() {
  console.log("📦 register init");

  provider = new ethers.JsonRpcProvider(
    "https://eth-sepolia.g.alchemy.com/v2/cka4F66cHyvFHccHvsdTpjUni9t3NDYR"
  );

  bindUI();
  watchWallet();
}

export function destroy() {
  console.log("📦 register destroy");

  if (walletWatcher) {
    clearInterval(walletWatcher);
    walletWatcher = null;
  }

  if (searchInput) {
    searchInput.removeEventListener("input", applySearchAndFilter);
  }

  if (filterSelect) {
    filterSelect.removeEventListener("change", applySearchAndFilter);
  }

  allTasks = [];
  lastAddress = null;
}

// ==============================
// UI
// ==============================
function bindUI() {
  searchInput = document.getElementById("searchInput");
  filterSelect = document.getElementById("filterSelect");

  if (searchInput) {
    searchInput.addEventListener("input", applySearchAndFilter);
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", applySearchAndFilter);
  }
}

// ==============================
// WALLET
// ==============================
function watchWallet() {
  walletWatcher = setInterval(async () => {
    const addr = window.wallet?.currentAddress;

    if (addr && addr !== lastAddress) {
      lastAddress = addr;
      await waitSignerAndLoad();
    }
  }, 300);
}

async function waitSignerAndLoad() {
  let signer = null;

  while (!signer) {
    signer = await window.wallet.getSigner();
    if (!signer) await delay(300);
  }

  await loadData(signer);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ==============================
// CONTRACT
// ==============================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ==============================
// LOAD DATA
// ==============================
async function loadData(signer) {
  try {
    const contract = await getContract(signer);

    const taskCount = Number(await contract.taskCounter());
    allTasks = [];

    for (let i = 0; i < taskCount; i++) {
      const task = await contract.Tasks(i);

      const showStatus = [3];
      if (!task.exists) continue;
      if (!showStatus.includes(Number(task.status))) continue;

      const stake = await contract.getMemberRequiredStake(task[0]);

      // ambil reputasi creator
      const user = await contract.Users(task.creator);

      // hitung point task
      const point = await _calculatePoint({
        rewardWei: Number(task[8]),
        creatorReputation: Number(user.reputation),
        actualHours: Number(task[12]),     // pastikan index benar
        revisionCount: Number(task[13])
      });

      allTasks.push({
        id: task[0].toString(),
        creator: task.creator.toLowerCase(),
        title: task[5],
        deadline: Number(task[8]),
        stake: Number(ethers.formatEther(stake)),
        point // ⬅️ POINT SIAP DIRENDER
      });
    }

    renderTasks(allTasks);

  } catch (err) {
    console.error(err);
    alert("Team Chain: Failed to load task data.");
  }
}


// ==============================
// RENDER
// ==============================
function renderTasks(tasks) {
  const container = document.getElementById("activeList");
  const template = document.getElementById("taskCardTemplate");

  if (!container || !template) return;

  container.innerHTML = "";

  tasks.forEach(task => {
    const clone = template.content.cloneNode(true);

    clone.querySelector(".taskId").textContent = task.id;
    clone.querySelector(".creator").textContent = task.creator;
    clone.querySelector(".title").textContent = task.title;
    clone.querySelector(".deadline").textContent = task.deadline;
    clone.querySelector(".stake").textContent = task.stake;
    clone.querySelector(".Points").textContent = task.point;

    clone.querySelector(".detailsBTN")
      .addEventListener("click", () => {
     go(`/../user/taskDetail?id=${task.id}`);
      });

    container.appendChild(clone);
  });
}

// ==============================
// FILTER
// ==============================
function applySearchAndFilter() {
  if (!searchInput || !filterSelect) return;

  const keyword = searchInput.value.toLowerCase();
  const filter = filterSelect.value;

  let result = allTasks.filter(task =>
    task.title.toLowerCase().includes(keyword) ||
    task.creator.includes(keyword)
  );

  switch (filter) {
    case "stakeHigh":
      result.sort((a, b) => b.stake - a.stake);
      break;
    case "stakeLow":
      result.sort((a, b) => a.stake - b.stake);
      break;
    case "deadlineSoon":
      result.sort((a, b) => a.deadline - b.deadline);
      break;
    case "deadlineLate":
      result.sort((a, b) => b.deadline - a.deadline);
      break;
  }

  renderTasks(result);
}
