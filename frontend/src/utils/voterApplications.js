const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const defaultVoterApplication = {
  walletAddress: "",
  fullName: "",
  registrationType: "WARD_BASED",
  district: "",
  localBody: "",
  wardNumber: "",
  idReferenceMasked: "",
  idProofPath: "",
  photoDataUrl: "",
  status: "PENDING",
  reviewNote: "",
};

export function normalizeVoterApplication(application = {}) {
  return {
    id: application.id ?? null,
    walletAddress: (application.walletAddress || "").trim().toLowerCase(),
    fullName: (application.fullName || "").trim(),
    registrationType: (application.registrationType || "WARD_BASED").trim().toUpperCase(),
    district: (application.district || "").trim(),
    localBody: (application.localBody || "").trim(),
    wardNumber: (application.wardNumber || "").trim(),
    idReferenceMasked: (application.idReferenceMasked || "").trim(),
    idProofPath: (application.idProofPath || "").trim(),
    photoDataUrl: application.photoDataUrl || "",
    status: (application.status || "PENDING").trim().toUpperCase(),
    reviewNote: (application.reviewNote || "").trim(),
    submittedAt: application.submittedAt || "",
    reviewedAt: application.reviewedAt || "",
  };
}

export async function fetchVoterApplications() {
  const response = await fetch(`${API_BASE_URL}/api/voter-applications`);
  if (!response.ok) {
    throw new Error(`Unable to fetch voter applications [${response.status}]`);
  }

  const data = await response.json();
  return data.map(normalizeVoterApplication);
}

export async function submitVoterApplication(application) {
  const response = await fetch(`${API_BASE_URL}/api/voter-applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(application),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Unable to submit application [${response.status}]`);
  }

  return normalizeVoterApplication(await response.json());
}

export async function reviewVoterApplication(id, decision, reviewNote = "") {
  const response = await fetch(`${API_BASE_URL}/api/voter-applications/${id}/${decision}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reviewNote }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Unable to ${decision} application [${response.status}]`);
  }

  return normalizeVoterApplication(await response.json());
}
