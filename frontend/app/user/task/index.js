import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";

// ==============================
// MODULE STATE
// ==============================

// Persistent module state (re-initialized per page instance)
let provider = null;
let iface = null;
let walletWatcherInterval = null;
let lastAddress = null;

// Task data arrays
let createdTasks = [];
let joinedTasks = [];

// Event listener references for cleanup
let eventListeners = [];

// Configuration
const ARTIFACT_PATH = "../artifact/TrustlessTeamProtocol.json";

// ==============================
// INITIALIZATION / DESTRUCTION
// ==============================

/**
 * Initialize the projects page
 * Called by SPA router when this page becomes active
 */
export async function init() {
    console.log("📦 projects page initializing");
    
    // Initialize provider (Ethereum connection)
    provider = new ethers.JsonRpcProvider(
        "https://eth-sepolia.g.alchemy.com/v2/cka4F66cHyvFHccHvsdTpjUni9t3NDYR"
    );
    
    // Load contract interface for event parsing
    const artifact = await loadABI(ARTIFACT_PATH);
    iface = new ethers.Interface(artifact.abi);
    
    // Set up all UI event listeners
    setupEventListeners();
    
    // Start monitoring for wallet connections
    setupWalletWatcher();
    
    // Load initial data if wallet is already connected
    if (window.wallet?.currentAddress) {
        await waitSignerAndRun();
    }
}

/**
 * Clean up all resources when leaving the page
 * Called by SPA router before page removal
 */
export function destroy() {
    console.log("🧹 projects page cleaning up");
    
    // Stop wallet monitoring
    if (walletWatcherInterval) {
        clearInterval(walletWatcherInterval);
        walletWatcherInterval = null;
    }
    
    // Remove all event listeners
    eventListeners.forEach(({ element, event, handler }) => {
        element?.removeEventListener(event, handler);
    });
    eventListeners = [];
    
    // Clear state
    lastAddress = null;
    createdTasks = [];
    joinedTasks = [];
    
    console.log("✅ projects page cleanup complete");
}

// ==============================
// EVENT LISTENER MANAGEMENT
// ==============================

/**
 * Helper to add tracked event listeners for proper cleanup
 */
function addEventListener(element, event, handler) {
    if (!element) return;
    element.addEventListener(event, handler);
    eventListeners.push({ element, event, handler });
}

/**
 * Set up all page event listeners
 * Called during initialization
 */
