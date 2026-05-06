import { useEffect, useState } from "react";
import { maskIdReference } from "../utils/voterProfile";
import { defaultVoterApplication, submitVoterApplication } from "../utils/voterApplications";
import { useLanguage } from "../utils/i18n";

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
  const { t } = useLanguage();

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
      setMessage(error.message || t("register.fileProcessError"));
      setPhotoPreview("");
      handleChange("photoDataUrl", "");
    }
  };

  const handleIdProofChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      handleChange("idProofDataUrl", "");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessageType("error");
      setMessage("Identity proof file must be less than 2MB.");
      handleChange("idProofDataUrl", "");
      return;
    }

    try {
      if (file.type.startsWith("image/")) {
        const result = await compressImageFile(file);
        handleChange("idProofDataUrl", result);
      } else {
        const result = await readFileAsDataUrl(file);
        handleChange("idProofDataUrl", result);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Unable to process identity proof file.");
      handleChange("idProofDataUrl", "");
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert(t("register.walletInstall"));
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
      setMessage(t("register.submitSuccess"));
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
              {t("register.badge")}
            </div>
            <h1 className="app-title text-4xl font-extrabold tracking-tight md:text-5xl">
              {t("register.title")}
            </h1>
            <p className="text-lg theme-text-muted">
              {t("register.subtitle")}
            </p>
          </div>
        </section>

        <section className="theme-card rounded-[1.8rem] p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">{t("register.connectedWallet")}</p>
              <p className="mt-1 font-mono text-sm theme-text-soft">
                {form.walletAddress || t("register.noWalletConnected")}
              </p>
            </div>
            <button
              type="button"
              onClick={connectWallet}
              className="theme-secondary-btn rounded-2xl px-5 py-3 text-sm font-semibold"
            >
              {form.walletAddress ? t("register.changeWallet") : t("register.connectWallet")}
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
                <span className="text-sm font-semibold">{t("register.typeLabel")}</span>
                <select
                  value={form.registrationType}
                  onChange={(event) => handleChange("registrationType", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  required
                >
                  <option value="GENERAL">{t("common.registrationTypeGeneral")}</option>
                  <option value="WARD_BASED">{t("common.registrationTypeWard")}</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">{t("register.fullName")}</span>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => handleChange("fullName", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">{t("register.walletAddress")}</span>
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
                    <span className="text-sm font-semibold">{t("register.district")}</span>
                    <input
                      type="text"
                      value={form.district}
                      onChange={(event) => handleChange("district", event.target.value)}
                      className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold">{t("register.localBody")}</span>
                    <input
                      type="text"
                      value={form.localBody}
                      onChange={(event) => handleChange("localBody", event.target.value)}
                      className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold">{t("register.wardNumber")}</span>
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
                <span className="text-sm font-semibold">{t("register.idReference")}</span>
                <input
                  type="text"
                  value={form.idReferenceMasked}
                  onChange={(event) => handleChange("idReferenceMasked", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  placeholder={t("register.idReferencePlaceholder")}
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">Gender</span>
                <select
                  value={form.gender}
                  onChange={(event) => handleChange("gender", event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold">{t("register.idProofLabel")}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleIdProofChange}
                className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 text-sm text-inherit outline-none file:mr-4 file:rounded-full file:border-0 file:bg-indigo-500/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-200"
                required
              />
            </label>

            {form.idProofDataUrl && form.idProofDataUrl.startsWith("data:image/") ? (
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4">
                <p className="mb-3 text-sm font-semibold">ID Proof Preview</p>
                <img
                  src={form.idProofDataUrl}
                  alt="ID Proof preview"
                  className="h-40 w-auto rounded-2xl object-cover"
                />
              </div>
            ) : form.idProofDataUrl && form.idProofDataUrl.startsWith("data:application/pdf") ? (
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4">
                <p className="mb-3 text-sm font-semibold">ID Proof Preview</p>
                <iframe src={form.idProofDataUrl} className="w-full h-40 rounded-2xl" title="ID Proof" />
              </div>
            ) : null}

            <label className="space-y-2">
              <span className="text-sm font-semibold">{t("register.voterPhoto")}</span>
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
                <p className="mb-3 text-sm font-semibold">{t("register.photoPreview")}</p>
                <img
                  src={photoPreview}
                  alt="Voter preview"
                  className="h-40 w-40 rounded-2xl object-cover"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !form.photoDataUrl || !form.idProofDataUrl}
              className="theme-primary-btn rounded-2xl px-6 py-3 text-sm font-bold disabled:opacity-60"
            >
              {submitting ? t("register.submitting") : t("register.submit")}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Register;
