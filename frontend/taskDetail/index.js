import { modal } from "../global/connectwallet.js";
import { ethers, BrowserProvider } from "ethers";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";
import {
  _getMinDeadline,
  _getMaxRevisionTime,
  _getMaxReward,
  isRegistered,
  _calculatePoint,
  _hasRequestedJoin,
  _rejectAllPendingExcept,
  _rejectAllPending,
  _isEnoughDeadline
} from "../global/helper.js";
import { withUI } from "../global-Ux/loading-ui.js";

// ==============================
// STATE
// ==============================
let provider = null;
let iface = null;
let walletWatcherInterval = null;
let lastAddress = null;
let eventListeners = []; // Track event listeners for cleanup
let pageActive = null;
let cachedABI = null;
let lastLoadedAddress = null;
let lastJoinRequestsCache = null;
const WALLET_SESSION_KEY = 'active_wallet_address';


const ARTIFACT_PATH = "/artifact/TrustlessTeamProtocol.json";

// ==============================
// INIT / DESTROY
// ==============================
export async function init() {
  console.log("📦 task detail page init");
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
    if (!pageActive) return;

    try {
      const signer = await getSigner();

      // WALLET DISCONNECTED
      if (!signer) {
        if (lastLoadedAddress !== null) {
          lastLoadedAddress = null;
          sessionStorage.removeItem(WALLET_SESSION_KEY);
          resetJoinRequestUI();
          console.log('Wallet disconnected, UI reset');
        }
        return;
      }

      const addr = (await signer.getAddress()).toLowerCase();
      const storedAddr = sessionStorage.getItem(WALLET_SESSION_KEY);

      // WALLET FIRST CONNECT / CHANGED
      if (!storedAddr || storedAddr !== addr) {
        sessionStorage.setItem(WALLET_SESSION_KEY, addr);
        console.log('Wallet changed, refreshing page:', addr);

        // HARD RELOAD PAGE
        location.reload();
        return;
      }

      if (addr !== lastLoadedAddress) {
        lastLoadedAddress = addr;
        await loadData(addr);
        console.log('Wallet loaded:', addr);
      }

    } catch (e) {
      if (lastLoadedAddress !== null) {
        lastLoadedAddress = null;
        sessionStorage.removeItem(WALLET_SESSION_KEY);
        resetJoinRequestUI();
        console.log('Wallet error, UI reset');
      }
    }
  }, 800);
}


// ==============================
// CONTRACT HELPERS
// ==============================
async function loadABI() {
  if (cachedABI) return cachedABI;
  const res = await fetch(ARTIFACT_PATH);
  cachedABI = await res.json();
  iface = new ethers.Interface(cachedABI.abi);
  return cachedABI;
}

async function getContract(signer) {
  const artifact = await loadABI();
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}




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
        loadAllJoinRequestData();
        show(btn.closeReg);
    }

    if (isCreator && status === 4) {
        loadSubmitData();
        show(btn.requestRev);
        show(btn.approve);
        show(btn.cancel);
    }

    // Member rules
    if (isMember && status === 3) {
        loadUserJoinRequestData(userAddress);
        show(btn.join);
        show(btn.WithdrawJoinReq);
    }

    if (isMember && status === 4) {
        renderTaskSubmit();
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
    showText(card, ".SubmitStatus", decodeSubmitStatus(await loadSubmitStatus()));
    const status = await loadSubmitStatus();
    if (status === 2n) {
        alert("Revision needed in task");
    }

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
        const signer = await getSigner();
        if (!signer) return;

        const address = await signer.getAddress(); // FIX: Single source of truth

        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        if (!taskId) return;

        const contract = await getContract(signer);
        const task = await contract.Tasks(taskId);
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
    }
}

