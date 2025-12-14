import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

console.log("📦 register loaded");

// ==============================
// 2. LOAD ABI FROM JSON FILE
// ==============================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "../artifact/TrustlessTeamProtocol.json";
const CONTRACT_ADDRESS = "0x80e7F58aF8b9E99743a1a20cd0e706B9F6c3149d";

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


let TotalActiveTask = 0;
let TotalNotActivatedTask = 0;

function renderUserDashboard(user, amount) {
  document.getElementById("name").textContent = user.name;
  document.getElementById("age").textContent = user.age;
  document.getElementById("github").textContent = user.gitProfile;
  document.getElementById("withdrawable").textContent = amount.toFixed(4);

  document.getElementById("created").textContent = user.totalTasksCreated;
  document.getElementById("completed").textContent = user.totalTasksCompleted;
  document.getElementById("Failed").textContent = user.totalTasksFailed;
  document.getElementById("reputation").textContent = user.reputation;

  document.getElementById("activeValue").textContent = TotalActiveTask;
  document.getElementById("NotActivated").textContent = TotalNotActivatedTask;
}

async function loadData() {
  try {
    if (!window.wallet) return;

    const signer = await window.wallet.getSigner();
    if (!signer) return;

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

    userWithdrawableAmount = Number(withdrawable) / 1e18; // ETH

    renderUserDashboard(userData, userWithdrawableAmount);

  } catch (err) {
    console.error(err);
    alert("Team Chain: Failed to load user data.");
  }
}



async function searchOpenTask() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);

    const ActiveTask = 2;

    const taskCount = Number(await contract.taskCounter());
    TotalActiveTask = 0;

    for (let i = 0; i < taskCount; i++) {
      const task = await contract.Tasks(i);

      if (!task.exists) continue;

      if (Number(task.status) === ActiveTask) {
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

async function SearchNotActivated() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);

    const NotActivated = 1;

    const taskCount = Number(await contract.taskCounter());
    TotalNotActivatedTask = 0;

    for (let i = 0; i < taskCount; i++) {
      const task = await contract.Tasks(i);

      if (!task.exists) continue;

      if (Number(task.status) === NotActivated) {
        TotalNotActivatedTask++;
      }
    }

    console.log("Total not activated tasks:", TotalNotActivatedTask);
    return TotalNotActivatedTask;

  } catch (err) {
    console.error(err);
    alert("Team Chain: Failed to load task data.");
  }
}



// ==== AUTO TRIGGERS ====

if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
     if (accounts.length > 0) { 
    loadData();
    searchOpenTask();
    SearchNotActivated();
  }
  });

  window.ethereum.on("chainChanged", () => { 
    loadData();
    searchOpenTask();
    SearchNotActivated();
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  if (!window.ethereum) return;

  const accounts = await window.ethereum.request({
    method: "eth_accounts",
  });

  if (accounts.length > 0) { 
    loadData();
    searchOpenTask();
    SearchNotActivated();
  }
});


document.getElementById("withdrawToMe")?.addEventListener("click", async () => {
  try {
    const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }

      const contract = await getContract(signer);
      const amount = await contract.getWithdrawableAmount(signer.address);

      if (amount <= 0) {
        alert("Team Chain: Insuficient Amount To Withdraw");
        return;
      }

      const tx = await contract.withdraw(signer.address);
      const receipt = await tx.wait();

      console.log("withdraw Success:", receipt);

      for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "Withdrawal") {
          console.log("📌 EVENT Withdrawal:", signer.address);
          alert(`✔ Withdrawal Success !\n TO: ${signer.address}\n Amount: ${formatEther(amount)} ETH `);
        }
      } catch {}
    }
  } catch(err) {
    console.error(err);
    alert("Team Chain: An Error Occured When Withdrawal !.")
  }
});

document.getElementById("UnRegister")?.addEventListener("click", async () => {
  try {
    const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }

      const contract = await getContract(signer);
      const tx = await contract.Unregister(signer.address);
      const receipt = await tx.wait();

      console.log("Unregister Success:", receipt);

      for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "UserUnregistered") {
          console.log("📌 EVENT User Unregistered:", signer.address);
          alert(`✔ Team Chain: User Unregistered Success: ${signer.address}`);
        }
      } catch {}
    }
  } catch(err) {
    console.error(err);
    alert("Team Chain: An Error Occured When UnRegister !.")
  }
});

