import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";

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
const ARTIFACT_PATH = "../artifact/TrustlessTeamProtocol.json";

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
    
    // Accept join request button
    const acceptJoinBtn = document.querySelector(".AcceptJoin");
    if (acceptJoinBtn) {
        addEventListener(acceptJoinBtn, "click", handleAcceptJoinClick);
    }
    
    // Submit task button
    const submitTaskBtn = document.querySelector(".submitTask");
    if (submitTaskBtn) {
        addEventListener(submitTaskBtn, "click", handleSubmitTaskClick);
    }
    
    // Approve task button
    const approveTaskBtn = document.querySelector(".ApproveTask");
    if (approveTaskBtn) {
        addEventListener(approveTaskBtn, "click", handleApproveTaskClick);
    }
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
        acceptMember: card.querySelector(".AcceptJoin"),
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
    const member = task[4];

    const isCreator = creator === userAddress;
    const isMember = member === userAddress;

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
        show(btn.acceptMember);
        show(btn.closeReg);
    }

    if (isCreator && status === 4) {
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
async function showTaskData(task) {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const address = await signer.getAddress();
    const card = document.querySelector(".task-card");
    if (!card) return;

    // Basic task info
    showText(card, ".taskId", task[0]?.toString());
    showText(card, ".status", await decodeStatus(Number(task[1])));
    showText(card, ".value", Number(task[2]));
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

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) return;

        const contract = await getContract(signer);
        const task = await contract.Tasks(id);
        
        await showTaskData(task);

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

// ==============================
// TASK ACTION HANDLERS
// ==============================

async function handleActivateTask() {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const taskData = await contract.Tasks(id);
        const deadlineHours = Number(taskData[8]);
        const maxRevision = Number(taskData[13]);
        const reward = taskData[7];
        const creatorAddress = taskData[3];

        const requiredStake = await contract.__getCreatorStake(
            deadlineHours,
            maxRevision,
            reward,
            creatorAddress
        );
        const balance = await provider.getBalance(addr);

        if (requiredStake > balance) {
            alert(`Team Chain: Insufficient balance\nYour balance: ${ethers.formatEther(balance)} ETH\nRequired: ${ethers.formatEther(requiredStake)} ETH`);
            return;
        }

        const tx = await contract.activateTask(id, { value: requiredStake });
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "TaskActive") {
                    alert('Team Chain: Task Activated Successfully');
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Activate task error:", err);
        alert("Team Chain: Failed to activate task");
    }
}

async function handleDeleteTask() {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const taskData = await contract.Tasks(id);
        if (taskData[3] !== addr) {
            alert("Team Chain: You are not the task owner");
            return;
        }

        const tx = await contract.deleteTask(id, addr);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "TaskDeleted") {
                    alert(`✔ Team Chain: Task Deleted Successfully!`);
                }
            } catch {}
        }
    } catch (err) {
        console.error("Delete task error:", err);
        alert("Team Chain: Failed to delete task");
    }
}

async function handleOpenRegistration() {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const taskData = await contract.Tasks(id);
        if (taskData[3] !== addr) {
            alert("Team Chain: You are not the task owner");
            return;
        }

        const tx = await contract.openRegistration(id);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "RegistrationOpened") {
                    alert(`✔ Team Chain: Task Registration Opened Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Open registration error:", err);
        alert("Team Chain: Failed to open registration");
    }
}

async function handleCloseRegistration() {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const taskData = await contract.Tasks(id);
        if (taskData[3] !== addr) {
            alert("Team Chain: You are not the task owner");
            return;
        }

        const tx = await contract.closeRegistration(id);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "RegistrationClosed") {
                    alert(`✔ Team Chain: Task Registration Closed Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Close registration error:", err);
        alert("Team Chain: Failed to close registration");
    }
}

async function handleCancelTask() {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const tx = await contract.cancelByMe(id, addr);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "TaskCancelledByMe") {
                    alert(`✔ Team Chain: Task Cancelled Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Cancel task error:", err);
        alert("Team Chain: Failed to cancel task");
    }
}

async function handleJoinTask() {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const contract = await getContract(signer);
        const requiredStake = await contract.getMemberRequiredStake(id);
        const addr = await signer.getAddress();

        const taskData = await contract.Tasks(id);
        if (taskData[4] === addr) {
            alert("Team Chain: You are already a member");
            return;
        }

        const tx = await contract.requestJoinTask(id, addr, { value: requiredStake });
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "JoinRequested") {
                    alert(`✔ Team Chain: Join Request Submitted Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Join task error:", err);
        alert("Team Chain: Failed to join task");
    }
}

