
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
console.log("📦 owner wallet loaded");

// -----------------------------------------------------
// WEB3MODAL + WAGMI CONFIG
// -----------------------------------------------------
import {
  createWeb3Modal,
  defaultWagmiConfig
} from "https://esm.sh/@web3modal/wagmi";

import { sepolia } from "https://esm.sh/wagmi/chains";

const projectId = "52a9a44c36c9cf0288d553c34e8a662d";

const metadata = {
  name: "My Wallet UI",
  description: "Wallet Connect",
  url: window.location.origin,
  icons: ["https://avatars.githubusercontent.com/u/37784886"]
};

const chains = [sepolia];

export const wagmiConfig = defaultWagmiConfig({
  projectId,
  metadata,
  chains
});

createWeb3Modal({
  wagmiConfig,
  projectId,
  themeMode: "light",
  chains,
  defaultChain: sepolia
});



// -----------------------------------------------------
// WATCH ACCOUNT + GET SIGNER
// -----------------------------------------------------
import { watchAccount, getWalletClient } from "https://esm.sh/wagmi/actions";

// Simpan di global window untuk akses dari file lain
window.wallet = {
  currentAddress: null,
  currentSigner: null,
  provider: null,
  
  // Fungsi untuk mendapatkan signer
  async getSigner() {
    try {
      const walletClient = await getWalletClient(wagmiConfig);
      if (!walletClient) return null;
      
      // Konversi WalletClient viem ke ethers.js Signer
      const { BrowserProvider } = ethers;
      const provider = new BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();
      
      this.currentSigner = signer;
      this.provider = provider;
      return signer;
    } catch (error) {
      console.error("Error getting signer:", error);
      return null;
    }
  },
  
  // Fungsi untuk mendapatkan alamat saat ini
  async getAddress() {
    const signer = await this.getSigner();
    if (!signer) return null;
    return await signer.getAddress();
  }
};

// Watch account changes
watchAccount(wagmiConfig, {
  onChange: async (data) => {
    console.log("Account changed:", data.address);
    window.wallet.currentAddress = data.address || null;
    
    if (data.address) {
      // Update signer ketika account berubah
      await window.wallet.getSigner();
    } else {
      // Reset signer ketika disconnected
      window.wallet.currentSigner = null;
      window.wallet.provider = null;
    }
  }
});

// Export untuk digunakan di file lain
export async function getWalletSigner() {
  return await window.wallet.getSigner();
}

export async function getWalletAddress() {
  return await window.wallet.getAddress();
}








//ambil di every funct







/*
// -----------------------------------------------------
// GET CONNECTED ADDRESS + SIGNER (Ethers v6 safe)
// -----------------------------------------------------
window.getConnectedAddress = async function () {
  try {
    const acc = getAccount(wagmiConfig);

    // Jika belum connect → buka Web3Modal
    if (!acc?.isConnected || !acc?.address) {
      document.querySelector("w3m-button").click();
      throw new Error("Please connect wallet first.");
    }

    // Ambil client asli dari Wagmi
    const client = await getWalletClient({ chainId: acc.chainId });
    if (!client) throw new Error("Wallet client missing.");

    // Pakai provider dari MetaMask (harus untuk signing)
    if (!window.ethereum) {
      throw new Error("No injected provider available.");
    }
    const provider = new ethers.BrowserProvider(window.ethereum);

    // Signer yg berasal dari MetaMask
    const signer = await provider.getSigner(acc.address);

    window.currentAddress = acc.address;
    window.currentSigner = signer;

    return { address: acc.address, signer };
  } catch (err) {
    console.error("getConnectedAddress ERROR:", err);
    throw err;
  }
};


window.requireSigner = async function () {
  const { signer } = await window.getConnectedAddress();
  if (!signer) throw new Error("Signer unavailable.");
  return { signer };
};

window.getMetaMaskSigner = async function () {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected.");
  }

  // Provider langsung dari MetaMask
  const provider = new ethers.BrowserProvider(window.ethereum);

  // Trigger connect jika belum connect
  try {
    await provider.send("eth_requestAccounts", []);
  } catch (err) {
    console.error("MetaMask connect rejected:", err);
    throw new Error("Please connect MetaMask.");
  }

  // Ambil signer asli
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  console.log("Signer connected:", address);
  return signer;
};*/
