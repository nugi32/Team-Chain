import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

console.log("📦 Contrac tUtils loaded");

/***************************************
 * 2. Load Smart Contract ABI (Helper)
 ***************************************/
async function loadABI(path) {
  const res = await fetch(path);  // Loads JSON from file
  return res.json();
}

// Contract ABI paths & addresses
const SystemWallet_ARTIFACT = "./artifact/System_wallet.json";
const SystemWallet_ADDRESS = "0x1C6f816B036d389b76557CB9577E16C44360E029";

const StateVar_ARTIFACT = "./artifact/stateVariable.json";
const StateVar_ADDRESS = "0x2d6410f1cF12998CEC5eD1F95C484ca395818773";

const MainContract_ARTIFACT = "./artifact/TrustlessTeamProtocol.json";
const MainContract_ADDRESS = "0x80e7F58aF8b9E99743a1a20cd0e706B9F6c3149d";

/***************************************
 * 3. Get Contract Instance
 ***************************************/
async function getContract(ARTIFACT_PATH, CONTRACT_ADDRESS, signer) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

/***************************************
 * 4. Load Interface Instance (For Events)
 ***************************************/
async function loadIface(ARTIFACT_PATH) {
  const artifact = await loadABI(ARTIFACT_PATH);
  return new ethers.Interface(artifact.abi);
}


  /***************************************
   * 5. Change Access Control Address
   ***************************************/
  document.querySelector(".changeAccessControl")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }
      const newAccesControl = e.target.changeAccessControlAddress.value.trim();

      // System Wallet Contract
      const SystemWalletContract = await getContract(SystemWallet_ARTIFACT, SystemWallet_ADDRESS, signer);
      const tx1 = await SystemWalletContract.changeAccessControl(newAccesControl);
      const receipt1 = await tx1.wait();
      console.log("System Wallet Access Control Changed:", receipt1);

      // State Variable Contract
      const StateVarContract = await getContract(StateVar_ARTIFACT, StateVar_ADDRESS, signer);
      const tx2 = await StateVarContract.changeAccessControl(newAccesControl);
      const receipt2 = await tx2.wait();
      console.log("State Variables Access Control Changed:", receipt2);

      // Main Contract
      const MainContract = await getContract(MainContract_ARTIFACT, MainContract_ADDRESS, signer);
      const tx3 = await MainContract.changeAccessControl(newAccesControl);
      const receipt3 = await tx3.wait();
      console.log("Main Contract Access Control Changed:", receipt3);

      alert("access control addresses changed successfully:", $newAccesControl);

      // Event Parsing: System Wallet
      for (const log of receipt.logs) {
        try {
          const Iface1 = await loadIface(SystemWallet_ARTIFACT);
          const parsed = Iface1.parseLog(log);
          if (parsed?.name === "AccessControlChanged") {
            console.log("System Wallet Access Control Changed:", parsed.args.newAccesControl);
          }
        } catch {}
      }

      // Event Parsing: State Variables
      for (const log of receipt.logs) {
        try {
          const Iface2 = await loadIface(StateVar_ARTIFACT);
          const parsed = Iface2.parseLog(log);
          if (parsed?.name === "AccessControlChanged") {
            console.log("State Variable Access Control Changed:", parsed.args.newAccesControl);
          }
        } catch {}
      }

      // Event Parsing: Main Contract
      for (const log of receipt.logs) {
        try {
          const Iface3 = await loadIface(MainContract_ARTIFACT);
          const parsed = Iface3.parseLog(log);
          if (parsed?.name === "AccessControlChanged") {
            console.log("Main Contract Access Control Changed:", parsed.args.newAccesControl);
          }
        } catch {}
      }

    } catch (err) {
      console.error("Error changing access control:", err);
      alert("An error occurred while changing access control address.");
    }
  });

  /***************************************
   * 6. Pause All Contracts
   ***************************************/
  document.getElementById("pauseBtn").addEventListener("click", async () => {
    try {

      const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }
      const SystemWalletContract = await getContract(SystemWallet_ARTIFACT, SystemWallet_ADDRESS, signer);
      const tx1 = await SystemWalletContract.pause();
      const receipt1 = await tx1.wait();
      console.log("System Wallet Contract Paused:", receipt1);

      const StateVarContract = await getContract(StateVar_ARTIFACT, StateVar_ADDRESS, signer);
      const tx2 = await StateVarContract.pause();
      const receipt2 = await tx2.wait();
      console.log("State Variable Contract Paused:", receipt2);

      const MainContract = await getContract(MainContract_ARTIFACT, MainContract_ADDRESS, signer);
      const tx3 = await MainContract.pause();
      const receipt3 = await tx3.wait();
      console.log("Main Contract Paused:", receipt3);

      alert("All System Has Successfuly Paused");

      // Event → System Wallet
      for (const log of receipt1.logs) {
        try {
          const Iface1 = await loadIface(SystemWallet_ARTIFACT);
          const parsed = Iface1.parseLog(log);
          if (parsed?.name === "ContractPaused") {
            console.log("System Wallet Contract Paused !");
          }
        } catch {}
      }

      // Event → State Variables
      for (const log of receipt2.logs) {
        try {
          const Iface2 = await loadIface(StateVar_ARTIFACT);
          const parsed = Iface2.parseLog(log);
          if (parsed?.name === "ContractPaused") {
            console.log("State Variable Contract Paused !");
          }
        } catch {}
      }

      // Event → Main Contract
      for (const log of receipt3.logs) {
        try {
          const Iface3 = await loadIface(MainContract_ARTIFACT);
          const parsed = Iface3.parseLog(log);
          if (parsed?.name === "ContractPaused") {
            console.log("Main Contract Paused !");
          }
        } catch {}
      }

    } catch (err) {
      console.error("An Error Occurred While Paused Contract:", err);
      alert("An Error Occurred While Paused Contract.");
    }
  });

  /***************************************
   * 7. Unpause All Contracts
   ***************************************/
  document.getElementById("unpauseBtn").addEventListener("click", async () => {
    try {

      const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }
      const SystemWalletContract = await getContract(SystemWallet_ARTIFACT, SystemWallet_ADDRESS, signer);
      const tx1 = await SystemWalletContract.unpause();
      const receipt1 = await tx1.wait();
      console.log("System Wallet Contract UnPaused:", receipt1);

      const StateVarContract = await getContract(StateVar_ARTIFACT, StateVar_ADDRESS, signer);
      const tx2 = await StateVarContract.unpause();
      const receipt2 = await tx2.wait();
      console.log("State Variable Contract UnPaused:", receipt2);

      const MainContract = await getContract(MainContract_ARTIFACT, MainContract_ADDRESS, signer);
      const tx3 = await MainContract.unpause();
      const receipt3 = await tx3.wait();
      console.log("Main Contract UnPaused:", receipt3);

      alert("All System Has Successfuly UnPaused");

      // Event → System Wallet
      for (const log of receipt1.logs) {
        try {
          const Iface1 = await loadIface(SystemWallet_ARTIFACT);
          const parsed = Iface1.parseLog(log);
          if (parsed?.name === "ContractUnpaused") {
            console.log("System Wallet Contract Unpaused !");
          }
        } catch {}
      }

      // Event → State Variables
      for (const log of receipt2.logs) {
        try {
          const Iface2 = await loadIface(StateVar_ARTIFACT);
          const parsed = Iface2.parseLog(log);
          if (parsed?.name === "ContractPaused") {
            console.log("State Vaiable Contract Unpaused !");
          }
        } catch {}
      }

      // Event → Main Contract
      for (const log of receipt3.logs) {
        try {
          const Iface3 = await loadIface(MainContract_ARTIFACT);
          const parsed = Iface3.parseLog(log);
          if (parsed?.name === "ContractPaused") {
            console.log("Main Contract Unpaused !");
          }
        } catch {}
      }

    } catch (err) {
      console.error("An Error Occurred While UnPaused Contract:", err);
      alert("An Error Occurred While UnPaused Contract.");
    }
  });

  /***************************************
   * 8. Check Paused Status
   ***************************************/
  document.getElementById("checkPausedBtn").addEventListener("click", async () => {
    try {

      const signer = await window.wallet.getSigner();
      
      if (!signer) {
        console.error("No signer available. Please connect wallet.");
        return;
      }
      const SystemWalletContract = await getContract(SystemWallet_ARTIFACT, SystemWallet_ADDRESS, signer);
      const tx1 = await SystemWalletContract.paused();
      console.log("System Wallet Contract Checked:", tx1);

      const StateVarContract = await getContract(StateVar_ARTIFACT, StateVar_ADDRESS, signer);
      const tx2 = await StateVarContract.paused();
      console.log("State Variable Contract Checked:", tx2);

      const MainContract = await getContract(MainContract_ARTIFACT, MainContract_ADDRESS, signer);
      const tx3 = await MainContract.paused();
      console.log("Main Contract UnPaused:", tx3);

      alert("All System Has Successfuly Checked");

    } catch (err) {
      console.error("An Error Occurred While Checked Contract:", err);
      alert("An Error Occurred While Checked Contract.");
    }
  });