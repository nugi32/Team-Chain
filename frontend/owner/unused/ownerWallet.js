console.log("ownerWallet.js loaded");
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

(function(){
  // Simple frontend using ethers v6 (UMD global `ethers`).
  // Expects to be served from repo root so it can fetch artifact JSON from /artifacts/.. paths.

  const connectBtn = document.getElementById('connectBtn');
  const accountSpan = document.getElementById('account');

  let provider = null;
  let signer = null;
  let userAddress = null;
  let loadedArtifacts = {};

  async function connectWallet(){
    if(!window.ethereum){
      alert('No injected wallet detected (MetaMask). Please install or use a dapp browser.');
      return;
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    try{
      await provider.send('eth_requestAccounts', []);
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();
      accountSpan.textContent = userAddress;
      connectBtn.textContent = 'Connected';
      connectBtn.disabled = true;
    }catch(e){
      console.error(e);
      alert('Failed to connect wallet: '+(e.message||e));
    }
  }

  connectBtn.addEventListener('click', connectWallet);

})();
