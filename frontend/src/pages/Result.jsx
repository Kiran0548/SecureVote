import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { contractAddress, abi } from "../config";
import { enrichElection, fetchElectionMetadataMap } from "../utils/electionMetadata";
import { fetchSystemInsights, topEntries } from "../utils/insights";
import { useLanguage } from "../utils/i18n";

function formatElectionType(type) {
  return type;
}

function formatDate(timestamp, fallback) {
  if (!timestamp) return fallback;
  return new Date(timestamp * 1000).toLocaleString();
}

function Result() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [insights, setInsights] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const metadataMap = await fetchElectionMetadataMap();
        const fetchedInsights = await fetchSystemInsights();

        if (!window.ethereum) {
          if (active) {
            setInsights(fetchedInsights);
            setLoading(false);
          }
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const count = Number(await contract.electionCount());
        const items = [];

        for (let i = 1; i <= count; i += 1) {
          try {
            const election = await contract.elections(i);
            const candidateStructs = await contract.getElectionCandidates(i);
            const candidates = [];
            let totalVotes = 0;

            for (let index = 0; index < candidateStructs.length; index += 1) {
              const votes = Number(await contract.getVotes(i, index));
              totalVotes += votes;
              candidates.push({
                name: candidateStructs[index].name || candidateStructs[index][0],
                logoUrl: candidateStructs[index].logoUrl || candidateStructs[index][1],
                votes,
              });
            }

            const sortedCandidates = candidates.slice().sort((left, right) => right.votes - left.votes);
            const leader = sortedCandidates[0] || null;

            items.push(
              enrichElection(
                {
                  id: Number(election.id),
                  title: election.title,
                  state: Number(election.state),
                  startTime: Number(election.startTime),
                  endTime: Number(election.endTime),
                  totalVotes,
                  candidates: sortedCandidates,
                  leader,
                },
                metadataMap
              )
            );
          } catch (error) {
            console.warn(`Unable to load election ${i}:`, error);
          }
        }

        if (active) {
          const sortedItems = items.sort((left, right) => right.id - left.id);
          setElections(sortedItems);
          setSelectedElectionId(sortedItems[0]?.id ?? null);
          setInsights(fetchedInsights);
        }
      } catch (error) {
        console.error("Unable to load results explorer:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const visibleElections = useMemo(() => elections.filter((election) => {
    const matchesSearch = !search.trim()
      || election.title.toLowerCase().includes(search.trim().toLowerCase())
      || String(election.id).includes(search.trim());

    const matchesType = typeFilter === "all" || election.metadata?.electionType === typeFilter;

    return matchesSearch && matchesType;
  }), [elections, search, typeFilter]);

  const selectedElection = visibleElections.find((election) => election.id === selectedElectionId)
    || elections.find((election) => election.id === selectedElectionId)
    || visibleElections[0]
    || null;

  const leaderboardDistricts = topEntries(insights?.profileSummary?.districtCoverage || {}, 3);
  const leadingCandidates = topEntries(insights?.voteSummary?.candidateBreakdown || {}, 4);

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-12 md:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="theme-card vote-page-hero rounded-[2rem] px-6 py-10 md:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] theme-text-muted">
              {t("results.badge")}
            </div>
            <h1 className="app-title text-5xl font-extrabold tracking-tight md:text-6xl">
              {t("results.title")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg theme-text-muted md:text-xl">
              {t("results.subtitle")}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-4">
          <div className="theme-card rounded-[1.6rem] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] theme-text-soft">{t("results.loggedVotes")}</p>
            <p className="mt-3 text-4xl font-extrabold">{insights?.voteSummary?.totalVotes ?? 0}</p>
          </div>
          <div className="theme-card rounded-[1.6rem] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] theme-text-soft">{t("results.uniqueVoters")}</p>
            <p className="mt-3 text-4xl font-extrabold">{insights?.voteSummary?.uniqueVoters ?? 0}</p>
          </div>
          <div className="theme-card rounded-[1.6rem] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] theme-text-soft">{t("results.profiles")}</p>
            <p className="mt-3 text-4xl font-extrabold">{insights?.profileSummary?.totalProfiles ?? 0}</p>
          </div>
          <div className="theme-card rounded-[1.6rem] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] theme-text-soft">{t("results.wardElections")}</p>
            <p className="mt-3 text-4xl font-extrabold">{insights?.metadataSummary?.wardScopedElections ?? 0}</p>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.45fr]">
          <aside className="space-y-6">
            <div className="theme-card rounded-[1.6rem] p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] theme-text-soft">
                    {t("results.searchElections")}
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("results.searchPlaceholder")}
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] theme-text-soft">
                    {t("results.ballotType")}
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  >
                    <option value="all">{t("results.allElections")}</option>
                    <option value="global">{t("results.generalElections")}</option>
                    <option value="ward_based">{t("results.wardBasedElections")}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="theme-card rounded-[1.6rem] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t("results.availableElections")}</h2>
                <span className="text-sm theme-text-soft">{visibleElections.length}</span>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <p className="theme-text-soft">{t("results.loading")}</p>
                ) : visibleElections.length === 0 ? (
                  <p className="theme-text-soft">{t("results.noMatches")}</p>
                ) : (
                  visibleElections.map((election) => (
                    <button
                      key={election.id}
                      type="button"
                      onClick={() => setSelectedElectionId(election.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${selectedElection?.id === election.id ? "border-indigo-500/50 bg-indigo-500/10" : "border-[var(--border-soft)] bg-[var(--surface-2)]"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] theme-text-soft">
                          Election #{election.id}
                        </span>
                        <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                          {election.metadata?.electionType === "ward_based" ? t("results.wardBased") : t("results.general")}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-bold">{election.title}</h3>
                      <p className="mt-2 text-sm theme-text-soft">
                        {election.totalVotes} {t("results.trackedVotes")}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="theme-card rounded-[1.6rem] p-6">
              <h2 className="text-xl font-bold">{t("results.coverageSignals")}</h2>
              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-sm font-semibold theme-text-muted">{t("results.topDistricts")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {leaderboardDistricts.length > 0 ? leaderboardDistricts.map(([district, count]) => (
                      <span key={district} className="signal-chip text-sm font-semibold">
                        {district}
                        <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-300">{count}</span>
                      </span>
                    )) : <span className="theme-text-soft text-sm">{t("results.noDistrictData")}</span>}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold theme-text-muted">{t("results.mostLoggedCandidates")}</p>
                  <div className="mt-3 space-y-2">
                    {leadingCandidates.length > 0 ? leadingCandidates.map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3">
                        <span className="font-medium">{name}</span>
                        <span className="theme-text-soft">{count}</span>
                      </div>
                    )) : <span className="theme-text-soft text-sm">{t("results.noCandidateLogs")}</span>}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            {selectedElection ? (
              <>
                <div className="theme-card rounded-[1.8rem] p-7">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] theme-text-soft">
                        Election #{selectedElection.id}
                      </p>
                      <h2 className="mt-3 text-3xl font-extrabold">{selectedElection.title}</h2>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="signal-chip text-sm font-semibold">
                          {selectedElection.metadata?.electionType === "ward_based" ? t("results.wardBased") : t("results.general")}
                        </span>
                        {selectedElection.metadata?.district && (
                          <span className="signal-chip text-sm font-semibold">
                            {selectedElection.metadata.district}
                          </span>
                        )}
                        {selectedElection.metadata?.wardNumber && (
                          <span className="signal-chip text-sm font-semibold">
                            Ward {selectedElection.metadata.wardNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="theme-panel rounded-2xl px-4 py-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] theme-text-soft">{t("results.starts")}</p>
                        <p className="mt-2 text-sm font-semibold">{formatDate(selectedElection.startTime, t("common.notScheduled"))}</p>
                      </div>
                      <div className="theme-panel rounded-2xl px-4 py-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] theme-text-soft">{t("results.ends")}</p>
                        <p className="mt-2 text-sm font-semibold">{formatDate(selectedElection.endTime, t("common.notScheduled"))}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="theme-card rounded-[1.4rem] p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] theme-text-soft">{t("results.totalVotes")}</p>
                    <p className="mt-3 text-4xl font-extrabold">{selectedElection.totalVotes}</p>
                  </div>
                  <div className="theme-card rounded-[1.4rem] p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] theme-text-soft">{t("results.candidates")}</p>
                    <p className="mt-3 text-4xl font-extrabold">{selectedElection.candidates.length}</p>
                  </div>
                  <div className="theme-card rounded-[1.4rem] p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] theme-text-soft">{t("results.currentLeader")}</p>
                    <p className="mt-3 text-2xl font-extrabold">
                      {selectedElection.leader?.name || t("results.noLeaderYet")}
                    </p>
                  </div>
                </div>

                <div className="theme-card rounded-[1.8rem] p-7">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-bold">{t("results.standings")}</h3>
                    <span className="text-sm theme-text-soft">
                      {t("results.standingsHint")}
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    {selectedElection.candidates.length > 0 ? selectedElection.candidates.map((candidate, index) => {
                      const share = selectedElection.totalVotes > 0
                        ? (candidate.votes / selectedElection.totalVotes) * 100
                        : 0;

                      return (
                        <div key={`${selectedElection.id}-${candidate.name}`} className="rounded-[1.3rem] border border-[var(--border-soft)] bg-[var(--surface-2)] p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="grid h-12 w-12 place-items-center rounded-full bg-indigo-500/15 text-lg font-bold text-indigo-300">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="text-lg font-bold">{candidate.name}</h4>
                                <p className="text-sm theme-text-soft">{candidate.votes} {t("results.loggedVotes").toLowerCase()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-extrabold">{share.toFixed(1)}%</p>
                              <p className="text-sm theme-text-soft">{t("results.voteShare")}</p>
                            </div>
                          </div>

                          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--surface-4)]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400"
                              style={{ width: `${Math.max(share, selectedElection.totalVotes > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="theme-text-soft">{t("results.noCandidateRecords")}</p>
                    )}
                  </div>
                </div>

                <div className="theme-card rounded-[1.8rem] p-7">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-bold">{t("results.recentActivity")}</h3>
                    <span className="text-sm theme-text-soft">{t("results.recentActivityHint")}</span>
                  </div>

                  <div className="mt-6 space-y-3">
                    {(insights?.voteSummary?.recentVotes || []).length > 0 ? insights.voteSummary.recentVotes.map((vote) => (
                      <div key={vote.id} className="flex flex-col gap-2 rounded-2xl bg-[var(--surface-2)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold">{vote.candidate || t("results.candidateUnavailable")}</p>
                          <p className="text-sm theme-text-soft">{vote.voterPreview || t("results.anonymousVoter")}</p>
                        </div>
                        <div className="text-sm theme-text-soft">
                          {vote.createdAt ? new Date(vote.createdAt).toLocaleString() : t("results.timestampUnavailable")}
                        </div>
                      </div>
                    )) : (
                      <p className="theme-text-soft">
                        {t("results.noActivity")}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="theme-card rounded-[1.8rem] p-10 text-center">
                <h2 className="text-2xl font-bold">{t("results.noElectionSelected")}</h2>
                <p className="mt-3 theme-text-soft">
                  {t("results.noElectionSelectedHint")}
                </p>
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

export default Result;
