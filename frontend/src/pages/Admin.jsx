import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { contractAddress, abi } from "../config";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import * as faceapi from "@vladmandic/face-api";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../utils/pinata";
import { exportToCSV, exportToPDF } from "../utils/exportUtils";

function Admin() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [whitelistAddress, setWhitelistAddress] = useState("");
  const [candidates, setCandidates] = useState([{ name: "", logoUrl: "", logoFile: null, manifesto: "", videoFile: null }]);
  const [loading, setLoading] = useState(false);
  const [pinataJwt, setPinataJwt] = useState(import.meta.env.VITE_PINATA_JWT || localStorage.getItem("pinataJwt") || "");

  // Face Registration states
  const [photo, setPhoto] = useState(null);
  const [descriptor, setDescriptor] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // New states for admin features
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [electionState, setElectionState] = useState(0); // 0: NotStarted, 1: Ongoing, 2: Ended
  const [results, setResults] = useState([]);
  const [electionEndTime, setElectionEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  
  const [allElections, setAllElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [electionTitle, setElectionTitle] = useState("");
  const [showAllElections, setShowAllElections] = useState(false);

  useEffect(() => {
    init();

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
    if (contract && electionState === 1 && electionEndTime > 0 && currentTime > electionEndTime && results.length === 0) {
      fetchResults(contract);
    }
  }, [currentTime, contract, electionState, electionEndTime, results.length]);

  useEffect(() => {
    localStorage.setItem("pinataJwt", pinataJwt);
  }, [pinataJwt]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face models:", err);
      }
    };
    loadModels();
  }, []);

  const ensureContract = async () => {
    if (!window.ethereum) {
      alert("MetaMask extension not found. Please install it to continue.");
      return null;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      // Ensure we have at least one account connected
      let accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length === 0) {
        accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      }
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const signer = await provider.getSigner();
        const sc = new ethers.Contract(contractAddress, abi, signer);
        setContract(sc);
        return sc;
      }
      return null;
    } catch (err) {
      console.error("MetaMask connection failed:", err);
      return null;
    }
  };

  const init = async () => {
    const sc = await ensureContract();
    if (!sc) return;

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length === 0) return;

      // Check if current user is owner
      const owner = await sc.owner();
      setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase());
      
      // Fetch All Elections
      const count = await sc.electionCount();
      const electionsArr = [];
      for (let i = 1; i <= Number(count); i++) {
        try {
          const e = await sc.elections(i);
          electionsArr.push({
            id: Number(e.id),
            title: e.title,
            state: Number(e.state),
            startTime: Number(e.startTime),
            endTime: Number(e.endTime)
          });
        } catch (err) {
          console.warn(`Failed to load election #${i}:`, err);
        }
      }
      setAllElections(electionsArr);

      // Automatically select the latest election if none selected
      if (!selectedElectionId && electionsArr.length > 0) {
        const latest = electionsArr[electionsArr.length - 1];
        setSelectedElectionId(latest.id);
        setElectionState(latest.state);
        setElectionEndTime(latest.endTime);
        fetchResults(sc, latest.id);
      } else if (selectedElectionId) {
        const e = await sc.elections(selectedElectionId);
        setElectionState(Number(e.state));
        setElectionEndTime(Number(e.endTime));
        
        const isTimeUp = Number(e.state) === 1 && Math.floor(Date.now() / 1000) > Number(e.endTime) && Number(e.endTime) > 0;
        if (Number(e.state) === 2 || isTimeUp || Number(e.state) === 1) {
          fetchResults(sc, selectedElectionId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResults = async (sc, electionId) => {
    try {
      const cands = await sc.getElectionCandidates(electionId);
      const res = [];
      for (let i = 0; i < cands.length; i++) {
        const count = await sc.getVotes(electionId, i);
        res.push({ name: cands[i].name, logoUrl: cands[i].logoUrl, votes: count.toString() });
      }
      setResults(res);
    } catch (err) {
      console.error("Error fetching results:", err);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === "Kiran" && password === "Kiran@123") {
      setIsAdminLoggedIn(true);
    } else {
      alert("Invalid credentials. Hint: Kiran / Kiran@123");
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhoto(url);
      setDescriptor(null);
    }
  };

  const processFace = async (imgEl) => {
    if (!modelsLoaded || !imgEl) return;
    try {
      const detections = await faceapi.detectSingleFace(
        imgEl,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();
      
      if (detections) {
        setDescriptor(detections.descriptor);
      } else {
        alert("No face detected in the photo! Please upload a clear picture of the voter's face.");
        setPhoto(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhitelist = async (e) => {
    e.preventDefault();
    const sc = await ensureContract();
    if (!sc || !whitelistAddress) return;
    try {
      setLoading(true);
      const tx = await sc.addToWhitelist(whitelistAddress);
      alert("Whitelist transaction submitted to MetaMask! Wait a few seconds for it to confirm.");
      
      // Save face descriptor to localStorage for FaceAuth
      if (descriptor) {
         localStorage.setItem(`face_${whitelistAddress.toLowerCase()}`, JSON.stringify(Array.from(descriptor)));
      }
      
      alert("Address successfully whitelisted!");
      setWhitelistAddress("");
      setPhoto(null);
      setDescriptor(null);
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = () => {
    setCandidates([...candidates, { name: "", logoUrl: "", logoFile: null, manifesto: "", videoFile: null }]);
  };

  const handleRemoveCandidate = (index) => {
    const newCandidates = candidates.filter((_, i) => i !== index);
    setCandidates(newCandidates);
  };

  const handleCandidateChange = (index, field, value) => {
    const newCandidates = [...candidates];
    newCandidates[index][field] = value;
    setCandidates(newCandidates);
  };

  const handleCreateElection = async (e) => {
    e.preventDefault();
    const sc = await ensureContract();
    const validCandidates = candidates.filter(c => c.name.trim() !== "");
    if (!sc || !electionTitle || validCandidates.length === 0 || !startTime || !endTime) return;
    
    try {
      setLoading(true);
      
      const namesArray = [];
      const logosArray = [];
      const manifestosArray = [];
      const videosArray = [];
      
      for (const c of validCandidates) {
         namesArray.push(c.name.trim());
         
         let logoHash = c.logoUrl ? c.logoUrl.trim() : "";
         if (c.logoFile) {
            const cid = await uploadFileToIPFS(c.logoFile, pinataJwt);
            logoHash = "https://gateway.pinata.cloud/ipfs/" + cid;
         }
         logosArray.push(logoHash);
         
         let manifestoHash = "";
         if (c.manifesto && c.manifesto.trim() !== "") {
            manifestoHash = await uploadJSONToIPFS({ text: c.manifesto.trim() }, pinataJwt);
         }
         manifestosArray.push(manifestoHash);
         
         let videoHash = "";
         if (c.videoFile) {
            const cid = await uploadFileToIPFS(c.videoFile, pinataJwt);
            const isPdf = c.videoFile.type.includes("pdf");
            videoHash = cid + (isPdf ? "?type=pdf" : "?type=video");
         }
         videosArray.push(videoHash);
      }
      
      const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

      if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
        alert("Invalid start or end time selected.");
        return;
      }

      if (endTimestamp <= startTimestamp) {
        alert("End time must be after start time.");
        return;
      }

      const tx = await sc.createElection(
         electionTitle.trim(), namesArray, logosArray, manifestosArray, videosArray, startTimestamp, endTimestamp
      );
      
      alert("Election creation transaction sent! It will appear in the list once confirmed.");
      setElectionTitle("");
      setCandidates([{ name: "", logoUrl: "", logoFile: null, manifesto: "", videoFile: null }]);
      setStartTime("");
      setEndTime("");
      
      init();
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

   const handleTerminateElection = async (id) => {
     const sc = await ensureContract();
     if (!sc) return;
     if (!window.confirm("Are you sure you want to terminate this election?")) return;
     try {
       setLoading(true);
       const tx = await sc.terminateElection(id);
      alert("Termination transaction sent!");
      init();
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResetUI = () => {
    setSelectedElectionId(null);
    setResults([]);
  };

  const sortedElections = allElections.slice().sort((a, b) => b.id - a.id);
  const visibleElections = showAllElections ? sortedElections : sortedElections.slice(0, 3);

  const handleExport = async (type) => {
    const sc = await ensureContract();
    if (!sc || results.length === 0) return;
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const electionId = await sc.electionCount();
      const dataToSign = JSON.stringify({
        electionId: electionId.toString(),
        results: results
      });
      
      // Request admin to sign the results for authenticity
      const signature = await signer.signMessage(dataToSign);
      
      if (type === "csv") {
        exportToCSV(`Election_Results_${selectedElectionId}`, results, account, signature);
      } else {
        exportToPDF(`Election_Results_${selectedElectionId}`, "Official Election Results", results, account, signature);
      }
    } catch (err) {
      console.error(err);
      alert("Export failed: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center px-4 py-8">
        <div className="theme-card w-full max-w-md rounded-2xl p-8 text-center">
           <svg className="w-16 h-16 text-indigo-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
          <h2 className="text-2xl font-bold mb-6">Admin Sign-in</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username"
                className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-indigo-500 transition-colors"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-indigo-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="theme-primary-btn w-full rounded-lg px-4 py-3 font-semibold"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="theme-card vote-page-hero mb-12 flex flex-col items-center rounded-[2rem] px-6 py-10 text-center animate-fade-in-up md:px-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] theme-text-muted">
          Election operations
        </div>
        <h1 className="app-title mb-4 text-4xl font-bold md:text-5xl">Admin Dashboard</h1>
        <p className="text-slate-400">Manage the election, candidates, and eligible voters.</p>
        <div className="flex gap-4 mt-4">
          <button 
            onClick={() => setIsAdminLoggedIn(false)} 
            className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Sign Out
          </button>
          {allElections.length > 0 && (
            <button 
              onClick={() => document.getElementById("results-section")?.scrollIntoView({ behavior: 'smooth' })} 
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors font-medium border border-indigo-500/30 px-3 py-1 rounded-full bg-indigo-500/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              View Analytics & Results
            </button>
          )}
        </div>
      </div>

      {!account ? (
        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl text-center backdrop-blur-sm">
          <p className="text-yellow-400 text-lg">Please connect your wallet to access the Admin Panel modules.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Multi-Election Status & Management */}
          <div className="bg-slate-900/80 border border-slate-700 p-8 rounded-2xl shadow-lg">
             <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-300">
                    Election Control
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight text-white">Election Management</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Showing the latest 3 by default to keep this panel clean. Use View All anytime.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {allElections.length > 3 && (
                    <button
                      onClick={() => setShowAllElections((prev) => !prev)}
                      className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-indigo-400/50 hover:text-white"
                    >
                      {showAllElections ? "Show Latest 3" : "View All"}
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedElectionId(null)}
                    className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
                  >
                    + Create New Election
                  </button>
                </div>
             </div>
             
             {allElections.length === 0 ? (
               <p className="text-slate-500 italic text-center py-4">No elections have been created yet.</p>
             ) : (
               <div className="grid gap-4">
                 {visibleElections.map(e => (
                   <div 
                    key={e.id} 
                    className={`flex flex-col gap-4 rounded-2xl border p-5 transition-all md:flex-row md:items-center md:justify-between ${selectedElectionId === e.id ? "bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]" : "bg-slate-800/40 border-slate-700 hover:border-slate-600"}`}
                   >
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-mono text-slate-400 ring-1 ring-slate-700">#{e.id}</span>
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${e.state === 1 ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-slate-700 text-slate-300 border border-slate-600"}`}>
                            {e.state === 1 ? "Ongoing" : "Ended"}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold tracking-tight text-white">{e.title}</h4>
                        <p className="mt-1 text-sm text-slate-400">Ends: {new Date(e.endTime * 1000).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {e.state === 1 && (
                          <button
                            onClick={() => handleTerminateElection(e.id)}
                            disabled={loading}
                            className="rounded-xl border border-red-600/20 bg-red-600/10 px-4 py-2 text-xs text-red-400 transition-all hover:bg-red-600/20"
                          >
                            Terminate
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            setSelectedElectionId(e.id);
                            setElectionState(e.state);
                            setElectionEndTime(e.endTime);
                            const sc = await ensureContract();
                             if (sc) fetchResults(sc, e.id);
                             // Scroll to results section
                             document.getElementById("results-section")?.scrollIntoView({ behavior: 'smooth' });
                           }}
                           className={`rounded-xl border px-4 py-2 text-xs transition-all ${selectedElectionId === e.id ? "border-indigo-500 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20" : "border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"}`}
                         >
                          {e.state === 1 ? "View Live Results" : "View Final Results"}
                        </button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Whitelist Form */}
            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl backdrop-blur-sm shadow-xl h-fit">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                 <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 Whitelist Voter
              </h2>
              <form onSubmit={handleWhitelist} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Wallet Address</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    value={whitelistAddress}
                    onChange={(e) => setWhitelistAddress(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Voter Photo (Identity Verification)</label>
                  {!modelsLoaded ? (
                     <p className="text-sm text-yellow-500">Loading AI Models...</p>
                  ) : (
                     <input
                       type="file"
                       accept="image/*"
                       onChange={handlePhotoUpload}
                       className="w-full text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-900/50 file:text-indigo-400 hover:file:bg-indigo-900/80 cursor-pointer"
                     />
                  )}
                  {photo && (
                    <div className="mt-4 flex flex-col items-center">
                      <img 
                        src={photo} 
                        alt="Voter" 
                        onLoad={(e) => processFace(e.target)}
                        className="w-32 h-32 object-cover rounded-xl border border-slate-600 shadow-lg" 
                      />
                      {descriptor ? (
                        <p className="text-green-400 text-sm mt-2 flex items-center gap-1 font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          Face ID Generated
                        </p>
                      ) : (
                        <p className="text-yellow-400 text-sm mt-2 animate-pulse font-medium">Scanning face...</p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !whitelistAddress || !descriptor}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-2"
                >
                  {loading ? "Processing..." : "Add to Whitelist & Register Face"}
                </button>
              </form>
            </div>

             {/* Election Creation Form */}
              <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl backdrop-blur-sm shadow-xl">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                   <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                   New Parallel Election
                </h2>
                <form onSubmit={handleCreateElection} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Election Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Student Council 2026"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      value={electionTitle || ""}
                      onChange={(e) => setElectionTitle(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Pinata API JWT (Required for IPFS Uploads)</label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
                      value={pinataJwt}
                      onChange={(e) => setPinataJwt(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-slate-500 mt-2">Get a long-lived JWT from your <a href="https://app.pinata.cloud/developers/api-keys" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Pinata Dashboard</a>. Saved locally.</p>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-300">Candidates</label>
                    {candidates.map((candidate, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder={`Candidate ${idx + 1} Name`}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                            value={candidate.name}
                            onChange={(e) => handleCandidateChange(idx, 'name', e.target.value)}
                            disabled={loading}
                          />
                          <input
                            type="text"
                            placeholder="Logo Image URL (optional)"
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
                            value={candidate.logoUrl || ""}
                            onChange={(e) => handleCandidateChange(idx, 'logoUrl', e.target.value)}
                            disabled={loading}
                          />
                          <div className="flex flex-col">
                            <label className="text-xs text-slate-400 mb-1">Candidate Logo (Image, optional)</label>
                            <input
                              type="file"
                              accept="image/*"
                              className="w-full text-slate-300 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-900/50 file:text-indigo-400 hover:file:bg-indigo-900/80 cursor-pointer"
                              onChange={(e) => handleCandidateChange(idx, 'logoFile', e.target.files[0])}
                              disabled={loading}
                            />
                          </div>
                          <textarea
                            placeholder="Candidate Manifesto / Agenda (optional)"
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
                            rows="2"
                            value={candidate.manifesto || ""}
                            onChange={(e) => handleCandidateChange(idx, 'manifesto', e.target.value)}
                            disabled={loading}
                          ></textarea>
                          <div className="flex flex-col">
                            <label className="text-xs text-slate-400 mb-1">Campaign Media (Video or PDF, optional)</label>
                            <input
                              type="file"
                              accept="video/*,application/pdf"
                              className="w-full text-slate-300 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-900/50 file:text-purple-400 hover:file:bg-purple-900/80 cursor-pointer"
                              onChange={(e) => handleCandidateChange(idx, 'videoFile', e.target.files[0])}
                              disabled={loading}
                            />
                          </div>
                        </div>
                        {candidates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCandidate(idx)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddCandidate}
                      className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      Add Another Candidate
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Start Time</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">End Time</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || candidates.filter(c => c.name.trim() !== "").length === 0 || !startTime || !endTime}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-6"
                  >
                    {loading ? "Processing..." : "Start Election"}
                  </button>
                </form>
              </div>

             {/* Status Information */}
            {selectedElectionId && (
               <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl flex items-center justify-between shadow-lg h-fit">
                 <div>
                   <h3 className="text-lg font-semibold text-white">Management: {allElections.find(e => e.id === selectedElectionId)?.title}</h3>
                   <p className="text-slate-400">
                      {electionState === 1 ? (currentTime > electionEndTime && electionEndTime > 0 ? "Time Up (Pending Termination)" : "Currently Ongoing") : "Election Ended"}
                   </p>
                 </div>
                 <button 
                  onClick={handleResetUI}
                  className="text-xs text-indigo-400 hover:underline"
                 >
                   Deselect
                 </button>
               </div>
            )}
          </div>

          {/* Results Section */}
          <div id="results-section" className="scroll-mt-20">
            {allElections.length > 0 && (
            <div className="space-y-8 mt-12">
              <div className="flex items-center gap-3 mb-6">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                <h2 className="text-3xl font-bold">Election Results & Analytics</h2>
                <div className="ml-auto flex gap-3">
                  <button 
                    onClick={() => handleExport("csv")}
                    disabled={loading || results.length === 0}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Export CSV
                  </button>
                  <button 
                    onClick={() => handleExport("pdf")}
                    disabled={loading || results.length === 0}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    Export Signed PDF
                  </button>
                </div>
              </div>
              
              {results.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Loading analytics data...</p>
              ) : (
                <>
                  <AnalyticsDashboard candidates={results} contract={contract} electionId={selectedElectionId} />
                  
                  <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl backdrop-blur-sm shadow-xl mt-8 hidden md:block">
                    <h3 className="text-xl font-semibold mb-6 text-slate-300">Detailed Tally</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.slice().sort((a,b) => b.votes - a.votes).map((res, idx) => (
                        <div key={idx} className="bg-slate-900/80 p-5 rounded-xl flex items-center gap-4 border border-slate-700/50 hover:border-indigo-500/30 transition-colors">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 ${idx === 0 ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" : "bg-slate-800 text-slate-400"}`}>
                            {res.logoUrl ? (
                              <img src={res.logoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                            ) : null}
                            <span className={res.logoUrl ? 'hidden' : 'block'}>{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white truncate">{res.name}</h4>
                            <p className="text-sm text-slate-500">{res.votes} votes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default Admin;
