

// -----------------------------------------------------
// WEB3MODAL + WAGMI CONFIG
// -----------------------------------------------------
import {
  createWeb3Modal,
  defaultWagmiConfig
} from "https://esm.sh/@web3modal/wagmi";

import { sepolia } from "https://esm.sh/wagmi/chains";

// project ID wc v3
const projectId = "52a9a44c36c9cf0288d553c34e8a662d";

const metadata = {
  name: "My Wallet UI",
  description: "Wallet Connect",
  url: window.location.origin,
  icons: ["https://avatars.githubusercontent.com/u/37784886"]
};

// chains
const chains = [sepolia];

// wagmi config
export const wagmiConfig = defaultWagmiConfig({
  projectId,
  metadata,
  chains
});

// init web3modal
createWeb3Modal({
  wagmiConfig,
  projectId,
  themeMode: "light",
  chains,
  defaultChain: sepolia
});

// -----------------------------------------------------
// WATCH ACCOUNT (ADDRESS CHANGES)
// -----------------------------------------------------
import { watchAccount, getAccount, getWalletClient } from "https://esm.sh/wagmi/actions";

window.currentAddress = null;
window.currentSigner = null;

watchAccount(wagmiConfig, {
  onChange(data) {
    console.log("Account changed:", data.address);
    window.currentAddress = data.address || null;
  }
});

// -----------------------------------------------------
// HELPER: RETURN ADDRESS + SIGNER
// -----------------------------------------------------
window.getConnectedAddress = async function () {
  try {
    // kalau sudah connect → return saja
    if (window.currentAddress && window.currentSigner) {
      return {
        address: window.currentAddress,
        signer: window.currentSigner
      };
    }

    // cek akun wagmi
    const acc = getAccount(wagmiConfig);

    // jika belum connect → buka popup w3m
    if (!acc.isConnected) {
      const modal = document.querySelector("w3m-button");
      modal.click(); // buka modal
      throw new Error("Please connect wallet first");
    }

    // ambil wallet client wagmi
    const client = await getWalletClient(wagmiConfig);
    if (!client) throw new Error("No wallet client");

    // signer via ethers
    const provider = new ethers.providers.Web3Provider(client.transport);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    // simpan global
    window.currentAddress = address;
    window.currentSigner = signer;

    return { address, signer };

  } catch (err) {
    console.error("getConnectedAddress ERROR:", err);
    throw err;
  }
};


















/*import {
  createWeb3Modal,
  defaultWagmiConfig
} from "https://esm.sh/@web3modal/wagmi";

import { Web3Modal } from "https://esm.sh/@web3modal/html";
import { sepolia } from "https://esm.sh/wagmi/chains";

const projectId = "52a9a44c36c9cf0288d553c34e8a662d";

const metadata = {
  name: "My Wallet UI",
  description: "Wallet Connect",
  url: window.location.origin,
  icons: ["https://avatars.githubusercontent.com/u/37784886"]
};

const chains = [sepolia];

const wagmiConfig = defaultWagmiConfig({
  projectId,
  metadata,
  chains
});

// Web3Modal – default chain = sepolia
createWeb3Modal({
  wagmiConfig,
  projectId,
  themeMode: "light",
  chains,
  defaultChain: sepolia
});


import { watchAccount } from "https://esm.sh/wagmi/actions";

watchAccount(wagmiConfig, {
  onChange(data) {
    window.currentAddress = data.address;  // ⬅ simpan address global
    console.log("Update address:", data.address);
  }
});

// Expose helper functions to the page for UI buttons
// Returns the currently connected address (requests connection if needed)
window.getConnectedAddress = async function() {
  try {
    if (window.currentAddress && window.currentSigner)
      return window.currentAddress;

    const activeProvider = await getActiveProvider();
    const provider = new window.ethers.providers.Web3Provider(activeProvider);

    // request account
    if (typeof activeProvider.request === 'function') {
      await activeProvider.request({ method: 'eth_requestAccounts' });
    }

    const signer = provider.getSigner();
    const addr = await signer.getAddress();

    // simpan global
    window.currentAddress = addr;
    window.currentSigner = signer;   // ⬅ simpan signer
    window._selectedProvider = activeProvider;

    return addr;
  } catch (err) {
    console.error('getConnectedAddress error', err);
    throw err;
  }
};




/*
52a9a44c36c9cf0288d553c34e8a662d
*/
/*

        document.addEventListener('DOMContentLoaded', () => {
                const btnAddr = document.getElementById('btn-get-address');

                btnAddr.addEventListener('click', async () => {
                    out.textContent = 'Requesting...';
                    try {
                        const addr = await window.getConnectedAddress();
                        out.textContent = addr || 'No address connected';
                    } catch (e) {
                        out.textContent = 'Error: ' + (e && e.message ? e.message : e);
                    }
                });
              });*/