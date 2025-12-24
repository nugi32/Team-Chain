// ==============================
// REGISTER PAGE MODULE (SPA SAFE)
// ==============================

// External dependencies
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";
import { isRegistered } from "../global/helper.js";
import { withUI } from "../../global-Ux/loading-ui.js";

// ==============================
// MODULE STATE
// ==============================

const ARTIFACT_PATH = "../../artifact/TrustlessTeamProtocol.json";

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

async function antiDuplicateGitProfile(contract, url) {
  const normalizedUrl = url.trim().toLowerCase();

  const gitHash = ethers.keccak256(
    ethers.toUtf8Bytes(normalizedUrl)
  );

  const isUsed = await contract.usedGitURL(gitHash);
  return isUsed; // boolean
}


async function handleRegisterSubmit(e) {
  e.preventDefault(); // ⬅ pindahkan ke luar

  return withUI(async () => {
    const signer = await window.wallet?.getSigner();
    if (!signer) {
      throw new Error("Wallet not connected");
    }

    const form = e.target;
    const name = form.name.value.trim();
    const age = form.age.value.trim();
    const githubURL = form.github.value.trim();

    // --- GitHub URL validation (biarkan seperti punya Anda) ---
    const url = new URL(githubURL);
    if (url.hostname !== "github.com") {
      throw new Error("Invalid GitHub profile URL");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1) {
      throw new Error("Invalid GitHub profile URL");
    }

    const addr = await signer.getAddress();
    const contract = await getContract(signer);/*
    const isDuplicate = await antiDuplicateGitProfile(contract, githubURL);

    if (isDuplicate) {
      throw new Error('This github profile has been registered');
    }*/

    const result = await isRegistered(contract, addr);
    const { isRegistered: registered, message } = result;


    if (registered) {
      Notify.success(message);
    }

    const tx = await contract.Register(name, age, githubURL, addr);
    const receipt = await tx.wait();

    // ✅ Cukup anggap sukses jika tx mined
    Notify.success(
      "Registration Successful",
      "Your account has been registered."
    );

    return true; // 🔑 WAJIB ADA
  });
}

async function handleCheckRegistration() {
  return withUI(async () => {
    const signer = await window.wallet.getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const addr = await signer.getAddress();
    const contract = await getContract(signer);

    const result = await isRegistered(contract, addr);
    const { isRegistered: registered, message } = result;

    if (registered) {
      Notify.success("Registration Status", message);
    } else {
      Notify.error(message);
    }

    return registered;
  });
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
