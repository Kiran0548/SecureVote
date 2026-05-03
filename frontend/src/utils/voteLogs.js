const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function normalizeVoteLog(payload = {}) {
  return {
    voter: (payload.voter || "").trim().toLowerCase(),
    candidate: (payload.candidate || "").trim(),
    electionId: payload.electionId == null ? null : Number(payload.electionId),
    createdAt: payload.createdAt || new Date().toISOString(),
  };
}

export async function createVoteLog(payload) {
  const voteLog = normalizeVoteLog(payload);

  const response = await fetch(`${API_BASE_URL}/api/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(voteLog),
  });

  if (!response.ok) {
    throw new Error(`Unable to save vote log [${response.status}]`);
  }

  return response.json();
}
