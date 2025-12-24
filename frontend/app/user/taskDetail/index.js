import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";
import { _hasRequestedJoin, isRegistered, _rejectAllPending, _rejectAllPendingExcept, _calculatePoint } from "../global/helper.js";
import { withUI } from "../../global-Ux/loading-ui.js";
// ==============================
// STATE MANAGEMENT
// ==============================

// Module-level state that persists for the lifetime of the module
let provider = null;
let iface = null;
let walletWatcherInterval = null;
let lastAddress = null;
let eventListeners = []; // Track event listeners for cleanup

// Contract ABI path
const ARTIFACT_PATH = "../../artifact/TrustlessTeamProtocol.json";

// ==============================
// INITIALIZATION / DESTRUCTION
// ==============================

/**
 * Initialize the task detail page
 * Called by SPA router when page becomes active
 * Sets up all event listeners, state, and initial data loading
 */
export async function init() {
    console.log("📦 task detail page initializing");
    
    // Initialize provider once
    provider = new ethers.JsonRpcProvider(
        "https://eth-sepolia.g.alchemy.com/v2/cka4F66cHyvFHccHvsdTpjUni9t3NDYR"
    );
    
    // Load contract interface for event parsing
    const artifact = await loadABI(ARTIFACT_PATH);
    iface = new ethers.Interface(artifact.abi);
    
    // Set up UI event listeners
    setupEventListeners();
    
    // Start wallet connection monitoring
    setupWalletWatcher();
    
    // Load initial data if wallet is already connected
    if (window.wallet?.currentAddress) {
        await waitSignerAndRun();
    }
}

/**
 * Clean up page resources
 * Called by SPA router when leaving the page
 * Removes all event listeners and stops intervals
 */
export function destroy() {
    console.log("🧹 task detail page cleaning up");
    
    // Clear wallet watcher interval
    if (walletWatcherInterval) {
        clearInterval(walletWatcherInterval);
        walletWatcherInterval = null;
    }
    
    // Remove all registered event listeners
    eventListeners.forEach(({ element, event, handler }) => {
        element?.removeEventListener(event, handler);
    });
    eventListeners = [];
    
    // Reset state
    lastAddress = null;
    
    console.log("✅ task detail page cleanup complete");
}

// ==============================
// EVENT LISTENER MANAGEMENT
// ==============================

/**
 * Helper to add event listeners with tracking for cleanup
 */
function addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    eventListeners.push({ element, event, handler });
}

/**
 * Set up all page event listeners
 * Called during initialization
 */
function setupEventListeners() {
    // Reload button
    const reloadBtn = document.getElementById("reload");
    if (reloadBtn) {
        addEventListener(reloadBtn, "click", async () => {
            try {
                await loadData();
                console.log("reload triggered");
            } catch (e) {
                console.error(e);
            }
        });
    }
    
    // Task action buttons
    setupTaskActionListeners();
}

/**
 * Set up task action button listeners
 */
function setupTaskActionListeners() {
    const actions = [
        { selector: ".ActivateTask", handler: handleActivateTask },
        { selector: ".DeleteTask", handler: handleDeleteTask },
        { selector: ".OpenRegisteration", handler: handleOpenRegistration },
        { selector: ".CloseRegisteration", handler: handleCloseRegistration },
        { selector: ".CancelTask", handler: handleCancelTask },
        { selector: ".Join", handler: handleJoinTask },
        { selector: ".WithdrawJoin", handler: handleWithdrawJoin }
    ];
    
    actions.forEach(({ selector, handler }) => {
        const element = document.querySelector(selector);
        if (element) {
            addEventListener(element, "click", handler);
        }
    });
}

// ==============================
// CONTRACT INTERACTION
// ==============================

/**
 * Load contract ABI from JSON file
 */
async function loadABI(path) {
    const res = await fetch(path);
    return res.json();
}

/**
 * Get contract instance with signer
 */
