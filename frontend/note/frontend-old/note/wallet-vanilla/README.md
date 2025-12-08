Wallet Demo (Vanilla JS)

This folder provides a minimal HTML/CSS/JS demo that imitates the Connect Wallet UI from the project (RainbowKit custom connect button), but implemented in plain HTML + JS (no React).

Files:
- `index.html` — main page (includes CDN scripts for `ethers` and WalletConnect provider + QR code lib)
- `styles.css` — simple styles resembling the original button / dropdown
- `app.js` — vanilla JS logic to connect/disconnect, show balance, network, copy address and QR code

How to use:
1. Open `index.html` in a modern browser (Chrome/Edge/Firefox). You can open it by double-clicking the file or using a simple static server.

2. Click `Connect Wallet` and choose `MetaMask` or `WalletConnect`.
   - MetaMask: connects to the injected `window.ethereum` wallet.
   - WalletConnect: opens a QR modal from WalletConnect provider. The demo uses public RPC endpoints (via `rpc` mapping). For production, replace with your own RPC endpoints or WalletConnect project configuration.

Notes & limitations:
- This demo is intentionally small and dependency-free (no bundler). It uses CDN UMD builds of `ethers` and `@walletconnect/web3-provider`.
- WalletConnect configuration: the provider is initialized with a minimal `rpc` mapping. For reliable production usage, replace with dedicated RPC endpoints or a WalletConnect project id.
- MetaMask disconnect cannot be programmatically forced in all wallets; disconnect here clears app UI state. Wallet sessions from WalletConnect are properly disconnected.

If you want, I can:
- Swap the RPC endpoints to the exact networks you use (e.g., Lisk Sepolia if you provide its RPC URL).
- Add ENS resolution and avatar display.
- Style the UI to match 1:1 with your app (provide Tailwind classes or a screenshot).
