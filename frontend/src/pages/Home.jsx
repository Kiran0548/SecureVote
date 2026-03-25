import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="max-w-4xl text-center space-y-8 animate-fade-in-up">
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight">
          Decentralized <br className="md:hidden" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
            Voting System
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-light">
          Secure, transparent, and verifiable elections powered by Ethereum smart contracts. Your vote is immutable and anonymous.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
          <Link
            to="/vote"
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 overflow-hidden"
          >
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-full opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative flex items-center gap-2">
              Cast Your Vote
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
            </span>
          </Link>
          
          <Link
            to="/admin"
            className="inline-flex items-center justify-center px-8 py-4 font-bold text-indigo-300 transition-all duration-200 bg-slate-800/50 border border-indigo-500/30 rounded-full hover:bg-slate-800 hover:text-white hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 backdrop-blur-sm"
          >
            Admin Portal
          </Link>
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      <div className="fixed top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
    </div>
  );
}

export default Home;