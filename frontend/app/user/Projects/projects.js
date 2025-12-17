import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import {CONTRACT_ADDRESS} from "../global/AddressConfig.js";

console.log("📦 register loaded");

const ARTIFACT_PATH = "../artifact/TrustlessTeamProtocol.json";

const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/cka4F66cHyvFHccHvsdTpjUni9t3NDYR");

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


async function loadData() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);
    const address = await signer.getAddress();

    const container = document.getElementById("activeList");
    const template  = document.getElementById("taskCardTemplate");
    if (!container || !template) return;

    container.innerHTML = "";

    const taskCount = Number(await contract.taskCounter());

    for (let i = 0; i < taskCount; i++) {
      const task = await contract.Tasks(i);


const showStatus = [1, 3];

if (!task.exists) continue;
if (!showStatus.includes(Number(task.status))) continue;


    

      const clone = template.content.cloneNode(true);
      const card  = clone.querySelector(".task-card");


      const taskId = task[0].toString();
      const stake = await contract.getMemberRequiredStake(task[0]);
      const ethStake = ethers.formatEther(stake);

      card.querySelector(".taskId").textContent = taskId;
      card.querySelector(".creator").textContent = task[3];
      card.querySelector(".title").textContent  = task[5];
      card.querySelector(".deadline").textContent = task[8];
      card.querySelector(".stake").textContent  = ethStake;

      clone.querySelector(".detailsBTN").addEventListener("click", () => {
        window.location.href = `taskDetail.html?id=${taskId}`;
      });

      container.appendChild(clone);
    }

  } catch (err) {
    console.error(err);
    alert("Team Chain: Failed to load task data.");
  }
}

let lastAddress = null;

const walletWatcher = setInterval(() => {
  const addr = window.wallet?.currentAddress;

  if (addr && addr !== lastAddress) {
    lastAddress = addr;

    waitSignerAndRun();

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
}