async function getContract(signer) {
    const artifact = await loadABI(ARTIFACT_PATH);
    return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ==============================
// UI HELPER FUNCTIONS
// ==============================

/**
 * Decode task status number to human-readable string
 */
async function decodeStatus(status) {
    const statusMap = {
        0: "NonExistent",
        1: "Created",
        2: "Active",
        3: "OpenRegistration",
        4: "InProgress",
        5: "Completed",
        6: "Cancelled"
    };
    return statusMap[status] || "Undefined";
}

async function decodeValueCategory(status) {
    const statusMap = {
        0: "Low",
        1: "Midle Low",
        2: "Midle",
        3: "Midle High",
        4: "High",
        5: "Ultra High",
    };
    return statusMap[status] || "Undefined";
}

/**
 * Helper to set text content with fallback
 */
function showText(parent, selector, value, fallback = "-") {
    const el = parent?.querySelector(selector);
    if (!el) return;
    el.textContent = value ?? fallback;
}

/**
 * Helper to set boolean display
 */
function showBool(parent, selector, value) {
    showText(parent, selector, value ? "Yes" : "No");
}

/**
 * Helper to set link content
 */
function showLink(parent, selector, url) {
    const el = parent?.querySelector(selector);
    if (!el) return;
    if (!url) {
        el.textContent = "-";
        el.removeAttribute("href");
        return;
    }
    el.href = url;
    el.textContent = url.length > 30 ? url.slice(0, 30) + "..." : url;
}

/**
 * Show element
 */
function show(el) {
    if (!el) return;
    el.style.display = "";
}

/**
 * Hide element
 */
function hide(el) {
    if (!el) return;
    el.style.display = "none";
}

/**
 * Get all task action buttons from card
 */
function getTaskButtons(card) {
    return {
        activate: card.querySelector(".ActivateTask"),
        openReg: card.querySelector(".OpenRegisteration"),
        closeReg: card.querySelector(".CloseRegisteration"),
        requestRev: card.querySelector(".RequestRevision"),
        approve: card.querySelector(".ApproveTask"),
        cancel: card.querySelector(".CancelTask"),
        submit: card.querySelector(".submitTask"),
        resubmit: card.querySelector(".ResubmitTask"),
        join: card.querySelector(".Join"),
        Delete: card.querySelector(".DeleteTask"),
        WithdrawJoinReq: card.querySelector(".WithdrawJoin"),
    };
}

/**
 * Hide all task action buttons
 */
function hideAllButtons(btn) {
    Object.values(btn).forEach(hide);
}

/**
 * Apply button visibility rules based on task state and user role
 */
function applyButtonRules(card, task, userAddress) {
    const btn = getTaskButtons(card);
    hideAllButtons(btn);

    const status = Number(task[1]);
    const creator = task[3];

    const isCreator = creator === userAddress;
    const isMember = creator !== userAddress;

    // Creator rules
    if (isCreator && status === 1) {
        show(btn.activate);
        show(btn.Delete);
    }

    if (isCreator && status === 2) {
        show(btn.openReg);
        show(btn.Delete);
    }

    if (isCreator && status === 3) {
        loadJoinRequestData(userAddress);
        show(btn.closeReg);
    }

    if (isCreator && status === 4) {
        handleApproveTaskClick();
        loadUserData();
        show(btn.requestRev);
        show(btn.approve);
        show(btn.cancel);
    }

    // Member rules
    if (isMember && status === 3) {
        show(btn.join);
        show(btn.WithdrawJoinReq);
    }

    if (isMember && status === 4) {
        loadUserData();
        handleSubmitTaskClick();
        show(btn.submit);
        show(btn.resubmit);
        show(btn.cancel);
    }
}

// ==============================
// DATA LOADING AND RENDERING
// ==============================

/**
 * Display task data in the UI
 */
async function showTaskData(task, address, point) {

    const card = document.querySelector(".task-info");
    if (!card) return;

    // Basic task info
    showText(card, ".taskId", task[0]?.toString());
    showText(card, ".status", await decodeStatus(Number(task[1])));
    showText(card, ".value", await decodeValueCategory(Number(task[2])));
    showText(card, ".Points", (Number(point)));
    showText(card, ".creator", task[3]);
    showText(card, ".member",
        task[4] === ethers.ZeroAddress ? "Not Assigned" : task[4]
    );

    // Task details
    showText(card, ".title", task[5]);
    showLink(card, ".githubURL", task[6]);
    showText(card, ".reward", ethers.formatEther(task[7]));
    showText(card, ".deadlineHours", task[8]?.toString());

    // Timestamps
    showText(card, ".deadlineAt",
        new Date(Number(task[9]) * 1000).toLocaleString()
    );
    showText(card, ".createdAt",
        new Date(Number(task[10]) * 1000).toLocaleString()
    );

    // Stakes and settings
    showText(card, ".creatorStake", ethers.formatEther(task[11]));
    showText(card, ".memberStake", ethers.formatEther(task[12]));
    showText(card, ".maxRevision", task[13]?.toString());

    console.log(task[14])
    console.log(task[15])
    console.log(task[16])
    console.log(task[17])

    // Boolean flags
    showBool(card, ".isMemberStakeLocked", task[14]);
    showBool(card, ".isCreatorStakeLocked", task[15]);
    showBool(card, ".isRewardClaimed", task[16]);
    showBool(card, ".exists", task[17]);

    // Apply button rules based on user role
    applyButtonRules(card, task, address);
}

/**
 * Load and display task data from contract
 */
async function loadData() {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const address = await signer.getAddress();

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) return;

        console.log(id)

        const contract = await getContract(signer);
        const task = await contract.Tasks(id);
        const user = await contract.Users(task.creator);
        const point = await _calculatePoint({
                rewardWei: Number(task[8]),
                creatorReputation: Number(user.reputation),
                actualHours: Number(task[12]),
                revisionCount: Number(task[13])
              });
        
        await showTaskData(task, address, point);
        console.log(task)

    } catch (e) {
        console.error("Failed to load task data:", e);
        alert("Team Chain: Failed to load task data.");
    }
}

