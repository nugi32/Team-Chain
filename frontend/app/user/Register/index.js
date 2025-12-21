// ==============================
// REGISTER PAGE MODULE (SPA SAFE)
// ==============================

// External dependencies
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";

// ==============================
// MODULE STATE
// ==============================

const ARTIFACT_PATH = "/app/artifact/TrustlessTeamProtocol.json";

let iface = null;
let formHandler = null;
let checkHandler = null;

// ==============================
// ABI & CONTRACT HELPERS
// ==============================

async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

async function loadInterface() {
  if (iface) return iface;

  const artifact = await loadABI(ARTIFACT_PATH);
  iface = new ethers.Interface(artifact.abi);
  return iface;
}

// ==============================
// ERROR HANDLING
// ==============================

const errorMessages = {
  NotOwner: "Team Chain: User already registered.",
  ZeroAddress:
    "Team Chain: Invalid address — the zero address (0x000...0) is not allowed.",
};

const selectorMap = {
  "0x3797687a": "NotOwner",
  "0x30cd7471": "NotOwner",
  "0x1b4ce173": "ZeroAddress",
};

function decodeErrorSelector(err) {
  const data =
    err?.data ||
    err?.error?.data ||
    err?.info?.error?.data ||
    err?.cause?.data ||
    null;

  if (!data || data.length < 10) return null;

  return selectorMap[data.slice(0, 10)] ?? null;
}

// ==============================
// FORM HANDLERS
// ==============================

async function handleRegisterSubmit(e) {
  e.preventDefault();

  try {
    const signer = await window.wallet?.getSigner();
    if (!signer) {
      alert("Please connect wallet first.");
      return;
    }

    const form = e.target;

    const name = form.name.value.trim();
    const age = form.age.value.trim();
    const githubURL = form.github.value.trim();

    // Validate GitHub URL
    let username;
    try {
      const url = new URL(githubURL);

      if (url.hostname !== "github.com") {
        throw new Error();
      }

      const parts = url.pathname.split("/").filter(Boolean);
      if (!parts.length) throw new Error();

      username = parts[0];
    } catch {
      alert("❌ Team Chain: Invalid GitHub URL.");
      return;
    }

    const addr = await signer.getAddress();
    const contract = await getContract(signer);
    const iface = await loadInterface();

    const tx = await contract.Register(name, age, githubURL, addr);
    const receipt = await tx.wait();

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "UserRegistered") {
          alert("✔ Team Chain: Registration successful!");
        }
      } catch {}
    }
  } catch (err) {
    const errorName =
      decodeErrorSelector(err) ||
      err?.shortMessage?.replace("execution reverted: ", "") ||
      err?.reason ||
      null;

    if (errorName && errorMessages[errorName]) {
      alert(errorMessages[errorName]);
      return;
    }

    alert("Team Chain: Failed to register.");
  }
}

async function handleCheckRegistration() {
  try {
    const signer = await window.wallet?.getSigner();
    if (!signer) {
      alert("Please connect wallet first.");
      return;
    }

    const addr = await signer.getAddress();
    const contract = await getContract(signer);

    const status = await contract.isRegistered(addr);

    alert(
      status
        ? "Team Chain: Your address IS registered."
        : "Team Chain: Your address is NOT registered."
    );
  } catch (err) {
    console.error(err);
    alert("Team Chain: Failed to check registration status.");
  }
}

// ==============================
// SPA LIFECYCLE
// ==============================

export function init() {
  console.log("📦 register page initialized");

  const form = document.querySelector(".registerForm");
  const checkBtn = document.getElementById("IsRegistered");

  if (form) {
    formHandler = handleRegisterSubmit;
    form.addEventListener("submit", formHandler);
  }

  if (checkBtn) {
    checkHandler = handleCheckRegistration;
    checkBtn.addEventListener("click", checkHandler);
  }
}

export function destroy() {
  const form = document.querySelector(".registerForm");
  const checkBtn = document.getElementById("IsRegistered");

  if (form && formHandler) {
    form.removeEventListener("submit", formHandler);
  }

  if (checkBtn && checkHandler) {
    checkBtn.removeEventListener("click", checkHandler);
  }

  formHandler = null;
  checkHandler = null;

  console.log("🧹 register page destroyed");
}
