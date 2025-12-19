export async function waitForWallet(options = {}) {
  const {
    interval = 300,
    loadingText = "Waiting for wallet connection..."
  } = options;

  UI.showLoading(loadingText);

  let signer = null;

  while (!signer) {
    signer = await window.wallet?.getSigner();
    if (!signer) {
      await new Promise(r => setTimeout(r, interval));
    }
  }

  UI.hideLoading();
  return signer;
}
