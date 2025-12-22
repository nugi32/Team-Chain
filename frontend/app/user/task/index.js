import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";
import { _getMinDeadline, _getMaxRevisionTime, _getMaxReward, isRegistered } from "../global/helper.js";
import { withUI } from "../../global-Ux/loading-ui.js";

// ==============================
// MODULE STATE
// ==============================

let provider = null;
let iface = null;
let walletWatcherInterval = null;

let pageActive = false;
let lastLoadedAddress = null;

// Task data
let createdTasks = [];
let joinedTasks = [];

// Event listeners
let eventListeners = [];

const ARTIFACT_PATH = "../../artifact/TrustlessTeamProtocol.json";

// ==============================
// INIT / DESTROY
// ==============================

export async function init() {
    console.log("📦 task page initializing");
    pageActive = true;

    provider = new ethers.JsonRpcProvider(
        "https://eth-sepolia.g.alchemy.com/v2/cka4F66cHyvFHccHvsdTpjUni9t3NDYR"
    );

    const artifact = await loadABI(ARTIFACT_PATH);
    iface = new ethers.Interface(artifact.abi);

    setupEventListeners();
    setupWalletWatcher();

    // Page masuk → coba load (kalau wallet sudah connect)
    await tryLoadTasks();
}

export function destroy() {
    console.log("🧹 projects page cleaning up");
    pageActive = false;

    if (walletWatcherInterval) {
        clearInterval(walletWatcherInterval);
        walletWatcherInterval = null;
    }

    eventListeners.forEach(({ element, event, handler }) => {
        element?.removeEventListener(event, handler);
    });
    eventListeners = [];

    lastLoadedAddress = null;
    createdTasks = [];
    joinedTasks = [];
}

// ==============================
// WALLET GATE LOADER (KUNCI)
// ==============================

async function tryLoadTasks() {
    if (!pageActive) return;

    const signer = await window.wallet?.getSigner();
    if (!signer) return;

    const address = (await signer.getAddress()).toLowerCase();

    // 🔒 GATE: address sama → STOP
    if (address === lastLoadedAddress) return;
    lastLoadedAddress = address;

    console.log("🔄 Loading tasks for", address);

    await loadCreatedTasks();
    await loadJoinedTasks();
}

// ==============================
// WALLET WATCHER
// ==============================

function setupWalletWatcher() {
    walletWatcherInterval = setInterval(async () => {
        const addr = window.wallet?.currentAddress;
        if (!addr) return;

        if (addr.toLowerCase() !== lastLoadedAddress) {
            await tryLoadTasks();
        }
    }, 300);
}

// ==============================
// EVENT LISTENER MANAGEMENT
// ==============================

function addEventListener(element, event, handler) {
    if (!element) return;
    element.addEventListener(event, handler);
    eventListeners.push({ element, event, handler });
}

function setupEventListeners() {
    const searchActive = document.getElementById("searchActive");
    const filterActive = document.getElementById("filterActive");

    if (searchActive) {
        addEventListener(searchActive, "input", () => {
            const q = searchActive.value.toLowerCase();
            renderCreatedTasks(createdTasks.filter(t => t.title.toLowerCase().includes(q)));
        });
    }

    if (filterActive) {
        addEventListener(filterActive, "change", e => {
            let list = [...createdTasks];
            if (e.target.value === "newest") list.reverse();
            else list.sort((a, b) => a.order - b.order);
            renderCreatedTasks(list);
        });
    }

    const searchInactive = document.getElementById("searchInactive");
    const filterInactive = document.getElementById("filterInactive");

    if (searchInactive) {
        addEventListener(searchInactive, "input", () => {
            const q = searchInactive.value.toLowerCase();
            renderJoinedTasks(joinedTasks.filter(t => t.title.toLowerCase().includes(q)));
        });
    }

    if (filterInactive) {
        addEventListener(filterInactive, "change", e => {
            let list = [...joinedTasks];
            if (e.target.value === "newest") list.reverse();
            else list.sort((a, b) => a.order - b.order);
            renderJoinedTasks(list);
        });
    }

    const taskForm = document.querySelector(".taskForm");
    if (taskForm) {
        addEventListener(taskForm, "submit", handleTaskFormSubmit);
    }
}

// ==============================
// CONTRACT HELPERS
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
// DATA LOADERS
// ==============================

async function loadCreatedTasks() {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);
    const address = (await signer.getAddress()).toLowerCase();
    const taskCount = Number(await contract.taskCounter());

    createdTasks = [];

    for (let i = 0; i < taskCount; i++) {
        const task = await contract.Tasks(i);
        if (!task.exists) continue;
        if (task.creator.toLowerCase() !== address) continue;

        createdTasks.push({
            id: task[0].toString(),
            title: task[5],
            status: task[1],
            order: i
        });
    }

    renderCreatedTasks(createdTasks);
}