// ==============================
// WALLET CONNECTION MANAGEMENT
// ==============================

/**
 * Set up wallet connection watcher
 * Monitors for wallet address changes
 */
function setupWalletWatcher() {
    walletWatcherInterval = setInterval(() => {
        const addr = window.wallet?.currentAddress;
        if (addr && addr !== lastAddress) {
            lastAddress = addr;
            onWalletConnected(addr);
            clearInterval(walletWatcherInterval);
        }
    }, 300);
}

/**
 * Handle wallet connection event
 */
function onWalletConnected(address) {
    console.log("Wallet connected:", address);
    waitSignerAndRun();
}

/**
 * Wait for signer to be available and load data
 */
async function waitSignerAndRun() {
    let signer = null;
    
    // Poll for signer availability
    while (!signer) {
        signer = await window.wallet.getSigner();
        if (!signer) {
            await new Promise(r => setTimeout(r, 300));
        }
    }
    
    // Load data once signer is available
    await loadData();
}


function decodeJoinStatus(inputEnum) {
    const statusMap = {
        0: "None",
        1: "Requested",
        2: "Accepted",
        3: "Submitted",
        4: "InProgress",
        5: "Revision",
        6: "Cancelled"
    };
    return statusMap[inputEnum] || "Undefined";
}

function decodeSubmitStatus(inputEnum) {
    const statusMap = {
        0: "None",
        1: "Pending",
        2: "RevisionNeeded",
        3: "Accepted"
    };
    return statusMap[inputEnum] || "Undefined";
}


function decodeBool(input) {
    if (input) {
        return "Yes";
    } else {
        return "No";
    }
}



