/* globals ethers, WalletConnectProvider, QRCode */

let provider = null; // ethers provider (Web3Provider)
let rawProvider = null; // underlying provider (window.ethereum or walletconnect)
let signer = null;
let currentAddress = null;
let wcProviderInstance = null;

// elements
const connectBtn = document.getElementById('connect-btn');
const connectArea = document.getElementById('connect-area');
const modal = document.getElementById('modal');
const mmBtn = document.getElementById('mm');
const wcBtn = document.getElementById('wc');
const modalClose = document.getElementById('modal-close');
const info = document.getElementById('info');
const balanceEl = document.getElementById('balance');
const networkEl = document.getElementById('network');
const addressEl = document.getElementById('address');
const btnCopy = document.getElementById('btn-copy');
const btnQr = document.getElementById('btn-qrcode');
const btnExplorer = document.getElementById('btn-explorer');
const btnSwitch = document.getElementById('btn-switch');
const btnDisconnect = document.getElementById('btn-disconnect');
const qrModal = document.getElementById('qr-modal');
const qrClose = document.getElementById('qr-close');

function openModal(){ modal.classList.remove('hidden'); }
function closeModal(){ modal.classList.add('hidden'); }

connectBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);

mmBtn.addEventListener('click', async () => {
  closeModal();
  await connectMetaMask();
});

wcBtn.addEventListener('click', async () => {
  closeModal();
  await connectWalletConnect();
});

btnCopy.addEventListener('click', () => {
  if (!currentAddress) return;
  navigator.clipboard.writeText(currentAddress).then(()=>{
    btnCopy.textContent = 'Copied';
    setTimeout(()=> btnCopy.textContent = 'Copy', 1200);
  });
});

btnQr.addEventListener('click', ()=>{
  if(!currentAddress) return;
  openQR();
});

qrClose.addEventListener('click', ()=>{
  qrModal.classList.add('hidden');
  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = '';
});

btnExplorer.addEventListener('click', ()=>{
  if(!currentAddress) return;
  // use Etherscan for mainnet; modify if using testnet
  const url = `https://etherscan.io/address/${currentAddress}`;
  window.open(url, '_blank', 'noopener');
});

btnSwitch.addEventListener('click', async ()=>{
  // try switching to Sepolia as example
  if(!rawProvider || !rawProvider.request){ alert('Wallet does not support programmatic switching'); return; }
  try{
    await rawProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] }); // 11155111 sepolia
    // refresh network display
    if(provider) updateUi();
  }catch(err){
    console.warn('Switch failed', err);
    alert('Switch failed: ' + (err.message || err));
  }
});

btnDisconnect.addEventListener('click', async ()=>{
  await disconnect();
});

async function connectMetaMask(){
  if(!window.ethereum){ alert('MetaMask (or any injected wallet) not found in this browser.'); return; }
  try{
    rawProvider = window.ethereum;
    provider = new ethers.providers.Web3Provider(rawProvider);
    await provider.send('eth_requestAccounts', []);
    signer = provider.getSigner();
    const address = await signer.getAddress();
    onConnected(address);
    // listen for account changes
    rawProvider.on && rawProvider.on('accountsChanged', handleAccountsChanged);
    rawProvider.on && rawProvider.on('chainChanged', ()=> updateUi());
  }catch(err){
    console.error(err);
    alert('Connection failed: ' + (err.message||err));
  }
}

async function connectWalletConnect(){
  if(typeof WalletConnectProvider === 'undefined'){ alert('WalletConnect Provider missing'); return; }
  try{
    // Try to get UMD export
    const WCP = (window.WalletConnectProvider && window.WalletConnectProvider.default) ? window.WalletConnectProvider.default : window.WalletConnectProvider;
    // Minimal RPC mapping (public endpoints) - you can replace with your own rpc endpoints
    const rpc = {
      1: 'https://rpc.ankr.com/eth',
      11155111: 'https://rpc.ankr.com/eth_sepolia'
    };
    wcProviderInstance = new WCP({ rpc });
    // enable session (opens QR modal from provider)
    await wcProviderInstance.enable();
    rawProvider = wcProviderInstance;
    provider = new ethers.providers.Web3Provider(rawProvider);
    signer = provider.getSigner();
    const address = await signer.getAddress();
    onConnected(address);
    rawProvider.on && rawProvider.on('accountsChanged', handleAccountsChanged);
    rawProvider.on && rawProvider.on('disconnect', async ()=>{ await disconnect(); });
  }catch(err){
    console.error('WC connect error', err);
    alert('WalletConnect connection failed: ' + (err.message || err));
  }
}

async function onConnected(address){
  currentAddress = address;
  // Replace connect button with connected UI
  connectArea.innerHTML = ''; // remove connect button
  info.classList.remove('hidden');
  updateUi();
}

async function updateUi(){
  if(!provider || !currentAddress) return;
  try{
    const bal = await provider.getBalance(currentAddress);
    balanceEl.textContent = `${ethers.utils.formatEther(bal).slice(0, 8)} ETH`;
    const network = await provider.getNetwork();
    networkEl.textContent = network.name + ` (chainId: ${network.chainId})`;
    addressEl.textContent = shorten(currentAddress);
  }catch(err){
    console.error('updateUi err', err);
  }
}

function shorten(addr){ if(!addr) return ''; return addr.slice(0,6) + '...' + addr.slice(-4); }

function handleAccountsChanged(accounts){
  if(!accounts || accounts.length === 0){ // disconnected
    disconnect();
    return;
  }
  currentAddress = accounts[0];
  updateUi();
}

async function disconnect(){
  try{
    if(wcProviderInstance){
      await wcProviderInstance.disconnect();
      wcProviderInstance = null;
    }
  }catch(e){ console.warn('Error disconnecting wc', e); }

  // clear state
  provider = null; rawProvider = null; signer = null; currentAddress = null;
  info.classList.add('hidden');
  // restore connect button
  connectArea.innerHTML = '<button id="connect-btn" class="btn btn-secondary btn-sm">Connect Wallet</button>';
  const newBtn = document.getElementById('connect-btn');
  newBtn.addEventListener('click', openModal);
}

function openQR(){
  qrModal.classList.remove('hidden');
  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, { text: currentAddress, width: 200, height:200 });
}

// auto-detect previously connected injected wallet (best-effort)
(function tryAutoConnect(){
  // small convenience: if window.ethereum has selectedAddress, use it as connected state
  if(window.ethereum && window.ethereum.selectedAddress){
    // won't auto authorize, but populate UI after request
    // do nothing to avoid prompt; user can click connect
  }
})();

// Expose for debugging
window._walletDemo = { connectMetaMask, connectWalletConnect, disconnect };
