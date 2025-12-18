import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";

console.log("📦 register loaded");

const ARTIFACT_PATH = "../artifact/TrustlessTeamProtocol.json";

const provider = new ethers.JsonRpcProvider(
  "https://eth-sepolia.g.alchemy.com/v2/cka4F66cHyvFHccHvsdTpjUni9t3NDYR"
);

// ==============================
// GLOBAL STATE
// ==============================
let allTasks = [];

// ==============================
// LOAD ABI
// ==============================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

// ==============================
// CONTRACT
// ==============================
async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ==============================
// LOAD DATA FROM CONTRACT
// ==============================
async function loadData() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);

    const taskCount = Number(await contract.taskCounter());
    allTasks = [];

    for (let i = 0; i < taskCount; i++) {
      const task = await contract.Tasks(i);

      const showStatus = [1, 3];
      if (!task.exists) continue;
      if (!showStatus.includes(Number(task.status))) continue;

      const stake = await contract.getMemberRequiredStake(task[0]);

      allTasks.push({
        id: task[0].toString(),
        creator: task[3].toLowerCase(),
        title: task[5],
        deadline: Number(task[8]),
        stake: Number(ethers.formatEther(stake))
      });
    }

    renderTasks(allTasks);

  } catch (err) {
    console.error(err);
    alert("Team Chain: Failed to load task data.");
  }
}

// ==============================
// RENDER TASKS
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

    clone.querySelector(".detailsBTN").addEventListener("click", () => {
      window.location.href = `../task/taskDetail.html?id=${task.id}`;
    });

    container.appendChild(clone);
  });
}

// ==============================
// SEARCH + FILTER
// ==============================
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");

if (searchInput && filterSelect) {
  searchInput.addEventListener("input", applySearchAndFilter);
  filterSelect.addEventListener("change", applySearchAndFilter);
}

function applySearchAndFilter() {
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

// ==============================
// WALLET WATCHER
// ==============================
let lastAddress = null;

const walletWatcher = setInterval(() => {
  const addr = window.wallet?.currentAddress;

  if (addr && addr !== lastAddress) {
    lastAddress = addr;
    waitSignerAndRun();
    clearInterval(walletWatcher);
  }
}, 300);

async function waitSignerAndRun() {
  let signer = null;

  while (!signer) {
    signer = await window.wallet.getSigner();
    if (!signer) await new Promise(r => setTimeout(r, 300));
  }

  await loadData();
}
