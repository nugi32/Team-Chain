const fs = require('fs');
const path = require('path');

/**
 * Pastikan folder ada
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Kopi json secara rekursif
 */
function copyJsonRecursive(src, dest) {
  ensureDir(dest);

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyJsonRecursive(srcPath, destPath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`📦 Copied: ${srcPath} → ${destPath}`);
    }
  }
}

/**
 * Wrapper Task
 * @param {string} src
 * @param {string} dest
 * @param {string} label
 */
function copyJob(src, dest, label = null) {
  console.log(`\n=== 🚀 COPY JOB: ${label || src} ===`);
  console.log(`SRC  → ${src}`);
  console.log(`DEST → ${dest}`);

  ensureDir(src);
  ensureDir(dest);

  copyJsonRecursive(src, dest);
  console.log(`✔️ DONE: ${label}`);
}

// =============================
// 🔥 DAFTAR TASK KAMU
// =============================

// contoh: state variable
const SRC_STATE_VAR = path.join(__dirname, '..', '..', 'artifacts', 'contracts', 'system', 'StateVariable.sol');
const DEST_STATE_VAR = path.join(__dirname, '..', 'app', 'owner', 'artifact');

// contoh: access control
const SRC_ACCESS = path.join(__dirname, '..', '..', 'artifacts', 'contracts', 'system', 'AccesControl.sol');
const DEST_ACCESS = path.join(__dirname, '..', 'app', 'owner', 'artifact');

// contoh: WALLET
const SRC_WALLET = path.join(__dirname,'..', '..', 'artifacts', 'contracts', 'system', 'Wallet.sol');
const DEST_WALLET = path.join(__dirname, '..', 'app', 'owner', 'artifact');

// contoh: main contract
const SRC_MAIN = path.join(__dirname, '..', '..', 'artifacts', 'contracts', 'User', 'TrustlessTeamProtocol.sol');
const DEST_MAIN = path.join(__dirname, '..', 'app', 'owner', 'artifact');

const SRC_USR = path.join(__dirname, '..', '..', 'artifacts', 'contracts', 'User', 'TrustlessTeamProtocol.sol');
const DEST_USR = path.join(__dirname, '..', 'app', 'user', 'artifact');



// =============================
// 🔥 EKSEKUSI SEKALI SAJA
// =============================

console.log("\n📦=== START COPY CONTRACTS ===");

copyJob(SRC_STATE_VAR, DEST_STATE_VAR, "STATE VAR");
copyJob(SRC_ACCESS, DEST_ACCESS, "ACCESS CONTROL");
copyJob(SRC_WALLET, DEST_WALLET, "EMPLOYEE MODULE");
copyJob(SRC_MAIN, DEST_MAIN, "EMPLOYEE MODULE");
copyJob(SRC_USR, DEST_USR, "Team-Chain MODULE");

console.log("\n🎉 ALL TASK FINISHED!");
