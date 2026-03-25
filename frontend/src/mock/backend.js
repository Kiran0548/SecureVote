// Mock backend for SecureVote
export const getCandidates = async () => {
  // Simulate fetching candidates
  return [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Charlie" },
  ];
};

export const submitVote = async (voterAddress, candidateId) => {
  // Simulate vote submission
  console.log(`Vote submitted: Voter ${voterAddress}, Candidate ${candidateId}`);
  return { success: true, message: "Vote recorded successfully!" };
};