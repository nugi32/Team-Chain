const navToggle = document.getElementById('navToggle');
    const sideNav = document.getElementById('sideNav');
    const overlay = document.getElementById('overlay');
    const navClose = document.getElementById('navClose');

    function openNav(){
      sideNav.classList.add('open');
      overlay.classList.add('visible');
      navToggle.setAttribute('aria-expanded','true');
      sideNav.setAttribute('aria-hidden','false');
    }
    function closeNav(){
      sideNav.classList.remove('open');
      overlay.classList.remove('visible');
      navToggle.setAttribute('aria-expanded','false');
      sideNav.setAttribute('aria-hidden','true');
    }

    navToggle.addEventListener('click', ()=>{
      if(sideNav.classList.contains('open')) closeNav(); else openNav();
    });
    navClose.addEventListener('click', closeNav);
    overlay.addEventListener('click', closeNav);
    // close on Escape
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeNav(); });

    // =========================================================
// MetaMask Connection
// =========================================================

// element
const connectWallet = document.getElementById('connectWallet');
const walletAddress = document.getElementById('walletAddress');

// cek apakah MetaMask ada
async function checkMetaMask() {
  if (typeof window.ethereum === 'undefined') {
    alert("MetaMask tidak ditemukan! Install di Chrome Web Store.");
    return false;
  }
  return true;
}

// connect ke MetaMask
async function connectMetaMask() {
  if (!(await checkMetaMask())) return;

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    const account = accounts[0];

    // tampilkan 0xabc...cdef
    walletAddress.textContent =
      account.substring(0, 6) + "..." + account.substring(account.length - 4);

    connectWallet.textContent = "Connected";

  } catch (err) {
    console.error("User rejected:", err);
  }
}

// klik tombol
connectWallet.addEventListener('click', connectMetaMask);

// jika user ganti account dari MetaMask
if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length > 0) {
      const acc = accounts[0];
      walletAddress.textContent =
        acc.substring(0, 6) + "..." + acc.substring(acc.length - 4);
    } else {
      walletAddress.textContent = "";
      connectWallet.textContent = "Connect Wallet";
    }
  });
}

  