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

const AnalyticsDashboard = ({ candidates, contract, electionId }) => {
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

  // Find winner
  const maxVotes = Math.max(...data.map(d => d.votes));
  const winners = data.filter(d => d.votes === maxVotes && maxVotes > 0);

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
