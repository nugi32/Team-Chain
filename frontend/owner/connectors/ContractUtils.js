import { ethers, BrowserProvider } from "ethers";
import { modal } from "../../global/connectwallet.js";
import { SYSTEM_WALLET, STATE_VAR_ADDRESS, CONTRACT_ADDRESS } from "../../global/AddressConfig.js";
import { withUI } from "../../global-Ux/loading-ui";
import { VAR, MAIN, WALLET } from "../index.js";

console.log("📦 Admin Contract Utils loaded");

// ==============================
// STATE
// ==============================
let cachedSigner = null;

// ==============================
// WALLET HELPERS (REOWN SAFE)
// ==============================
async function getSigner() {
  if (cachedSigner) return cachedSigner;

  const walletProvider = modal.getWalletProvider();
  if (!walletProvider) return null;

  const provider = new ethers.BrowserProvider(walletProvider);
  cachedSigner = await provider.getSigner();
  return cachedSigner;
}

// ==============================
// LOAD ABI
// ==============================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

// ==============================
// CONTRACT INSTANCES
// ==============================
async function getSystemWalletContract(signer) {
  const artifact = await loadABI(WALLET);
  return new ethers.Contract(SYSTEM_WALLET, artifact.abi, signer);
}

async function getStateVarContract(signer) {
  const artifact = await loadABI(VAR);
  return new ethers.Contract(STATE_VAR_ADDRESS, artifact.abi, signer);
}

async function getMainContract(signer) {
  const artifact = await loadABI(MAIN);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ==============================
// INTERFACE FOR EVENTS
// ==============================
async function loadIface(artifactPath) {
  const artifact = await loadABI(artifactPath);
  return new ethers.Interface(artifact.abi);
}

// =====================================================
// EXPORTED FUNCTIONS
// =====================================================

/**
 * Change access control address for all contracts
 * @param {string} newAccessControl - New access control address
 */
export async function changeAccessControl(newAccessControl) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    if (!ethers.isAddress(newAccessControl)) throw new Error("Invalid address");

    const systemWallet = await getSystemWalletContract(signer);
    const stateVar = await getStateVarContract(signer);
    const mainContract = await getMainContract(signer);

    // Execute transactions
    const tx1 = await systemWallet.changeAccessControl(newAccessControl);
    const receipt1 = await tx1.wait();

    const tx2 = await stateVar.changeAccessControl(newAccessControl);
    const receipt2 = await tx2.wait();

    const tx3 = await mainContract.changeAccessControl(newAccessControl);
    const receipt3 = await tx3.wait();

    // Parse logs for events
    await parseAccessControlEvents(receipt1, SystemWallet_ARTIFACT, "System Wallet");
    await parseAccessControlEvents(receipt2, StateVar_ARTIFACT, "State Variable");
    await parseAccessControlEvents(receipt3, MainContract_ARTIFACT, "Main Contract");

    Notify.success(`Access control changed to: ${newAccessControl}`);
    return { receipt1, receipt2, receipt3 };
  });
}

/**
 * Pause all contracts
 */
export async function pauseAllContracts() {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const systemWallet = await getSystemWalletContract(signer);
    const stateVar = await getStateVarContract(signer);
    const mainContract = await getMainContract(signer);

    const receipt1 = await (await systemWallet.pause()).wait();
    const receipt2 = await (await stateVar.pause()).wait();
    const receipt3 = await (await mainContract.pause()).wait();

    Notify.success("All contracts paused successfully");
    return { receipt1, receipt2, receipt3 };
  });
}

/**
 * Unpause all contracts
 */
export async function unpauseAllContracts() {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const systemWallet = await getSystemWalletContract(signer);
    const stateVar = await getStateVarContract(signer);
    const mainContract = await getMainContract(signer);

    const receipt1 = await (await systemWallet.unpause()).wait();
    const receipt2 = await (await stateVar.unpause()).wait();
    const receipt3 = await (await mainContract.unpause()).wait();

    Notify.success("All contracts unpaused successfully");
    return { receipt1, receipt2, receipt3 };
  });
}

/**
 * Check paused status of all contracts
 */
export async function checkPausedStatus() {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const systemWallet = await getSystemWalletContract(signer);
    const stateVar = await getStateVarContract(signer);
    const mainContract = await getMainContract(signer);

    const systemPaused = await systemWallet.paused();
    const statePaused = await stateVar.paused();
    const mainPaused = await mainContract.paused();

    const status = {
      systemWallet: systemPaused,
      stateVariable: statePaused,
      mainContract: mainPaused
    };
    console.log(status);
    Notify.success("Paused status checked");
    return status;
  });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Parse AccessControlChanged events from transaction logs
 */
async function parseAccessControlEvents(receipt, artifactPath, contractName) {
  for (const log of receipt.logs) {
    try {
      const iface = await loadIface(artifactPath);
      const parsed = iface.parseLog(log);
      if (parsed?.name === "AccessControlChanged") {
        console.log(`${contractName}:`, parsed.args.newAccesControl);
      }
    } catch (error) {
      // Ignore parsing errors
    }
  }
}
