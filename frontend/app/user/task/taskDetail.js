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



// =======================
// HELPERS (WAJIB DI ATAS)
// =======================

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

function showText(parent, selector, value, fallback = "-") {
  const el = parent.querySelector(selector);
  if (!el) return;
  el.textContent = value ?? fallback;
}

function showBool(parent, selector, value) {
  showText(parent, selector, value ? "Yes" : "No");
}

function showLink(parent, selector, url) {
  const el = parent.querySelector(selector);
  if (!el) return;
  if (!url) {
    el.textContent = "-";
    el.removeAttribute("href");
    return;
  }
  el.href = url;
  el.textContent = url.length > 30 ? url.slice(0, 30) + "..." : url;
}





function show(el) {
  if (!el) return;
  el.style.display = "";
}

function hide(el) {
  if (!el) return;
  el.style.display = "none";
}



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
function hideAllButtons(btn) {
  Object.values(btn).forEach(hide);
}


function applyButtonRules(card, task, userAddress) {
  const btn = getTaskButtons(card);
  hideAllButtons(btn);

  const status = Number(task[1]);
  const creator = task[3];
  const member  = task[4];

  const isCreator = creator === userAddress;
  const isMember  = member === userAddress;

  // ======================
  // RULES
  // ======================

  // Creator – task baru
  if (isCreator && status === 1) {
    show(btn.activate);
    show(btn.Delete);
  }

  // Creator – sudah aktif
  if (isCreator && status === 2) {
    show(btn.openReg);
    show(btn.Delete);
  }

  // Creator – registration dibuka
  if (isCreator && status === 3) {
    show(btn.acceptMember);
    show(btn.closeReg);
  }

    if (isCreator && status === 4) {
    show(btn.requestRev);
    show(btn.approve);
    show(btn.cancel);
  }

  // Member – sudah assigned
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






async function showTaskData(task) {
   const signer = await window.wallet.getSigner();
    if (!signer) return;

        const address = await signer.getAddress();

        
  const card = document.querySelector(".task-card");
  if (!card) return;

  showText(card, ".taskId", task[0]?.toString());
  showText(card, ".status", await decodeStatus(Number(task[1])));
  showText(card, ".value", Number(task[2]));
  showText(card, ".creator", task[3]);
  showText(card, ".member",
    task[4] === ethers.ZeroAddress ? "Not Assigned" : task[4]
  );

  showText(card, ".title", task[5]);
  showLink(card, ".githubURL", task[6]);

  showText(card, ".reward", ethers.formatEther(task[7]));
  showText(card, ".deadlineHours", task[8]?.toString());

  showText(card, ".deadlineAt",
    new Date(Number(task[9]) * 1000).toLocaleString()
  );

  showText(card, ".createdAt",
    new Date(Number(task[10]) * 1000).toLocaleString()
  );

  showText(card, ".creatorStake", ethers.formatEther(task[11]));
  showText(card, ".memberStake", ethers.formatEther(task[12]));
  showText(card, ".maxRevision", task[13]?.toString());

  showBool(card, ".isMemberStakeLocked", task[14]);
  showBool(card, ".isCreatorStakeLocked", task[15]);
  showBool(card, ".isRewardClaimed", task[16]);
  showBool(card, ".exists", task[17]);
  applyButtonRules(card, task, address);

}


async function loadData() {
  try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const contract = await getContract(signer);

  const task = await contract.Tasks(id);
  showTaskData(task);

  }catch(e) {
    console.error(e);
  }
}




