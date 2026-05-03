import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { contractAddress, abi } from "../config";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import { fetchSystemInsights } from "../utils/insights";
import { useLanguage } from "../utils/i18n";

function Dashboard() {
  const [contract, setContract] = useState(null);
  const [results, setResults] = useState([]);
  const [electionState, setElectionState] = useState(0); 
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [pastElections, setPastElections] = useState([]);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  const [loading, setLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [allElections, setAllElections] = useState([]);
  const [showAllPastElections, setShowAllPastElections] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [insights, setInsights] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    init();
    fetchSystemInsights().then(setInsights);
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    const handleChainChanged = () => window.location.reload();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", init);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      clearInterval(interval);
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", init);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (contract && electionState === 1 && endTime > 0 && currentTime > endTime && results.length === 0) {
      fetchResults(contract);
    }
  }, [currentTime, contract, electionState, endTime, results.length]);

  const fetchResults = async (sc) => {
    try {
      const cands = await sc.getCandidates();
      const res = [];
      for (let i = 0; i < cands.length; i++) {
        const count = await sc.getVotes(i);
        res.push({ name: cands[i].name, logoUrl: cands[i].logoUrl, votes: count.toString() });
      }
      setResults(res);
    } catch (err) {
      console.error("Error fetching results in Dashboard:", err);
    }
  };

  const init = async () => {
    if (!window.ethereum) {
      setLoading(false);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      setWalletConnected(accounts.length > 0);

      // We can read data even without signer using default provider if possible, 
      // but if wallet is connected, we use provider directly.
      const sc = new ethers.Contract(contractAddress, abi, provider);
      setContract(sc);

      const count = await sc.electionCount();
      const electionsArr = [];
      for (let i = 1; i <= Number(count); i++) {
        const e = await sc.elections(i);
        if (Number(e.state) === 1) { // Ongoing
          electionsArr.push({
            id: Number(e.id),
            title: e.title,
            state: Number(e.state),
            startTime: Number(e.startTime),
            endTime: Number(e.endTime)
          });
        }
      }
      setAllElections(electionsArr);

      // We still keep the legacy single-state fetch for the "main" highlight if needed,
      // but we'll focus on allElections now.

      try {
        const past = await sc.getPastElections();
        const formattedPast = past.map(p => ({
          id: Number(p.id),
          title: p.title,
          winnerName: p.winnerName,
          winnerVotes: Number(p.winnerVotes),
          totalVotes: Number(p.totalVotes)
        }));
        setPastElections(formattedPast);
      } catch (err) {
        console.warn("Could not fetch past elections (Contract might not be updated):", err);
      }

    } catch (err) {
      console.error("Error connecting to smart contract:", err);
    } finally {
      setLoading(false);
    }
  };

  const isVotingActive = electionState === 1 && currentTime >= startTime && currentTime <= endTime;
  const isTimeUp = electionState === 1 && currentTime > endTime && endTime > 0;
  const sortedPastElections = pastElections.slice().sort((a, b) => b.id - a.id);
  const visiblePastElections = showAllPastElections ? sortedPastElections : sortedPastElections.slice(0, 3);
  const visibleCurrentElections = allElections.filter((election) => (
    !searchTerm.trim() || election.title.toLowerCase().includes(searchTerm.trim().toLowerCase())
  ));
  const activeNowCount = allElections.filter((election) => currentTime >= election.startTime && currentTime <= election.endTime).length;

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-12 relative overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="theme-card vote-page-hero rounded-[2rem] px-6 py-10 text-center animate-fade-in-up md:px-10">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] theme-text-muted">
            {t("dashboard.badge")}
          </div>
          <h1 className="app-title text-5xl md:text-6xl font-extrabold tracking-tight">
            <span className="theme-gradient-text">{t("dashboard.title")}</span>
          </h1>
          <p className="mx-auto max-w-2xl pt-4 text-lg theme-text-muted md:text-xl">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="theme-card rounded-[1.5rem] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] theme-text-soft">{t("dashboard.liveNow")}</p>
            <p className="mt-3 text-3xl font-extrabold">{activeNowCount}</p>
          </div>
          <div className="theme-card rounded-[1.5rem] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] theme-text-soft">{t("dashboard.trackedElections")}</p>
            <p className="mt-3 text-3xl font-extrabold">{allElections.length}</p>
          </div>
          <div className="theme-card rounded-[1.5rem] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] theme-text-soft">{t("dashboard.profilesLoaded")}</p>
            <p className="mt-3 text-3xl font-extrabold">{insights?.profileSummary?.totalProfiles ?? 0}</p>
          </div>
          <div className="theme-card rounded-[1.5rem] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] theme-text-soft">{t("dashboard.voteLogs")}</p>
            <p className="mt-3 text-3xl font-extrabold">{insights?.voteSummary?.totalVotes ?? 0}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Active / Upcoming */}
            <div className="lg:col-span-2 space-y-8">
              
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                    {t("dashboard.currentStatus")}
                  </h2>
                  <p className="mt-2 text-sm theme-text-soft">
                    {t("dashboard.currentStatusHint")}
                  </p>
                </div>
                <div className="w-full md:max-w-sm">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] theme-text-soft">
                    {t("dashboard.searchLabel")}
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={t("dashboard.searchPlaceholder")}
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  />
                </div>
              </div>

              {visibleCurrentElections.length > 0 ? (
                <div className="grid gap-6">
                  {visibleCurrentElections.map(e => {
                    const isActive = currentTime >= e.startTime && currentTime <= e.endTime;
                    return (
                      <div key={e.id} className={`bg-gradient-to-br border p-8 rounded-3xl backdrop-blur-md shadow-2xl relative overflow-hidden group ${isActive ? "from-indigo-900/40 to-slate-900/80 border-indigo-500/30" : "from-slate-800/40 to-slate-900/80 border-slate-700"}`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-500"></div>
                        
                        <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border ${isActive ? "bg-green-500/20 border-green-500/50 text-green-400" : "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"}`}>
                          {isActive ? t("dashboard.activeElection") : t("dashboard.upcoming")}
                        </div>
                        <h3 className="text-3xl font-bold mb-2">{e.title}</h3>
                        <p className="text-slate-300 mb-8 max-w-lg leading-relaxed">
                          {isActive ? t("dashboard.activeDescription") : t("dashboard.upcomingDescription")}
                          <br/><br/>
                          <span className="text-indigo-300 font-medium">
                            {isActive
                              ? t("dashboard.closes", { time: new Date(e.endTime * 1000).toLocaleString() })
                              : t("dashboard.starts", { time: new Date(e.startTime * 1000).toLocaleString() })}
                          </span>
                        </p>

                        <Link to="/vote" className={`inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all bg-indigo-600 rounded-xl hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] ${!isActive && "opacity-50 cursor-not-allowed pointer-events-none"}`}>
                          {isActive ? t("dashboard.enterBooth") : t("dashboard.boothClosed")}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-800/40 border border-slate-700/50 p-8 flex flex-col items-center justify-center text-center rounded-3xl min-h-[300px]">
                  <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4M8 16l-4-4 4-4m12 0l4 4-4 4"></path></svg>
                  <h3 className="text-2xl font-bold mb-2 text-slate-400">{t("dashboard.noMatchTitle")}</h3>
                  <p className="text-slate-500 max-w-md">{allElections.length === 0 ? t("dashboard.noParallelBody") : t("dashboard.noMatchBody")}</p>
                </div>
              )}
            </div>

            {/* Right Column: Past Results */}
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                  {t("dashboard.historyResults")}
                </h2>
                {pastElections.length > 3 && (
                  <button
                    onClick={() => setShowAllPastElections((prev) => !prev)}
                    className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-purple-400/50 hover:text-white"
                  >
                    {showAllPastElections ? t("dashboard.showLatestThree") : t("dashboard.viewAll")}
                  </button>
                )}
              </div>

              <div className="bg-slate-800/50 border border-slate-700/80 rounded-3xl p-6 backdrop-blur-sm custom-scrollbar max-h-[600px] overflow-y-auto">
                <div className="space-y-4">
                  {/* Current Election if ended */}
                  {(electionState === 2 || isTimeUp) && (
                    <div className="bg-purple-900/20 border border-purple-500/30 p-5 rounded-2xl">
                      <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Current Cycle Concluded</div>
                      <h4 className="text-xl font-bold text-white mb-2">{t("dashboard.resultsLive")}</h4>
                      <p className="text-slate-400 text-sm">{t("dashboard.resultsLiveHint")}</p>
                    </div>
                  )}

                  {/* Historical Elections from Smart Contract */}
                  {pastElections.length === 0 && electionState !== 2 && !isTimeUp ? (
                    <p className="text-slate-500 text-center py-10">{t("dashboard.noHistoricalRecords")}</p>
                  ) : (
                    visiblePastElections.map((election, idx) => (
                      <div key={idx} className="bg-slate-900/60 border border-slate-700/50 p-5 rounded-2xl hover:border-slate-500/50 transition-colors">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t("dashboard.electionNumber", { id: election.id, title: election.title })}</div>
                        <h4 className="text-lg font-bold text-white mb-1">{t("dashboard.winner", { name: election.winnerName })}</h4>
                        <div className="flex justify-between items-center mt-3 text-sm">
                          <span className="text-green-400 font-medium">{election.winnerVotes} Votes</span>
                          <span className="text-slate-500">{t("dashboard.totalVotesSummary", { votes: election.totalVotes })}</span>
                        </div>
                        {/* Simple progress bar */}
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-1.5 rounded-full" 
                            style={{width: `${(election.winnerVotes / Math.max(election.totalVotes, 1)) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
