import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";
import { isRegistered } from "../global/helper.js";
import { withUI } from "../../global-Ux/loading-ui.js";

// ==============================
// STATE
// ==============================
let iface;
let walletWatcher = null;
let lastAddress = null;
let initialized = false;

const ARTIFACT_PATH = "../../artifact/TrustlessTeamProtocol.json";

// ==============================
// INIT / DESTROY
// ==============================
export async function init() {
  if (initialized) return;
  initialized = true;

  console.log("📦 dashboard init");

  await setupInterface();
  setupButtons();
  watchWallet();

  // 🔑 WALLET SUDAH CONNECT SEBELUM PAGE MASUK
  if (window.wallet?.currentAddress) {
    lastAddress = window.wallet.currentAddress;
    await loadData();
  }
}

export function destroy() {
  initialized = false;

  if (walletWatcher) {
    clearInterval(walletWatcher);
    walletWatcher = null;
  }

  lastAddress = null;

  console.log("📦 dashboard destroy");
}

// ==============================
// SETUP
// ==============================
async function setupInterface() {
  const artifact = await loadABI(ARTIFACT_PATH);
  iface = new ethers.Interface(artifact.abi);
}

function setupButtons() {
  document.getElementById("reload")?.addEventListener("click", loadData);
  document.getElementById("withdrawToMe")?.addEventListener("click", withdraw);
  document.getElementById("UnRegister")?.addEventListener("click", unregister);
  document.getElementById("ViewTask")?.addEventListener("click", viewtask);
}

function watchWallet() {
  walletWatcher = setInterval(async () => {
    const addr = window.wallet?.currentAddress;
    if (!addr) return;

    if (addr.toLowerCase() !== lastAddress) {
      lastAddress = addr;
      await loadData();
    }
  }, 300);
}

// ==============================
// CORE LOGIC
// ==============================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

async function loadData() {
  try {
    const signer = await window.wallet?.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);
    const address = await signer.getAddress();

    const { isRegistered: registered } =
      await isRegistered(contract, address);

    if (!registered) {
      throw new Error("User is not registered");
    }

    const user = await contract.Users(address);
    const withdrawable = await contract.withdrawable(address);

    const userData = {
      totalTasksCreated: Number(user.totalTasksCreated),
      totalTasksCompleted: Number(user.totalTasksCompleted),
      totalTasksFailed: Number(user.totalTasksFailed),
      reputation: Number(user.reputation),
      age: Number(user.age),
      name: user.name,
      gitProfile: user.GitProfile
    };

    const withdrawableAmount = ethers.formatEther(withdrawable);

    await renderUserDashboard(userData, withdrawableAmount);

  } catch (err) {
    console.error("loadData error:", err);
  }
}

// ==============================
// UI
// ==============================
async function renderUserDashboard(user, amount) {
  const openTask = await searchOpenTask();

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "-";
  };

  setText("name", user.name);
  setText("age", user.age);
  setText("github", user.gitProfile);
  setText("withdrawable", Number(amount).toFixed(4));
  setText("created", user.totalTasksCreated);
  setText("completed", user.totalTasksCompleted);
  setText("failed", user.totalTasksFailed);
  setText("reputation", user.reputation);
  setText("activeValue", openTask);
}

async function searchOpenTask() {
  const signer = await window.wallet.getSigner();
  if (!signer) return 0;

  const contract = await getContract(signer);
  const address = await signer.getAddress();

  const ActiveTask = 2;
  const taskCount = Number(await contract.taskCounter());
  let total = 0;

  for (let i = 0; i < taskCount; i++) {
    const task = await contract.Tasks(i);
    if (!task.exists) continue;

    if (
      Number(task.status) === ActiveTask ||
      task[3] === address ||
      task[4] === address
    ) {
      total++;
    }
  }

  return total;
}

// ==============================
// ACTIONS
// ==============================
async function withdraw() {
  return withUI(async () => {
    const signer = await window.wallet.getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const addr = await signer.getAddress();
    const contract = await getContract(signer);

    const amount = await contract.withdrawable(addr);
    if (amount <= 0n) {
      throw new Error("Insufficient withdrawable amount");
    }

    const tx = await contract.withdraw(addr);
    await tx.wait();

    Notify.success(
      "Withdrawal Successful",
      "Your funds have been withdrawn."
    );

    // refresh dashboard
    await loadData();
    return true;
  });
}

async function unregister() {
  return withUI(async () => {
    const signer = await window.wallet.getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const addr = await signer.getAddress();
    const contract = await getContract(signer);

    const { isRegistered: registered } =
      await isRegistered(contract, addr);

    if (!registered) {
      throw new Error("User is not registered");
    }

    const tx = await contract.Unregister(addr);
    await tx.wait();

    Notify.success(
      "Unregistered",
      "Your account has been successfully unregistered."
    );

    return true;
  });
}

function viewtask() {
  go("/user/task");
}
