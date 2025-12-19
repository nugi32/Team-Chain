import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import {CONTRACT_ADDRESS} from "../global/AddressConfig.js";
import { withUI } from "../../global-Ux/loading-ui.js";



console.log("📦 dashboard loaded");

// ==============================
// 2. LOAD ABI FROM JSON FILE
// ==============================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "../artifact/TrustlessTeamProtocol.json";

// ==============================
// 3. CONTRACT INSTANCE
// ==============================
async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);

}

let iface;
(async () => {
  const artifact = await loadABI(ARTIFACT_PATH);
  iface = new ethers.Interface(artifact.abi);
})();



 async function renderUserDashboard(user, amount) {

  const openTask = await searchOpenTask();
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "-";
  };

  setText("name", user.name);
  setText("age", user.age);
  setText("github", user.gitProfile);

  // amount dari ethers.formatEther = string
  setText("withdrawable", Number(amount).toFixed(4));

  setText("created", user.totalTasksCreated);
  setText("completed", user.totalTasksCompleted);
  setText("failed", user.totalTasksFailed);
  setText("reputation", user.reputation);

  setText("activeValue", openTask); //kenapa ini keluar object promise
}


async function loadData() {
  try {
    if (!window.wallet) return;

    const signer = await window.wallet.getSigner();
    if (!signer) return;

    let userData = null;
    let userWithdrawableAmount = "0";


    const contract = await getContract(signer);
    const address = await signer.getAddress();

    const isRegistered = await contract.isRegistered(address);
    if (!isRegistered) {
      console.warn("User not registered");
      return;
    }

    const user = await contract.getMyData(address);
    const withdrawable = await contract.getWithdrawableAmount(address);

    userData = {
      totalTasksCreated: Number(user.totalTasksCreated),
      totalTasksCompleted: Number(user.totalTasksCompleted),
      totalTasksFailed: Number(user.totalTasksFailed),
      reputation: Number(user.reputation),
      age: Number(user.age),
      isRegistered: user.isRegistered,
      name: user.name,
      gitProfile: user.GitProfile
    };

    // ✅ ethers v6 way
    userWithdrawableAmount = ethers.formatEther(withdrawable);

    await renderUserDashboard(userData, userWithdrawableAmount);
    console.log(userData, userWithdrawableAmount)

  } catch (err) {
    console.error("loadData error:", err);
    alert("Team Chain: Failed to load user data.");
  }
}



async function searchOpenTask() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);
    const address = await signer.getAddress();

    const isRegistered = await contract.isRegistered(address);
    if (!isRegistered) {
      console.warn("User not registered");
      return;
    }

    const ActiveTask = 2;

    const taskCount = Number(await contract.taskCounter());
    let TotalActiveTask = 0;

    for (let i = 0; i < taskCount; i++) {
      const task = await contract.Tasks(i);

      if (!task.exists) continue;

      if (
  Number(task.status) === ActiveTask ||
  task[3] === address ||
  task[4] === address
) {
  TotalActiveTask++;
}

    }

    console.log("Total active tasks:", TotalActiveTask);
    return TotalActiveTask;

  } catch (err) {
    console.error(err);
    alert("Team Chain: Failed to load task data.");
  }
}



document.getElementById("reload")?.addEventListener("click", async () => {
  try {
    loadData();
    searchOpenTask();
    console.log("tirggered");
  } catch(e) {
    console.error(e);
  }
})



let lastAddress = null;

const walletWatcher = setInterval(() => {
  const addr = window.wallet?.currentAddress;

  if (addr && addr !== lastAddress) {
    lastAddress = addr;

    // 🔥 Trigger function
    onWalletConnected(addr);
        loadData();
    searchOpenTask();
    SearchNotActivated();

    // Optional: stop watcher jika cuma mau sekali
    clearInterval(walletWatcher);
  }
}, 300);

async function waitSignerAndRun() {
  let signer = null;

  while (!signer) {
    signer = await window.wallet.getSigner();
    if (!signer) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  await loadData();
  await searchOpenTask();
}


function onWalletConnected(address) {
  console.log("Wallet connected:", address);
  waitSignerAndRun();
}



document.getElementById("withdrawToMe")?.addEventListener("click", () => {
  withUI(async () => {
    const signer = await window.wallet.getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const addr = await signer.getAddress();
    const contract = await getContract(signer);

    const amount = await contract.getWithdrawableAmount(addr);
    if (amount <= 0n) throw new Error("Insufficient amount to withdraw");

    const tx = await contract.withdraw(addr);
    const receipt = await tx.wait();

    // Event parsing tetap DI DALAM
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "Withdrawal") {
          console.log("📌 Withdrawal:", addr);
        }
      } catch {}
    }

    return {
      address: addr,
      amount
    };

  }, {
    loadingText: "Processing withdrawal...",
    successMessage: "Withdrawal completed successfully"
  });
});



document.getElementById("UnRegister")?.addEventListener("click", () => {
  withUI(async () => {
    const signer = await window.wallet.getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const addr = await signer.getAddress();
    const contract = await getContract(signer);

    const isRegistered = await contract.isRegistered(addr);
    if (!isRegistered) throw new Error("User is not registered");

    const tx = await contract.Unregister(addr);
    const receipt = await tx.wait();

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "UserUnregistered") {
          console.log("📌 User Unregistered:", addr);
        }
      } catch {}
    }

  }, {
    loadingText: "Unregistering user...",
    successMessage: "User unregistered successfully"
  });
});