async function loadJoinedTasks() {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);
    const address = (await signer.getAddress()).toLowerCase();
    const taskCount = Number(await contract.taskCounter());

    joinedTasks = [];

    for (let i = 0; i < taskCount; i++) {
        const task = await contract.Tasks(i);
        if (!task.exists) continue;
        if (task.member.toLowerCase() !== address) continue;

        joinedTasks.push({
            id: task[0].toString(),
            title: task[5],
            status: Number(task.status),
            order: i
        });
    }

    renderJoinedTasks(joinedTasks);
}

// ==============================
// UI RENDERING
// ==============================

function decodeStatus(status) {
    return {
        0: "NonExistent",
        1: "Created",
        2: "Active",
        3: "OpenRegistration",
        4: "InProgress",
        5: "Completed",
        6: "Cancelled"
    }[status] || "Undefined";
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
        n.querySelector(".detailsBTN")?.addEventListener("click", () => {
            go(`/../user/taskDetail?id=${task.id}`);
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
        n.querySelector(".detailsBTN")?.addEventListener("click", () => {
            go(`/../user/taskDetail?id=${task.id}`);
        });
        c.appendChild(n);
    });
}














// ==============================
// TASK CREATION
// ==============================

/**
 * Validate GitHub issue URL format
 */
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

/**
 * Handle task creation form submission
 */
async function handleTaskFormSubmit(e) {
  e.preventDefault();
  return withUI(async () => {
    const signer = await window.wallet.getSigner();
    if (!signer) throw new Error("Wallet not connected");

    // Get form values
    const title = e.target.title.value.trim();
    const githubUrl = e.target.github.value.trim();
    const deadlineHours = Number(e.target.deadlineHours.value);
    const maxRevision = Number(e.target.maxRevision.value);
    const rewardInput = e.target.reward.value.trim();

    // Validate GitHub URL
    if (!validateGithubIssueUrl(githubUrl)) {
      throw new Error("Invalid GitHub Issue URL.");
    }

    // Validate numeric inputs
    if (isNaN(deadlineHours) || deadlineHours <= 0) {
      throw new Error("Deadline must be a positive number.");
    }

    if (isNaN(maxRevision) || maxRevision < 0) {
      throw new Error("Max revision must be a non-negative number.");
    }

    // Convert reward to Wei
    const rewardUnit = document.getElementById("rewardUnit")?.value || "eth";
    let rewardWei;

    if (isNaN(rewardInput) || Number(rewardInput) <= 0) {
      throw new Error("Invalid reward amount.");
    }

    if (rewardUnit === "eth") {
      // ETH → Wei
      rewardWei = ethers.parseEther(rewardInput);
    } else {
      // Wei (ensure it's an integer)
      rewardWei = BigInt(rewardInput);
    }

    // Check user registration status
    const contract = await getContract(signer);
    const addr = await signer.getAddress();
    const status =  await isRegistered(contract, addr);
    const maxReward = await _getMaxReward(signer);
    const minDeadline = await _getMinDeadline(signer);
    const MaxRevision = await _getMaxRevisionTime(signer);

    if (deadlineHours < minDeadline) {
        console.log(minDeadline)
        throw new Error(`Deadline is too short, minimum allowed is: ${minDeadline}.`);
    }

    if (maxRevision > MaxRevision) {
        console.log("rev",MaxRevision)
        throw new Error(`too much revision, maximum allowed is: ${MaxRevision}.`);
    }

    if (rewardWei > maxReward) {
        throw new Error(`Reward is too big, maximum allowed is: ${ethers.formatEther(maxReward)} ETH.`);
    }

    if (!status) {
      throw new Error("You are not registered.");
    }

    // Check user balance
    const balance = await provider.getBalance(addr);
    if (balance < rewardWei) {
      throw new Error(`Insufficient balance\nYour balance: ${ethers.formatEther(balance)} ETH.  \nReward: ${ethers.formatEther(rewardWei)} ETH`);
    }

    console.log(title)
    console.log(githubUrl)
    console.log(deadlineHours)
    console.log(maxRevision)
    console.log(addr)
    console.log(rewardWei)

    // Create task transaction
    const tx = await contract.createTask(
      title,
      githubUrl,
      deadlineHours,
      maxRevision,
      addr,
      { value: rewardWei }
    );

    const receipt = await tx.wait();

    // Parse events
    let taskCreated = false;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "TaskCreated") {
          taskCreated = true;
          console.log("📌 EVENT Task Created!");
          Notify.success("Task Created", "Task created successfully!");
          
          // Refresh task lists
          await loadCreatedTasks();
          await loadJoinedTasks();
          
          // Clear form
          e.target.reset();
          break;
        }
      } catch (error) {
        console.error("Error parsing log:", error);
      }
    }

    if (!taskCreated) {
      throw new Error("Task creation failed - no TaskCreated event found");
    }

    return taskCreated;
  });
}