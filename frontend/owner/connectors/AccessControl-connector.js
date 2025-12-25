import { ethers, BrowserProvider } from "ethers";
import { modal } from "../../global/connectwallet.js";
import { ACCESS_CONTROL, CONTRACT_ADDRESS } from "../../global/AddressConfig.js";
import { isRegistered } from "../../global/helper.js";
import { withUI } from "../../global-Ux/loading-ui";

console.log("📦 Access Control loaded");

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

const ARTIFACT_PATH = "../global/artifact/AccessControl.json";
const MAIN_ARTIFACT_PATH = "../global/artifact/TrustlessTeamProtocol.json";

// ==============================
// CONTRACT INSTANCE
// ==============================
async function getContract(signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(ACCESS_CONTROL, artifact.abi, signer);
}

async function mainGetContract(signer) {
  const artifact = await loadABI(MAIN_ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// =====================================================
// EXPORTED FUNCTIONS
// =====================================================

/**
 * Assign a new employee
 * @param {string} employeeAddr - Employee address to assign
 */
export async function assignEmployee(employeeAddr) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    if (!ethers.isAddress(employeeAddr)) throw new Error("Invalid address");

    const MainContract = await mainGetContract(signer);
    const addr = await signer.getAddress();

    const isRegister = await isRegistered(MainContract, addr);
    if (isRegister) {
      throw new Error("Employee address is user")
    }

    const contract = await getContract(signer);
    const tx = await contract.assignNewEmployee(employeeAddr);
    const receipt = await tx.wait();

    Notify.success(`Employee assigned ${employeeAddr}`);
    return receipt;
  });
}

/**
 * Remove an employee
 * @param {string} employeeAddr - Employee address to remove
 */
export async function removeEmployee(employeeAddr) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    if (!ethers.isAddress(employeeAddr)) throw new Error("Invalid address");

    const contract = await getContract(signer);
    const tx = await contract.removeEmployee(employeeAddr);
    const receipt = await tx.wait();

    Notify.success(`Employee removed ${employeeAddr}`);
    return receipt;
  });
}

/**
 * Change contract owner
 * @param {string} newOwnerAddr - New owner address
 */
export async function changeOwner(newOwnerAddr) {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    if (!ethers.isAddress(newOwnerAddr)) throw new Error("Invalid address");

    const contract = await getContract(signer);
    const tx = await contract.changeOwner(newOwnerAddr);
    const receipt = await tx.wait();

    Notify.success(`Owner Changed ${newOwnerAddr}`);
    return receipt;
  });
}

/**
 * Get employee count
 */
export async function getEmployeeCount() {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const contract = await getContract(signer);
    const count = await contract.employeeCount();

    Notify.success(`Employee count: ${count}`);
    return count;
  });
}

/**
 * Get owner address
 */
export async function getOwnerAddress() {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const contract = await getContract(signer);
    const ownerAddr = await contract.owner();

    Notify.success(`Owner address: ${ownerAddr}`);
    return ownerAddr;
  });
}

/**
 * Check if current user has employee role
 */
export async function checkHasRole() {
  return withUI(async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Wallet not connected");

    const addr = await signer.getAddress();
    const contract = await getContract(signer);
    const hasRole = await contract.hasRole(addr);

    if (hasRole) {
      Notify.success(`Roles: Employee`);
      return true;
    } else {
      throw new Error(`Your address not assigned`);
    }
  });
}