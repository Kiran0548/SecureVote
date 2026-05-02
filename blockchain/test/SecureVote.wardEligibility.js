const { expect } = require("chai");
const { ethers } = require("hardhat");

async function deploySecureVoteFixture() {
  const [owner, voter1, voter2] = await ethers.getSigners();

  const SemaphoreVerifier = await ethers.getContractFactory("SemaphoreVerifier", owner);
  const verifier = await SemaphoreVerifier.deploy();
  await verifier.waitForDeployment();

  const PoseidonT3 = await ethers.getContractFactory("poseidon-solidity/PoseidonT3.sol:PoseidonT3", owner);
  const poseidon = await PoseidonT3.deploy();
  await poseidon.waitForDeployment();

  const SemaphoreFactory = await ethers.getContractFactory("Semaphore", {
    signer: owner,
    libraries: {
      PoseidonT3: await poseidon.getAddress(),
    },
  });
  const semaphore = await SemaphoreFactory.deploy(await verifier.getAddress());
  await semaphore.waitForDeployment();

  const SecureVote = await ethers.getContractFactory("SecureVote", owner);
  const secureVote = await SecureVote.deploy(await semaphore.getAddress());
  await secureVote.waitForDeployment();

  return { owner, voter1, voter2, secureVote };
}

describe("SecureVote ward eligibility", function () {
  it("stores ward metadata and limits ward elections to matching voters", async function () {
    const { secureVote, voter1, voter2 } = await deploySecureVoteFixture();
    const now = Math.floor(Date.now() / 1000);

    await secureVote.approveVoter(voter1.address, "Jaipur", "Gram Panchayat North", "12");
    await secureVote.approveVoter(voter2.address, "Jaipur", "Gram Panchayat North", "13");

    await secureVote.createElectionWithMetadata(
      "Ward Election",
      ["Candidate A"],
      [""],
      [""],
      [""],
      now - 60,
      now + 3600,
      1,
      "Jaipur",
      "Gram Panchayat North",
      "12"
    );

    const electionMetadata = await secureVote.getElectionMetadata(1);
    expect(Number(electionMetadata[0])).to.equal(1);
    expect(electionMetadata[1]).to.equal("Jaipur");
    expect(electionMetadata[2]).to.equal("Gram Panchayat North");
    expect(electionMetadata[3]).to.equal("12");

    const voter1Profile = await secureVote.getVoterProfile(voter1.address);
    expect(voter1Profile[0]).to.equal(true);
    expect(voter1Profile[1]).to.equal("Jaipur");
    expect(voter1Profile[2]).to.equal("Gram Panchayat North");
    expect(voter1Profile[3]).to.equal("12");

    expect(await secureVote.canVoteInElection(voter1.address, 1)).to.equal(true);
    expect(await secureVote.canVoteInElection(voter2.address, 1)).to.equal(false);
  });

  it("allows whitelisted voters to join general elections", async function () {
    const { secureVote, voter1 } = await deploySecureVoteFixture();
    const now = Math.floor(Date.now() / 1000);

    await secureVote.approveVoter(voter1.address, "Jaipur", "Gram Panchayat North", "12");

    await secureVote.createElection(
      "General Election",
      ["Candidate A"],
      [""],
      [""],
      [""],
      now - 60,
      now + 3600
    );

    expect(await secureVote.canVoteInElection(voter1.address, 1)).to.equal(true);
  });
});
