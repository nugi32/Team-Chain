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
const CONTRACT_ADDRESS = "0xEEB12f99f71F38b3f3fBE2Ce28ea6DDe368cf014";

// ==============================
// 3. CONTRACT INSTANCE
// ==============================
async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);

}

// ==============================
// 4. CUSTOM ERROR MESSAGES
// ==============================
const errors_messages = {
  NotOwner: "Team Chain: User Alredy Registered.",
  ZeroAddress: "Team Chain: Invalid address — the zero address (0x000...0) is not allowed.",
};

// ==============================
// 5. ERROR SELECTOR LOOKUP TABLE
// ==============================
const selectorMap = {
  "0x3797687a": "NotOwner",
  "0x30cd7471": "NotOwner",
  "0x1b4ce173": "ZeroAddress",
};

// ==============================
// 6. ERROR DECODER (Custom)
// ==============================
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

/****************************************
 * 7. Load ABI interface for event parsing
 ****************************************/
let iface;
(async () => {
  const artifact = await loadABI(ARTIFACT_PATH);
  iface = new ethers.Interface(artifact.abi);
})();

document.querySelector(".registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {

    const signer = await window.wallet.getSigner();
      
      if (!signer) {
        alert("No signer available. Please connect wallet.");
        return;
      }

    const name = e.target.name.value.trim();
    const age = e.target.age.value.trim();
    const githubURL = e.target.github.value.trim();


let username;

try {
  const url = new URL(githubURL);

  if (url.hostname !== "github.com") {
    throw new Error("❌ Team Chain: Not Github URL !");
  }

  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts.length < 1) {
    throw new Error("❌ Team Chain: Username Not Found !");
  }

  username = pathParts[0];
} catch (e) {
  alert("❌ Team Chain: Github URL Is Invalid !");
  return;
}



    const addr = await signer.getAddress();
    const contract = await getContract(signer);
    const tx = await contract.Register(name, age, githubURL, addr);
    const receipt = await tx.wait();

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "UserRegistered") {
          console.log("📌 EVENT User Registered !");
          alert(`✔ Team Chain: Registered Succesfuly !`);
        }
      } catch {}
    }

  } catch (err) {
    const errorName =
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

    alert("Team Chain: An error occurred while processing.");
  }
});

document.getElementById("IsRegistered")?.addEventListener("click", async () => {
    try {

    const signer = await window.wallet.getSigner();
      
      if (!signer) {
        alert("No signer available. Please connect wallet.");
        return;
      }

      const addr = await signer.getAddress();

      console.log(addr)
      
    const contract = await getContract(signer);
    const status = await contract.isRegistered(addr);
    if (status == false) {
      alert("Team Chain: Your Address Is Not Registered.");
      return;
    } else if (status == true) {
      alert("Team Chain: Your Address IS Registered.");
      return;
    } else {
      alert("Team Chain: An Error Occured When Getting Your Data.");
      return;
    }

  } catch (err) {
   console.error(err);

    console.log("FINAL DETECTED errorName:", errorName);

    if (errorName && errors_messages[errorName]) {
      alert(errors_messages[errorName]);
      return;
    }

    alert("Team Chain: An error occurred while get status.");
  }
});
