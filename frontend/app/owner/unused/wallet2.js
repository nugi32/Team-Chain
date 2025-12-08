
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
console.log("📦 owner wallet 2 loaded");

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
// WATCH ACCOUNT
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
// GET CONNECTED ADDRESS + SIGNER (Ethers v6 safe)
// -----------------------------------------------------
window.getConnectedAddress = async function () {
  try {
    if (window.currentAddress && window.currentSigner) {
      return {
        address: window.currentAddress,
        signer: window.currentSigner
      };
    }

    // Prefer injected provider (MetaMask)
    if (window.ethereum && window.ethereum.request) {
      const provider = new ethers.BrowserProvider(window.ethereum);

      try {
        await provider.send("eth_requestAccounts", []);
      } catch (e) {}

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      console.log(signer, address);

      window.currentAddress = address;
      window.currentSigner = signer;
      return { address, signer };
    }

    const acc = getAccount(wagmiConfig);

    if (!acc.isConnected) {
      const modal = document.querySelector("w3m-button");
      modal.click();
      throw new Error("Please connect wallet first");
    }

    let client;
    try {
      client = await getWalletClient();
    } catch (err) {
      console.error('getWalletClient failed', err);
      throw new Error('Failed to get wallet client from wagmi.');
    }

    if (!client) throw new Error("No wallet client");

    if (!client.transport) {
      throw new Error('Wallet client transport is unavailable.');
    }

    const provider = new ethers.BrowserProvider(client.transport);
    let signer = await provider.getSigner();
    let address;

    try {
      address = await signer.getAddress();
    } catch (err) {
      const acc = getAccount(wagmiConfig);
      if (acc && acc.address) {
        address = acc.address;
        try {
          signer = provider.getSigner(address);
        } catch (e) {
          console.warn('provider.getSigner(address) failed', e);
        }
      } else {
        const msg = err?.message || String(err);
        console.error('Could not get address from transport:', msg);
        throw new Error(
          'Connected wallet transport does not expose an address via ethers provider.'
        );
      }
    }

    window.currentAddress = address;
    window.currentSigner = signer;

    return { address, signer };

  } catch (err) {
    console.error("getConnectedAddress ERROR:", err);
    throw err;
  }
};

// requireSigner shim
window.requireSigner = async function () {
  try {
    const res = await window.getConnectedAddress();
    if (!res || !res.signer) throw new Error('Please connect wallet first');
    return res;
  } catch (err) {
    const msg = window.parseEthersError
      ? window.parseEthersError(err)
      : (err.message || String(err));

    if (window.logEvent) window.logEvent('error', 'requireSigner', msg);
    throw err;
  }
};
