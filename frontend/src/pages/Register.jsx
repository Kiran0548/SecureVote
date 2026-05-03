import { useEffect, useState } from "react";
import { maskIdReference } from "../utils/voterProfile";
import { defaultVoterApplication, submitVoterApplication } from "../utils/voterApplications";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Unable to read the selected photo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to process the selected photo."));
    image.src = dataUrl;
  });
}

async function compressImageFile(file) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const maxSize = 768;
  const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare the selected photo.");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function formatSubmissionError(error) {
  const raw = error?.message || "Unable to submit application.";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.message) return parsed.message;
    if (parsed?.error) return `${parsed.error}. Please check the required fields and photo size.`;
  } catch {
    // Ignore JSON parsing errors and fall back to the raw message.
  }
  return raw;
}

function Register() {
  const [form, setForm] = useState(defaultVoterApplication);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [photoPreview, setPhotoPreview] = useState("");

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

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoPreview("");
      handleChange("photoDataUrl", "");
      return;
    }

    try {
      const result = await compressImageFile(file);
      setPhotoPreview(result);
      handleChange("photoDataUrl", result);
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Unable to process the selected photo.");
      setPhotoPreview("");
      handleChange("photoDataUrl", "");
    }
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
        district: form.registrationType === "GENERAL" ? "" : form.district,
        localBody: form.registrationType === "GENERAL" ? "" : form.localBody,
        wardNumber: form.registrationType === "GENERAL" ? "" : form.wardNumber,
      });

      setMessageType("success");
      setMessage("Application submitted successfully. The admin can now review and approve it.");
      setForm((current) => ({
        ...defaultVoterApplication,
        walletAddress: current.walletAddress,
      }));
      setPhotoPreview("");
    } catch (error) {
      setMessageType("error");
      setMessage(formatSubmissionError(error));
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
                <span className="text-sm font-semibold">Registration Type</span>
                <select
                  value={form.registrationType}
                  onChange={(event) => handleChange("registrationType", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  required
                >
                  <option value="GENERAL">General Election</option>
                  <option value="WARD_BASED">Ward-Based Election</option>
                </select>
              </label>

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

              {form.registrationType === "WARD_BASED" ? (
                <>
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
                </>
              ) : null}

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

            <label className="space-y-2">
              <span className="text-sm font-semibold">Voter Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none file:mr-4 file:rounded-full file:border-0 file:bg-indigo-500/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-200"
                required
              />
            </label>

            {photoPreview ? (
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4">
                <p className="mb-3 text-sm font-semibold">Photo Preview</p>
                <img
                  src={photoPreview}
                  alt="Voter preview"
                  className="h-40 w-40 rounded-2xl object-cover"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !form.photoDataUrl}
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
