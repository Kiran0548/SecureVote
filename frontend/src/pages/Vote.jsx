import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { contractAddress, abi } from "../config";
import FaceAuth from "../components/FaceAuth";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof } from "@semaphore-protocol/proof";
import { enrichElection, fetchElectionMetadataMap } from "../utils/electionMetadata";
import { defaultVoterProfile, fetchVoterProfile, getVoterEligibilityReason, isVoterEligibleForElection } from "../utils/voterProfile";
import { createVoteLog } from "../utils/voteLogs";
import { useLanguage } from "../utils/i18n";

function Vote() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState([]);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [electionAccessMode, setElectionAccessMode] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("");
  const [localBodyFilter, setLocalBodyFilter] = useState("");
  const [wardSearch, setWardSearch] = useState("");
  const [voterProfile, setVoterProfile] = useState(defaultVoterProfile);
  const { t } = useLanguage();

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
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const ensureContract = async () => {
    if (!window.ethereum) {
      alert(t("vote.walletMissing"));
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

  const getOnChainVoterProfile = async (sc, walletAddress) => {
    try {
      const [exists, district, localBody, wardNumber] = await sc.getVoterProfile(walletAddress);
      if (!exists) return null;
      return {
        walletAddress: walletAddress.toLowerCase(),
        district,
        localBody,
        wardNumber,
      };
    } catch (error) {
      console.warn("On-chain voter profile unavailable:", error);
      return null;
    }
  };

  const getOnChainElectionMetadata = async (sc, electionId) => {
    try {
      const [electionType, district, localBody, wardNumber] = await sc.getElectionMetadata(electionId);
      return {
        electionType: Number(electionType),
        district,
        localBody,
        wardNumber,
      };
    } catch (error) {
      console.warn(`On-chain metadata unavailable for election ${electionId}:`, error);
      return null;
    }
  };

  const getOnChainEligibility = async (sc, walletAddress, electionId) => {
    try {
      return await sc.canVoteInElection(walletAddress, electionId);
    } catch (error) {
      console.warn(`On-chain eligibility unavailable for election ${electionId}:`, error);
      return null;
    }
  };

  const init = async () => {
    setIsInitializing(true);
    const sc = await ensureContract();
    if (!sc) {
      setIsInitializing(false);
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length === 0) {
        setIsInitializing(false);
        return;
      }
      
      const whitelisted = await sc.isWhitelisted(accounts[0]);
      setIsWhitelisted(whitelisted);

      const [metadataMap, backendProfile, onChainProfile] = await Promise.all([
        fetchElectionMetadataMap(),
        fetchVoterProfile(accounts[0]).catch(() => defaultVoterProfile),
        getOnChainVoterProfile(sc, accounts[0])
      ]);

      setVoterProfile({
        ...backendProfile,
        ...(onChainProfile || {}),
      });

      const count = await sc.electionCount();
      setElectionCount(Number(count));
      const electionsArr = [];
      const electionPromises = [];

      for (let i = 1; i <= Number(count); i++) {
        electionPromises.push(
          sc.elections(i).then(async (e) => {
            if (Number(e.state) === 1) { // Ongoing
              const chainMetadata = await getOnChainElectionMetadata(sc, i);
              const onChainEligible = await getOnChainEligibility(sc, accounts[0], i);
              return enrichElection({
                id: Number(e.id),
                title: e.title,
                state: Number(e.state),
                startTime: Number(e.startTime),
                endTime: Number(e.endTime),
                metadata: chainMetadata,
                onChainEligible,
              }, metadataMap);
            }
            return null;
          }).catch(err => {
            console.warn(`Failed to load election #${i}:`, err);
            return null;
          })
        );
      }
      
      const resolvedElections = await Promise.all(electionPromises);
      electionsArr.push(...resolvedElections.filter(e => e !== null));
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
    } finally {
      setIsInitializing(false);
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
    const eligibilityReason = election?.onChainEligible === false
      ? t("vote.wardDetailsMissing")
      : getVoterEligibilityReason(voterProfile, election);
    if (eligibilityReason) {
      alert(eligibilityReason);
      return;
    }

    setSelectedElectionId(election.id);
    setSelectedElectionTitle(election.title);
    setElectionState(election.state);
    setStartTime(election.startTime);
    setEndTime(election.endTime);
    fetchCandidates(contract, election.id);
  };

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const getInstructionText = () => {
    if (!account) {
      return t("vote.noAccountInstruction");
    }

    if (!isWhitelisted) {
      return t("vote.notApprovedInstruction");
    }

    if (!selectedElectionId) {
      if (allElections.length === 0) {
        return t("vote.noElectionAvailableInstruction");
      }

      return t("vote.noElectionInstruction");
    }

    if (electionState === 0) {
      return t("vote.notInitializedInstruction", { title: selectedElectionTitle });
    }

    if (electionState === 2) {
      return t("vote.endedInstruction", { title: selectedElectionTitle });
    }

    if (!isVotingActive && currentTime < startTime) {
      return t("vote.notStartedInstruction", { title: selectedElectionTitle });
    }

    if (!isVotingActive && currentTime > endTime) {
      return t("vote.finalResultInstruction", { title: selectedElectionTitle });
    }

    if (!biometricsVerified) {
      return t("vote.biometricInstruction");
    }

    if (!hasRegisteredIdentity) {
      return t("vote.identityInstruction");
    }

    return t("vote.candidateInstruction", { title: selectedElectionTitle });
  };

  const speakInstructions = () => {
    if (!speechSupported) {
      alert(t("vote.speechUnsupported"));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(getInstructionText());
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
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
        setModalManifesto(t("vote.manifestoLoadFailed"));
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
      alert(t("vote.identitySubmitted"));
    } catch (err) {
      console.error(err);
      alert(t("vote.registrationFailed", { message: err.reason || err.message }));
    } finally {
      setLoading(false);
    }
  };

  const voteCandidate = async (candidateId) => {
    if (!contract) return;
    if (!identityString) {
      alert(t("vote.identityNotFound"));
      return;
    }
    if (!selectedElection || selectedElection.onChainEligible === false || !isVoterEligibleForElection(voterProfile, selectedElection)) {
      const reason = selectedElection?.onChainEligible === false
        ? t("vote.wardDetailsMissing")
        : getVoterEligibilityReason(voterProfile, selectedElection);
      alert(reason || t("vote.ineligible"));
      return;
    }
    
    try {
      setLoading(true);
      const candidateName = candidates[candidateId]?.name || `Candidate #${candidateId + 1}`;
      
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
      
      // Get current block to avoid massive block scanning which fails on public RPCs
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = currentBlock - 100000 > 0 ? currentBlock - 100000 : 0;
      
      const events = await semaphoreContract.queryFilter(filter, fromBlock, "latest");
      
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

      const persistVoteLog = async () => {
        await createVoteLog({
          voter: account,
          candidate: candidateName,
          electionId: selectedElectionId,
        });
      };
      
      // Wait for transaction confirmation, fallback to delayed refetch if RPC rate-limits
      let receipt = null;
      try {
        receipt = await tx.wait(1);
      } catch (waitErr) {
        console.warn("tx.wait() failed (likely RPC rate limit), will retry in 10s:", waitErr);
      }
      
      setReceiptData({
        hash: tx.hash,
        blockNumber: receipt ? receipt.blockNumber.toString() : t("vote.receiptPending"),
        timestamp: new Date().toLocaleString(),
        from: account,
        to: contractAddress
      });

      setSelectedCandidate(null);
      
      if (receipt) {
        // Transaction confirmed — fetch updated counts immediately
        await persistVoteLog();
        await fetchCandidates(contract, selectedElectionId);
        await init();
      } else {
        // Transaction submitted but not yet confirmed — retry after delay
        setTimeout(async () => {
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const delayedReceipt = await provider.getTransactionReceipt(tx.hash);
            if (delayedReceipt?.status === 1) {
              await persistVoteLog();
            }
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
      alert(t("vote.receiptFailed"));
    }
  };

  const [biometricsVerified, setBiometricsVerified] = useState(false);
  const selectedElection = allElections.find((e) => e.id === selectedElectionId) || null;
  const filteredElections = allElections.filter((election) => {
    if (electionAccessMode === "global" && election.metadata?.electionType !== "global") {
      return false;
    }

    if (electionAccessMode === "ward_based" && election.metadata?.electionType !== "ward_based") {
      return false;
    }

    if (districtFilter.trim() && !election.metadata?.district.toLowerCase().includes(districtFilter.trim().toLowerCase())) {
      return false;
    }

    if (localBodyFilter.trim() && !election.metadata?.localBody.toLowerCase().includes(localBodyFilter.trim().toLowerCase())) {
      return false;
    }

    if (wardSearch.trim() && election.metadata?.wardNumber.trim() !== wardSearch.trim()) {
      return false;
    }

    if (election.onChainEligible === false) {
      return false;
    }

    if (!isVoterEligibleForElection(voterProfile, election)) {
      return false;
    }

    return true;
  });
  const selectedElectionEligibilityReason = selectedElection?.onChainEligible === false
    ? t("vote.wardDetailsMissing")
    : getVoterEligibilityReason(voterProfile, selectedElection);
  const isVotingActive = electionState === 1 && currentTime >= startTime && currentTime <= endTime;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="theme-card vote-page-hero mb-12 rounded-[2rem] px-6 py-10 text-center animate-fade-in-up md:px-10">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] theme-text-muted">
          {t("vote.badge")}
        </div>
        <h1 className="app-title mb-4 text-4xl font-bold md:text-5xl">{t("vote.title")}</h1>
        <p className="text-slate-400">{t("vote.subtitle")}</p>
      </div>

      <div className="theme-panel mb-8 rounded-2xl border border-[var(--border-soft)] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] theme-accent">
              {t("vote.assistBadge")}
            </div>
            <h2 className="text-xl font-bold">{t("vote.assistTitle")}</h2>
            <p className="theme-text-muted">
              {t("vote.assistBody")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={speakInstructions}
              disabled={!speechSupported}
              className="theme-primary-btn rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSpeaking ? t("vote.replayInstructions") : t("vote.readInstructions")}
            </button>
            <button
              type="button"
              onClick={stopSpeaking}
              disabled={!speechSupported || !isSpeaking}
              className="theme-secondary-btn rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("vote.stopAudio")}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] theme-text-soft">{t("vote.currentGuidance")}</p>
          <p className="mt-2 text-sm leading-7 theme-text-muted" aria-live="polite">
            {getInstructionText()}
          </p>
        </div>
      </div>

      {account && isWhitelisted && (
        <div className="theme-panel mb-8 rounded-2xl border border-[var(--border-soft)] p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] theme-text-soft">{t("vote.verifiedProfile")}</p>
              <h2 className="mt-2 text-xl font-bold text-white">{voterProfile.fullName || t("vote.profileOnFile")}</h2>
              <p className="mt-2 text-sm theme-text-muted">
                {voterProfile.district && voterProfile.localBody && voterProfile.wardNumber
                  ? `${voterProfile.district} / ${voterProfile.localBody} / ${t("common.wardLabel", { ward: voterProfile.wardNumber })}`
                  : t("vote.wardDetailsMissing")}
              </p>
            </div>
            {voterProfile.idReferenceMasked && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
                {t("vote.idRef", { value: voterProfile.idReferenceMasked })}
              </div>
            )}
          </div>
        </div>
      )}

      {!account ? (
        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl text-center backdrop-blur-sm max-w-lg mx-auto">
           <svg className="w-16 h-16 text-indigo-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          <p className="text-slate-300 text-lg mb-6">{t("vote.connectWalletPrompt")}</p>
        </div>
      ) : isInitializing ? (
        <div className="bg-slate-800/50 border border-slate-700 p-12 rounded-2xl text-center backdrop-blur-sm flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
          <svg className="w-12 h-12 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-indigo-400 text-xl font-semibold">Loading election data...</p>
          <p className="text-slate-400 text-sm">Please allow up to 50 seconds for the server to wake up.</p>
        </div>
      ) : !isWhitelisted ? (
        <div className="bg-yellow-900/20 border border-yellow-500/30 p-8 rounded-2xl text-center backdrop-blur-sm max-w-lg mx-auto">
           <svg className="w-16 h-16 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          <p className="text-yellow-400 text-lg font-medium">{t("vote.verificationRequired")}</p>
          <p className="text-slate-400 mt-2">{t("vote.notWhitelisted", { address: `${account.slice(0,6)}...${account.slice(-4)}` })}</p>
        </div>
      ) : !selectedElectionId ? (
        <div className="space-y-8">
           <div className="grid gap-6">
             <div className="theme-panel rounded-2xl border border-[var(--border-soft)] p-5 md:p-6">
               <div className="flex flex-col gap-4">
                 <div>
                   <h2 className="text-2xl font-bold text-center mb-2">{t("vote.selectElectionTitle")}</h2>
                   <p className="text-center text-sm theme-text-muted">
                     {t("vote.selectElectionBody")}
                   </p>
                 </div>

                 <div className="flex flex-wrap justify-center gap-3">
                   <button
                     type="button"
                     onClick={() => setElectionAccessMode("all")}
                     className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${electionAccessMode === "all" ? "bg-indigo-600 text-white" : "bg-slate-800/70 text-slate-300"}`}
                   >
                     {t("vote.allElections")}
                   </button>
                   <button
                     type="button"
                     onClick={() => setElectionAccessMode("global")}
                     className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${electionAccessMode === "global" ? "bg-indigo-600 text-white" : "bg-slate-800/70 text-slate-300"}`}
                   >
                     {t("vote.general")}
                   </button>
                   <button
                     type="button"
                     onClick={() => setElectionAccessMode("ward_based")}
                     className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${electionAccessMode === "ward_based" ? "bg-indigo-600 text-white" : "bg-slate-800/70 text-slate-300"}`}
                   >
                     {t("vote.wardBased")}
                   </button>
                 </div>

                 {electionAccessMode === "ward_based" && (
                   <div className="grid gap-4 md:grid-cols-3">
                     <input
                       type="text"
                       placeholder={t("vote.districtPlaceholder")}
                       className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                       value={districtFilter}
                       onChange={(e) => setDistrictFilter(e.target.value)}
                     />
                     <input
                       type="text"
                       placeholder={t("vote.localBodyPlaceholder")}
                       className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                       value={localBodyFilter}
                       onChange={(e) => setLocalBodyFilter(e.target.value)}
                     />
                     <input
                       type="text"
                       placeholder={t("vote.wardPlaceholder")}
                       className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                       value={wardSearch}
                       onChange={(e) => setWardSearch(e.target.value)}
                     />
                   </div>
                 )}
               </div>
             </div>
             {filteredElections.length === 0 ? (
               <div className="bg-slate-800/50 border border-slate-700 p-12 rounded-2xl text-center backdrop-blur-sm">
                 <p className="text-slate-400">
                   {allElections.length === 0
                     ? t("vote.noActiveElections")
                     : t("vote.noFilteredElections")}
                 </p>
               </div>
             ) : (
               <div className="grid sm:grid-cols-2 gap-6">
                 {filteredElections.map(e => (
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
                     <div className="mb-2 flex flex-wrap gap-2">
                       <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${e.metadata?.electionType === "ward_based" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"}`}>
                         {e.metadata?.electionType === "ward_based" ? t("vote.wardBased") : t("vote.general")}
                       </span>
                       {e.metadata?.wardNumber && (
                         <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] bg-slate-700 text-slate-300 border border-slate-600">
                           {t("common.wardLabel", { ward: e.metadata.wardNumber })}
                         </span>
                       )}
                     </div>
                     {e.metadata?.electionType === "ward_based" && (
                       <p className="text-slate-400 text-sm mb-2">
                         {e.metadata.district} / {e.metadata.localBody}
                       </p>
                     )}
                     <p className="text-slate-400 text-sm">{t("vote.closes", { time: new Date(e.endTime * 1000).toLocaleString() })}</p>
                   </button>
                 ))}
               </div>
             )}
           </div>
        </div>
      ) : (
           <div className="space-y-8">
          {selectedElectionEligibilityReason && (
            <div className="rounded-2xl border border-red-500/30 bg-red-900/20 p-5 text-center text-red-200">
              {selectedElectionEligibilityReason}
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setSelectedElectionId(null)}
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                {t("vote.backToElections")}
            </button>
            <div className="h-4 w-px bg-slate-700"></div>
            <div>
              <h2 className="text-xl font-bold text-indigo-400 tracking-tight">{selectedElectionTitle}</h2>
              {selectedElection?.metadata?.electionType === "ward_based" && (
                <p className="mt-1 text-sm text-slate-400">
                  {selectedElection.metadata.district} / {selectedElection.metadata.localBody} / {t("common.wardLabel", { ward: selectedElection.metadata.wardNumber })}
                </p>
              )}
            </div>
          </div>
          
          {/* Election Status Banner */}
          <div className={`p-6 rounded-2xl border text-center backdrop-blur-sm 
            ${electionState === 0 ? "bg-slate-800/50 border-slate-700" : 
              electionState === 2 ? "bg-purple-900/20 border-purple-500/30" : 
              isVotingActive ? "bg-green-900/20 border-green-500/30" : "bg-yellow-900/20 border-yellow-500/30"}`}
          >
             {electionState === 0 && <p className="text-slate-400 text-lg">{t("vote.notInitialized")}</p>}
            
            {electionState === 1 && (
              <>
                {!isVotingActive && currentTime < startTime && <p className="text-yellow-400 text-lg">{t("vote.startsAt", { time: new Date(startTime * 1000).toLocaleString() })}</p>}
                {!isVotingActive && currentTime > endTime && <p className="text-yellow-400 text-lg">{t("vote.votingEndedWaiting")}</p>}
                {isVotingActive && <p className="text-green-400 text-lg font-medium">{t("vote.activeClosesAt", { time: new Date(endTime * 1000).toLocaleString() })}</p>}
              </>
            )}

            {electionState === 2 && <p className="text-purple-400 text-lg font-medium">{t("vote.electionEndedAdmin")}</p>}
          </div>

          {!biometricsVerified && electionState === 1 && isVotingActive ? (
            <FaceAuth account={account} onVerified={() => setBiometricsVerified(true)} />
          ) : !hasRegisteredIdentity && electionState === 1 && isVotingActive ? (
            <div className="bg-slate-800/80 border border-slate-700 p-8 rounded-2xl max-w-xl mx-auto text-center space-y-6 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px]"></div>
               <svg className="w-16 h-16 text-indigo-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
               <h2 className="text-2xl font-bold">{t("vote.generateIdentity")}</h2>
               <p className="text-slate-300">
                  {t("vote.generateIdentityBody")}
               </p>
               <div className="bg-slate-900/50 p-4 rounded-xl text-left border border-slate-700/50">
                  <p className="text-sm text-yellow-400 font-medium mb-1">{t("vote.howItWorks")}</p>
                  <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                     <li>{t("vote.howItWorks1")}</li>
                     <li>{t("vote.howItWorks2")}</li>
                     <li>{t("vote.howItWorks3")}</li>
                     <li>{t("vote.howItWorks4")}</li>
                  </ul>
               </div>
               <button
                  onClick={registerAnonymousIdentity}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg text-lg disabled:opacity-50"
               >
                  {loading ? t("vote.registering") : t("vote.generateAndRegister")}
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
                    <span className="text-slate-400 text-sm">{t("vote.currentVotes", { count: votes[idx] })}</span>
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
                    {t("vote.viewProfileVote")}
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
                      title={t("vote.pdfTitle")}
                    ></iframe>
                  ) : (
                    <video 
                      controls 
                      className="w-full h-full"
                      src={`https://gateway.pinata.cloud/ipfs/${selectedCandidate.videoHash.split("?")[0]}`}
                      poster={selectedCandidate.logoUrl}
                    >
                      {t("vote.browserVideoUnsupported")}
                    </video>
                  )}
                </div>
              )}
              
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-indigo-400 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                  {t("vote.candidateManifesto")}
                </h3>
                {loadingManifesto ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    {t("vote.loadingManifesto")}
                  </div>
                ) : (
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {modalManifesto || t("vote.noManifesto")}
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
                {loading ? t("vote.processingTransaction") : t("vote.castVoteFor", { name: selectedCandidate.name })}
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
              <h2 className="text-2xl font-bold text-green-400 mb-1">{t("vote.voteSuccess")}</h2>
              <p className="text-green-300 text-sm">{t("vote.voteSuccessBody")}</p>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar">
              <div className="p-8 bg-white text-slate-900" ref={receiptRef}>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black tracking-widest text-slate-800 uppercase">SecureVote</h3>
                  <p className="text-slate-500 text-xs font-mono mt-1">{t("vote.cryptographicReceipt")}</p>
                </div>
                
                <div className="space-y-4 font-mono text-sm border-y border-dashed border-slate-300 py-6">
                  <div>
                    <span className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{t("vote.transactionHash")}</span>
                    <span className="block break-all font-medium text-indigo-700 bg-indigo-50 px-3 py-2 rounded border border-indigo-100">{receiptData.hash}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t("vote.blockNumber")}</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded">{receiptData.blockNumber}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t("vote.timestamp")}</span>
                    <span className="font-bold text-slate-800">{receiptData.timestamp}</span>
                  </div>
                  <div className="pt-2">
                    <span className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{t("vote.voterFrom")}</span>
                    <span className="block break-all font-medium text-slate-700 text-xs bg-slate-50 p-2 rounded">{receiptData.from}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-bold uppercase tracking-wider mt-2 mb-1">{t("vote.contractTo")}</span>
                    <span className="block break-all font-medium text-slate-700 text-xs bg-slate-50 p-2 rounded">{receiptData.to}</span>
                  </div>
                </div>

                <div className="text-center mt-6">
                  <p className="text-xs text-slate-400 italic">{t("vote.receiptHint")}</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 bg-slate-800 flex flex-col sm:flex-row gap-4">
              <button
                onClick={downloadReceipt}
                className="flex-1 font-bold py-4 px-4 rounded-xl transition-all shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                {t("vote.downloadReceipt")}
              </button>
              <button
                onClick={() => setReceiptData(null)}
                className="font-bold py-4 px-8 rounded-xl transition-all text-slate-300 bg-slate-700 hover:bg-slate-600 active:scale-95 border border-slate-600"
              >
                {t("vote.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vote;
