import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

console.log("📦 accessControl.js loaded");

// ----------------------
// LOAD ABI
// ----------------------
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "./artifact/EmployeeAssignment.json";
const CONTRACT_ADDRESS = "0xB9431eA629D0a325cacF58ece2d6BbAcd0B8705C";

// ----------------------
// CONTRACT INSTANCE
// ----------------------
async function getContract() {
  const { signer } = await window.getConnectedAddress();
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ----------------------
// DOM + EVENT LISTENER
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("📌 DOM ready");

  // Assign Employee
  document.querySelector(".assign-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const employeeAddr = e.target.assignEmployee.value.trim();
      if (!ethers.utils.isAddress(employeeAddr)) throw new Error("⚠ Address tidak valid");

      const contract = await getContract();
      console.log("📨 assignNewEmployee:", employeeAddr);

      const tx = await contract.assignNewEmployee(employeeAddr);
      await tx.wait();

      alert("✔ Employee assigned");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // Remove Employee
  document.querySelector(".remove-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const employeeAddr = e.target.removeEmployee.value.trim();
      if (!ethers.utils.isAddress(employeeAddr)) throw new Error("⚠ Address tidak valid");

      const contract = await getContract();
      const tx = await contract.removeEmployee(employeeAddr);
      await tx.wait();

      alert("✔ Employee removed");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // Change Owner
  document.querySelector(".change-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const newOwnerAddr = e.target.changeOwner.value.trim();
      if (!ethers.utils.isAddress(newOwnerAddr)) throw new Error("⚠ Address tidak valid");

      const contract = await getContract();
      const tx = await contract.changeOwner(newOwnerAddr);
      await tx.wait();

      alert("✔ Owner changed!");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

});
