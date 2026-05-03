import { useEffect, useState } from "react";
import { maskIdReference } from "../utils/voterProfile";
import { defaultVoterApplication, submitVoterApplication } from "../utils/voterApplications";

function Register() {
  const [form, setForm] = useState(defaultVoterApplication);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    const loadWallet = async () => {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setForm((current) => ({
          ...current,
          walletAddress: accounts[0].toLowerCase(),
        }));
      }
    };

    loadWallet();
  }, []);

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to continue.");
      return;
    }

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (accounts.length > 0) {
      handleChange("walletAddress", accounts[0].toLowerCase());
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setMessage("");

      await submitVoterApplication({
        ...form,
        walletAddress: form.walletAddress.trim().toLowerCase(),
        idReferenceMasked: maskIdReference(form.idReferenceMasked),
      });

      setMessageType("success");
      setMessage("Application submitted successfully. The admin can now review and approve it.");
      setForm((current) => ({
        ...defaultVoterApplication,
        walletAddress: current.walletAddress,
      }));
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Unable to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-12 md:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <section className="theme-card rounded-[2rem] px-6 py-10 md:px-10">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] theme-text-muted">
              Voter Registration
            </div>
            <h1 className="app-title text-4xl font-extrabold tracking-tight md:text-5xl">
              Apply for ballot access
            </h1>
            <p className="text-lg theme-text-muted">
              Submit your voter details for admin review. Once approved, your profile is created automatically in the backend and the admin can proceed with blockchain whitelisting.
            </p>
          </div>
        </section>

        <section className="theme-card rounded-[1.8rem] p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">Connected wallet</p>
              <p className="mt-1 font-mono text-sm theme-text-soft">
                {form.walletAddress || "No wallet connected"}
              </p>
            </div>
            <button
              type="button"
              onClick={connectWallet}
              className="theme-secondary-btn rounded-2xl px-5 py-3 text-sm font-semibold"
            >
              {form.walletAddress ? "Change Wallet" : "Connect Wallet"}
            </button>
          </div>

          {message ? (
            <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/30 bg-red-500/10 text-red-200"
            }`}>
              {message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Full Name</span>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => handleChange("fullName", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">Wallet Address</span>
                <input
                  type="text"
                  value={form.walletAddress}
                  onChange={(event) => handleChange("walletAddress", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm font-mono text-inherit outline-none"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">District</span>
                <input
                  type="text"
                  value={form.district}
                  onChange={(event) => handleChange("district", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">Local Body / Panchayat</span>
                <input
                  type="text"
                  value={form.localBody}
                  onChange={(event) => handleChange("localBody", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">Ward Number</span>
                <input
                  type="text"
                  value={form.wardNumber}
                  onChange={(event) => handleChange("wardNumber", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">ID Reference</span>
                <input
                  type="text"
                  value={form.idReferenceMasked}
                  onChange={(event) => handleChange("idReferenceMasked", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  placeholder="e.g. Aadhaar last 4 digits"
                  required
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold">ID Proof Link or File Path</span>
              <input
                type="text"
                value={form.idProofPath}
                onChange={(event) => handleChange("idProofPath", event.target.value)}
                className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                placeholder="Paste a drive link, IPFS URL, or local reference"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="theme-primary-btn rounded-2xl px-6 py-3 text-sm font-bold disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Register;
