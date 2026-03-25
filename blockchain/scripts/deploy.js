const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const signers = await hre.ethers.getSigners();
  const targetAddress = "0x976EA74026E726554dB657fA54763abd0C3a0aa9".toLowerCase();
  
  let deployer = signers.find(s => s.address.toLowerCase() === targetAddress);
  
  if (!deployer) {
    console.log("Specified account not found in hardhat signers. Using default signer[0]:", signers[0].address);
    deployer = signers[0];
  } else {
    console.log("Using specified deployer account:", deployer.address);
  }

  // 1. Deploy Semaphore Verifier
  console.log("Deploying SemaphoreVerifier...");
  const SemaphoreVerifier = await hre.ethers.getContractFactory("SemaphoreVerifier", deployer);
  const verifier = await SemaphoreVerifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("SemaphoreVerifier deployed to:", verifierAddress);

  // Deploy PoseidonT3 Library
  console.log("Deploying PoseidonT3...");
  const PoseidonT3 = await hre.ethers.getContractFactory("poseidon-solidity/PoseidonT3.sol:PoseidonT3", deployer);
  const poseidon = await PoseidonT3.deploy();
  await poseidon.waitForDeployment();
  const poseidonAddress = await poseidon.getAddress();
  console.log("PoseidonT3 deployed to:", poseidonAddress);

  // 2. Deploy Semaphore
  console.log("Deploying Semaphore...");
  const SemaphoreFactory = await hre.ethers.getContractFactory("Semaphore", {
    signer: deployer,
    libraries: {
      PoseidonT3: poseidonAddress
    }
  });
  const semaphore = await SemaphoreFactory.deploy(verifierAddress);
  await semaphore.waitForDeployment();
  const semaphoreAddress = await semaphore.getAddress();
  console.log("Semaphore deployed to:", semaphoreAddress);

  // 3. Deploy SecureVote
  console.log("Deploying SecureVote...");
  const SecureVote = await hre.ethers.getContractFactory("SecureVote", deployer);
  const contract = await SecureVote.deploy(semaphoreAddress); 
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log("SecureVote deployed to:", contractAddress, "by", deployer.address); 

  // Auto-sync frontend config and ABI
  const configPath = path.join(__dirname, "../../frontend/src/config.js");
  const configContent = `import contractABI from "./SecureVote.json";\n\nexport const contractAddress = "${contractAddress}";\nexport const abi = contractABI.abi;\n`;
  fs.writeFileSync(configPath, configContent);
  console.log("✅ Synced address to frontend/src/config.js");
  
  const abiSrc = path.join(__dirname, "../artifacts/contracts/SecureVote.sol/SecureVote.json");
  const abiDest = path.join(__dirname, "../../frontend/src/SecureVote.json");
  if (fs.existsSync(abiSrc)) {
    fs.copyFileSync(abiSrc, abiDest);
    console.log("✅ Synced SecureVote.json ABI to frontend/src");
  } else {
    console.warn("⚠️  Could not find compiled ABI at:", abiSrc);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});