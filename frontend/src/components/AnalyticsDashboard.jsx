import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { useState, useEffect } from "react";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#ef4444"];
const GENDER_COLORS = ["#3b82f6", "#ec4899", "#10b981"];

const AnalyticsDashboard = ({ candidates, contract, electionId, voteLogs = [], voterProfiles = [] }) => {
  const [turnoutData, setTurnoutData] = useState([]);
  const [loadingTurnout, setLoadingTurnout] = useState(false);

  useEffect(() => {
    if (contract && electionId) {
      fetchTurnoutData();
    }
  }, [contract, electionId]);

  const fetchTurnoutData = async () => {
    try {
      setLoadingTurnout(true);
      const filter = contract.filters.Voted(null, electionId);
      const events = await contract.queryFilter(filter, 0, "latest");
      
      const timestamps = await Promise.all(
        events.map(async (event) => {
          const block = await event.getBlock();
          return block.timestamp;
        })
      );

      // Sort timestamps
      timestamps.sort((a, b) => a - b);

      // Group by hours or appropriate interval
      const grouped = {};
      timestamps.forEach(ts => {
        const date = new Date(ts * 1000);
        const hourKey = date.toLocaleString([], { hour: 'numeric', minute: '2-digit' });
        grouped[hourKey] = (grouped[hourKey] || 0) + 1;
      });

      // Convert to array and cumulative count
      let cumulative = 0;
      const chartData = Object.entries(grouped).map(([time, count]) => {
        cumulative += count;
        return { time, votes: count, total: cumulative };
      });

      setTurnoutData(chartData);
    } catch (err) {
      console.error("Error fetching turnout data:", err);
    } finally {
      setLoadingTurnout(false);
    }
  };

  // Compute total votes
  const totalVotes = candidates.reduce((sum, c) => sum + Number(c.votes), 0);

  // Prepare data for recharts
  const data = candidates.map((c) => ({
    name: c.name,
    votes: Number(c.votes),
  }));

  // Find winner (Excluding NOTA)
  const dataForWinner = data.filter(d => d.name !== "None of the Above (NOTA)");
  const maxVotes = Math.max(...dataForWinner.map(d => d.votes));
  const winners = dataForWinner.filter(d => d.votes === maxVotes && maxVotes > 0);

  // Compute Gender Demographics
  const electionLogs = (voteLogs || []).filter(log => {
    if (!log || log.electionId === undefined) return false;
    return Number(log.electionId) === Number(electionId);
  });
  
  const genderCounts = { Male: 0, Female: 0, Other: 0 };
  
  electionLogs.forEach(log => {
    const profile = (voterProfiles || []).find(p => p.walletAddress?.toLowerCase() === log.voter?.toLowerCase());
    const gender = profile?.gender || "Other";
    if (genderCounts[gender] !== undefined) {
      genderCounts[gender]++;
    } else {
      genderCounts["Other"]++;
    }
  });

  const genderData = Object.entries(genderCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl">
          <h3 className="text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wider">Total Votes Cast</h3>
          <p className="text-4xl font-bold text-white">{totalVotes}</p>
        </div>
        <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl">
          <h3 className="text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wider">Total Candidates</h3>
          <p className="text-4xl font-bold text-white">{candidates.length}</p>
        </div>
        <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl">
          <h3 className="text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wider">Current Leader(s)</h3>
          <p className="text-2xl font-bold text-indigo-400">
            {winners.length > 0 ? winners.map(w => w.name).join(", ") : "None"}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl h-96 flex flex-col">
          <h3 className="text-xl font-bold mb-6 text-white">Vote Distribution</h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip 
                  cursor={{fill: '#334155', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="votes" name="Total Votes" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl h-96 flex flex-col">
          <h3 className="text-xl font-bold mb-6 text-white">Share of Votes</h3>
          <div className="flex-1 w-full relative -mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="votes"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  cursor={{fill: '#334155', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Demographics Section */}
      <div className="bg-slate-800/80 border border-slate-700 p-8 rounded-2xl flex flex-col shadow-xl">
        <h3 className="text-xl font-bold mb-6 text-white">Voter Turnout Demographics (Gender)</h3>
        <div className="grid md:grid-cols-2 items-center">
          <div className="h-64">
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 italic">
                No demographic data available.
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h4 className="text-slate-300 font-semibold mb-4">Awareness Insights</h4>
            {genderData.length > 0 ? (
              <ul className="space-y-3">
                {genderData.map((d, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GENDER_COLORS[i % GENDER_COLORS.length] }}></span>
                      {d.name} Participation
                    </span>
                    <span className="text-white font-bold">{d.value} votes ({Math.round((d.value / electionLogs.length) * 100)}%)</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                <p className="text-sm text-slate-500 italic">No voter demographics captured. Ensure voters have gender set in their profiles before voting.</p>
              </div>
            )}
            <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <p className="text-xs text-indigo-300 leading-relaxed">
                {electionLogs.length > 0 
                  ? "This analysis helps in identifying participation gaps. Use this data to target awareness campaigns in regions or demographics with low voter turnout."
                  : "Gender data is collected during voter registration. If voters registered before the gender field was added, their participation might show as 'Other' or be missing."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Turnout Chart */}
      <div className="bg-slate-800/80 border border-slate-700 p-8 rounded-2xl h-96 flex flex-col shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Voter Turnout over Time</h3>
          <span className="text-xs text-slate-500 font-mono uppercase">Live Blockchain Data</span>
        </div>
        <div className="flex-1 w-full relative">
          {loadingTurnout ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : turnoutData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={turnoutData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="total" name="Cumulative Votes" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 italic">
              Insufficient voting data available to generate time charts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
