const fs = require('fs');
const path = require('path');

// Folder sumber ABI Hardhat
const srcDir = path.join(__dirname, '..', '..', 'artifacts', 'contracts');
// Folder tujuan di dist
const outDir = path.join(__dirname, '..', 'dist', 'contracts');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyJsonRecursive(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Rekursif ke subfolder
      copyJsonRecursive(srcPath, destPath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      fs.copyFileSync(srcPath, destPath);
      console.log('Copied', srcPath, '→', destPath);
    }
  }
}

// Jalankan copy
copyJsonRecursive(srcDir, outDir);
console.log('✅ copy-contracts.js done');