async function handleWithdrawJoin() {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const tx = await contract.withdrawJoinRequest(id, addr);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "JoinRequestCancelled") {
                    alert(`✔ Team Chain: Join Request Withdrawn Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Withdraw join error:", err);
        alert("Team Chain: Failed to withdraw join request");
    }
}

// ==============================
// CONTRACT WRAPPER FUNCTIONS
// ==============================

async function acceptMember(taskId) {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== addr) {
            alert("Team Chain: You are not the task owner");
            return;
        }

        const tx = await contract.approveJoinRequest(taskId);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "JoinApproved") {
                    alert(`✔ Team Chain: Member Accepted Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Accept member error:", err);
        alert("Team Chain: Failed to accept member");
    }
}

async function rejectMember(taskId) {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const memberData = await contract.getJoinRequests(taskId);
        const taskData = await contract.Tasks(taskId);

        if (taskData[3] !== addr) {
            alert("Team Chain: You are not the task owner");
            return;
        }

        const tx = await contract.rejectJoinRequest(taskId, memberData[0].applicant);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "JoinRejected") {
                    alert(`✔ Team Chain: Member Rejected Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Reject member error:", err);
        alert("Team Chain: Failed to reject member");
    }
}

async function acceptTask(taskId) {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== addr) {
            alert("Team Chain: You are not the task owner");
            return;
        }

        // Get the latest submission
        const submitData = await contract.TaskSubmits(taskId);
        const submitId = submitData.submissionId || submitData[0];

        const tx = await contract.approveTask(taskId, submitId);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "TaskApproved") {
                    alert(`✔ Team Chain: Task Approved Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Accept task error:", err);
        alert("Team Chain: Failed to accept task");
    }
}

async function requestRevision(taskId, note, additionalDeadlineHours) {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const taskData = await contract.Tasks(taskId);
        if (taskData[3] !== addr) {
            alert("Team Chain: You are not the task owner");
            return;
        }

        const tx = await contract.requestRevision(taskId, note, additionalDeadlineHours);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "RevisionRequested") {
                    alert(`✔ Team Chain: Revision Requested Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Request revision error:", err);
        alert("Team Chain: Failed to request revision");
    }
}

async function submitTask(pullRequestURL, note) {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const taskData = await contract.Tasks(taskId);
        if (taskData[4] !== addr) {
            alert("Team Chain: You are not a member of this task");
            return;
        }

        const tx = await contract.requestSubmitTask(taskId, pullRequestURL, note, addr);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "TaskSubmitted") {
                    alert(`✔ Team Chain: Task Submitted Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Submit task error:", err);
        alert("Team Chain: Failed to submit task");
    }
}

async function reSubmitTask(pullRequestURL, note) {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('id');
        const contract = await getContract(signer);
        const addr = await signer.getAddress();

        const taskData = await contract.Tasks(taskId);
        if (taskData[4] !== addr) {
            alert("Team Chain: You are not a member of this task");
            return;
        }

        const tx = await contract.reSubmitTask(taskId, note, pullRequestURL, addr);
        const receipt = await tx.wait();

        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "TaskReSubmitted") {
                    alert(`✔ Team Chain: Task Resubmitted Successfully!`);
                    await loadData(); // Refresh data
                }
            } catch {}
        }
    } catch (err) {
        console.error("Resubmit task error:", err);
        alert("Team Chain: Failed to resubmit task");
    }
}

// ==============================
// UI COMPONENT HANDLERS
// ==============================

async function handleAcceptJoinClick() {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return;

        const contract = await getContract(signer);
        const params = new URLSearchParams(window.location.search);
        const taskId = Number(params.get("id"));
        
        if (isNaN(taskId)) return;

        const requests = await contract.getJoinRequests(taskId);
        renderJoinRequests(requests, taskId);

    } catch (err) {
        console.error("Load join requests error:", err);
        alert("Team Chain: Failed to load join requests");
    }
}

