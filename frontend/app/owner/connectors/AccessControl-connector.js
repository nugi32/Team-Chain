import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

console.log("📦 Access Control loaded");

// ==============================
// 2. LOAD ABI FROM JSON FILE
// ==============================
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "./artifact/AccessControl.json";
const CONTRACT_ADDRESS = "0xF5215fFf0bBD334B8C73813a69839AF4a3De8989";

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
  NotOwner: "Access Control: Action not allowed — only the contract owner can perform this operation.",
  ZeroAddress: "Access Control: Invalid address — the zero address (0x000...0) is not allowed.",
  AlredyHaveRole: "Access Control: Operation failed — the account already has that role.",
  DoesNotHaveRole: "Access Control: Operation failed — the account does not have the required role.",
  OwnerCannotBeEmployee: "Access Control: Invalid operation — the contract owner cannot be assigned as an employee."
};

// ==============================
// 5. ERROR SELECTOR LOOKUP TABLE
// ==============================
const selectorMap = {
  "0x3797687a": "NotOwner",
  "0x30cd7471": "NotOwner",
  "0x1b4ce173": "ZeroAddress",
  "0x69119ae0": "AlredyHaveRole",
  "0xC2d3accf": "DoesNotHaveRole",
  "0x4df6bedc": "OwnerCannotBeEmployee"
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

// =====================================================
// 8. ASSIGN EMPLOYEE FORM HANDLER
// =====================================================
document.querySelector(".assign-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {

    const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }
    const employeeAddr = e.target.assignEmployee.value.trim();

    // Validate address format
    if (!ethers.isAddress(employeeAddr)) alert("⚠ Invalid Address");

    const contract = await getContract(signer);
    const tx = await contract.assignNewEmployee(employeeAddr);
    const receipt = await tx.wait();

    // Decode EmployeeAssigned event
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

// =====================================================
// 9. REMOVE EMPLOYEE FORM HANDLER
// =====================================================
document.querySelector(".remove-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
      const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }
    const employeeAddr = e.target.removeEmployee.value.trim();

    if (!ethers.isAddress(employeeAddr)) throw new Error("⚠ Address tidak valid");

    const contract = await getContract(signer);
    const tx = await contract.removeEmployee(employeeAddr);
    const receipt = await tx.wait();

    // Decode EmployeeRemoved event
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

// =====================================================
// 10. CHANGE OWNER FORM HANDLER
// =====================================================
document.querySelector(".change-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {

      const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }
    const newOwnerAddr = e.target.changeOwner.value.trim();

    if (!ethers.isAddress(newOwnerAddr)) throw new Error("⚠ Address tidak valid");

    const contract = await getContract(signer);
    const tx = await contract.changeOwner(newOwnerAddr);
    const receipt = await tx.wait();

    // Decode OwnerChanged event
    const iface = new ethers.Interface([
      "event OwnerChanged(address indexed oldOwner, address indexed newOwner)"
    ]);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "OwnerChanged") {
          console.log("📌 EVENT OwnerChanged:", parsed.args.oldOwner, "→", parsed.args.newOwner);
          alert(`✔ Owner changed: ${parsed.args.oldOwner} → ${parsed.args.newOwner}`);
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

    alert("An error occurred while changing owner.");
  }
});

// =====================================================
// 11. BUTTON: GET EMPLOYEE COUNT
// =====================================================
document.getElementById("btnEmployeeCount").addEventListener("click", async () => {
  try {

      const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }

    const contract = await getContract(signer);
    const employeeCount = await contract.employeeCount();
    alert(`✔ Employee Count: ${employeeCount}`);
  } catch (err) {
    console.error(err);
    alert("An error occurred while fetching employee count.");
  }
});

// =====================================================
// 12. BUTTON: GET OWNER ADDRESS
// =====================================================
document.getElementById("owner").addEventListener("click", async () => {
  try {

      const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }

    const contract = await getContract(signer);
    const tx = await contract.owner();
    alert(`✔ Owner Address : ${tx}`);
  } catch (err) {
    alert("An error occurred while fetching owner address.");
  }
});

// =====================================================
// 13. BUTTON: CHECK ROLE OF SIGNER
// =====================================================
document.getElementById("HasRole").addEventListener("click", async () => {
  try {
      const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }
    const contract = await getContract(signer);
    const msg_sender = await signer.getAddress();
    const HasRole = await contract.hasRole(msg_sender);
    alert(`✔ Roles : ${HasRole}`);
  } catch (err) {
    console.error(err);
    alert("An error occurred while checking address roles.");
  }
});
