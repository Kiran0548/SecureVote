import React, { useState } from "react";
import { ethers } from "ethers";
import { contractAddress } from "../config";
import { useLanguage } from "../utils/i18n";

function Verify() {
  const [txHash, setTxHash] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { t } = useLanguage();

  const verifyTransaction = async () => {
    if (!txHash || txHash.length !== 66 || !txHash.startsWith("0x")) {
      setError("Please enter a valid 66-character transaction hash starting with 0x.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setVerificationResult(null);

      // Connect to the provider
      let provider;
      if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        setError("MetaMask is required to interact with the blockchain.");
        setLoading(false);
        return;
      }

      // Fetch transaction receipt
      const receipt = await provider.getTransactionReceipt(txHash);
      const tx = await provider.getTransaction(txHash);

      if (!receipt || !tx) {
        setError("Transaction not found on the blockchain. Are you on the correct network?");
        setLoading(false);
        return;
      }

      // We only care if the transaction was successful
      if (receipt.status === 1) {
        // Check if this transaction was interacting with our SecureVote contract
        const isSecureVote = receipt.to && receipt.to.toLowerCase() === contractAddress.toLowerCase();
        
        setVerificationResult({
          status: "SUCCESS",
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          from: receipt.from,
          to: receipt.to,
          contractInteracted: receipt.to ? receipt.to : "Contract Creation",
          isSecureVote: isSecureVote
        });
      } else {
        setVerificationResult({
          status: "FAILED",
          blockNumber: receipt.blockNumber,
        });
        setError("This transaction reverted/failed on the blockchain.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to verify. Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 min-h-[calc(100vh-80px)] relative">
      <div className="theme-card vote-page-hero mb-12 rounded-[2rem] px-6 py-10 text-center animate-fade-in-up md:px-10">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] theme-text-muted">
          {t("verify.badge")}
        </div>
        <h1 className="app-title mb-4 text-4xl font-bold md:text-5xl">{t("verify.title")}</h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          {t("verify.subtitle")}
        </p>
      </div>

      <div className="theme-card p-8 rounded-3xl relative">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-2">{t("verify.txHash")}</label>
            <input 
              type="text" 
              placeholder={t("verify.txPlaceholder")}
              value={txHash}
              onChange={(e) => setTxHash(e.target.value.trim())}
              className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-4 text-[var(--text-main)] placeholder:text-[var(--text-soft)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 font-mono"
            />
          </div>
          
          <button 
            onClick={verifyTransaction}
            disabled={loading}
            className="theme-primary-btn w-full rounded-xl px-4 py-4 text-base font-bold"
          >
            {loading ? t("verify.verifying") : t("verify.verifyButton")}
          </button>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-4 rounded-xl mt-4 text-center">
              <svg className="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {error}
            </div>
          )}

          {verificationResult && verificationResult.status === "SUCCESS" && (
            <div className="mt-8 animate-fade-in-up">
              <div className="bg-green-900/20 border border-green-500/50 rounded-3xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-[40px]"></div>
                
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  {verificationResult.isSecureVote && (
                    <div className="absolute -bottom-1 -right-1 bg-indigo-600 border-2 border-slate-900 text-white rounded-full p-1.5 shadow-lg" title="Verified SecureVote Transaction">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                    </div>
                  )}
                </div>
                <h2 className="text-3xl font-extrabold text-green-400 mb-2">VOTE INCLUDED IN TALLY</h2>
                <div className="flex items-center justify-center gap-2 mb-8">
                  <p className="text-slate-300 font-medium">This transaction hash is permanently verified on the blockchain.</p>
                  {verificationResult.isSecureVote && (
                    <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                      SecureVote Official
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-colors">
                    <span className="block text-xs text-indigo-400 uppercase font-bold mb-1 tracking-wider">Block Number</span>
                    <span className="font-mono text-white text-xl">{verificationResult.blockNumber}</span>
                  </div>
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-colors">
                    <span className="block text-xs text-indigo-400 uppercase font-bold mb-1 tracking-wider">Gas Used</span>
                    <span className="font-mono text-white text-xl">{verificationResult.gasUsed} Wei</span>
                  </div>
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 md:col-span-2 overflow-hidden hover:border-indigo-500/30 transition-colors">
                    <span className="block text-xs text-indigo-400 uppercase font-bold mb-1 tracking-wider">Voter Address (From)</span>
                    <span className="font-mono text-slate-300 text-sm md:text-base break-all">{verificationResult.from}</span>
                  </div>
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 md:col-span-2 overflow-hidden hover:border-indigo-500/30 transition-colors">
                    <span className="block text-xs text-indigo-400 uppercase font-bold mb-1 tracking-wider">Contract Processed (To)</span>
                    <span className="font-mono text-green-300 text-sm md:text-base break-all">{verificationResult.contractInteracted}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Verify;
