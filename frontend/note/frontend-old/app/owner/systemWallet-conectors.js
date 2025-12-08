import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

console.log("📦 ownerWallet.js loaded");

// ----------------------
// LOAD ABI
// ----------------------
async function loadABI(path) {
  const res = await fetch(path);
  return res.json();
}

const ARTIFACT_PATH = "./artifact/System_wallet.json";
const CONTRACT_ADDRESS = "0x379f85F767b5fc2187fdC6E054C6196480fD649D";

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


  // =====================================
  // =========== SYSTEM WALLET ===========
  // =====================================
document.querySelector(".transfer-form").addEventListener("submit", async (e) => {
  e.preventDefault(); // Mencegah reload page saat submit

  try {
    const toAddress = e.target.toAddress.value.trim();
    const amount = e.target.amount.value.trim();

    // Validasi address
    if (!ethers.utils.isAddress(toAddress)) throw new Error("⚠ Address tidak valid");

    // Validasi jumlah transfer
    if (!amount || isNaN(amount) || Number(amount) <= 0) throw new Error("⚠ Amount tidak valid");

    const contract = await getContract(); // Ambil instance kontrak
    console.log("📨 transferFunds:", { toAddress, amount });

    // Kirim transaksi ke blockchain
    const tx = await contract.transfer(toAddress, ethers.utils.parseEther(amount));
    await tx.wait();

    alert("✔ Transfer berhasil!");
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

// See Contract Balance
document.getElementById("checkBalanceBtn").addEventListener("click", async () => {
  try {
    const contract = await getContract(); // Ambil instance kontrak
    const balance = await contract.seeBalances(); // Asumsikan fungsi di kontrak: getBalance()
    
    // Ubah format balance menjadi Ether
    const formatted = ethers.utils.formatEther(balance);
    alert(`💰 Contract Balance: ${formatted} ETH`);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

});
