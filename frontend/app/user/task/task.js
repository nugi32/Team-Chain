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

let iface;
(async () => {
  const artifact = await loadABI(ARTIFACT_PATH);
  iface = new ethers.Interface(artifact.abi);
})();

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

  const errorName = selectorMap[selector] || null;
  console.log("Decoded errorName:", errorName);

  return errorName;
}







async function decodeStatus(status) {
  if (status == 0) {
    return "NonExistent";
  } else if (status == 1) {
    return "Created";
  } else if (status == 2) {
    return "Active";
  } else if (status == 3) {
    return "OpenRegistration";
  } else if (status == 4) {
    return "InProgres";
  } else if (status == 5) {
    return "Completed";
  } else if (status == 6) {
    return "Cancelled";
  } else {
    return "Undifined";
  }
}





async function searchCreatedTask() {
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

const showStatus = [1, 2, 3, 4, 5];

if (!task.exists) continue;
if (task.creator !== address) continue;
if (!showStatus.includes(Number(task.status))) continue;


    

      const clone = template.content.cloneNode(true);
      const card  = clone.querySelector(".task-card");

      const taskId = task[0].toString();

      card.querySelector(".taskId").textContent = taskId;
      card.querySelector(".status").textContent = await decodeStatus(Number(task[1]));
      card.querySelector(".title").textContent  = task[5];

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





async function searchJoinedTask() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);
    const address = await signer.getAddress();

    const container = document.getElementById("JoinedList");
    const template  = document.getElementById("JtaskCardTemplate");
    if (!container || !template) return;

    container.innerHTML = "";

    const taskCount = Number(await contract.taskCounter());

    for (let i = 0; i < taskCount; i++) {
      const task = await contract.Tasks(i);

const showStatus = [1, 2, 3, 4, 5];

if (!task.exists) continue;
if (task.member !== address) continue;
if (!showStatus.includes(Number(task.status))) continue;


    

      const clone = template.content.cloneNode(true);
      const card  = clone.querySelector(".task-card");

      const taskId = task[0].toString();

      card.querySelector(".taskId").textContent = taskId;
      card.querySelector(".status").textContent = await decodeStatus(Number(task[1]));
      card.querySelector(".title").textContent  = task[5];

      clone.querySelector(".JdetailsBTN").addEventListener("click", () => {
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

  await searchCreatedTask();
  await searchJoinedTask();
}


function onWalletConnected(address) {
  console.log("Wallet connected:", address);
  waitSignerAndRun();
}





















document.getElementById("test")?.addEventListener("click", async () => {
  try {
    const signer = await window.wallet.getSigner();
      
      if (!signer) {
        alert("No signer available. Please connect wallet.");
        return;
      }
    const contract = await getContract(signer);
    const data = await contract.Tasks(1);
    console.log(data);
    searchCreatedTask();
    searchJoinedTask();
  } catch(e) {
    console.error(e);
  }
});



// perlu err message yang jelas


function validateGithubIssueUrl(githubUrl) {
  try {
    let input = githubUrl.trim();

    // Auto add protocol
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
    // expected: [owner, repo, "issues", issueNumber]

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






document.querySelector(".taskForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {

    const signer = await window.wallet.getSigner();
      
      if (!signer) {
        alert("No signer available. Please connect wallet.");
        return;
      }

    const Title = e.target.title.value.trim();
    const GithubUrl = e.target.github.value.trim();
    const Deadline = Number(e.target.deadlineHours.value);
    const MaxRevision = Number(e.target.maxRevision.value);
    const rewardInput  = e.target.reward.value.trim();

    if (validateGithubIssueUrl(GithubUrl) !== true) {
      alert("Team Chain: Invalid Github Issue URL.")
      return;
    }

    const rewardUnit = document.getElementById("rewardUnit").value;

    let rewardWei;

if (isNaN(rewardInput) || Number(rewardInput) <= 0) {
  alert("Invalid reward amount");
  return;
}

if (rewardUnit === "eth") {
  // ETH → Wei
  rewardWei = ethers.parseEther(rewardInput);
} else {
  // Wei (pastikan integer)
  rewardWei = BigInt(rewardInput);
}

console.log("Reward In Wei Is:", rewardWei);




    const addr = await signer.getAddress();
    const contract = await getContract(signer);

    const balance = await provider.getBalance(addr);

    if (balance < rewardWei) {
      alert(`Team Chain: Insuficcinet balance\n Your balance: ${ethers.formatEther(balance)} ETH\n reward: ${ethers.formatEther(rewardWei)} ETH`);
      return;
    }

    const tx = await contract.createTask(Title, GithubUrl, Deadline, MaxRevision, addr, {value: rewardWei});
    const receipt = await tx.wait();

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "TaskCreated") {
          console.log("📌 EVENT Task Created !");
          alert(`✔ Team Chain: Task Created Succesfuly !`);
        }
      } catch {}
    }

  } catch (err) {
    console.error(err);
    /*const errorName =
      decodeErrorSelector(err) ||
      err?.data?.errorName ||
      err?.errorName ||
      err?.info?.errorName ||
      err?.reason ||
      err?.shortMessage?.replace("execution reverted: ", "") ||
      null;

    console.log("FINAL DETECTED errorName:", errorName);

    if (errorName && errors_messages[errorName]) {
      alert(errors_messages[errorName]);
      return;
    }

    alert("Team Chain: An error occurred while processing.");*/
  }
});
