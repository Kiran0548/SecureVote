const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const defaultVoterProfile = {
  walletAddress: "",
  fullName: "",
  district: "",
  localBody: "",
  wardNumber: "",
  idReferenceMasked: "",
  gender: "",
};

export function normalizeVoterProfile(profile = {}) {
  return {
    walletAddress: (profile.walletAddress || "").trim().toLowerCase(),
    fullName: (profile.fullName || "").trim(),
    district: (profile.district || "").trim(),
    localBody: (profile.localBody || "").trim(),
    wardNumber: (profile.wardNumber || "").trim(),
    idReferenceMasked: (profile.idReferenceMasked || "").trim(),
    gender: (profile.gender || "").trim(),
  };
}

export function maskIdReference(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const compact = trimmed.replace(/\s+/g, "");
  if (compact.length <= 4) {
    return compact;
  }

  const visible = compact.slice(-4);
  return `${"*".repeat(Math.max(compact.length - 4, 4))}${visible}`;
}

export async function fetchVoterProfile(walletAddress) {
  if (!walletAddress) {
    return { ...defaultVoterProfile };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/voters/profile/${walletAddress.toLowerCase()}`);
    if (!response.ok) {
      throw new Error(`Profile request failed with status ${response.status}`);
    }

    const profile = await response.json();
    return profile ? normalizeVoterProfile(profile) : { ...defaultVoterProfile, walletAddress: walletAddress.toLowerCase() };
  } catch (error) {
    console.warn("Unable to fetch voter profile:", error);
    return { ...defaultVoterProfile, walletAddress: walletAddress.toLowerCase() };
  }
}

export async function saveVoterProfile(profile) {
  const normalized = normalizeVoterProfile(profile);

  const response = await fetch(`${API_BASE_URL}/api/voters/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalized),
  });

  if (!response.ok) {
    throw new Error(`Unable to save voter profile [${response.status}]`);
  }

  return normalizeVoterProfile(await response.json());
}

export async function fetchAllVoterProfiles() {
  const response = await fetch(`${API_BASE_URL}/api/voters/profile/all`);
  if (!response.ok) {
    throw new Error(`Unable to fetch voter profiles [${response.status}]`);
  }

  const profiles = await response.json();
  return profiles.map(normalizeVoterProfile);
}

export async function deleteVoterProfile(walletAddress) {
  if (!walletAddress) return false;
  
  const response = await fetch(`${API_BASE_URL}/api/voters/profile/${walletAddress.toLowerCase()}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Unable to delete voter profile [${response.status}]`);
  }
  return true;
}

function sameText(left = "", right = "") {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function isVoterEligibleForElection(profile, election) {
  if (!election?.metadata || election.metadata.electionType !== "ward_based") {
    return true;
  }

  return (
    sameText(profile?.district, election.metadata.district) &&
    sameText(profile?.localBody, election.metadata.localBody) &&
    String(profile?.wardNumber || "").trim() === String(election.metadata.wardNumber || "").trim()
  );
}

export function getVoterEligibilityReason(profile, election) {
  if (!election?.metadata || election.metadata.electionType !== "ward_based") {
    return "";
  }

  if (!profile?.district || !profile?.localBody || !profile?.wardNumber) {
    return "Your voter profile is missing district, local body, or ward details. Please contact the administrator.";
  }

  if (!isVoterEligibleForElection(profile, election)) {
    return `This ward-based election is restricted to ${election.metadata.district} / ${election.metadata.localBody} / Ward ${election.metadata.wardNumber}.`;
  }

  return "";
}
