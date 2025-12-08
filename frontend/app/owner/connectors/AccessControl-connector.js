import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { PRIVATE_KEY, ALCHEMY_API_KEY } from "./config.js";

console.log("📦 accessControl.js loaded");

// ======================
// BASIC WALLET CONNECTION
// ======================
const privatekey = PRIVATE_KEY;
const provider = new ethers.JsonRpcProvider(ALCHEMY_API_KEY);
const signer = new ethers.Wallet(privatekey, provider);
console.log("signer address:", signer.address);

// ======================
// LOAD ABI FUNCTION
// ======================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "./artifact/AccessControl.json";
const CONTRACT_ADDRESS = "0x137a4013B700d35df33e8bCA8869F17CC9B5876C";

// ======================
// CONTRACT INSTANCE
// ======================
async function getContract() {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

// ======================
// CUSTOM ERROR MESSAGES
// ======================
const errors_messages = {
  NotOwner: "Access Control: Action not allowed — only the contract owner can perform this operation.",
  ZeroAddress: "Access Control: Invalid address — the zero address (0x000...0) is not allowed.",
  AlredyHaveRole: "Access Control: Operation failed — the account already has that role.",
  DoesNotHaveRole: "Access Control: Operation failed — the account does not have the required role.",
  OwnerCannotBeEmployee: "Access Control: Invalid operation — the contract owner cannot be assigned as an employee."
};

// ======================
// ERROR SELECTOR MAP
// ======================
const selectorMap = {
  "0x3797687a": "NotOwner",
  "0x1b4ce173": "ZeroAddress",
  "0x69119ae0": "AlredyHaveRole",
  "0xC2d3accf": "DoesNotHaveRole",
  "0x4df6bedc": "OwnerCannotBeEmployee"
};

// ======================
// DECODE ERROR FUNCTION
// ======================
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

/***************************************
 * 5. Load Contract Interface
 ***************************************/
let iface;
(async () => {
  // Load contract ABI interface once to parse events
  const artifact = await loadABI(ARTIFACT_PATH);
  iface = new ethers.Interface(artifact.abi);
})();

// ======================
// DOM EVENTS
// ======================
document.addEventListener("DOMContentLoaded", () => {
  console.log("📌 AccessControl DOM Ready");


  // ----------------------
  // ASSIGN EMPLOYEE FORM
  // ----------------------
document.querySelector(".assign-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const employeeAddr = e.target.assignEmployee.value.trim();
        if (!ethers.isAddress(employeeAddr)) alert("⚠ Invalid Address");

        const contract = await getContract();
        const tx = await contract.assignNewEmployee(employeeAddr);
        const receipt = await tx.wait();

        // --- Decode EmployeeAssigned event ---
        const iface = new ethers.Interface([
          "event EmployeeAssigned(address indexed employee)"
        ]);

        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "EmployeeAssigned") {
              console.log("📌 EVENT EmployeeAssigned:", parsed.args.employee);
              alert(`✔ Employee assigned: ${parsed.args.employee}`);
            }
          } catch {}
        }

      } catch (err) {
        // --- Custom Error Decoder ---
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

        alert("An error occurred while assigning employee.");
      }
    });
  });


  // ----------------------
  // REMOVE EMPLOYEE FORM
  // ----------------------
  document.querySelector(".remove-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const employeeAddr = e.target.removeEmployee.value.trim();
        if (!ethers.isAddress(employeeAddr)) throw new Error("⚠ Address tidak valid");

        const contract = await getContract();
        const tx = await contract.removeEmployee(employeeAddr);
        const receipt = await tx.wait();

        // --- Decode EmployeeRemoved event ---
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "EmployeeRemoved") {
              console.log("📌 EVENT EmployeeRemoved:", parsed.args.employee);
              alert(`✔ Employee removed: ${parsed.args.employee}`);
            }
          } catch {}
        }

      } catch (err) {
        // --- Custom Error Decoder ---
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

        alert("An error occurred while removing employee.");
      }
    });
  


  // ----------------------
  // CHANGE OWNER FORM
  // ----------------------
  document.querySelector(".change-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const newOwnerAddr = e.target.changeOwner.value.trim();
      if (!ethers.isAddress(newOwnerAddr)) throw new Error("⚠ Address tidak valid");

      const contract = await getContract();
      const tx = await contract.changeOwner(newOwnerAddr);
      const receipt = await tx.wait();

      // --- Decode OwnerChanged event ---
      const iface = new ethers.Interface([
        "event OwnerChanged(address indexed oldOwner, address indexed newOwner)"
      ]);

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "OwnerChanged") {
            console.log(
              "📌 EVENT OwnerChanged:",
              parsed.args.oldOwner,
              "→",
              parsed.args.newOwner
            );
            alert(`✔ Owner changed: ${parsed.args.oldOwner} → ${parsed.args.newOwner}`);
          }
        } catch {}
      }

    } catch (err) {
      // --- Custom Error Decoder ---
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

      alert("An error occurred while changing owner.");
    }
  });

  document.getElementById("btnEmployeeCount").addEventListener("click", async () => {
    try {
      const contract = await getContract();
      const employeeCount = await contract.employeeCount();
      alert(`✔ Employee Count: ${employeeCount}`);
    } catch (err) {
      console.error(err);
      alert("An error occurred while fetching employee count.");
    }});


  document.getElementById("HasRole").addEventListener("click", async () => {
    try {
      const contract = await getContract();
      const HasRole = await contract.hasRole();
      alert(`✔ Roles : ${HasRole}`);
    } catch (err) {
      console.error(err);
      alert("An error occurred while checking address roles.");
    }});