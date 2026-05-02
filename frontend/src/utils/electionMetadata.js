const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const STORAGE_KEY = "securevote-election-metadata";

export const defaultMetadata = {
  electionType: "global",
  district: "",
  localBody: "",
  wardNumber: "",
};

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
}

function readStore() {
  if (!canUseStorage()) {
    return { byId: {}, pending: [] };
  }

  return safeParse(localStorage.getItem(STORAGE_KEY), { byId: {}, pending: [] });
}

function writeStore(store) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function normalizeMetadata(metadata = {}) {
  const onChainElectionType = typeof metadata.electionType === "number"
    ? (metadata.electionType === 1 ? "ward_based" : "global")
    : metadata.electionType;

  return {
    electionType: onChainElectionType === "ward_based" ? "ward_based" : "global",
    district: (metadata.district || "").trim(),
    localBody: (metadata.localBody || "").trim(),
    wardNumber: (metadata.wardNumber || "").trim(),
  };
}

function matchesPending(pendingItem, election) {
  return (
    pendingItem.title === election.title &&
    Number(pendingItem.startTime) === Number(election.startTime) &&
    Number(pendingItem.endTime) === Number(election.endTime)
  );
}

export function savePendingElectionMetadata(matchData, metadata) {
  const store = readStore();
  const normalized = normalizeMetadata(metadata);

  store.pending = [
    ...store.pending.filter((item) => !matchesPending(item, matchData)),
    {
      title: matchData.title,
      startTime: Number(matchData.startTime),
      endTime: Number(matchData.endTime),
      metadata: normalized,
    },
  ];

  writeStore(store);
}

export function resolveElectionMetadata(election, metadataMap = null) {
  if (election?.metadata) {
    return normalizeMetadata(election.metadata);
  }

  const mapped = metadataMap?.[String(election.id)] || metadataMap?.[Number(election.id)];
  if (mapped) {
    return normalizeMetadata(mapped);
  }

  const store = readStore();
  const direct = store.byId?.[String(election.id)];
  if (direct) {
    return normalizeMetadata(direct);
  }

  const pendingMatch = store.pending.find((item) => matchesPending(item, election));
  if (pendingMatch) {
    const normalized = normalizeMetadata(pendingMatch.metadata);
    store.byId[String(election.id)] = normalized;
    store.pending = store.pending.filter((item) => !matchesPending(item, election));
    writeStore(store);
    return normalized;
  }

  return { ...defaultMetadata };
}

export function enrichElection(election, metadataMap = null) {
  return {
    ...election,
    metadata: resolveElectionMetadata(election, metadataMap),
  };
}

export function getElectionMetadata(electionId) {
  const store = readStore();
  const found = store.byId?.[String(electionId)];
  return found ? normalizeMetadata(found) : { ...defaultMetadata };
}

function persistLocalElectionMetadata(electionId, metadata) {
  const store = readStore();
  store.byId[String(electionId)] = normalizeMetadata(metadata);
  writeStore(store);
}

export async function fetchElectionMetadataMap() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/elections/metadata`);
    if (!response.ok) {
      throw new Error(`Metadata request failed with status ${response.status}`);
    }

    const items = await response.json();
    const metadataMap = {};
    for (const item of items) {
      if (item?.electionId == null) continue;
      metadataMap[String(item.electionId)] = normalizeMetadata(item);
      persistLocalElectionMetadata(item.electionId, item);
    }

    return metadataMap;
  } catch (error) {
    console.warn("Falling back to local election metadata store:", error);
    return readStore().byId || {};
  }
}

export async function saveElectionMetadata(electionId, metadata) {
  const normalized = normalizeMetadata(metadata);
  persistLocalElectionMetadata(electionId, normalized);

  const response = await fetch(`${API_BASE_URL}/api/elections/metadata`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      electionId: Number(electionId),
      ...normalized,
    }),
  });

  if (!response.ok) {
    throw new Error(`Unable to save election metadata [${response.status}]`);
  }

  return response.json();
}