function decodeJoinStatus(inputEnum) {
    const statusMap = {
        0: "None",
        1: "Requested",
        2: "Accepted",
        3: "Rejected",
        4: "Cancelled"
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



function resetJoinRequestUI() {
  const container = document.getElementById('joinRequestOverlay');
  if (!container) return;

  container.innerHTML = '<p>Wallet not connected.</p>';
}


function RenderJoinRequests(requests) {
  const container = document.getElementById('joinRequestOverlay');
  const template = document.getElementById('JoinRequest');

  // DOM belum ada → JANGAN error
  if (!container || !template) {
    console.warn('JoinRequest DOM not ready, render skipped');
    return;
  }

  container.innerHTML = '';

  if (!Array.isArray(requests) || requests.length === 0) {
    container.innerHTML = '<p>No join requests found.</p>';
    return;
  }

  // Tampilkan semua requests, tanpa filter isPending
  requests.forEach(req => {
    const clone = template.content.cloneNode(true);

    clone.querySelector('.taskId').textContent = req.applicant;
    clone.querySelector('.status').textContent = decodeJoinStatus(req.status);
    clone.querySelector('.pending').textContent = decodeBool(req.isPending);
    clone.querySelector('.stakeAmount').textContent =
      ethers.formatEther(req.stakeAmount);

    container.appendChild(clone);
  });
}




async function loadUserJoinRequestData(address) {
  try {
    const signer = await getSigner();
    if (!signer) throw new Error('Wallet not connected');

    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('id');
    if (!taskId) throw new Error('Task ID not found');

    const contract = await getContract(signer);
    const count = Number(await contract.getJoinRequestCount(taskId));

    const userAddress = address.toLowerCase();
    const requests = [];

    for (let i = 0; i < count; i++) {
      const req = await contract.joinRequests(taskId, i);

      if (req.applicant.toLowerCase() === userAddress) {
        requests.push({
          index: i,
          applicant: req.applicant,
          stakeAmount: req.stakeAmount,
          status: Number(req.status),
          isPending: Boolean(req.isPending),
          hasWithdrawn: Boolean(req.hasWithdrawn)
        });
      }
    }

    if (!document.getElementById('joinRequestOverlay')) {
  console.warn('JoinRequest page not active, skip load');
  return [];
}


lastJoinRequestsCache = requests;
RenderJoinRequests(requests);
return requests;


  } catch (e) {
    console.error('load User Join Request Data error:', e);
    return [];
  }
}

function RenderAllJoinRequests(requests) {
  const container = document.getElementById('joinRequestOverlay');
  const template = document.getElementById('acceptMember');

  // DOM belum ada → JANGAN error
  if (!container || !template) {
    console.warn('JoinRequest DOM not ready, render skipped');
    return;
  }
 
  container.innerHTML = '';

  
  if (!Array.isArray(requests) || requests.length === 0) {
    container.innerHTML = '<p>No pending join requests.</p>';
    return;
  }

  const pendingRequests = requests.filter(req => req.isPending);

  if (pendingRequests.length === 0) {
    container.innerHTML = '<p>No pending join requests.</p>';
    return;
  }

  pendingRequests.forEach(req => {
    const clone = template.content.cloneNode(true);

    clone.querySelector('.taskId').textContent = req.applicant;
    clone.querySelector('.Points').textContent = req.reputation;
    clone.querySelector(".Accept")?.addEventListener("click", () => {
      acceptMember(req.id, req.applicant);
    });
     clone.querySelector(".Reject")?.addEventListener("click", () => {
      rejectMember(req.id, req.applicant);
    });

    console.log(req.applicant, req.id)

    container.appendChild(clone);
  });
}



async function loadAllJoinRequestData() {
  try {
    const signer = await getSigner();
    if (!signer) throw new Error('Wallet not connected');

    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('id');
    if (!taskId) throw new Error('Task ID not found');

    const contract = await getContract(signer);
    const count = Number(await contract.getJoinRequestCount(taskId));

    const requests = [];

    //isPending
    for (let i = 0; i < count; i++) {
      const req = await contract.joinRequests(taskId, i);

        const rep = await contract.Users(req.applicant)
        requests.push({
          index: i,
          applicant: req.applicant,
          isPending: req.isPending,
          reputation: rep.reputation,
          id: taskId
        });
    }

    console.log(requests); //data keluar

    if (!document.getElementById('joinRequestOverlay')) {
        console.warn('JoinRequest page not active, skip load');
        return;
    }
RenderAllJoinRequests(requests);
return requests;


  } catch (e) {
    console.error('load User Join Request Data error:', e);
    return [];
  }
}


async function loadSubmitStatus() {
  try {
    const signer = await getSigner();
    if (!signer) throw new Error('Wallet not connected');

    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('id');
    if (!taskId) throw new Error('Task ID not found');

    const contract = await getContract(signer);

    const ts = await contract.TaskSubmits(taskId);
    return ts.status;

  } catch (e) {
    console.error('load Submit Status error:', e);
  }
}






/*

function RenderSubmitData(requests, taskId) {
  const container = document.getElementById('joinRequestOverlay');
  const template = document.getElementById('SubmitStatus');

  // DOM belum ada → JANGAN error
  if (!container || !template) {
    console.warn('JoinRequest DOM not ready, render skipped');
    return;
  }

  container.innerHTML = '';

  if (!Array.isArray(requests) || requests.length === 0) {
    container.innerHTML = '<p>No task submit yet.</p>';
    return;
  }

  // Tampilkan semua requests
  requests.forEach(req => {
    const clone = template.content.cloneNode(true);

    // Set konten
    clone.querySelector('.gitURL').textContent = req.github;
    clone.querySelector('.note').textContent = req.Note;

    // Event tombol Accept
    const btnAccept = clone.querySelector('.Accept');
    btnAccept.addEventListener('click', () => {
       acceptTask(taskId);  //harusnya pakai await
    });

    // Event form Revision
    const revisionForm = clone.querySelector('.Revision');
    revisionForm.addEventListener('submit', e => {
      e.preventDefault();
      const note = revisionForm.note.value.trim();
      const newDeadline = revisionForm.newDeadline.value.trim();
      requestRevision(taskId, note, newDeadline); //harusnya pakai await
    });

    container.appendChild(clone);
  });
}*/

function RenderSubmitData(requests, taskId) {
  const container = document.getElementById('joinRequestOverlay');
  const template = document.getElementById('SubmitStatus');

  if (!container || !template) {
    console.warn('JoinRequest DOM not ready, render skipped');
    return;
  }

  container.innerHTML = '';

  if (!Array.isArray(requests) || requests.length === 0) {
    container.innerHTML = '<p>No task submit yet.</p>';
    return;
  }

  requests.forEach(req => {
    const clone = template.content.cloneNode(true);

    // Set konten
    clone.querySelector('.gitURL').textContent = req.github;
    clone.querySelector('.note').textContent = req.Note;

    // Event tombol Accept
    const btnAccept = clone.querySelector('.Accept');
    btnAccept.addEventListener('click', async () => {
      try {
        btnAccept.disabled = true; // disable tombol sementara menunggu
        await acceptTask(taskId);
        btnAccept.textContent = 'Accepted';
      } catch (err) {
        console.error('Accept task failed', err);
        btnAccept.disabled = false;
      }
    });

    // Event form Revision
    const revisionForm = clone.querySelector('.Revision');
    revisionForm.addEventListener('submit', async e => {
      e.preventDefault();
      const note = revisionForm.note.value.trim();
      const newDeadline = revisionForm.newDeadline.value.trim();
      try {
        await requestRevision(taskId, note, newDeadline);
        revisionForm.querySelector('button[type="submit"]').textContent = 'Sent';
      } catch (err) {
        console.error('Revision request failed', err);
      }
    });

    container.appendChild(clone);
  });
}



async function loadSubmitData() {
  try {
    const signer = await getSigner();
    if (!signer) throw new Error('Wallet not connected');

    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('id');
    if (!taskId) throw new Error('Task ID not found');

    const contract = await getContract(signer);

    const taskSubmit = [];

    const ts = await contract.TaskSubmits(taskId);
    
    taskSubmit.push({
          Sender: ts.sender,
          Note: ts.note,
          RevTime: ts.revisionTime,
          NewDeadline: ts.newDeadline,
          github: ts.githubURL
        });

        console.log(taskSubmit);
         if (!document.getElementById('joinRequestOverlay')) {
        console.warn('Submit page not active, skip load');
        return;
    }
        RenderSubmitData(taskSubmit, taskId);

  } catch (e) {
    console.error('loadSubmitData error:', e);
  }
}





function isValidGithubPRURL(prURL) {
  try {
    const url = new URL(prURL);

    // Pastikan hostname GitHub
    if (url.hostname !== "github.com") return false;

    const parts = url.pathname.split("/").filter(Boolean);

    // Format PR: github.com/username/repo/pull/number
    if (parts.length !== 4) return false;
    if (parts[2] !== "pull") return false;
    if (isNaN(parts[3])) return false;

    return true;
  } catch (e) {
    return false;
  }
}


function renderTaskSubmit() {
    console.log("renderafasfafa")
    const template = document.getElementById('submitTask');
    const clone = template.content.cloneNode(true);

    const form = clone.querySelector('.Revision');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const note = form.note.value.trim();
        const gitURL = form.gitURL.value.trim();

        return withUI(async () => {
            console.log("triggered");
            const status = await loadSubmitStatus();

            if (status === 1n) {
                throw new Error("Invalid status for submision");
            } 

            if (status === 3n) {
                throw new Error("Invalid status for submision");
            } 
    
            if (status === 0n) {
                await submitTask(gitURL, note);

            } else if (status === 2n) {
                await reSubmitTask(gitURL, note);
            }
        });
    });

    const container = document.getElementById('joinRequestOverlay');
    container.appendChild(clone);
}






























