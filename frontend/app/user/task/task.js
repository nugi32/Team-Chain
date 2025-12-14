import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

console.log("📦 register loaded");

const ARTIFACT_PATH = "../artifact/TrustlessTeamProtocol.json";
const CONTRACT_ADDRESS = "0x80e7F58aF8b9E99743a1a20cd0e706B9F6c3149d";

// ==============================
// LOAD ABI
// ==============================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

// ==============================
// CONTRACT
// ==============================
async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ==============================
// RENDER TASKS
// ==============================
async function searchCreatedTask() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);

    const container = document.getElementById("taskContainer");
    const template = document.getElementById("taskCardTemplate");

    // clear card lama
    container.innerHTML = "";

    const CreatedSelector = 1;
    const taskCount = Number(await contract.taskCounter());

for (let i = 0; i < taskCount; i++) {
  const task = await contract.Tasks(i);

  if (!task.exists) continue;
  if (Number(task.status) !== CreatedSelector) continue;
  if (task.creator == signer.address) continue;

  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".task-card");

  // =========================
  // FILL DATA - SESUAIKAN INDEX ARRAY DI SINI
  // =========================
  
  // Task ID (index 0)
  card.querySelector(".taskId").textContent = task[0].toString();
  
  // Status (index 1)
  const statusValue = Number(task[1]);
  card.querySelector(".status").textContent = getStatusText(statusValue);
  
  // Value Category (index 2)
  const valueValue = Number(task[2]);
  card.querySelector(".value").textContent = getValueText(valueValue);
  
  // Creator (index 3)
  const creatorAddress = task[3];
  card.querySelector(".creator").textContent = shortenAddress(creatorAddress);
  
  // Member (index 4)
  const memberAddress = task[4];
  card.querySelector(".member").textContent = memberAddress === ethers.ZeroAddress ? 
    "Not Assigned" : shortenAddress(memberAddress);
  
  // Title (index 5)
  card.querySelector(".title").textContent = task[5];
  
  // GitHub URL (index 6)
  const githubURL = task[6];
  const githubLink = card.querySelector(".githubURL");
  githubLink.href = githubURL;
  githubLink.textContent = githubURL.length > 30 ? 
    githubURL.substring(0, 30) + "..." : githubURL;
  
  // Reward (index 7)
  const reward = ethers.formatEther(task[7]);
  card.querySelector(".reward").textContent = reward;
  
  // Deadline Hours (index 8)
  card.querySelector(".deadlineHours").textContent = task[8].toString();
  
  // Deadline At (index 9)
  const deadlineAt = Number(task[9]);
  card.querySelector(".deadlineAt").textContent = new Date(deadlineAt * 1000).toLocaleString();
  
  // Created At (index 10)
  const createdAt = Number(task[10]);
  card.querySelector(".createdAt").textContent = new Date(createdAt * 1000).toLocaleString();
  
  // Creator Stake (index 11)
  const creatorStake = ethers.formatEther(task[11]);
  card.querySelector(".creatorStake").textContent = creatorStake;
  
  // Member Stake (index 12)
  const memberStake = ethers.formatEther(task[12]);
  card.querySelector(".memberStake").textContent = memberStake;
  
  // Max Revision (index 13)
  card.querySelector(".maxRevision").textContent = task[13].toString();
  
  // isMemberStakeLocked (index 14) - boolean
  card.querySelector(".isMemberStakeLocked").textContent = task[14] ? "Yes" : "No";
  
  // isCreatorStakeLocked (index 15) - boolean
  card.querySelector(".isCreatorStakeLocked").textContent = task[15] ? "Yes" : "No";
  
  // isRewardClaimed (index 16) - boolean
  card.querySelector(".isRewardClaimed").textContent = task[16] ? "Yes" : "No";
  
  // exists (index 17) - boolean
  card.querySelector(".exists").textContent = task[17] ? "Yes" : "No";



  // Update badges
  card.querySelector(".task-status.badge").textContent = getStatusText(statusValue);
  card.querySelector(".task-value.badge").textContent = getValueText(valueValue);

  // =========================
  // BUTTON ACTIONS - SESUAIKAN DENGAN FUNGSI KONTRAK
  // =========================
  
  // Button: ActivateTask
  card.querySelector(".ActivateTask").onclick = () => {
    console.log("Activate Task:", task[0]);
    // Panggil fungsi kontrak: contract.activateTask(task[0]);
  };

  // Button: OpenRegisteration (typo: seharusnya OpenRegistration)
  card.querySelector(".OpenRegisteration").onclick = () => {
    console.log("Open Registration for Task:", task[0]);
    // Panggil fungsi kontrak: contract.openRegistration(task[0]);
  };

  // Button: CloseRegisteration (typo: seharusnya CloseRegistration)
  card.querySelector(".CloseRegisteration").onclick = () => {
    console.log("Close Registration for Task:", task[0]);
    // Panggil fungsi kontrak: contract.closeRegistration(task[0]);
  };

  // Button: CancelTask
  card.querySelector(".CancelTask").onclick = () => {
    console.log("Cancel Task:", task[0]);
    // Panggil fungsi kontrak: contract.cancelTask(task[0]);
  };

  // Button: RequestRevision
  card.querySelector(".RequestRevision").onclick = () => {
    console.log("Request Revision for Task:", task[0]);
    // Panggil fungsi kontrak: contract.requestRevision(task[0]);
  };

  // Button: ApproveTask
  card.querySelector(".ApproveTask").onclick = () => {
    console.log("Approve Task:", task[0]);
    // Panggil fungsi kontrak: contract.approveTask(task[0]);
  };
}
document.head.appendChild(style);
  } catch (err) {
    console.error(err);
    alert("Team Chain: Failed to load task data.");
  }
}











