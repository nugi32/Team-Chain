/*import { ethers } from "ethers";

// RPC Sepolia
const provider = new ethers.JsonRpcProvider(
  "https://rpc.sepolia.org"
);

// Private key wallet test kamu (bukan mainnet)
const privateKey = "0xYOUR_PRIVATE_KEY_HERE";

// Buat signer
const wallet = new ethers.Wallet(privateKey, provider);

async function main() {
  console.log("Wallet Address:", wallet.address);

  // Cek balance
  const bal = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(bal), "ETH");

  // Kirim TX kecil (opsional)
  // const tx = await wallet.sendTransaction({
  //   to: "0x...", // tujuan
  //   value: ethers.parseEther("0.001")
  // });
  // await tx.wait();
  // console.log("TX done:", tx.hash);
}

main();*/


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

