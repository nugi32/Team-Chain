
/*
window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("testAddress");

  if (!btn) {
    console.log("Tombol test tidak ditemukan!");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("Current address:", window.currentAddress);

    if (!window.currentAddress) {
      alert("Address: " + window.currentAddress);
    } else {
      alert("Address: " + window.currentAddress);
    }
  });
});*/
import { getAccount, getWalletClient } from "https://esm.sh/@wagmi/core";
import { ethers } from "https://esm.sh/ethers";

// Fungsi untuk update UI tombol dan address
function setupWalletUI() {
  const walletInfo = document.getElementById("walletInfo");
  const signBtn = document.getElementById("signTestBtn");

  if (!walletInfo || !signBtn) return false;

  const updateUI = () => {
    const acc = getAccount();
    if (acc.isConnected) {
      walletInfo.textContent =
        acc.address.slice(0, 6) + "..." + acc.address.slice(-4);
      signBtn.style.display = "inline-block";
    } else {
      walletInfo.textContent = "";
      signBtn.style.display = "none";
    }
  };

  // Event listener sign
  signBtn.addEventListener("click", async () => {
    const acc = getAccount();
    if (!acc.isConnected) return alert("Wallet belum connect");

    const walletClient = await getWalletClient();
    const signer = await new ethers.BrowserProvider(
      walletClient.transport
    ).getSigner();

    const signature = await signer.signMessage("Test Sign Message");
    alert("Signed! Lihat console");
    console.log("Signature:", signature);
  });

  // Event listener Web3Modal
  window.addEventListener("w3m:connected", updateUI);
  window.addEventListener("w3m:disconnected", updateUI);

  updateUI(); // langsung cek saat load
  return true;
}

// MutationObserver tunggu header selesai load
const observer = new MutationObserver(() => {
  if (setupWalletUI()) observer.disconnect(); // stop observer begitu berhasil
});

// Observasi seluruh body
observer.observe(document.body, { childList: true, subtree: true });
