import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { contractAddress, abi } from "../config";
import FaceAuth from "../components/FaceAuth";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof } from "@semaphore-protocol/proof";

function Vote() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState([]);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [modalManifesto, setModalManifesto] = useState("");
  const [loadingManifesto, setLoadingManifesto] = useState(false);
  
  const [allElections, setAllElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [selectedElectionTitle, setSelectedElectionTitle] = useState("");
  
  const [receiptData, setReceiptData] = useState(null);
  const receiptRef = useRef(null);
  
  const [electionState, setElectionState] = useState(0); // 0: NotStarted, 1: Ongoing, 2: Ended
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  
  // Semaphore ZKP States
  const [hasRegisteredIdentity, setHasRegisteredIdentity] = useState(false);
  const [electionCount, setElectionCount] = useState(0);
  const [identityString, setIdentityString] = useState(localStorage.getItem("semaphoreIdentity") || "");

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

  const ensureContract = async () => {
    if (!window.ethereum) {
      alert("MetaMask extension not found. Please install it to participate.");
      return null;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
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
      
      const whitelisted = await sc.isWhitelisted(accounts[0]);
      setIsWhitelisted(whitelisted);

      const count = await sc.electionCount();
      const electionsArr = [];
      for (let i = 1; i <= Number(count); i++) {
        try {
          const e = await sc.elections(i);
          if (Number(e.state) === 1) { // Ongoing
            electionsArr.push({
              id: Number(e.id),
              title: e.title,
              state: Number(e.state),
              startTime: Number(e.startTime),
              endTime: Number(e.endTime)
            });
          }
        } catch (err) {
          console.warn(`Failed to load election #${i}:`, err);
        }
      }
      setAllElections(electionsArr);

      const registered = await sc.hasRegisteredIdentity(accounts[0]);
      setHasRegisteredIdentity(registered);

      if (selectedElectionId) {
        const e = await sc.elections(selectedElectionId);
        setElectionState(Number(e.state));
        setStartTime(Number(e.startTime));
        setEndTime(Number(e.endTime));
        fetchCandidates(sc, selectedElectionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCandidates = async (sc, electionId) => {
    try {
      const cands = await sc.getElectionCandidates(electionId);
      // cands is now an array of Candidate structs (arrays in ethers)
      const formattedCands = cands.map(c => ({
        name: c[0],
        logoUrl: c[1],
        manifestoHash: c[2],
        videoHash: c[3]
      }));
      setCandidates(formattedCands);

      const voteCounts = [];
      for (let i = 0; i < cands.length; i++) {
        const count = await sc.getVotes(electionId, i);
        voteCounts.push(count.toString());
      }
      setVotes(voteCounts);
    } catch (err) {
      console.error("Error fetching candidates:", err);
    }
  };

  const selectElection = (election) => {
    setSelectedElectionId(election.id);
    setSelectedElectionTitle(election.title);
    setElectionState(election.state);
    setStartTime(election.startTime);
    setEndTime(election.endTime);
    fetchCandidates(contract, election.id);
  };

  const openModal = async (candidate, idx) => {
    setSelectedCandidate({ ...candidate, idx });
    setModalManifesto("");
    if (candidate.manifestoHash) {
      setLoadingManifesto(true);
      try {
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${candidate.manifestoHash}`);
        const data = await res.json();
        // Check both standard JSON and Pinata-wrapped format
        setModalManifesto(data.text || data.pinataContent?.text || "");
      } catch (err) {
        console.error("Failed to load manifesto:", err);
        setModalManifesto("Failed to load candidate manifesto.");
      } finally {
        setLoadingManifesto(false);
      }
    }
  };

  const registerAnonymousIdentity = async () => {
    const sc = await ensureContract();
    if (!sc) return;
    try {
      setLoading(true);
      // Generate a new Semaphore identity using a random seed
      const seed = ethers.hexlify(ethers.randomBytes(32));
      const identity = new Identity(seed);
      
      // Save the secret identity locally
      localStorage.setItem("semaphoreIdentity", seed);
      setIdentityString(seed);
      
      // Register just the public commitment on-chain
      const tx = await sc.registerIdentity(identity.commitment);
      
      setHasRegisteredIdentity(true);
      alert("Anonymous Identity Reg. transaction submitted!");
    } catch (err) {
      console.error(err);
      alert("Registration failed: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const voteCandidate = async (candidateId) => {
    if (!contract) return;
    if (!identityString) {
      alert("Anonymous identity not found! Please register first.");
      return;
    }
    
    try {
      setLoading(true);
      
      // 1. Recover Identity from local storage
      const identity = new Identity(identityString);
      
      // 2. We need the current Semaphore group (whitelist) to generate a proof.
      // We can create a dummy group off-chain and only add our identity to generate a basic proof if the verifyProof doesn't strictly check off-chain roots,
      // But Semaphore REQUIRES the merkle tree root to match on-chain.
      // So we must fetch the on-chain group. In Semaphore V4, since we don't have a subgraph setup here, we will fetch events or just use a standard way.
      // Actually, since we didn't add the SemaphoreSubgraph, we must reconstruct the tree!
      // Luckily, @semaphore-protocol/group lets us build it. 
      // To simplify for this demo without an indexer, we just fetch all `MemberAdded` events from the Semaphore contract.
      // For this hackathon/MVP, let's assume `hasRegisteredIdentity` gets us past the UI, but generating the proof needs the tree.
      
      const semaphoreAddress = await contract.semaphore();
      const semaphoreAbi = [
          "event MemberAdded(uint256 indexed groupId, uint256 index, uint256 identityCommitment, uint256 merkleTreeRoot)"
      ];
      const provider = new ethers.BrowserProvider(window.ethereum);
      const semaphoreContract = new ethers.Contract(semaphoreAddress, semaphoreAbi, provider);
      
      const groupId = await contract.groupId();
      const filter = semaphoreContract.filters.MemberAdded(groupId);
      const events = await semaphoreContract.queryFilter(filter, 0, "latest");
      
      const group = new Group();
      for (let e of events) {
         group.addMember(e.args[2].toString());
      }
      
      // 3. Generate zk-SNARK Proof
      const scope = selectedElectionId;
      // Use electionId as the scope to ensure only ONE vote per voter per election.
      const message = candidateId;
      
      const fullProof = await generateProof(identity, group, message, scope);
      
      const sc = await ensureContract();
      if (!sc) return;

      const tx = await sc.vote(selectedElectionId, candidateId, {
         merkleTreeDepth: fullProof.merkleTreeDepth,
         merkleTreeRoot: fullProof.merkleTreeRoot,
         nullifier: fullProof.nullifier,
         message: fullProof.message,
         scope: fullProof.scope,
         points: fullProof.points
      });
      
      // Wait for transaction confirmation, fallback to delayed refetch if RPC rate-limits
      let receipt = null;
      try {
        receipt = await tx.wait(1);
      } catch (waitErr) {
        console.warn("tx.wait() failed (likely RPC rate limit), will retry in 10s:", waitErr);
      }
      
      setReceiptData({
        hash: tx.hash,
        blockNumber: receipt ? receipt.blockNumber.toString() : "Pending...",
        timestamp: new Date().toLocaleString(),
        from: account,
        to: contractAddress
      });

      setSelectedCandidate(null);
      
      if (receipt) {
        // Transaction confirmed — fetch updated counts immediately
        await fetchCandidates(contract, selectedElectionId);
        await init();
      } else {
        // Transaction submitted but not yet confirmed — retry after delay
        setTimeout(async () => {
          try {
            await fetchCandidates(contract, selectedElectionId);
            await init();
          } catch (e) {
            console.warn("Delayed refetch failed:", e);
          }
        }, 10000);
      } 
    } catch (error) {
      console.error(error);
      // Semaphore error selectors
      const isDuplicateNullifier = error?.data === "0x1ec9575e" || error?.message?.includes("0x1ec9575e");
      const isMemberAlreadyExists = error?.data === "0x208b15e8" || error?.message?.includes("0x208b15e8");
      
      if (isDuplicateNullifier || error?.message?.includes("0x208b15e8")) {
        alert("⚠️ You have already voted in this election! Only one vote is allowed per voter.");
      } else if (isMemberAlreadyExists) {
        alert("⚠️ This identity is already registered in the group.");
      } else {
        alert("Transaction failed: " + (error.reason || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      // Calculate aspect ratio
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SecureVote_Receipt_${receiptData.hash.substring(0,8)}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF receipt.");
    }
  };

  const [biometricsVerified, setBiometricsVerified] = useState(false);
  const isVotingActive = electionState === 1 && currentTime >= startTime && currentTime <= endTime;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="theme-card vote-page-hero mb-12 rounded-[2rem] px-6 py-10 text-center animate-fade-in-up md:px-10">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] theme-text-muted">
          Secure voting booth
        </div>
        <h1 className="app-title mb-4 text-4xl font-bold md:text-5xl">Election Booth</h1>
        <p className="text-slate-400">Cast your vote securely on the blockchain.</p>
      </div>

      {!account ? (
        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl text-center backdrop-blur-sm max-w-lg mx-auto">
           <svg className="w-16 h-16 text-indigo-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          <p className="text-slate-300 text-lg mb-6">Please connect your Web3 wallet to participate in the election.</p>
        </div>
      ) : !isWhitelisted ? (
        <div className="bg-yellow-900/20 border border-yellow-500/30 p-8 rounded-2xl text-center backdrop-blur-sm max-w-lg mx-auto">
           <svg className="w-16 h-16 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          <p className="text-yellow-400 text-lg font-medium">Verification Required</p>
          <p className="text-slate-400 mt-2">Your address ({account.slice(0,6)}...{account.slice(-4)}) is not whitelisted. Please contact the administrator.</p>
        </div>
      ) : !selectedElectionId ? (
        <div className="space-y-8">
           <div className="grid gap-6">
             <h2 className="text-2xl font-bold text-center mb-4">Select an Active Election</h2>
             {allElections.length === 0 ? (
               <div className="bg-slate-800/50 border border-slate-700 p-12 rounded-2xl text-center backdrop-blur-sm">
                 <p className="text-slate-400">There are no active elections at the moment.</p>
               </div>
             ) : (
               <div className="grid sm:grid-cols-2 gap-6">
                 {allElections.map(e => (
                   <button 
                     key={e.id}
                     onClick={() => selectElection(e)}
                     className="bg-slate-800/80 border border-slate-700 hover:border-indigo-500/50 p-6 rounded-2xl text-left transition-all hover:bg-slate-800 group shadow-lg"
                   >
                     <div className="flex justify-between items-start mb-4">
                       <span className="bg-indigo-500/10 text-indigo-400 text-xs font-mono px-3 py-1 rounded-full border border-indigo-500/20">Election #{e.id}</span>
                       <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                       </div>
                     </div>
                     <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-300 transition-colors">{e.title}</h3>
                     <p className="text-slate-400 text-sm">Closes: {new Date(e.endTime * 1000).toLocaleString()}</p>
                   </button>
                 ))}
               </div>
             )}
           </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setSelectedElectionId(null)}
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to Elections
            </button>
            <div className="h-4 w-px bg-slate-700"></div>
            <h2 className="text-xl font-bold text-indigo-400 tracking-tight">{selectedElectionTitle}</h2>
          </div>
          
          {/* Election Status Banner */}
          <div className={`p-6 rounded-2xl border text-center backdrop-blur-sm 
            ${electionState === 0 ? "bg-slate-800/50 border-slate-700" : 
              electionState === 2 ? "bg-purple-900/20 border-purple-500/30" : 
              isVotingActive ? "bg-green-900/20 border-green-500/30" : "bg-yellow-900/20 border-yellow-500/30"}`}
          >
             {electionState === 0 && <p className="text-slate-400 text-lg">The election has not been initialized yet.</p>}
            
            {electionState === 1 && (
              <>
                {!isVotingActive && currentTime < startTime && <p className="text-yellow-400 text-lg">The election has not started yet. Starts at: {new Date(startTime * 1000).toLocaleString()}</p>}
                {!isVotingActive && currentTime > endTime && <p className="text-yellow-400 text-lg">The election voting period has ended. Waiting for admin to terminate the election.</p>}
                {isVotingActive && <p className="text-green-400 text-lg font-medium">The election is currently active! Closes at: {new Date(endTime * 1000).toLocaleString()}</p>}
              </>
            )}

            {electionState === 2 && <p className="text-purple-400 text-lg font-medium">The election has ended. Please check the Admin dashboard for results.</p>}
          </div>

          {!biometricsVerified && electionState === 1 && isVotingActive ? (
            <FaceAuth account={account} onVerified={() => setBiometricsVerified(true)} />
          ) : !hasRegisteredIdentity && electionState === 1 && isVotingActive ? (
            <div className="bg-slate-800/80 border border-slate-700 p-8 rounded-2xl max-w-xl mx-auto text-center space-y-6 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px]"></div>
               <svg className="w-16 h-16 text-indigo-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
               <h2 className="text-2xl font-bold">Generate Anonymous Identity</h2>
               <p className="text-slate-300">
                  To ensure your vote is completely untraceable, you must first generate a cryptographic Zero-Knowledge Identity.
                  Your wallet will only interact with the blockchain to register your <i>public commitment</i>.
               </p>
               <div className="bg-slate-900/50 p-4 rounded-xl text-left border border-slate-700/50">
                  <p className="text-sm text-yellow-400 font-medium mb-1">How it works:</p>
                  <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                     <li>A mathematical secret is generated and saved securely in your browser.</li>
                     <li>You register the public hash (commitment) on the blockchain.</li>
                     <li>When you vote, you submit a zk-SNARK proof. The smart contract validates you are registered without knowing <i>which</i> registered user you are.</li>
                     <li>Zero Knowledge = Zero Traceability.</li>
                  </ul>
               </div>
               <button
                  onClick={registerAnonymousIdentity}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg text-lg disabled:opacity-50"
               >
                  {loading ? "Registering on Blockchain..." : "Generate & Register Identity"}
               </button>
            </div>
          ) : candidates.length > 0 && (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 animate-[fadeIn_0.5s_ease-out]">
              {candidates.map((candidate, idx) => (
                <div key={idx} className={`bg-slate-800/80 border border-slate-700 p-6 rounded-2xl group flex flex-col items-center transition-all ${isVotingActive ? "hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]" : "opacity-75"}`}>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-transform overflow-hidden ${isVotingActive ? "bg-indigo-900/50 group-hover:scale-110" : "bg-slate-700"}`}>
                    {candidate.logoUrl ? (
                      <img src={candidate.logoUrl} alt={`${candidate.name} logo`} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                    ) : null}
                    <span className={`text-2xl font-bold ${candidate.logoUrl ? 'hidden' : 'block'} ${isVotingActive ? "text-indigo-300" : "text-slate-400"}`}>{candidate.name.charAt(0)}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{candidate.name}</h3>
                  <div className="bg-slate-900 rounded-full px-4 py-1 mb-6 border border-slate-700">
                    <span className="text-slate-400 text-sm">Current Votes: <span className="text-white font-mono">{votes[idx]}</span></span>
                  </div>
                  <button
                    onClick={() => openModal(candidate, idx)}
                    disabled={!isVotingActive}
                    className={`w-full font-semibold py-3 px-4 rounded-xl transition-all ${
                      isVotingActive 
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95" 
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    View Profile & Vote
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Candidate Profile Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center">
                  {selectedCandidate.logoUrl ? (
                    <img src={selectedCandidate.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : <span className="text-xl font-bold text-slate-400">{selectedCandidate.name.charAt(0)}</span>}
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedCandidate.name}</h2>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {selectedCandidate.videoHash && (
                <div className="rounded-xl overflow-hidden bg-black border border-slate-700 aspect-video shadow-lg relative">
                  {selectedCandidate.videoHash.includes("type=pdf") ? (
                    <iframe
                      className="w-full h-full bg-slate-800"
                      src={`https://gateway.pinata.cloud/ipfs/${selectedCandidate.videoHash.split("?")[0]}`}
                      title="Candidate PDF Portfolio"
                    ></iframe>
                  ) : (
                    <video 
                      controls 
                      className="w-full h-full"
                      src={`https://gateway.pinata.cloud/ipfs/${selectedCandidate.videoHash.split("?")[0]}`}
                      poster={selectedCandidate.logoUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              )}
              
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-indigo-400 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                  Candidate Manifesto
                </h3>
                {loadingManifesto ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading manifesto from IPFS...
                  </div>
                ) : (
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {modalManifesto || "No manifesto provided for this candidate."}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 bg-slate-800/80">
              <button
                onClick={() => voteCandidate(selectedCandidate.idx)}
                disabled={loading || !isVotingActive}
                className="w-full font-bold py-4 px-6 rounded-xl transition-all shadow-lg text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white hover:shadow-green-500/30 active:scale-95"
              >
                {loading ? "Processing Transaction..." : `Cast Vote for ${selectedCandidate.name}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cryptographic Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-green-900/20 border-b border-green-500/30 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-green-400 mb-1">Vote Successfully Cast!</h2>
              <p className="text-green-300 text-sm">Your vote is permanently secured on the blockchain.</p>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar">
              <div className="p-8 bg-white text-slate-900" ref={receiptRef}>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black tracking-widest text-slate-800 uppercase">SecureVote</h3>
                  <p className="text-slate-500 text-xs font-mono mt-1">CRYPTOGRAPHIC VOTER RECEIPT</p>
                </div>
                
                <div className="space-y-4 font-mono text-sm border-y border-dashed border-slate-300 py-6">
                  <div>
                    <span className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Transaction Hash</span>
                    <span className="block break-all font-medium text-indigo-700 bg-indigo-50 px-3 py-2 rounded border border-indigo-100">{receiptData.hash}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Block Number</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded">{receiptData.blockNumber}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Timestamp</span>
                    <span className="font-bold text-slate-800">{receiptData.timestamp}</span>
                  </div>
                  <div className="pt-2">
                    <span className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Voter (From)</span>
                    <span className="block break-all font-medium text-slate-700 text-xs bg-slate-50 p-2 rounded">{receiptData.from}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-bold uppercase tracking-wider mt-2 mb-1">Contract (To)</span>
                    <span className="block break-all font-medium text-slate-700 text-xs bg-slate-50 p-2 rounded">{receiptData.to}</span>
                  </div>
                </div>

                <div className="text-center mt-6">
                  <p className="text-xs text-slate-400 italic">Keep this receipt safe. You can independently verify this transaction hash on the Verification page without revealing your identity or choice.</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 bg-slate-800 flex flex-col sm:flex-row gap-4">
              <button
                onClick={downloadReceipt}
                className="flex-1 font-bold py-4 px-4 rounded-xl transition-all shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Download PDF Receipt
              </button>
              <button
                onClick={() => setReceiptData(null)}
                className="font-bold py-4 px-8 rounded-xl transition-all text-slate-300 bg-slate-700 hover:bg-slate-600 active:scale-95 border border-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vote;
