import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Vote = lazy(() => import("./pages/Vote"));
const Verify = lazy(() => import("./pages/Verify"));
const Admin = lazy(() => import("./pages/Admin"));
const Result = lazy(() => import("./pages/Result"));

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("securevote-theme") || "dark");

  useEffect(() => {
    localStorage.setItem("securevote-theme", theme);
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <Router>
      <div className={`theme-root theme-${theme}`}>
        <div className="theme-grid" />
        <div className="theme-glow theme-glow-a" />
        <div className="theme-glow theme-glow-b" />
        <div className="theme-glow theme-glow-c" />

        <div className="theme-shell relative z-10">
          <Navbar theme={theme} onToggleTheme={toggleTheme} />
          <Suspense fallback={<div className="px-6 py-16 text-center theme-text-muted">Loading SecureVote...</div>}>
            <Routes>
              <Route path="/" element={<Home theme={theme} />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/results" element={<Result />} />
              <Route path="/vote" element={<Vote />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  );
}

export default App;
