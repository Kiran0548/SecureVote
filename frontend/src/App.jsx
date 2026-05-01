import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Vote from "./pages/Vote";
import Verify from "./pages/Verify";
import Admin from "./pages/Admin";

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
          <Routes>
            <Route path="/" element={<Home theme={theme} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/vote" element={<Vote />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