function setupEventListeners() {
    // Search and filter for created tasks
    const searchActive = document.getElementById("searchActive");
    const filterActive = document.getElementById("filterActive");
    
    if (searchActive) {
        addEventListener(searchActive, "input", () => {
            const query = searchActive.value.toLowerCase();
            const filtered = createdTasks.filter(t => 
                t.title.toLowerCase().includes(query)
            );
            renderCreatedTasks(filtered);
        });
    }
    
    if (filterActive) {
        addEventListener(filterActive, "change", (e) => {
            let sorted = [...createdTasks];
            if (e.target.value === "newest") {
                sorted.reverse();
            } else if (e.target.value === "oldest") {
                sorted.sort((a, b) => a.order - b.order);
            }
            renderCreatedTasks(sorted);
        });
    }
    
    // Search and filter for joined tasks
    const searchInactive = document.getElementById("searchInactive");
    const filterInactive = document.getElementById("filterInactive");
    
    if (searchInactive) {
        addEventListener(searchInactive, "input", () => {
            const query = searchInactive.value.toLowerCase();
            const filtered = joinedTasks.filter(t => 
                t.title.toLowerCase().includes(query)
            );
            renderJoinedTasks(filtered);
        });
    }
    
    if (filterInactive) {
        addEventListener(filterInactive, "change", (e) => {
            let sorted = [...joinedTasks];
            if (e.target.value === "newest") {
                sorted.reverse();
            } else if (e.target.value === "oldest") {
                sorted.sort((a, b) => a.order - b.order);
            }
            renderJoinedTasks(sorted);
        });
    }
    
    // Test button (for debugging)
    const testBtn = document.getElementById("test");
    if (testBtn) {
        addEventListener(testBtn, "click", async () => {
            try {
                const signer = await window.wallet.getSigner();
                if (!signer) {
                    alert("No signer available. Please connect wallet.");
                    return;
                }
                const contract = await getContract(signer);
                const data = await contract.Tasks(1);
                console.log(data);
                await loadCreatedTasks();
                await loadJoinedTasks();
            } catch (e) {
                console.error(e);
            }
        });
    }
    
    // Task creation form
    const taskForm = document.querySelector(".taskForm");
    if (taskForm) {
        addEventListener(taskForm, "submit", handleTaskFormSubmit);
    }
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
// WALLET CONNECTION MANAGEMENT
// ==============================

/**
 * Set up interval to watch for wallet connection changes
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
    
    // Poll until signer is available
    while (!signer) {
        signer = await window.wallet.getSigner();
        if (!signer) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    // Load both task lists
    await loadCreatedTasks();
    await loadJoinedTasks();
}

// ==============================
// TASK DATA LOADING
// ==============================

/**
 * Load tasks created by the current user
 */
async function loadCreatedTasks() {
    try {
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

    } catch (error) {
        console.error("Failed to load created tasks:", error);
        alert("Team Chain: Failed to load created tasks.");
    }
}

/**
 * Load tasks the current user has joined
 */
async function loadJoinedTasks() {
    try {
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

    } catch (error) {
        console.error("Failed to load joined tasks:", error);
        alert("Team Chain: Failed to load joined tasks.");
    }
}

// ==============================
// UI RENDERING
// ==============================

/**
 * Decode task status number to human-readable string
 */
function decodeStatus(status) {
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
 * Render created tasks to the UI
 */
function renderCreatedTasks(tasks) {
    const container = document.getElementById("activeList");
    const template = document.getElementById("taskCardTemplate");

    if (!container || !template) return;
    
    container.innerHTML = "";

    tasks.forEach(task => {
        const clone = template.content.cloneNode(true);
        
        clone.querySelector(".taskId").textContent = task.id;
        clone.querySelector(".title").textContent = task.title;
        clone.querySelector(".status").textContent = decodeStatus(task.status);

        const detailsBtn = clone.querySelector(".detailsBTN");
        if (detailsBtn) {
            // Use addEventListener for proper cleanup in SPA context
            detailsBtn.addEventListener("click", () => {
                window.location.href = `taskDetail.html?id=${task.id}`;
            });
        }

        container.appendChild(clone);
    });
}

/**
 * Render joined tasks to the UI
 */
function renderJoinedTasks(tasks) {
    const container = document.getElementById("JoinedList");
    const template = document.getElementById("JtaskCardTemplate");

    if (!container || !template) return;
    
    container.innerHTML = "";

    tasks.forEach(task => {
        const clone = template.content.cloneNode(true);
        
        clone.querySelector(".taskId").textContent = task.id;
        clone.querySelector(".title").textContent = task.title;
        clone.querySelector(".status").textContent = decodeStatus(task.status);

        const detailsBtn = clone.querySelector(".JdetailsBTN");
        if (detailsBtn) {
            // Use addEventListener for proper cleanup in SPA context
            detailsBtn.addEventListener("click", () => {
                window.location.href = `taskDetail.html?id=${task.id}`;
            });
        }

        container.appendChild(clone);
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

    try {
        const signer = await window.wallet.getSigner();
        if (!signer) {
            alert("No signer available. Please connect wallet.");
            return;
        }

        // Get form values
        const title = e.target.title.value.trim();
        const githubUrl = e.target.github.value.trim();
        const deadlineHours = Number(e.target.deadlineHours.value);
        const maxRevision = Number(e.target.maxRevision.value);
        const rewardInput = e.target.reward.value.trim();

        // Validate GitHub URL
        if (!validateGithubIssueUrl(githubUrl)) {
            alert("Team Chain: Invalid GitHub Issue URL.");
            return;
        }

        // Validate numeric inputs
        if (isNaN(deadlineHours) || deadlineHours <= 0) {
            alert("Team Chain: Deadline must be a positive number.");
            return;
        }

        if (isNaN(maxRevision) || maxRevision < 0) {
            alert("Team Chain: Max revision must be a non-negative number.");
            return;
        }

        // Convert reward to Wei
        const rewardUnit = document.getElementById("rewardUnit")?.value || "eth";
        let rewardWei;

        if (isNaN(rewardInput) || Number(rewardInput) <= 0) {
            alert("Team Chain: Invalid reward amount.");
            return;
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
        const isRegistered = await contract.isRegistered(addr);

        if (!isRegistered) {
            alert("Team Chain: You are not registered.");
            return;
        }

        // Check user balance
        const balance = await provider.getBalance(addr);
        if (balance < rewardWei) {
            alert(`Team Chain: Insufficient balance\nYour balance: ${ethers.formatEther(balance)} ETH\nReward: ${ethers.formatEther(rewardWei)} ETH`);
            return;
        }

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
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === "TaskCreated") {
                    console.log("📌 EVENT Task Created!");
                    alert(`✔ Team Chain: Task Created Successfully!`);
                    
                    // Refresh task lists
                    await loadCreatedTasks();
                    await loadJoinedTasks();
                    
                    // Clear form
                    e.target.reset();
                }
            } catch (error) {
                console.error("Error parsing log:", error);
            }
        }

    } catch (err) {
        console.error("Task creation error:", err);
        alert("Team Chain: An error occurred while creating the task.");
    }
}

// ==============================
// ERROR HANDLING (PLACEHOLDER)
// ==============================

/**
 * Decode error selector from transaction error
 * Note: selectorMap needs to be defined based on contract errors
 */
function decodeErrorSelector(err) {
    console.log("RAW ERROR:", err);

    const data =
        err?.data ||
        err?.error?.data ||
        err?.info?.error?.data ||
        err?.cause?.data ||
        null;

    if (!data || data.length < 10) {
        console.log("No selector found");
        return null;
    }

    const selector = data.slice(0, 10);
    console.log("Selector:", selector);

    // This needs to be populated with actual contract error selectors
    const selectorMap = {};
    const errorName = selectorMap[selector] || null;
    console.log("Decoded errorName:", errorName);

    return errorName;
}