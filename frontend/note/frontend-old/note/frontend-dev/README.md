POP frontend (plain TypeScript, no framework)

What this frontend does
- Loads ABIs automatically from the repo `artifacts/` directory when you serve from the repo root.
- Fallback: if artifacts aren't reachable, it will try to load ABI files from `frontend/src/contracts/` (copy the three contract JSONs there).
- Auto-loads known deployed proxy addresses from `frontend/src/contracts/addresses.json` (or `/contracts/addresses.json` in served `dist`) if present.
- Renders all functions from three contracts: EmployeeAssignment, System_wallet, TrustlessTeamProtocol.
- Connects to injected wallet (MetaMask) and supports read calls and transactions (including payable).

Quick start (Windows PowerShell)
1) Copy ABIs (optional):
   If you prefer not to serve the whole repo, copy the three artifact JSON files into `frontend/src/contracts/`:
   - artifacts/contracts/Owner/employe_assignment.sol/EmployeeAssignment.json
   - artifacts/contracts/system/Wallet.sol/System_wallet.json
   - artifacts/contracts/User/TrustlessTeamProtocol.sol/TrustlessTeamProtocol.json

   You can also copy an addresses file `addresses.json` into that folder with keys:
   {
     "EmployeeAssignment": "0x...",
     "System_wallet": "0x...",
     "TrustlessTeamProtocol": "0x..."
   }

2) Install dev dependencies (inside frontend):
   cd frontend
   npm ci

3) Build and serve locally (this will compile TypeScript and copy JSON files into `dist/contracts`):
   npm run start

4) Open in browser:
   http://localhost:8080

Notes
- The server serves `./dist` — the build step copies any JSON files under `frontend/src/contracts/` into `dist/contracts/` so the frontend can fetch them without manual edits.
- If you serve the repo root (e.g. using a different static server) the app will try `/artifacts/...` first and will find the ABIs there.
- The UI expects an injected wallet and the chain to be set accordingly (Lisk Sepolia / Sepolia). If you want the frontend to use a specific RPC without MetaMask, we can add a provider selector.

If you want me to also copy the current artifact JSON files into `frontend/src/contracts/` automatically from the repo, tell me and I'll add that step (it will modify files under `frontend/src/contracts/`).
