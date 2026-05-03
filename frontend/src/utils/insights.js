const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const emptyInsights = {
  voteSummary: {
    totalVotes: 0,
    uniqueVoters: 0,
    candidateBreakdown: {},
    recentVotes: [],
  },
  profileSummary: {
    totalProfiles: 0,
    districtCoverage: {},
    wardCoverage: {},
    profilesWithMaskedId: 0,
  },
  metadataSummary: {
    totalMetadataRecords: 0,
    electionTypes: {},
    districtCoverage: {},
    wardScopedElections: 0,
  },
};

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed for ${path} [${response.status}]`);
  }

  return response.json();
}

export async function fetchSystemInsights() {
  try {
    const [voteSummary, profileSummary, metadataSummary] = await Promise.all([
      fetchJson("/api/vote/summary"),
      fetchJson("/api/voters/profile/summary"),
      fetchJson("/api/elections/metadata/summary"),
    ]);

    return {
      voteSummary: { ...emptyInsights.voteSummary, ...voteSummary },
      profileSummary: { ...emptyInsights.profileSummary, ...profileSummary },
      metadataSummary: { ...emptyInsights.metadataSummary, ...metadataSummary },
    };
  } catch (error) {
    console.warn("Unable to fetch system insights:", error);
    return emptyInsights;
  }
}

export function topEntries(record = {}, limit = 3) {
  return Object.entries(record)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
}