document.getElementById("reload")?.addEventListener("click", async () => {
  try {
    loadData();
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
}


function onWalletConnected(address) {
  console.log("Wallet connected:", address);
  waitSignerAndRun();
}







// direct button contract call

  document.querySelector(".ActivateTask")?.addEventListener("click", async () => {
    try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    const deadlineHours = Number(taskData[8]);
    const maxRevision = Number(taskData[13]);
    const reward = taskData[7];
    const creatorAddress = taskData[3];

    const requiredStake = await contract.__getCreatorStake(deadlineHours,maxRevision,reward,creatorAddress);
    const balance = await provider.getBalance(addr);

    if (requiredStake > balance) {
      alert(`Team Chain: Insuficcinet balance\n Your balance: ${ethers.formatEther(balance)} ETH\n Required Balance: ${ethers.formatEther(requiredStake)} ETH`);
      return;
    }

    const tx = await contract.activateTask(id, {value: requiredStake});
    const receipt = await tx.wait();
    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "TaskActive") {
        }
      } catch {}
    }
    alert('Team Chain: Contract Activated Successfuly');
    } catch(err) {
      console.error(err);
    }
  });

  // Button: OpenRegisteration (typo: seharusnya OpenRegistration)
  document.querySelector(".DeleteTask")?.addEventListener("click", async () => {
    try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    if (taskData[3] !== addr) {
      alert("Team Chain: You Is Not Owner");
      return;
    }
/*
    if (taskData[1] == 1) {
      alert("Team Chain: Cannot Delete This Task !");
      return;
    }

    if (taskData[1] !== 2) {
      alert("Team Chain: Cannot Delete This Task !");
      return;
    }*/

    const tx = await contract.deleteTask(id, addr);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "TaskDeleted") {
          alert(`✔ Team Chain: Task Deleted Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
  });



  document.querySelector(".OpenRegisteration")?.addEventListener("click", async () => {
    try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    if (taskData[3] !== addr) {
      alert("Team Chain: You Is Not Owner");
      return;
    }
    if (taskData[1] !== 2) {
      alert("Team Chain: Cannot Open Registeration This Task !");
      return;
    }

    const tx = await contract.openRegistration(id);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "RegistrationOpened") {
          alert(`✔ Team Chain: Task Registeration Openned Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
  });


    document.querySelector(".CloseRegisteration")?.addEventListener("click", async () => {
    try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    if (taskData[3] !== addr) {
      alert("Team Chain: You Is Not Owner");
      return;
    }
    if (taskData[1] !== 2) {
      alert("Team Chain: Cannot Open Close This Task !");
      return;
    }

    const tx = await contract.closeRegistration(id);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "RegistrationClosed") {
          alert(`✔ Team Chain: Task Registeration Closed Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
  });


  document.querySelector(".CancelTask")?.addEventListener("click", async () => {
    try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    if (taskData[1] !== 4) {
      alert("Team Chain: Cannot Cancel This Task !");
      return;
    }

    const tx = await contract.cancelByMe(id, addr);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "TaskCancelledByMe") {
          alert(`✔ Team Chain: Task Cancelled Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
  });

  //member

  document.querySelector(".Join")?.addEventListener("click", async () => {
       try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');


    const contract = await getContract(signer);
    const requiredStake = await contract.getMemberRequiredStake(id);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    if (taskData[4] == addr) {
      alert("Team Chain: You Alredy Accepted");
      return;
    }

    const tx = await contract.requestJoinTask(id, addr, {value: requiredStake});
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "JoinRequested") {
          alert(`✔ Team Chain: Task Join Requested Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
});


    document.querySelector(".WithdrawJoin")?.addEventListener("click", async () => {
    try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const contract = await getContract(signer);
    const addr = await signer.getAddress();
    const tx = await contract.withdrawJoinRequest(id, addr);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "JoinrequestCancelled") {
          alert(`✔ Team Chain: Task Join Request Withdrawed Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
  });









// call contract with funct

async function acceptMember(memberId) {
   try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

        const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    if (taskData[3] !== addr) {
      alert("Team Chain: You Is Not Owner");
      return;
    }
    const tx = await contract.approveJoinRequest(memberId);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "JoinApproved") {
          alert(`✔ Team Chain: Member Task Accepted Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
}

async function rejectMember(memberId) {
   try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const memberData = await contract.getJoinRequests(memberId);

    if (taskData[3] !== addr) {
      alert("Team Chain: You Is Not Owner");
      return;
    }
    const tx = await contract.approveJoinRequest(memberId, memberData[0]);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "JoinRejected") {
          alert(`✔ Team Chain: Member Task Rejected Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
}

async function acceptTask(SubmitId) {
   try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

        const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    if (taskData[3] !== addr) {
      alert("Team Chain: You Is Not Owner");
      return;
    }
    const tx = await contract.approveTask(id, SubmitId);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "TaskApproved") {
          alert(`✔ Team Chain: Task Accepted Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
}

async function requestRevision(id,Note,additionalDeadlineHours) {
   try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

        const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    if (taskData[3] !== addr) {
      alert("Team Chain: You Is Not Owner");
      return;
    }

    const tx = await contract.requestRevision(id, Note, additionalDeadlineHours);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "RevisionRequested") {
          alert(`✔ Team Chain: Revision Requested Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
}






//member
async function submitTask(PullRequestURL,Note) {
   try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

        const params = new URLSearchParams(window.location.search);
    const id = params.get('id');


        const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    if (taskData[4] !== addr) {
      alert("Team Chain: You Is Not Member");
      return;
    }

    const tx = await contract.requestSubmitTask(id,PullRequestURL, Note, addr);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "TaskSubmitted") {
          alert(`✔ Team Chain: Task Submitted Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
}


async function reSubmitTask(PullRequestURL,Note) {
   try {
    const signer = await window.wallet.getSigner();
    if (!signer) return;

        const params = new URLSearchParams(window.location.search);
    const id = params.get('id');


        const contract = await getContract(signer);
    const addr = await signer.getAddress();

    const taskData = await contract.Tasks(id);

    if (taskData[4] !== addr) {
      alert("Team Chain: You Is Not Member");
      return;
    }

    const tx = await contract.reSubmitTask(id, Note, PullRequestURL, addr);
    const receipt = await tx.wait();

    console.log(receipt);

     for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "TaskReSubmitted") {
          alert(`✔ Team Chain: Task ReSubmitted Succesfuly !`);
        }
      } catch {}
    }
    } catch(err) {
      console.error(err);
    }
}