function RenderJoinRequests(requests) {
  const container = document.getElementById('joinRequestOverlay');
  const template = document.getElementById('JoinRequest');

  if (!container || !template) {
    throw new Error('Required DOM elements not found');
  }

  container.innerHTML = '';

  if (!Array.isArray(requests)) {
    container.innerHTML = '<p>Invalid join request data.</p>';
    return;
  }

  const pendingRequests = requests.filter(req => req.isPending);

  if (pendingRequests.length === 0) {
    container.innerHTML = '<p>No pending join requests.</p>';
    return;
  }

  pendingRequests.forEach((req) => {
    const clone = template.content.cloneNode(true);

    clone.querySelector('.taskId').textContent = req.applicant;
    clone.querySelector('.status').textContent = decodeJoinStatus(req.status);

    clone.querySelector('.pending').textContent = decodeBool(req.isPending);

    clone.querySelector('.stakeAmount').textContent =
      ethers.formatEther(req.stakeAmount);

    container.appendChild(clone);
  });
}



async function loadJoinRequestData(address) {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) throw new Error('Wallet not connected');

    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('id');
    if (!taskId) throw new Error('Task ID not found');

    const contract = await getContract(signer);
    const count = Number(await contract.getJoinRequestCount(taskId));

    const requests = [];

    for (let i = 0; i < count; i++) {
      const req = await contract.joinRequests(taskId, i);

      if (req.applicant === address) {
        requests.push({
          index: i,
          applicant: req.applicant,
          stakeAmount: req.stakeAmount,
          status: Number(req.status),
          isPending: req.isPending,
          hasWithdrawn: req.hasWithdrawn
        });
      }
    }

    RenderJoinRequests(requests);

    return requests;

  } catch (e) {
    console.error('loadJoinRequestData error:', e);
    return [];
  }
}










function RenderSubmitStatus(TaskSubmit) {
  const container = document.getElementById('joinRequestOverlay');
  const template = document.getElementById('SubmitStatus');

  if (!container || !template) {
    throw new Error('Required DOM elements not found');
  }

  container.innerHTML = '';

  if (!Array.isArray(TaskSubmit)) {
    container.innerHTML = '<p>Invalid join request data.</p>';
    return;
  }

  const pendingRequests = TaskSubmit.filter(req => req.isPending);

  if (pendingRequests.length === 0) {
    container.innerHTML = '<p>No pending join requests.</p>';
    return;
  }

  pendingRequests.forEach((req) => {
    const clone = template.content.cloneNode(true);

    clone.querySelector('.taskId').textContent = req.applicant;
    clone.querySelector('.status').textContent = decodeSubmitStatus(req.status);

    clone.querySelector('.note').textContent = req.Note;

    clone.querySelector('.gitURL').textContent = req.git;

    container.appendChild(clone);
  });
}

async function loadUserData() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) throw new Error('Wallet not connected');

    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('id');
    if (!taskId) throw new Error('Task ID not found');

    const contract = await getContract(signer);
    const count = Number(await contract.getJoinRequestCount(taskId));

    const TaskSubmit = [];

    for (let i = 0; i < count; i++) {
      const ts = await contract.TaskSubmits(i);

        TaskSubmit.push({
          index: i,
          applicant: ts.sender,
          status: Number(ts.status),
          Note: ts.note,
          git: ts.githubURL
        });
    }

    RenderSubmitStatus(TaskSubmit);
    console.log(TaskSubmit)

    return TaskSubmit;

  } catch (e) {
    console.error('loadSubmitData error:', e);
    return [];
  }
}






/*
Todo: 

* buat section joined request task di dashboard
* buat helper buat reject semua pending join request ketika member accepted & registeration closed **
* buat section if address is pending then show pending status **

*/























// ==============================
// TASK ACTION HANDLERS
// ==============================
// ==============================
// TASK ACTION HANDLERS
// ==============================

