import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

/*
  AccessControl-connector.example.js
  - This is an example / template you can copy and adapt.
  - It uses safe checks before attaching listeners so pages without forms won't throw.
  - Assumes `window.getConnectedAddress()` exists and returns { signer }.
*/

console.log("📦 AccessControl-connector (example) loaded");

const ARTIFACT_PATH = "./artifact/AccessControl.json";
const CONTRACT_ADDRESS = "0x2ed7D97868f04782342C3dBd2682A191cb391788"; // replace with your address

async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

async function getContract() {
  const { signer } = await window.getConnectedAddress();
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

document.addEventListener('DOMContentLoaded', () => {
  // assign form (example)
  const assignForm = document.querySelector('.assign-form');
  if (assignForm) {
    assignForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const addr = e.target.assignEmployee.value.trim();
        if (!ethers.utils.isAddress(addr)) throw new Error('Invalid address');

        const contract = await getContract();
        const tx = await contract.assignNewEmployee(addr);
        await tx.wait();
        alert('Employee assigned');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Assign failed');
      }
    });
  }

  // remove form (example)
  const removeForm = document.querySelector('.remove-form');
  if (removeForm) {
    removeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const addr = e.target.removeEmployee.value.trim();
        if (!ethers.utils.isAddress(addr)) throw new Error('Invalid address');

        const contract = await getContract();
        const tx = await contract.removeEmployee(addr);
        await tx.wait();
        alert('Employee removed');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Remove failed');
      }
    });
  }
});

export default {};
