const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const targetUserAddress = "0x976EA74026E726554dB657fA54763abd0C3a0aa9".toLowerCase();

  const signers = await hre.ethers.getSigners();
  const targetDeployer = "0x976EA74026E726554dB657fA54763abd0C3a0aa9".toLowerCase();
  let deployer = signers.find(s => s.address.toLowerCase() === targetDeployer) || signers[0];

  // Dynamically load deployed contract address from frontend config
  const configPath = path.join(__dirname, "../../frontend/src/config.js");
  const configContent = fs.readFileSync(configPath, 'utf8');
  const match = configContent.match(/export const contractAddress = "(0x[a-fA-F0-9]{40})";/);
  
  if (!match) {
    throw new Error("Could not find contract address in config.js");
  }
  
  const contractAddress = match[1];
  console.log("Found contract address:", contractAddress);

  const SecureVote = await hre.ethers.getContractFactory("SecureVote", deployer);
  const contract = await SecureVote.attach(contractAddress);

  console.log("Whitelisting user:", targetUserAddress);
  const tx = await contract.addToWhitelist(targetUserAddress);
  await tx.wait();
  
  console.log("✅ Successfully whitelisted.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
