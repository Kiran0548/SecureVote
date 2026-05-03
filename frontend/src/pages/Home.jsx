import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSystemInsights, topEntries } from "../utils/insights";
import { useLanguage } from "../utils/i18n";

const signalItems = [
  { label: "Anonymous", accent: "bg-emerald-500" },
  { label: "Verified", accent: "bg-sky-500" },
  { label: "On-chain", accent: "bg-indigo-500" },
];

function Home() {
  const [insights, setInsights] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    let active = true;

    fetchSystemInsights().then((data) => {
      if (active) {
        setInsights(data);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const heroStats = [
    {
      label: t("home.votesLogged"),
      value: insights?.voteSummary?.totalVotes ?? "0",
    },
    {
      label: t("home.approvedProfiles"),
      value: insights?.profileSummary?.totalProfiles ?? "0",
    },
    {
      label: t("home.electionRecords"),
      value: insights?.metadataSummary?.totalMetadataRecords ?? "0",
    },
  ];

  const leadingDistricts = topEntries(insights?.profileSummary?.districtCoverage || {}, 2);

  return (
    <div className="relative px-4 pb-20 pt-10 md:px-6 md:pt-16">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-8 animate-fade-in-up">
          <div className="hero-badge">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {t("home.badge")}
          </div>

          <div className="space-y-6">
            <h1 className="app-title max-w-4xl text-4xl font-bold leading-[1.02] md:text-6xl">
              {t("home.titleLead")}
              {" "}
              <span className="theme-gradient-text">{t("home.titleAccent")}</span>{t("home.titleEnd")}
            </h1>

            <p className="max-w-2xl text-lg leading-8 theme-text-muted md:text-xl">
              {t("home.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {signalItems.map((item) => (
              <span key={item.label} className="signal-chip text-sm font-semibold">
                <span className={`h-2.5 w-2.5 rounded-full ${item.accent}`} />
                {item.label}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              to="/vote"
              className="theme-primary-btn inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-bold"
            >
              {t("home.voteButton")}
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <Link
              to="/dashboard"
              className="theme-secondary-btn inline-flex items-center justify-center rounded-2xl px-7 py-4 text-base font-semibold"
            >
              {t("home.dashboardButton")}
            </Link>

            <Link
              to="/results"
              className="theme-secondary-btn inline-flex items-center justify-center rounded-2xl px-7 py-4 text-base font-semibold"
            >
              {t("home.resultsButton")}
            </Link>

            <Link
              to="/register"
              className="theme-secondary-btn inline-flex items-center justify-center rounded-2xl px-7 py-4 text-base font-semibold"
            >
              Register as Voter
            </Link>
          </div>

          <div className="grid gap-4 pt-2 md:grid-cols-3">
            {heroStats.map((item) => (
              <div key={item.label} className="theme-card rounded-[1.4rem] px-5 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.24em] theme-text-soft">
                  {item.label}
                </p>
                <p className="mt-3 text-3xl font-extrabold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="hero-stage space-y-6 animate-fade-in-up">
          <div className="hero-wire hidden lg:block" />

          <div className="ballot-card">
            <div className="ballot-slot" />

            <div className="ballot-sheet">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
                    Secure Ballot
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                    Election Access Pass
                  </h2>
                </div>
                <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                  Booth Open
                </div>
              </div>

              <div className="space-y-1">
                <div className="ballot-row">
                  <div>
                    <p className="font-bold text-slate-900">Face Authentication</p>
                    <p className="text-sm text-slate-500">One voter. One verified entry.</p>
                  </div>
                  <div className="ballot-check">
                    <svg className="h-4 w-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <div className="ballot-row">
                  <div>
                    <p className="font-bold text-slate-900">Anonymous Proof</p>
                    <p className="text-sm text-slate-500">Identity protected with zero knowledge.</p>
                  </div>
                  <div className="ballot-check">
                    <svg className="h-4 w-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <div className="ballot-row">
                  <div>
                    <p className="font-bold text-slate-900">Blockchain Receipt</p>
                    <p className="text-sm text-slate-500">Every valid vote stays publicly auditable.</p>
                  </div>
                  <div className="ballot-check">
                    <svg className="h-4 w-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="ballot-seal">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Trusted Vote
            </div>
          </div>

          <div className="theme-card rounded-[1.6rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] theme-text-soft">
                  SecureVote
                </p>
                <h2 className="mt-2 text-2xl font-extrabold">{t("home.readinessTitle")}</h2>
              </div>
              <Link to="/results" className="text-sm font-semibold theme-accent">
                {t("home.readinessLink")}
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="theme-panel rounded-2xl p-4">
                <p className="text-sm font-semibold theme-text-muted">{t("home.uniqueVoters")}</p>
                <p className="mt-2 text-2xl font-bold">
                  {insights?.voteSummary?.uniqueVoters ?? 0}
                </p>
                <p className="mt-2 text-sm theme-text-soft">
                  {t("home.uniqueVotersHint")}
                </p>
              </div>

              <div className="theme-panel rounded-2xl p-4">
                <p className="text-sm font-semibold theme-text-muted">{t("home.wardElections")}</p>
                <p className="mt-2 text-2xl font-bold">
                  {insights?.metadataSummary?.wardScopedElections ?? 0}
                </p>
                <p className="mt-2 text-sm theme-text-soft">
                  {t("home.wardElectionsHint")}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold theme-text-muted">{t("home.topDistricts")}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {leadingDistricts.length > 0 ? (
                  leadingDistricts.map(([district, count]) => (
                    <span key={district} className="signal-chip text-sm font-semibold">
                      {district}
                      <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-300">
                        {count}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="theme-text-soft text-sm">
                    {t("home.topDistrictsEmpty")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