function renderJoinRequests(requests, taskId) {
    const container = document.getElementById("OverlayInfo");
    const template = document.getElementById("acceptMember");

    if (!container || !template) return;
    container.innerHTML = "";

    if (requests.length === 0 || !requests.some(req => req.isPending)) {
        container.innerHTML = "<p>No pending join requests.</p>";
        return;
    }

    requests.forEach((req) => {
        if (!req.isPending) return;

        const clone = template.content.cloneNode(true);
        clone.querySelector(".title").textContent = "Join Request";
        clone.querySelector(".taskId").textContent = req.applicant;
        clone.querySelector(".Points").textContent = ethers.formatEther(req.stakeAmount);

        clone.querySelector(".Accept").onclick = async () => {
            await acceptMember(taskId);
            container.innerHTML = ""; // Clear overlay after action
        };

        clone.querySelector(".Reject").onclick = async () => {
            await rejectMember(taskId);
            container.innerHTML = ""; // Clear overlay after action
        };

        container.appendChild(clone);
    });
}

async function handleSubmitTaskClick() {
    const template = document.getElementById("submitTask");
    const clone = template.content.cloneNode(true);
    const container = document.getElementById("OverlayInfo");
    
    container.innerHTML = "";
    container.appendChild(clone);

    const submitBtn = container.querySelector(".submit");
    if (!submitBtn) return;

    addEventListener(submitBtn, "click", async (e) => {
        e.preventDefault();

        try {
            const signer = await window.wallet.getSigner();
            if (!signer) {
                alert("No signer available. Please connect wallet.");
                return;
            }

            const params = new URLSearchParams(window.location.search);
            const taskId = Number(params.get("id"));
            if (isNaN(taskId)) {
                alert("Invalid task ID");
                return;
            }

            const noteInput = container.querySelector('input[name="note"], textarea[name="note"]');
            const gitInput = container.querySelector('input[name="gitURL"]');

            if (!noteInput || !gitInput) {
                alert("Form input not found");
                return;
            }

            const note = noteInput.value.trim();
            const gitURL = gitInput.value.trim();

            if (!note || !gitURL) {
                alert("Please fill in all fields");
                return;
            }

            await submitTask(gitURL, note);
            container.innerHTML = ""; // Clear overlay after submission

        } catch (err) {
            console.error("Submit task form error:", err);
            alert("Team Chain: Failed to submit task");
        }
    });
}

async function handleApproveTaskClick() {
    const params = new URLSearchParams(window.location.search);
    const taskId = Number(params.get("id"));
    
    if (isNaN(taskId)) {
        alert("Invalid task ID");
        return;
    }

    const template = document.getElementById("acceptTask");
    const clone = template.content.cloneNode(true);
    const container = document.getElementById("OverlayInfo");
    
    container.innerHTML = "";
    container.appendChild(clone);

    // Load submission data
    const submitData = await getSubmitData(taskId);
    if (!submitData) {
        alert("Submit data not found");
        container.innerHTML = "";
        return;
    }

    container.querySelector(".taskId").textContent = taskId;
    container.querySelector(".Note").textContent = submitData.note;

    // Accept task button
    const acceptBtn = container.querySelector(".Accept");
    addEventListener(acceptBtn, "click", async (e) => {
        e.preventDefault();
        try {
            await acceptTask(taskId);
            container.innerHTML = "";
        } catch (err) {
            console.error("Accept task error:", err);
            alert("Team Chain: Failed to accept task");
        }
    });

    // Revision request form
    const form = container.querySelector("form.Revision");
    addEventListener(form, "submit", async (e) => {
        e.preventDefault();
        
        const note = form.querySelector('input[name="note"]')?.value.trim();
        const newDeadline = form.querySelector('input[name="newDeadline"]')?.value.trim();
        
        if (!note || !newDeadline) {
            alert("Please fill in all fields");
            return;
        }

        try {
            await requestRevision(taskId, note, newDeadline);
            container.innerHTML = "";
        } catch (err) {
            console.error("Request revision error:", err);
            alert("Team Chain: Failed to request revision");
        }
    });
}

async function getSubmitData(taskId) {
    try {
        const signer = await window.wallet.getSigner();
        if (!signer) return null;

        const contract = await getContract(signer);
        const data = await contract.TaskSubmits(taskId);

        return {
            note: data.note ?? data[2] ?? "",
            status: data.status ?? data[3] ?? 0,
            deadline: data.deadline ?? data[5] ?? 0,
        };
    } catch (err) {
        console.error("Get submit data error:", err);
        return null;
    }
}