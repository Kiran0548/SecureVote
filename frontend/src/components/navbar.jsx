import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../utils/i18n";

function Navbar({ theme, onToggleTheme }) {
  const [account, setAccount] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const { language, setLanguage, languages, t } = useLanguage();

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

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!account) {
        setNotifications([]);
        return;
      }
      try {
        const response = await fetch("http://localhost:8080/api/voter-applications");
        if (response.ok) {
          const apps = await response.json();
          const myApp = apps.find(a => a.walletAddress.toLowerCase() === account.toLowerCase());
          
          if (myApp) {
            const notifs = [];
            const dismissedStatus = localStorage.getItem(`notified_status_${account}`);
            
            if (myApp.status === "APPROVED" && dismissedStatus !== "APPROVED") {
              notifs.push({
                id: 1,
                type: "success",
                title: "Application Approved!",
                message: "🎉 Your registration has been approved! You are now eligible to vote.",
                status: myApp.status
              });
            } else if (myApp.status === "REJECTED" && dismissedStatus !== "REJECTED") {
               notifs.push({
                id: 2,
                type: "error",
                title: "Application Rejected",
                message: "Your registration was rejected. Please check with the admin.",
                status: myApp.status
              });
            }
            setNotifications(notifs);
          }
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [account]);

  const handleDismissNotification = (status) => {
    localStorage.setItem(`notified_status_${account}`, status);
    setNotifications([]);
    setShowNotifications(false);
  };

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
              {t("nav.dashboard")}
            </Link>
            <Link to="/results" className="nav-link text-sm font-semibold">
              {t("nav.results")}
            </Link>
            <Link to="/vote" className="nav-link text-sm font-semibold">
              {t("nav.vote")}
            </Link>
            <Link to="/register" className="nav-link text-sm font-semibold">
              Register
            </Link>
            <Link to="/verify" className="nav-link text-sm font-semibold">
              {t("nav.verify")}
            </Link>
            <Link to="/admin" className="nav-link text-sm font-semibold">
              {t("nav.admin")}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-1)] px-3 py-2 text-sm theme-text-muted">
            <span className="hidden sm:inline">{t("nav.language")}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-2 py-1 text-sm text-inherit outline-none sm:px-3"
              aria-label={t("nav.language")}
            >
              {languages.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

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

          {account && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex items-center justify-center h-[2.3rem] w-[2.3rem] rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] transition-colors hover:border-[var(--border-strong)] theme-text-muted hover:text-[var(--text-main)]"
                aria-label="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-[var(--surface-1)]"></span>
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 origin-top-right rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-1)] shadow-2xl backdrop-blur-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--surface-2)]">
                    <h3 className="text-sm font-bold text-[var(--text-main)]">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div key={notif.id} className="p-4 border-b border-[var(--border-soft)] hover:bg-[var(--surface-2)] transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${notif.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-[var(--text-main)]">{notif.title}</p>
                              <p className="text-sm theme-text-muted mt-1 leading-relaxed">{notif.message}</p>
                              <button 
                                onClick={() => handleDismissNotification(notif.status)}
                                className="mt-3 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                              >
                                Mark as read
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-sm theme-text-muted">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
              {t("nav.connectWallet")}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
