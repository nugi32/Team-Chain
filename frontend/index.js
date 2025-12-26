import { modal } from "./global/connectwallet.js";
import { ethers, BrowserProvider } from "ethers";
import { ACCESS_CONTROL } from "./global/AddressConfig.js";


const ARTIFACT_PATH = "/artifact/AccessControl.json";


/***************************************
 * Internal State (FIX)
 ***************************************/
let cachedABI = null;              // FIX
let iface = null;                  // FIX
let walletWatcherInterval = null;  // FIX
let lastLoadedAddress = null;      // FIX
let pageActive = true;             // FIX

/***************************************
 * ABI + Contract
 ***************************************/
async function loadABI() {
  if (cachedABI) return cachedABI;

  const res = await fetch(ARTIFACT_PATH);
  cachedABI = await res.json();
  iface = new ethers.Interface(cachedABI.abi);
  return cachedABI;
}

async function getContract(signer) {
  const artifact = await loadABI();
  return new ethers.Contract(ACCESS_CONTROL, artifact.abi, signer);
}

/***************************************
 * DOM State
 ***************************************/
let registerBtn = null;
let owner = null;

/***************************************
 * Lifecycle
 ***************************************/
export async function init() {
  registerBtn = document.getElementById("Register");
  if (!registerBtn) return;

  registerBtn.addEventListener("click", onRegisterClick);

  await checkAuthorized();   // FIX: initial auto-load
  startWalletWatcher();      // FIX


  console.log("main page loaded")
}

export function destroy() {
  pageActive = false; // FIX

  if (registerBtn) {
    registerBtn.removeEventListener("click", onRegisterClick);
    registerBtn = null;
  }

  if (owner) {
    owner.removeEventListener("click", onOwnerClick);
    owner = null;
  }

  if (walletWatcherInterval) {
    clearInterval(walletWatcherInterval); // FIX
    walletWatcherInterval = null;
  }
}

if (typeof window !== 'undefined') {
  window.__PAGE_MODULE = {
    init: typeof init === 'function' ? init : undefined,
    destroy: typeof destroy === 'function' ? destroy : undefined
  };
}


/***************************************
 * Wallet Watcher
 ***************************************/
function startWalletWatcher() {
  if (walletWatcherInterval) return;

  walletWatcherInterval = setInterval(async () => {
    try {
      if (!pageActive) return;

      const signer = await getSigner();
      if (!signer) return;

      const addr = (await signer.getAddress()).toLowerCase();

      if (addr !== lastLoadedAddress) {
        lastLoadedAddress = addr;   // FIX
        await checkAuthorized();    // FIX
      }
    } catch {
      // silent
    }
  }, 800);
}

/***************************************
 * UI Helpers
 ***************************************/
function loadOwnerBTN() {
  if (owner) return; // FIX: prevent double bind

  owner = document.querySelector(".footer-content");
  if (!owner) return;

  owner.addEventListener("click", onOwnerClick);
  console.log("Authorize button initialized");
}

/***************************************
 * Handlers
 ***************************************/
function onRegisterClick(e) {
  e.preventDefault();
  go("/Register");
}

function onOwnerClick(e) {
  e.preventDefault();
  go("/owner");
}

/***************************************
 * Wallet Helpers
 ***************************************/
async function getSigner() {
  const walletProvider = modal.getWalletProvider();
  if (!walletProvider) return null;

  const provider = new BrowserProvider(walletProvider);
  return provider.getSigner();
}

/***************************************
 * Authorization Logic
 ***************************************/
async function checkAuthorized() {
  const signer = await getSigner();
  if (!signer) return;

  const address = (await signer.getAddress()).toLowerCase();
  lastLoadedAddress = address; // FIX

  const contract = await getContract(signer);

  const isOwner = (await contract.owner()).toLowerCase();
  if (isOwner === address) {
    loadOwnerBTN();
    return;
  }

  const isEmployee = await contract.employees(address);
  if (isEmployee) {
    loadOwnerBTN();
  }
}