async function searchJoinedTask() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);

    const container = document.getElementById("taskContainer");
    const template = document.getElementById("taskCardTemplate");

    // clear card lama
    container.innerHTML = "";

    const CreatedSelector = 1;
    const taskCount = Number(await contract.taskCounter());

for (let i = 0; i < taskCount; i++) {
  const task = await contract.Tasks(i);

  if (!task.exists) continue;
  if (Number(task.status) !== CreatedSelector) continue;
  if (task.creator == signer.address) continue;

  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".task-card");

  // =========================
  // FILL DATA - SESUAIKAN INDEX ARRAY DI SINI
  // =========================
  
  // Task ID (index 0)
  card.querySelector(".taskId").textContent = task[0].toString();
  
  // Status (index 1)
  const statusValue = Number(task[1]);
  card.querySelector(".status").textContent = getStatusText(statusValue);
  
  // Creator (index 3)
  const creatorAddress = task[3];
  card.querySelector(".creator").textContent = shortenAddress(creatorAddress);
  
  // Title (index 5)
  card.querySelector(".title").textContent = task[5];
  
  // GitHub URL (index 6)
  const githubURL = task[6];
  const githubLink = card.querySelector(".githubURL");
  githubLink.href = githubURL;
  githubLink.textContent = githubURL.length > 30 ? 
    githubURL.substring(0, 30) + "..." : githubURL;
  
  // Reward (index 7)
  const reward = ethers.formatEther(task[7]);
  card.querySelector(".reward").textContent = reward;
  
  // Deadline At (index 9)
  const deadlineAt = Number(task[9]);
  card.querySelector(".deadlineTime").textContent = new Date(deadlineAt * 1000).toLocaleString();
  
  // Max Revision (index 13)
  card.querySelector(".maxRevision").textContent = task[13].toString();
  
  // isMemberStakeLocked (index 14) - boolean
  card.querySelector(".isMemberStakeLocked").textContent = task[14] ? "Yes" : "No";
  
  // isCreatorStakeLocked (index 15) - boolean
  card.querySelector(".isCreatorStakeLocked").textContent = task[15] ? "Yes" : "No";
  
  // isRewardClaimed (index 16) - boolean
  card.querySelector(".isRewardClaimed").textContent = task[16] ? "Yes" : "No";


  // Update badges
  card.querySelector(".task-status.badge").textContent = getStatusText(statusValue);
  card.querySelector(".task-value.badge").textContent = getValueText(valueValue);

  // =========================
  // BUTTON ACTIONS - SESUAIKAN DENGAN FUNGSI KONTRAK
  // =========================
  
  // Button: ActivateTask
  card.querySelector(".SubmitTask").onclick = () => {
    console.log("Activate Task:", task[0]);
    // Panggil fungsi kontrak: contract.activateTask(task[0]);
  };

  // Button: OpenRegisteration (typo: seharusnya OpenRegistration)
  card.querySelector(".ReSubmitTask").onclick = () => {
    console.log("Open Registration for Task:", task[0]);
    // Panggil fungsi kontrak: contract.openRegistration(task[0]);
  };

  // Button: CloseRegisteration (typo: seharusnya CloseRegistration)
  card.querySelector(".CancelTask").onclick = () => {
    console.log("Close Registration for Task:", task[0]);
    // Panggil fungsi kontrak: contract.closeRegistration(task[0]);
  };
}
document.head.appendChild(style);
  } catch (err) {
    console.error(err);
    alert("Team Chain: Failed to load task data.");
  }
}



























































// ==============================
// WALLET EVENTS
// ==============================
if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length > 0) searchOpenTask();
  });

  window.ethereum.on("chainChanged", () => searchOpenTask());
}

window.addEventListener("DOMContentLoaded", async () => {
  if (!window.ethereum) return;

  const accounts = await window.ethereum.request({
    method: "eth_accounts",
  });

  if (accounts.length > 0) searchOpenTask();
});
