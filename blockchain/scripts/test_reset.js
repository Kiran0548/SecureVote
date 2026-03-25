const hre = require("hardhat");

async function main() {
  const [owner, voter1] = await hre.ethers.getSigners();
  console.log("Testing with owner:", owner.address);

  // Deploy fresh
  const SecureVote = await hre.ethers.getContractFactory("SecureVote");
  const secureVote = await SecureVote.deploy();
  await secureVote.waitForDeployment();
  console.log("SecureVote deployed to:", await secureVote.getAddress());

  // Whitelist voter1
  await secureVote.addToWhitelist(voter1.address);
  console.log("Whitelisted voter1.");

  // Init election
  const now = Math.floor(Date.now() / 1000);
  await secureVote.initializeElection(["Alice", "Bob"], ["", ""], ["", ""], ["", ""], now - 1000, now + 10000);
  console.log("Initialized first election.");

  // Vote
  await secureVote.connect(voter1).vote(0); // Vote for Alice
  console.log("Voter1 voted for Alice.");

  let aliceVotes = await secureVote.getVotes(0);
  console.log("Alice votes after voting:", aliceVotes.toString());

  // Terminate
  await secureVote.terminateElection();
  console.log("Terminated first election.");

  // Reset
  await secureVote.resetElection();
  console.log("Reset election.");

  // Init second election
  await secureVote.initializeElection(["Charlie", "Dave"], ["", ""], ["", ""], ["", ""], now - 1000, now + 10000);
  console.log("Initialized second election.");

  // Check votes for first candidate in second election (Charlie, index 0)
  let charlieVotes = await secureVote.getVotes(0);
  console.log("Charlie (index 0) votes at start of second election:", charlieVotes.toString());

  if (charlieVotes.toString() === "0") {
    console.log("SUCCESS: Votes successfully reset!");
  } else {
    console.log("FAILURE: Vote carry-over detected!");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
