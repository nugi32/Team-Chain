// ==============================
// REGISTER PAGE MODULE (SPA SAFE)
// ==============================

// External dependencies
import { modal } from "../global/connectwallet.js";
import { BrowserProvider, parseEther, ethers } from "ethers";
import { CONTRACT_ADDRESS } from "../global/AddressConfig.js";
import { isRegistered } from "../global/helper.js";
import { withUI } from "../global-Ux/loading-ui.js";

// ==============================
// MODULE STATE
// ==============================

const ARTIFACT_PATH = "../global/artifact/TrustlessTeamProtocol.json";

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
  const gitHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedUrl));
  return await contract.usedGitURL(gitHash);
}

// ==============================
// FORM HANDLERS
// ==============================

async function handleRegisterSubmit(e) {
  e.preventDefault();

  return withUI(async () => {
    const walletProvider = modal.getWalletProvider();
    if (!walletProvider) throw new Error("Wallet not connect");

    const provider = new BrowserProvider(walletProvider);
    const signer = await provider.getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const address = await signer.getAddress();

    const form = e.target;
    const name = form.name.value.trim();
    const age = form.age.value.trim();
    const githubURL = form.github.value.trim();

    const url = new URL(githubURL);
    if (url.hostname !== "github.com") {
      throw new Error("Invalid GitHub profile URL");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1) {
      throw new Error("Invalid GitHub profile URL");
    }

    const contract = await getContract(signer);

    /*
    const isDuplicate = await antiDuplicateGitProfile(contract, githubURL);
    if (isDuplicate) {
      throw new Error("Github profile is used")
    }*/

    const { isRegistered: registered, message } =
      await isRegistered(contract, address);

    if (registered) {
      Notify.success("Info", message);
      return;
    }

    const tx = await contract.Register(name, age, githubURL, address);
    await tx.wait();

    Notify.success(
      "Registration Successful",
      "Your account has been registered."
    );
  });
}


async function handleCheckRegistration() {
  const walletProvider = modal.getWalletProvider();
  if (!walletProvider) throw new Error("Wallet not connect");

  const provider = new BrowserProvider(walletProvider);
  const signer = await provider.getSigner();
  if (!signer) throw new Error("Wallet not connected");

  const address = await signer.getAddress();
  const contract = await getContract(signer);

  const result = await isRegistered(contract, address);
  const { isRegistered: registered, message } = result;

  if (registered) {
    Notify.success("Registration Status", message);
  } else {
    Notify.error(message);
  }

  return registered;
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

  if (form && formHandler) form.removeEventListener("submit", formHandler);
  if (checkBtn && checkHandler) checkBtn.removeEventListener("click", checkHandler);

  formHandler = null;
  checkHandler = null;

  console.log("🧹 register page destroyed");
}
