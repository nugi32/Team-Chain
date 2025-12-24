
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
console.log("📦 owner wallet loaded");

// -----------------------------------------------------
// WEB3MODAL + WAGMI CONFIG
// -----------------------------------------------------
import { createConfig, configureChains } from "https://esm.sh/@wagmi/core@2.12.5";
import { injected, walletConnect } from "https://esm.sh/wagmi/connectors";
import { sepolia } from "https://esm.sh/viem@2.19.6/chains";
import { publicClient } from "https://esm.sh/@wagmi/core@2.12.5";

const chains = [sepolia];

const { publicClient: pc } = configureChains(chains, []);

const wagmiConfig = createConfig({
  connectors: [
    injected({ chains }),
    walletConnect({ chains, projectId: "52a9a44c36c9cf0288d553c34e8a662d" }),
  ],
  publicClient: pc,
});


/*
// -----------------------------------------------------
// WATCH ACCOUNT + GET SIGNER
// -----------------------------------------------------
import { watchAccount, getWalletClient } from "https://esm.sh/@wagmi/core@latest/actions";

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
}*/