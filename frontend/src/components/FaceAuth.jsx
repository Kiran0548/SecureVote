import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import * as faceapi from "@vladmandic/face-api";
import { useLanguage } from "../utils/i18n";

// Use the same detector options everywhere so enrollment and auth descriptors are comparable.
const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.4,
});

const FaceAuth = ({ onVerified, account }) => {
  const webcamRef = useRef(null);
  const scanningRef = useRef(false); // use a ref so the rAF loop always sees current value
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [matcher, setMatcher] = useState(null);
  const { t } = useLanguage();
  const [statusKey, setStatusKey] = useState("faceAuth.initialStatus");

  // Keep the ref in sync with the state
  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  useEffect(() => {
    setStatusKey("faceAuth.initialStatus");
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        // Load the saved descriptor for this account
        if (account) {
          const savedData = localStorage.getItem(`face_${account.toLowerCase()}`);
          if (savedData) {
            const descriptorArray = new Float32Array(JSON.parse(savedData));
            const labeledDescriptor = new faceapi.LabeledFaceDescriptors(account, [descriptorArray]);
            // 0.6 is the recommended threshold – strict enough to prevent impersonation
            // but tolerant of natural variation in lighting/angle.
            const faceMatcher = new faceapi.FaceMatcher(labeledDescriptor, 0.6);
            setMatcher(faceMatcher);
          } else {
            setError(t("faceAuth.noFaceId"));
          }
        }

        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face models:", err);
        setError(t("faceAuth.modelLoadError"));
      }
    };
    loadModels();
  }, [account, t]);

  const detectFace = useCallback(async () => {
    // Stop if the scan was cancelled
    if (!scanningRef.current) return;

    const video = webcamRef.current?.video;
    if (!video || !modelsLoaded || !matcher) {
      // Models not ready yet – retry on next frame
      requestAnimationFrame(detectFace);
      return;
    }

    if (video.readyState !== 4) {
      // Video not ready yet – retry on next frame
      requestAnimationFrame(detectFace);
      return;
    }

    try {
      const detections = await faceapi
        .detectSingleFace(video, DETECTOR_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!scanningRef.current) return; // cancelled while awaiting

      if (detections) {
        const bestMatch = matcher.findBestMatch(detections.descriptor);
        if (bestMatch.label !== "unknown") {
          setStatusKey("faceAuth.verified");
          setScanning(false);
          scanningRef.current = false;
          setTimeout(() => onVerified(), 1000);
          return; // done – do NOT schedule another frame
        } else {
          setStatusKey("faceAuth.mismatch");
        }
      } else {
        setStatusKey("faceAuth.scanning");
      }
    } catch (err) {
      console.error("Face detection error:", err);
    }

    // Continue scanning on the next frame
    if (scanningRef.current) {
      requestAnimationFrame(detectFace);
    }
  }, [modelsLoaded, matcher, onVerified]);

  // Start the detection loop whenever scanning becomes true
  useEffect(() => {
    if (scanning && modelsLoaded && matcher) {
      scanningRef.current = true;
      detectFace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, modelsLoaded, matcher]);

  const startScan = () => {
    setStatusKey("faceAuth.scanning");
    setScanning(true);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800/80 border border-slate-700 rounded-2xl max-w-md mx-auto relative overflow-hidden">
      <h2 className="text-2xl font-bold mb-4 text-white">{t("faceAuth.title")}</h2>

      {!error && (
        <p
          className={`text-center mb-6 font-medium ${
            statusKey === "faceAuth.mismatch"
              ? "text-red-400"
              : statusKey === "faceAuth.verified"
              ? "text-green-400"
              : "text-slate-400"
          }`}
        >
          {t(statusKey)}
        </p>
      )}

      {error ? (
        <p className="text-red-400 text-center font-medium bg-red-900/20 p-4 rounded-lg border border-red-500/30">
          {error}
        </p>
      ) : !modelsLoaded ? (
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-300">{t("faceAuth.loadingModels")}</p>
        </div>
      ) : (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black mb-6 border border-slate-600 shadow-lg">
          <Webcam
            ref={webcamRef}
            audio={false}
            className="absolute inset-0 w-full h-full object-cover"
            videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
            onUserMedia={() => {
              // Auto-start scanning once camera is ready and models + matcher are loaded
              if (!scanningRef.current && matcher) {
                startScan();
              }
            }}
          />

          {/* Scanning Animation */}
          {scanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
              <div className="absolute inset-0 border-4 border-indigo-500/30"></div>
            </div>
          )}
        </div>
      )}

      {!scanning && modelsLoaded && !error ? (
        <button
          onClick={startScan}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-xl transition-all"
        >
          {statusKey === "faceAuth.verified" ? t("faceAuth.verified") : t("faceAuth.retry")}
        </button>
      ) : (
        <div className="h-10"></div>
      )}
    </div>
  );
};

export default FaceAuth;
