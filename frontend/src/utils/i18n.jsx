import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "securevote-language";

export const supportedLanguages = [
  { code: "en", label: "English" },
  { code: "hi", label: "\u0939\u093f\u0928\u094d\u0926\u0940" },
  { code: "ta", label: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd" },
  { code: "bn", label: "\u09ac\u09be\u0982\u09b2\u09be" },
  { code: "or", label: "\u0b13\u0b21\u0b3f\u0b06" },
];

const en = {
  nav: {
    dashboard: "Dashboard",
    results: "Results",
    vote: "Vote",
    verify: "Verify",
    admin: "Admin",
    connectWallet: "Connect Wallet",
    language: "Language",
  },
  common: {
    loading: "Loading SecureVote...",
  },
  home: {
    badge: "National-grade digital ballot experience",
    titleLead: "Every vote",
    titleAccent: "secure",
    titleEnd: ", every result trusted.",
    subtitle: "SecureVote turns elections into a guided digital voting room with biometric verification, anonymous proofs, and audit-ready receipts that citizens can trust.",
    voteButton: "Enter Voting Booth",
    dashboardButton: "Explore Live Dashboard",
    resultsButton: "Open Results Explorer",
    votesLogged: "Votes Logged",
    approvedProfiles: "Approved Profiles",
    electionRecords: "Election Records",
    readinessTitle: "Election coverage at a glance",
    readinessLink: "View full explorer",
    uniqueVoters: "Unique voters seen",
    uniqueVotersHint: "Based on backend vote logs available to the dashboard.",
    wardElections: "Ward-scoped elections",
    wardElectionsHint: "Local ballots that use district and ward eligibility rules.",
    topDistricts: "Top district coverage",
    topDistrictsEmpty: "District coverage will appear here once voter profiles are added.",
  },
  dashboard: {
    badge: "Live election intelligence",
    title: "Voter Dashboard",
    subtitle: "Monitor ongoing elections, prepare for upcoming ones, and review transparent historical results in one place.",
    liveNow: "Live Now",
    trackedElections: "Tracked Elections",
    profilesLoaded: "Profiles Loaded",
    voteLogs: "Vote Logs",
    currentStatus: "Current Status",
    currentStatusHint: "Search active ballots by title and jump straight into the relevant voting room.",
    searchLabel: "Search active elections",
    searchPlaceholder: "Search by election name",
    historyResults: "History & Results",
    noMatchTitle: "No Matching Elections",
    noMatchBody: "No active or upcoming election matches your search right now.",
    noParallelBody: "There are currently no ongoing or upcoming elections initialized by the administrator.",
  },
  results: {
    badge: "Results explorer",
    title: "Election Intelligence",
    subtitle: "Review live tallies, compare election coverage, and inspect how voter registration and ballot metadata line up across the system.",
    loggedVotes: "Logged Votes",
    uniqueVoters: "Unique Voters",
    profiles: "Profiles",
    wardElections: "Ward Elections",
    searchElections: "Search Elections",
    searchPlaceholder: "Search by title or ID",
    ballotType: "Ballot Type",
    allElections: "All elections",
    generalElections: "General / large elections",
    wardBasedElections: "Ward-based elections",
    availableElections: "Available Elections",
    loading: "Loading election explorer...",
    noMatches: "No elections match the current search or type filter.",
    coverageSignals: "Coverage Signals",
    topDistricts: "Top districts",
    noDistrictData: "No district data yet.",
    mostLoggedCandidates: "Most logged candidates",
    noCandidateLogs: "Candidate logs will appear here once backend vote summaries exist.",
    starts: "Starts",
    ends: "Ends",
    totalVotes: "Total Votes",
    candidates: "Candidates",
    currentLeader: "Current Leader",
    noLeaderYet: "No leader yet",
    standings: "Candidate Standings",
    standingsHint: "Sorted by live vote count",
    voteShare: "vote share",
    recentActivity: "Recent Backend Vote Activity",
    recentActivityHint: "Latest 5 logged records",
    noActivity: "Backend vote logs are empty right now, so this activity stream will fill in as records are posted to the API.",
    noElectionSelected: "No election selected",
    noElectionSelectedHint: "Connect a wallet with access to the deployment and choose an election from the list to inspect tallies here.",
    trackedVotes: "votes tracked",
    noCandidateRecords: "No candidate records are available for this election yet.",
    candidateUnavailable: "Candidate unavailable",
    anonymousVoter: "Anonymous voter",
    timestampUnavailable: "Timestamp unavailable",
    general: "General",
    wardBased: "Ward Based",
  },
  verify: {
    badge: "Receipt verification portal",
    title: "Verify Cryptographic Receipt",
    subtitle: "Paste your Transaction Hash below to cryptographically prove that your vote was successfully included in the blockchain tally. For privacy, candidate choices are never displayed.",
    txHash: "Transaction Hash",
    txPlaceholder: "0xabc123... (Enter 66-character hash)",
    verifyButton: "Verify Vote Authenticity",
    verifying: "Verifying on Blockchain...",
  },
  faceAuth: {
    title: "Biometric Verification",
    initialStatus: "Please look directly at the camera to verify your identity.",
    noFaceId: "No Face ID found for this wallet address. Please contact Admin.",
    modelLoadError: "Failed to load facial recognition models.",
    verified: "Identity Verified! Unlocking...",
    mismatch: "Face detected, but identity does not match Wallet!",
    scanning: "Scanning for your face...",
    loadingModels: "Loading AI Models...",
    retry: "Retry Scan",
  },
  admin: {
    startTime: "Start Time",
    endTime: "End Time",
    title: "Admin",
  },
};

const translations = {
  en,
  hi: {
    ...en,
    nav: {
      ...en.nav,
      dashboard: "\u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921",
      results: "\u092a\u0930\u093f\u0923\u093e\u092e",
      vote: "\u092e\u0924\u0926\u093e\u0928",
      verify: "\u0938\u0924\u094d\u092f\u093e\u092a\u0928",
      admin: "\u090f\u0921\u092e\u093f\u0928",
      connectWallet: "\u0935\u0949\u0932\u0947\u091f \u0915\u0928\u0947\u0915\u094d\u091f \u0915\u0930\u0947\u0902",
      language: "\u092d\u093e\u0937\u093e",
    },
    admin: { ...en.admin, startTime: "\u0936\u0941\u0930\u0942 \u0938\u092e\u092f", endTime: "\u0938\u092e\u093e\u092a\u094d\u0924\u093f \u0938\u092e\u092f" },
  },
  ta: {
    ...en,
    nav: {
      ...en.nav,
      dashboard: "\u0b9f\u0bbe\u0bb7\u0bcd\u0baa\u0bcb\u0bb0\u0bcd\u0b9f\u0bc1",
      results: "\u0bae\u0bc1\u0b9f\u0bbf\u0bb5\u0bc1\u0b95\u0bb3\u0bcd",
      vote: "\u0bb5\u0bbe\u0b95\u0bcd\u0b95\u0bb3\u0bbf\u0baa\u0bcd\u0baa\u0bc1",
      verify: "\u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd\u0baa\u0bcd\u0baa\u0bc1",
      admin: "\u0b85\u0b9f\u0bcd\u0bae\u0bbf\u0ba9\u0bcd",
      connectWallet: "\u0bb5\u0bbe\u0bb2\u0bc6\u0b9f\u0bcd \u0b87\u0ba3\u0bc8\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd",
      language: "\u0bae\u0bca\u0bb4\u0bbf",
    },
    admin: { ...en.admin, startTime: "\u0ba4\u0bca\u0b9f\u0b95\u0bcd\u0b95 \u0ba8\u0bc7\u0bb0\u0bae\u0bcd", endTime: "\u0bae\u0bc1\u0b9f\u0bbf\u0bb5\u0bc1 \u0ba8\u0bc7\u0bb0\u0bae\u0bcd" },
  },
  bn: {
    ...en,
    nav: {
      ...en.nav,
      dashboard: "\u09a1\u09cd\u09af\u09be\u09b6\u09ac\u09cb\u09b0\u09cd\u09a1",
      results: "\u09ab\u09b2\u09be\u09ab\u09b2",
      vote: "\u09ad\u09cb\u099f",
      verify: "\u09af\u09be\u099a\u09be\u0987",
      admin: "\u0985\u09cd\u09af\u09be\u09a1\u09ae\u09bf\u09a8",
      connectWallet: "\u0993\u09df\u09be\u09b2\u09c7\u099f \u09b8\u0982\u09af\u09c1\u0995\u09cd\u09a4 \u0995\u09b0\u09c1\u09a8",
      language: "\u09ad\u09be\u09b7\u09be",
    },
    admin: { ...en.admin, startTime: "\u09b6\u09c1\u09b0\u09c1\u09b0 \u09b8\u09ae\u09df", endTime: "\u09b6\u09c7\u09b7 \u09b8\u09ae\u09df" },
  },
  or: {
    ...en,
    nav: {
      ...en.nav,
      dashboard: "\u0b21\u0b4d\u0b5f\u0b3e\u0b36\u0b2c\u0b4b\u0b30\u0b4d\u0b21",
      results: "\u0b2b\u0b33\u0b3e\u0b2b\u0b33",
      vote: "\u0b2d\u0b4b\u0b1f",
      verify: "\u0b2f\u0b3e\u0b01\u0b1a",
      admin: "\u0b05\u0b21\u0b2e\u0b3f\u0b28",
      connectWallet: "\u0b35\u0b3e\u0b32\u0b47\u0b1f \u0b2f\u0b4b\u0b21\u0b3c\u0b28\u0b4d\u0b24\u0b41",
      language: "\u0b2d\u0b3e\u0b37\u0b3e",
    },
    common: {
      ...en.common,
      loading: "SecureVote \u0b32\u0b4b\u0b21 \u0b39\u0b47\u0b09\u0b1b\u0b3f...",
    },
    home: {
      ...en.home,
      voteButton: "\u0b2d\u0b4b\u0b1f \u0b15\u0b15\u0b4d\u0b37\u0b15\u0b41 \u0b2a\u0b4d\u0b30\u0b2c\u0b47\u0b36 \u0b15\u0b30\u0b28\u0b4d\u0b24\u0b41",
      dashboardButton: "\u0b32\u0b3e\u0b07\u0b2d \u0b21\u0b4d\u0b5f\u0b3e\u0b36\u0b2c\u0b4b\u0b30\u0b4d\u0b21 \u0b26\u0b47\u0b16\u0b28\u0b4d\u0b24\u0b41",
      resultsButton: "\u0b2b\u0b33\u0b3e\u0b2b\u0b33 \u0b0f\u0b15\u0b4d\u0b38\u0b2a\u0b4d\u0b32\u0b4b\u0b30\u0b30 \u0b16\u0b4b\u0b32\u0b28\u0b4d\u0b24\u0b41",
    },
    dashboard: {
      ...en.dashboard,
      title: "\u0b2e\u0b24\u0b26\u0b3e\u0b24\u0b3e \u0b21\u0b4d\u0b5f\u0b3e\u0b36\u0b2c\u0b4b\u0b30\u0b4d\u0b21",
      historyResults: "\u0b07\u0b24\u0b3f\u0b39\u0b3e\u0b38 \u0b13 \u0b2b\u0b33\u0b3e\u0b2b\u0b33",
    },
    results: {
      ...en.results,
      title: "\u0b28\u0b3f\u0b30\u0b4d\u0b2c\u0b3e\u0b1a\u0b28 \u0b07\u0b28\u0b4d\u0b1f\u0b47\u0b32\u0b3f\u0b1c\u0b47\u0b28\u0b4d\u0b38",
      coverageSignals: "\u0b15\u0b2d\u0b30\u0b47\u0b1c \u0b38\u0b3f\u0b17\u0b4d\u0b28\u0b3e\u0b32",
      topDistricts: "\u0b36\u0b40\u0b30\u0b4d\u0b37 \u0b1c\u0b3f\u0b32\u0b4d\u0b32\u0b3e",
      mostLoggedCandidates: "\u0b38\u0b2c\u0b41\u0b20\u0b3e\u0b30\u0b41 \u0b05\u0b27\u0b3f\u0b15 \u0b32\u0b17 \u0b39\u0b4b\u0b07\u0b25\u0b3f\u0b2c\u0b3e \u0b2a\u0b4d\u0b30\u0b3e\u0b30\u0b4d\u0b25\u0b40",
    },
    verify: {
      ...en.verify,
      title: "\u0b15\u0b4d\u0b30\u0b3f\u0b2a\u0b4d\u0b1f\u0b4b\u0b17\u0b4d\u0b30\u0b3e\u0b2b\u0b3f\u0b15 \u0b30\u0b38\u0b3f\u0b26 \u0b2f\u0b3e\u0b01\u0b1a \u0b15\u0b30\u0b28\u0b4d\u0b24\u0b41",
      verifyButton: "\u0b2d\u0b4b\u0b1f \u0b2a\u0b4d\u0b30\u0b3e\u0b2e\u0b3e\u0b23\u0b3f\u0b15\u0b24\u0b3e \u0b2f\u0b3e\u0b01\u0b1a \u0b15\u0b30\u0b28\u0b4d\u0b24\u0b41",
    },
    faceAuth: {
      ...en.faceAuth,
      title: "\u0b2c\u0b3e\u0b5f\u0b4b\u0b2e\u0b47\u0b1f\u0b4d\u0b30\u0b3f\u0b15 \u0b2f\u0b3e\u0b01\u0b1a",
    },
    admin: {
      ...en.admin,
      startTime: "\u0b06\u0b30\u0b2e\u0b4d\u0b2d \u0b38\u0b2e\u0b5f",
      endTime: "\u0b36\u0b47\u0b37 \u0b38\u0b2e\u0b5f",
      title: "\u0b05\u0b21\u0b2e\u0b3f\u0b28",
    },
  },
};

const LanguageContext = createContext(null);

function getNestedValue(object, key) {
  return key.split(".").reduce((current, part) => current?.[part], object);
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem(STORAGE_KEY) || "en");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => {
    const translate = (key) => {
      const selected = getNestedValue(translations[language], key);
      if (selected != null) return selected;
      return getNestedValue(translations.en, key) ?? key;
    };

    return {
      language,
      setLanguage,
      languages: supportedLanguages,
      t: translate,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