async function handleActivateTask() {
    return withUI(async () => {
        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Get task ID from URL parameters
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        if (!taskId) {
            throw new Error('Task ID not found in URL parameters');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();

        // Fetch task details from blockchain
        const taskData = await contract.Tasks(taskId);
        const deadlineHours = Number(taskData[8]);
        const maxRevision = Number(taskData[13]);
        const reward = taskData[7];
        const creatorAddress = taskData[3];

        // Calculate required stake for task activation
        const requiredStake = await contract.__getCreatorStake(
            deadlineHours,
            maxRevision,
            reward,
            creatorAddress
        );

        // Check user balance against required stake
        const provider = contract.runner?.provider || window.ethereum;
        const balance = await provider.getBalance(userAddress);

        if (requiredStake > balance) {
            throw new Error(
                `Insufficient balance\nYour balance: ${ethers.formatEther(balance)} ETH\nRequired: ${ethers.formatEther(requiredStake)} ETH`
            );
        }

        // Execute activation transaction with stake value
        const tx = await contract.activateTask(taskId, { value: requiredStake });
        const receipt = await tx.wait();

        // Parse logs to find TaskActive event
        let activationConfirmed = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'TaskActive') {
                    activationConfirmed = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!activationConfirmed) {
            throw new Error('Task activation event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Task Activated", "Task activated successfully!");
        
        // Refresh UI data after successful activation
        await loadData();
    });
}

async function handleDeleteTask() {
    return withUI(async () => {
        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Get task ID from URL parameters
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        if (!taskId) {
            throw new Error('Task ID not found in URL parameters');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();

        // Verify user is the task owner
        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== userAddress) {
            throw new Error('You are not the task owner');
        }

        // Execute deletion transaction
        const tx = await contract.deleteTask(taskId, userAddress);
        const receipt = await tx.wait();

        // Parse logs to find TaskDeleted event
        let deletionConfirmed = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'TaskDeleted') {
                    deletionConfirmed = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!deletionConfirmed) {
            throw new Error('Task deletion event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Task Deleted", "Task deleted successfully!");
        
        // Refresh UI data after successful deletion
        await loadData();
    });
}

async function handleOpenRegistration() {
    return withUI(async () => {
        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Get task ID from URL parameters
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        if (!taskId) {
            throw new Error('Task ID not found in URL parameters');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();

        // Verify user is the task owner
        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== userAddress) {
            throw new Error('You are not the task owner');
        }

        // Execute registration opening transaction
        const tx = await contract.openRegistration(taskId);
        const receipt = await tx.wait();

        // Parse logs to find RegistrationOpened event
        let registrationOpened = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'RegistrationOpened') {
                    registrationOpened = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!registrationOpened) {
            throw new Error('Registration opened event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Registration Opened", "Task registration opened successfully!");
        
        // Refresh UI data after successful operation
        await loadData();
    });
}

async function handleCloseRegistration() {
    return withUI(async () => {
        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Get task ID from URL parameters
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        if (!taskId) {
            throw new Error('Task ID not found in URL parameters');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();
        _rejectAllPending(contract, taskId);

        // Verify user is the task owner
        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== userAddress) {
            throw new Error('You are not the task owner');
        }

        // Execute registration closing transaction
        const tx = await contract.closeRegistration(taskId);
        const receipt = await tx.wait();

        // Parse logs to find RegistrationClosed event
        let registrationClosed = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'RegistrationClosed') {
                    registrationClosed = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!registrationClosed) {
            throw new Error('Registration closed event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Registration Closed", "Task registration closed successfully!");
        
        // Refresh UI data after successful operation
        await loadData();
    });
}

















async function handleCancelTask() {
    return withUI(async () => {
        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Get task ID from URL parameters
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        if (!taskId) {
            throw new Error('Task ID not found in URL parameters');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();

        // Execute cancellation transaction
        const tx = await contract.cancelByMe(taskId, userAddress);
        const receipt = await tx.wait();

        // Parse logs to find TaskCancelledByMe event
        let cancellationConfirmed = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'TaskCancelledByMe') {
                    cancellationConfirmed = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!cancellationConfirmed) {
            throw new Error('Task cancellation event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Task Cancelled", "Task cancelled successfully!");
        
        // Refresh UI data after successful cancellation
        await loadData();
    });
}


















async function handleJoinTask() {
    return withUI(async () => {
        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Get task ID from URL parameters
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        if (!taskId) {
            throw new Error('Task ID not found in URL parameters');
        }

        // Initialize contract and get user address
        const address = await signer.getAddress();
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();
        const Result = await _hasRequestedJoin(contract, taskId, address);

        if (Result) {
        throw new Error('You already requested to join');
        }


    const result = await isRegistered(contract, address);
    const { isRegistered: registered, message } = result;

    if (!registered) {
      throw new Error(message);
    }

        // Check required stake for joining
        const requiredStake = await contract.getMemberRequiredStake(taskId);

        // Verify user is not already a member
        const taskData = await contract.Tasks(taskId);
        if (taskData[4] === userAddress) {
            throw new Error('You are already a member of this task');
        }

        // Execute join request transaction with stake
        const tx = await contract.requestJoinTask(taskId, userAddress, { value: requiredStake });
        const receipt = await tx.wait();

        // Parse logs to find JoinRequested event
        let joinRequested = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'JoinRequested') {
                    joinRequested = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!joinRequested) {
            throw new Error('Join requested event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Join Request Submitted", "Join request submitted successfully!");
        
        // Refresh UI data after successful join request
        await loadData();
    });
}

async function handleWithdrawJoin() {
    return withUI(async () => {
        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Get task ID from URL parameters
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        if (!taskId) {
            throw new Error('Task ID not found in URL parameters');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();
        const Result = await _hasRequestedJoin(contract, taskId, userAddress);

        if (!Result) {
        throw new Error('You do not have join request alredy');
        }

        const result = await isRegistered(contract, userAddress);
        const { isRegistered: registered, message } = result;

        if (!registered) {
        throw new Error(message);
        }

        // Execute join request withdrawal transaction
        const tx = await contract.withdrawJoinRequest(taskId, userAddress);
        const receipt = await tx.wait();

        // Parse logs to find JoinRequestCancelled event
        let withdrawalConfirmed = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'JoinrequestCancelled') {
                    withdrawalConfirmed = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!withdrawalConfirmed) {
            throw new Error('Join request cancellation event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Join Request Withdrawn", "Join request withdrawn successfully!");
        
        // Refresh UI data after successful withdrawal
        await loadData();
    });
}





























// ==============================
// CONTRACT WRAPPER FUNCTIONS
// ==============================

async function acceptMember(taskId, address) {
    return withUI(async () => {
        // Validate task ID
        if (!taskId) {
            throw new Error('Task ID is required');
        }

        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();
        _rejectAllPendingExcept(contract, taskId, address)

        // Verify user is the task owner
        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== userAddress) {
            throw new Error('You are not the task owner');
        }

        // Execute join request approval transaction
        const tx = await contract.approveJoinRequest(taskId, address);
        const receipt = await tx.wait();

        // Parse logs to find JoinApproved event
        let approvalConfirmed = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'JoinApproved') {
                    approvalConfirmed = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!approvalConfirmed) {
            throw new Error('Join approval event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Member Accepted", "Member accepted successfully!");
        
        // Refresh UI data after successful approval
        await loadData();
    });
}

async function rejectMember(taskId, applicant) {
    return withUI(async () => {
        // Validate task ID
        if (!taskId) {
            throw new Error('Task ID is required');
        }

        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();

        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== userAddress) {
            throw new Error('You are not the task owner');
        }

        // Execute join request rejection transaction
        const tx = await contract.rejectJoinRequest(taskId, applicant);
        const receipt = await tx.wait();

        // Parse logs to find JoinRejected event
        let rejectionConfirmed = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'JoinRejected') {
                    rejectionConfirmed = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!rejectionConfirmed) {
            throw new Error('Join rejection event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Member Rejected", "Member rejected successfully!");
        
        // Refresh UI data after successful rejection
        await loadData();
    });
}

async function acceptTask(taskId) {
    return withUI(async () => {
        // Validate task ID
        if (!taskId) {
            throw new Error('Task ID is required');
        }

        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();

        // Verify user is the task owner
        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== userAddress) {
            throw new Error('You are not the task owner');
        }

        // Get the latest submission data
        const submitData = await contract.TaskSubmits(taskId);
        const submitId = submitData.submissionId || submitData[0];

        if (!submitId) {
            throw new Error('No submission found for this task');
        }

        // Execute task approval transaction
        const tx = await contract.approveTask(taskId, submitId);
        const receipt = await tx.wait();

        // Parse logs to find TaskApproved event
        let approvalConfirmed = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'TaskApproved') {
                    approvalConfirmed = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!approvalConfirmed) {
            throw new Error('Task approval event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Task Approved", "Task approved successfully!");
        
        // Refresh UI data after successful approval
        await loadData();
    });
}

async function requestRevision(taskId, note, additionalDeadlineHours) {
    return withUI(async () => {
        // Validate inputs
        if (!taskId) {
            throw new Error('Task ID is required');
        }
        if (!note || note.trim() === '') {
            throw new Error('Revision note is required');
        }
        if (!additionalDeadlineHours || isNaN(additionalDeadlineHours)) {
            throw new Error('Valid additional deadline hours is required');
        }

        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();

        // Verify user is the task owner
        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== userAddress) {
            throw new Error('You are not the task owner');
        }

        // Execute revision request transaction
        const tx = await contract.requestRevision(taskId, note, additionalDeadlineHours);
        const receipt = await tx.wait();

        // Parse logs to find RevisionRequested event
        let revisionRequested = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'RevisionRequested') {
                    revisionRequested = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!revisionRequested) {
            throw new Error('Revision requested event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Revision Requested", "Revision requested successfully!");
        
        // Refresh UI data after successful revision request
        await loadData();
    });
}

async function submitTask(pullRequestURL, note) {
    return withUI(async () => {
        // Validate inputs
        if (!pullRequestURL || pullRequestURL.trim() === '') {
            throw new Error('Pull request URL is required');
        }
        if (!note || note.trim() === '') {
            throw new Error('Submission note is required');
        }

        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Get task ID from URL parameters
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        if (!taskId) {
            throw new Error('Task ID not found in URL parameters');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();

        // Verify user is a task member
        const taskData = await contract.Tasks(taskId);
        if (taskData[4] !== userAddress) {
            throw new Error('You are not a member of this task');
        }

        // Execute task submission transaction
        const tx = await contract.requestSubmitTask(taskId, pullRequestURL, note, userAddress);
        const receipt = await tx.wait();

        // Parse logs to find TaskSubmitted event
        let submissionConfirmed = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'TaskSubmitted') {
                    submissionConfirmed = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!submissionConfirmed) {
            throw new Error('Task submitted event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Task Submitted", "Task submitted successfully!");
        
        // Refresh UI data after successful submission
        await loadData();
    });
}

async function reSubmitTask(pullRequestURL, note) {
    return withUI(async () => {
        // Validate inputs
        if (!pullRequestURL || pullRequestURL.trim() === '') {
            throw new Error('Pull request URL is required');
        }
        if (!note || note.trim() === '') {
            throw new Error('Resubmission note is required');
        }

        // Validate wallet connection
        const signer = await window.wallet.getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Get task ID from URL parameters
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        if (!taskId) {
            throw new Error('Task ID not found in URL parameters');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress();

        // Verify user is a task member
        const taskData = await contract.Tasks(taskId);
        if (taskData[4] !== userAddress) {
            throw new Error('You are not a member of this task');
        }

        // Execute task resubmission transaction
        const tx = await contract.reSubmitTask(taskId, note, pullRequestURL, userAddress);
        const receipt = await tx.wait();

        // Parse logs to find TaskReSubmitted event
        let resubmissionConfirmed = false;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'TaskReSubmitted') {
                    resubmissionConfirmed = true;
                    break;
                }
            } catch {
                // Continue checking other logs
            }
        }

        if (!resubmissionConfirmed) {
            throw new Error('Task resubmitted event not found in transaction logs');
        }

        // Show success notification
        Notify.success("Task Resubmitted", "Task resubmitted successfully!");
        
        // Refresh UI data after successful resubmission
        await loadData();
    });
}






























// ==============================
// UI COMPONENT HANDLERS
// ==============================


async function handleSubmitTaskClick() {
        // Get submission template
        const template = document.getElementById('submitTask');
        if (!template) {
            throw new Error('Submit task template not found');
        }

        const clone = template.content.cloneNode(true);
        const container = document.getElementById('OverlayInfo');
        
        if (!container) {
            throw new Error('Overlay container not found');
        }

        container.innerHTML = '';
        container.appendChild(clone);

        // Setup form submission handler
        const submitBtn = container.querySelector('.submit');
        if (!submitBtn) {
            throw new Error('Submit button not found in template');
        }

        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            // Validate form inputs
            const noteInput = container.querySelector('input[name="note"], textarea[name="note"]');
            const gitInput = container.querySelector('input[name="gitURL"]');

            if (!noteInput || !gitInput) {
                throw new Error('Form inputs not found');
            }

            const note = noteInput.value.trim();
            const gitURL = gitInput.value.trim();

            if (!note || !gitURL) {
                throw new Error('Please fill in all fields');
            }

            // Submit task and clear overlay
            await submitTask(gitURL, note);
            container.innerHTML = '';
        });
    };


async function handleApproveTaskClick() {
        // Get task ID from URL parameters
        const params = new URLSearchParams(window.location.search);
        const taskId = Number(params.get('id'));
        if (isNaN(taskId)) {
            throw new Error('Invalid task ID');
        }

        // Get approval template
        const template = document.getElementById('acceptTask');
        if (!template) {
            throw new Error('Accept task template not found');
        }

        const clone = template.content.cloneNode(true);
        const container = document.getElementById('OverlayInfo');
        
        if (!container) {
            throw new Error('Overlay container not found');
        }

        container.innerHTML = '';
        container.appendChild(clone);

        // Load submission data
        const submitData = await getSubmitData(taskId);
        if (!submitData) {
            throw new Error('Submission data not found');
        }

        // Populate UI with submission details
        container.querySelector('.taskId').textContent = taskId;
        container.querySelector('.Note').textContent = submitData.note;

        // Setup accept button handler
        const acceptBtn = container.querySelector('.Accept');
        acceptBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await acceptTask(taskId);
            container.innerHTML = '';
        });

        // Setup revision request form handler
        const form = container.querySelector('form.Revision');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const note = form.querySelector('input[name="note"]')?.value.trim();
            const newDeadline = form.querySelector('input[name="newDeadline"]')?.value.trim();

            if (!note || !newDeadline) {
                throw new Error('Please fill in all fields');
            }

            await requestRevision(taskId, note, newDeadline);
            container.innerHTML = '';
        });
    };


async function getSubmitData(taskId) {
    // This function doesn't need withUI wrapper as it's just a data fetcher
    // Validate wallet connection
    const signer = await window.wallet.getSigner();
    if (!signer) {
        throw new Error('Wallet not connected');
    }

    // Initialize contract and fetch submission data
    const contract = await getContract(signer);
    const data = await contract.TaskSubmits(taskId);

    return {
        note: data.note ?? data[2] ?? '',
        status: data.status ?? data[3] ?? 0,
        deadline: data.deadline ?? data[5] ?? 0,
    };
}

// Auto-initialize when this module is loaded directly in the page
// (SPA router may call `init()` itself; this only ensures standalone pages work)
if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", () => {
            init().catch(e => console.error("taskDetail init error:", e));
        });
    } else {
        init().catch(e => console.error("taskDetail init error:", e));
    }
}