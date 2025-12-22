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
                console.log("afagegagag")
                //await loadData();
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