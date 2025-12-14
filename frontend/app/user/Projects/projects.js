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
async function searchOpenTask() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);

    const container = document.getElementById("taskContainer");
    const template = document.getElementById("taskCardTemplate");

    // clear card lama
    container.innerHTML = "";

    const OPEN_REGISTRATION = 3;
    const taskCount = Number(await contract.taskCounter());

    for (let i = 0; i < taskCount; i++) {
      const task = await contract.Tasks(i);

      if (!task.exists) continue;
      if (Number(task.status) !== OPEN_REGISTRATION) continue;

      const creator = await contract.getMyData(task[3]);
      const memberRequiredStake = await contract.getMemberRequiredStake(task[0]);

      const clone = template.content.cloneNode(true);
      const card = clone.querySelector(".task-card");

      // =========================
      // FILL DATA
      // =========================
      card.querySelector(".title").textContent = task[5];
      card.querySelector(".taskId").textContent = task[0];

      card.querySelector(".reward").textContent =
        ethers.formatEther(task[7]);

      card.querySelector(".CreatorAddress").textContent = task[3];

      card.querySelector(".deadlineTime").textContent =
        new Date(Number(task[8]) * 1000).toLocaleString();

      card.querySelector(".revison").textContent = task[13];

      card.querySelector(".memberStake").textContent =
        ethers.formatEther(memberRequiredStake);

      card.querySelector(".creatorReputaution").textContent =
        creator[3].toString();

      card.querySelector(".TaskGithubURl").textContent = task[6];

      // =========================
      // BUTTON ACTION
      // =========================
      card.querySelector(".joinBTN").onclick = () => {
        console.log("Join task:", task[0]);
      };

      // =========================
      // APPEND TO DOM
      // =========================
      container.appendChild(card);
    }
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
