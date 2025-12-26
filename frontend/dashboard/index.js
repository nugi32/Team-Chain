import { modal } from "../global/connectwallet.js";
import { BrowserProvider, ethers } from "ethers";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";
import { isRegistered } from "../global/helper.js";
import { withUI } from "../global-Ux/loading-ui.js";

// ==============================
// STATE
// ==============================
let initialized = false;
let walletWatcher = null;
let lastAddress = null;
let loading = false;
let cachedABI = null;

const ARTIFACT_PATH = "/artifact/TrustlessTeamProtocol.json";

// ==============================
// INIT / DESTROY
// ==============================
export async function init() {
  if (initialized) return;
  initialized = true;

  console.log("📦 dashboard init");

  await setupInterface();
  setupButtons();
  startWalletWatcher(); // cukup ini
}


export function destroy() {
  initialized = false;

  if (walletWatcher) {
    clearInterval(walletWatcher);
    walletWatcher = null;
  }

  lastAddress = null;
  loading = false;

  console.log("📦 dashboard destroy");
}

// ==============================
// SETUP
// ==============================
async function setupInterface() {
  await loadABI(); // preload ABI
}

function setupButtons() {
  document.getElementById("reload")?.addEventListener("click", loadData);
  document.getElementById("withdrawToMe")?.addEventListener("click", withdraw);
  document.getElementById("UnRegister")?.addEventListener("click", unregister);
  document.getElementById("ViewTask")?.addEventListener("click", viewtask);
}

function startWalletWatcher() {
  if (walletWatcher) return;

  walletWatcher = setInterval(async () => {
    try {
      const walletProvider = modal.getWalletProvider();
      if (!walletProvider) return;

      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const addr = (await signer.getAddress()).toLowerCase();

      if (addr !== lastAddress) {
        lastAddress = addr;
        await loadData();
      }
    } catch {
      // wallet belum connect → diam saja
    }
  }, 800);
}


// ==============================
// CORE LOGIC
// ==============================
async function loadABI() {
  if (cachedABI) return cachedABI;
  const res = await fetch(ARTIFACT_PATH);
  cachedABI = await res.json();
  return cachedABI;
}

async function getContract(signer) {
  const artifact = await loadABI();
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

async function getSigner() {
  const walletProvider = modal.getWalletProvider();
  if (!walletProvider) throw new Error("Wallet not connected");

  const provider = new BrowserProvider(walletProvider);
  return provider.getSigner();
}

async function loadData() {
  if (loading) return;
  loading = true;

  try {
    console.log("load dashboard data");

    const signer = await getSigner();
    const address = (await signer.getAddress()).toLowerCase();
    lastAddress = address;

    const contract = await getContract(signer);

    const { isRegistered: registered } =
      await isRegistered(contract, address);

    if (!registered) {
      console.warn("User not registered");
      return;
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
      gitProfile: user.GitProfile,
    };

    const withdrawableAmount = ethers.formatEther(withdrawable);
    await renderUserDashboard(userData, withdrawableAmount);

  } catch (err) {
    console.error("loadData error:", err);
  } finally {
    loading = false;
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
  try {
    const signer = await getSigner();
    const contract = await getContract(signer);
    const address = (await signer.getAddress()).toLowerCase();

    const ACTIVE = 2;
    const taskCount = Number(await contract.taskCounter());
    let total = 0;

    for (let i = 0; i < taskCount; i++) {
      const task = await contract.Tasks(i);
      if (!task.exists) continue;

      if (
        Number(task.status) === ACTIVE &&
        (task[3]?.toLowerCase() === address ||
         task[4]?.toLowerCase() === address)
      ) {
        total++;
      }
    }

    return total;
  } catch (err) {
    console.error("searchOpenTask error:", err);
    return 0;
  }
}

// ==============================
// ACTIONS
// ==============================
async function withdraw() {
  return withUI(async () => {
    const signer = await getSigner();
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

    await loadData();
    return true;
  });
}

async function unregister() {
  return withUI(async () => {
    const signer = await getSigner();
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
  go("/task");
}
