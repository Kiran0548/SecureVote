import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";

function Navbar() {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const checkWallet = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) setAccount(accounts[0]);
      }
    };
    checkWallet();

    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) setAccount(accounts[0]);
        else setAccount(null);
      };
      const handleChainChanged = () => window.location.reload();

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  const handleConnect = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this application.");
      return;
    }
    try {
      // First try to see if already authorized
      let accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length === 0) {
        // If not, request connection
        accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
      }
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (error) {
      console.error("Connection error:", error);
      alert("Wallet connection failed: " + (error.message || "Unknown error"));
    }
  };

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-indigo-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            SecureVote
          </Link>
          <div className="hidden md:flex gap-6">
            <Link to="/dashboard" className="text-gray-300 hover:text-indigo-400 font-medium transition-colors">Dashboard</Link>
            <Link to="/vote" className="text-gray-300 hover:text-indigo-400 font-medium transition-colors">Vote</Link>
            <Link to="/verify" className="text-gray-300 hover:text-indigo-400 font-medium transition-colors">Verify</Link>
            <Link to="/admin" className="text-gray-300 hover:text-indigo-400 font-medium transition-colors">Admin</Link>
          </div>
        </div>

        {account ? (
          <div className="flex items-center gap-3">
             <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-full font-mono backdrop-blur-sm shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-full font-semibold shadow-lg shadow-indigo-500/30 transform hover:scale-105 transition-all duration-200 active:scale-95 border border-indigo-400/50"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;