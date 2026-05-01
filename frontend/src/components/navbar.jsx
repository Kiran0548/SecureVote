import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function Navbar({ theme, onToggleTheme }) {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const checkWallet = async () => {
      if (!window.ethereum) return;

      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) setAccount(accounts[0]);
    };

    checkWallet();

    if (!window.ethereum) return;

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
  }, []);

  const handleConnect = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this application.");
      return;
    }

    try {
      let accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length === 0) {
        accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      }
      if (accounts.length > 0) setAccount(accounts[0]);
    } catch (error) {
      console.error("Connection error:", error);
      alert("Wallet connection failed: " + (error.message || "Unknown error"));
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border-soft)] bg-[var(--surface-2)]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/" className="app-title text-2xl font-bold tracking-tight">
            Secure<span className="theme-gradient-text">Vote</span>
          </Link>

          <div className="hidden items-center gap-5 md:flex">
            <Link to="/dashboard" className="nav-link text-sm font-semibold">
              Dashboard
            </Link>
            <Link to="/vote" className="nav-link text-sm font-semibold">
              Vote
            </Link>
            <Link to="/verify" className="nav-link text-sm font-semibold">
              Verify
            </Link>
            <Link to="/admin" className="nav-link text-sm font-semibold">
              Admin
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className="theme-toggle flex items-center px-1"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <span className="theme-toggle-knob" />
            <span className="sr-only">Toggle theme</span>
          </button>

          {account ? (
            <div className="hidden items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-1)] px-4 py-2 shadow-sm sm:flex">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-sm theme-text-muted">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="theme-primary-btn rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