// ==============================
// TASK ACTION HANDLERS
// ==============================

async function handleActivateTask() {
    return withUI(async () => {
        // Validate wallet connection
        // FIX: Get wallet provider from modal
        const walletProvider = modal?.getWalletProvider();
        if (!walletProvider) {
            throw new Error('Wallet not connected');
        }
        
        const provider = new ethers.BrowserProvider(walletProvider); // FIX: Use BrowserProvider
        const signer = await provider.getSigner();
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
        const userAddress = await signer.getAddress(); // FIX: Single source of truth

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
        const balance = await provider.getBalance(userAddress); // FIX: Use provider from above

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
        // FIX: Get wallet provider from modal
        const walletProvider = modal?.getWalletProvider();
        if (!walletProvider) {
            throw new Error('Wallet not connected');
        }
        
        const provider = new ethers.BrowserProvider(walletProvider); // FIX: Use BrowserProvider
        const signer = await provider.getSigner();
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
        const userAddress = await signer.getAddress(); // FIX: Single source of truth

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
        // FIX: Get wallet provider from modal
        const walletProvider = modal?.getWalletProvider();
        if (!walletProvider) {
            throw new Error('Wallet not connected');
        }
        
        const provider = new ethers.BrowserProvider(walletProvider); // FIX: Use BrowserProvider
        const signer = await provider.getSigner();
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
        const userAddress = await signer.getAddress(); // FIX: Single source of truth

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
        // FIX: Get wallet provider from modal
        const walletProvider = modal?.getWalletProvider();
        if (!walletProvider) {
            throw new Error('Wallet not connected');
        }
        
        const provider = new ethers.BrowserProvider(walletProvider); // FIX: Use BrowserProvider
        const signer = await provider.getSigner();
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
        const userAddress = await signer.getAddress(); // FIX: Single source of truth
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
        // FIX: Get wallet provider from modal
        const walletProvider = modal?.getWalletProvider();
        if (!walletProvider) {
            throw new Error('Wallet not connected');
        }
        
        const provider = new ethers.BrowserProvider(walletProvider); // FIX: Use BrowserProvider
        const signer = await provider.getSigner();
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
        const userAddress = await signer.getAddress(); // FIX: Single source of truth

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
        // FIX: Get wallet provider from modal
        const walletProvider = modal?.getWalletProvider();
        if (!walletProvider) {
            throw new Error('Wallet not connected');
        }
        
        const provider = new ethers.BrowserProvider(walletProvider); // FIX: Use BrowserProvider
        const signer = await provider.getSigner();
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
        const address = await signer.getAddress(); // FIX: Single source of truth
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress(); // FIX: Single source of truth
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
        location.reload();
    });
}













