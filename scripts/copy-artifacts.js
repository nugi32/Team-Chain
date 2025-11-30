const fs = require('fs');
const path = require('path');

// Source and destination paths
const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts');
const frontendPath = path.join(__dirname, '..', 'frontend', 'app', 'scripts');

// Create the destination directory if it doesn't exist
if (!fs.existsSync(frontendPath)) {
  fs.mkdirSync(frontendPath, { recursive: true });
}

// Function to copy contract artifacts
function copyArtifacts() {
  const contracts = [
    'User/register.sol/UserRegister.json',
    'Logic/Reputation.sol/UserReputation.json',
    'Owner/employe_assignment.sol/EmployeeAssignment.json',
    'system/Wallet.sol/System_wallet.json'
  ];

  contracts.forEach(contractPath => {
    const sourcePath = path.join(artifactsPath, contractPath);
    const destPath = path.join(frontendPath, path.basename(contractPath));
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${path.basename(contractPath)} to frontend`);
    } else {
      console.error(`Could not find ${sourcePath}`);
    }
  });
}

copyArtifacts();