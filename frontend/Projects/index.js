import { modal } from "../global/connectwallet.js";
import { ethers, BrowserProvider } from "ethers";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";
import { _calculatePoint } from "../global/helper.js";

const ARTIFACT_PATH = "../global/artifact/TrustlessTeamProtocol.json";

// ==============================
// STATE
// ==============================
let pageActive = false;
let walletWatcher = null;
let lastLoadedAddress = null;

let allTasks = [];
let cachedABI = null;

// DOM refs
let searchInput;
let filterSelect;

// ==============================
// LIFECYCLE
// ==============================
export async function init() {
  console.log("📦 project init");
  pageActive = true;

  bindUI();
  await preloadABI();
  startWalletWatcher();

  // load sekali walau wallet belum connect
  await loadPublicTasks();
}

export function destroy() {
  console.log("📦 project destroy");
  pageActive = false;

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
  lastLoadedAddress = null;
}

// ==============================
// WALLET HELPERS (REOWN)
// ==============================
async function getProvider() {
  const walletProvider = modal.getWalletProvider();
  if (!walletProvider) return null;
  return new BrowserProvider(walletProvider);
}

async function getSigner() {
  const provider = await getProvider();
  if (!provider) return null;
  return provider.getSigner();
}

// ==============================
// WALLET WATCHER (AUTO LOAD)
// ==============================
function startWalletWatcher() {
  if (walletWatcher) return;

  walletWatcher = setInterval(async () => {
    if (!pageActive) return;

    try {
      const signer = await getSigner();
      if (!signer) return;

      const addr = (await signer.getAddress()).toLowerCase();
      if (addr !== lastLoadedAddress) {
        lastLoadedAddress = addr;
        await loadPublicTasks(signer);
      }
    } catch {
      // wallet belum connect
    }
  }, 800);
}

// ==============================
// CONTRACT HELPERS
// ==============================
async function preloadABI() {
  if (cachedABI) return cachedABI;
  const res = await fetch(ARTIFACT_PATH);
  cachedABI = await res.json();
  return cachedABI;
}

async function getContract(providerOrSigner) {
  const artifact = await preloadABI();
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    artifact.abi,
    providerOrSigner
  );
}

// ==============================
// LOAD DATA
// ==============================
async function loadPublicTasks(signer = null) {
  try {
    const provider =
      signer?.provider ??
      new ethers.JsonRpcProvider("https://rpc.sepolia.org");

    const contract = await getContract(provider);
    const taskCount = Number(await contract.taskCounter());

    allTasks = [];

    for (let i = 0; i < taskCount; i++) {
      const task = await contract.Tasks(i);
      if (!task.exists) continue;

      // hanya OpenRegistration
      if (Number(task.status) !== 3) continue;

      const stake = await contract.getMemberRequiredStake(task[0]);
      const user = await contract.Users(task.creator);

      const point = await _calculatePoint({
        rewardWei: Number(task[8]),
        creatorReputation: Number(user.reputation),
        actualHours: Number(task[12]),
        revisionCount: Number(task[13])
      });

      allTasks.push({
        id: task[0].toString(),
        creator: task.creator.toLowerCase(),
        title: task[5],
        deadline: Number(task[8]),
        stake: Number(ethers.formatEther(stake)),
        point
      });
    }

    renderTasks(allTasks);

  } catch (err) {
    console.error("loadPublicTasks error:", err);
  }
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
      ?.addEventListener("click", () => {
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