function handleEthersError(err) {
    console.error(err);

    // ethers v6 CALL_EXCEPTION
    if (err.code === 'CALL_EXCEPTION') {
        // User rejected transaction
        if (err.shortMessage?.includes('user rejected')) {
            throw new Error('Transaction rejected by user');
        }

        // Missing revert data
        if (
            err.shortMessage?.includes('missing revert data') ||
            err.message?.includes('missing revert data')
        ) {
            throw new Error('You do not have join request alredy');
        }

        // Custom revert reason (if exists)
        if (err.reason) {
            throw new Error(err.reason);
        }

        throw new Error('Transaction reverted by smart contract');
    }

    // Fallback
    throw new Error(err.message || 'Unknown blockchain error');
}



async function handleWithdrawJoin() {
    return withUI(async () => {
        // Validate wallet connection
        // FIX: Get wallet provider from modal
        const walletProvider = modal?.getWalletProvider();
        if (!walletProvider) {
            throw new Error('Wallet not connected');
        }
        
        const provider = new ethers.BrowserProvider(walletProvider); // FIX: Use BrowserProvider
        const signer = await provider.getSigner();
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
        const userAddress = await signer.getAddress(); // FIX: Single source of truth
        /*
        const Result = await _hasRequestedJoin(contract, taskId, userAddress);

        if (!Result) {
        throw new Error('You do not have join request alredy');
        }*/

        const result = await isRegistered(contract, userAddress);
        const { isRegistered: registered, message } = result;

        if (!registered) {
        throw new Error(message);
        }

        let receipt;
try {
    const tx = await contract.withdrawJoinRequest(taskId, userAddress);
    receipt = await tx.wait();
} catch (err) {
    handleEthersError(err);
}


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
        location.reload();
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

        const signer = await getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress(); // FIX: Single source of truth
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
        location.reload();
    });
}

async function rejectMember(taskId, applicant) {
    return withUI(async () => {
        // Validate task ID
        if (!taskId) {
            throw new Error('Task ID is required');
        }

        const signer = await getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress(); // FIX: Single source of truth

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
        location.reload();
    });
}

async function acceptTask(taskId) {
    return withUI(async () => {
       
        const signer = await getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const userAddress = await signer.getAddress(); // FIX: Single source of truth

        // Verify user is the task owner
        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== userAddress) {
            throw new Error('You are not the task owner');
        }

        // Execute task approval transaction
        const tx = await contract.approveTask(taskId);
        const receipt = await tx.wait();

        // Show success notification
        Notify.success("Task Approved", "Task approved successfully!");
        
        // Refresh UI data after successful approval
        await loadData();
    });
}

async function requestRevision(taskId, note, additionalDeadlineHours) {
    return withUI(async () => {

        const signer = await getSigner();
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        // Initialize contract and get user address
        const contract = await getContract(signer);
        const minDeadline = await _getMinDeadline(signer);
        const deadline = BigInt(additionalDeadlineHours);

        if (deadline < minDeadline) {
            throw new Error(
        `New deadline is too short, minimum allowed is ${minDeadline}.`
      );
            
        }

        // Execute revision request transaction
        const tx = await contract.requestRevision(taskId, note, additionalDeadlineHours);
        const receipt = await tx.wait();


        // Show success notification
        Notify.success("Revision Requested", "Revision requested successfully!");
        
        // Refresh UI data after successful revision request
        await loadData();
    });
}







































async function submitTask(pullRequestURL, note) {
    return withUI(async () => {
        // Validate inputs
        /*
        const validate = isValidGithubPRURL(pullRequestURL);

            if (!validate) {
                throw new Error("Invalid github pull request url.");
            }*/

        const signer = await getSigner();
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
        const userAddress = await signer.getAddress(); // FIX: Single source of truth

        // Verify user is a task member
        const taskData = await contract.Tasks(taskId);
        if (taskData[4] !== userAddress) {
            throw new Error('You are not a member of this task');
        }

        // Execute task submission transaction
        const tx = await contract.requestSubmitTask(taskId, pullRequestURL, note, userAddress);
        const receipt = await tx.wait();

        // Show success notification
        Notify.success("Task Submitted", "Task submitted successfully!");
        
        // Refresh UI data after successful submission
        await loadData();
        location.reload();
    });
}

async function reSubmitTask(pullRequestURL, note) {
    return withUI(async () => {
        // Validate inputs
        /*
     const validate = isValidGithubPRURL(pullRequestURL);

            if (!validate) {
                throw new Error("Invalid github pull request url.");
            }*/

        const signer = await getSigner();
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
        const userAddress = await signer.getAddress(); // FIX: Single source of truth

        // Verify user is a task member
        const taskData = await contract.Tasks(taskId);
        if (taskData[4] !== userAddress) {
            throw new Error('You are not a member of this task');
        }

        // Execute task resubmission transaction
        const tx = await contract.reSubmitTask(taskId, note, pullRequestURL, userAddress);
        const receipt = await tx.wait();

        // Show success notification
        Notify.success("Task Resubmitted", "Task resubmitted successfully!");
        
        // Refresh UI data after successful resubmission
        await loadData();
        location.reload();
    });
}



