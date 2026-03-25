import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "@vladmandic/face-api";

const FaceAuth = ({ onVerified, account }) => {
  const webcamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [matcher, setMatcher] = useState(null);
  const [statusMsg, setStatusMsg] = useState("Please look directly at the camera to verify your identity.");

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
            // 0.4 specifies a strict threshold to prevent false positive face matches
            const faceMatcher = new faceapi.FaceMatcher(labeledDescriptor, 0.4);
            setMatcher(faceMatcher);
          } else {
            setError("No Face ID found for this wallet address. Please contact Admin.");
          }
        }
        
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face models:", err);
        setError("Failed to load facial recognition models.");
      }
    };
    loadModels();
  }, [account]);

  const detectFace = async () => {
    if (!webcamRef.current || !webcamRef.current.video || !modelsLoaded || !matcher) {
      if (scanning && !matcher && !error) {
         requestAnimationFrame(detectFace);
      }
      return;
    }
    
    if (webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;
      const detections = await faceapi.detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      ).withFaceLandmarks().withFaceDescriptor();

      if (detections) {
        const bestMatch = matcher.findBestMatch(detections.descriptor);
        if (bestMatch.label !== 'unknown') {
          setStatusMsg("Identity Verified! Unlocking...");
          setScanning(false);
          setTimeout(() => onVerified(), 1000);
          return;
        } else {
          setStatusMsg("Face detected, but identity does not match Wallet!");
        }
      } else {
        setStatusMsg("Scanning for your face...");
      }
      
      if (scanning) {
        requestAnimationFrame(detectFace);
      }
    } else {
      requestAnimationFrame(detectFace);
    }
  };

  useEffect(() => {
    if (scanning && matcher) {
      detectFace();
    }
    // eslint-disable-next-line
  }, [scanning, modelsLoaded, matcher]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800/80 border border-slate-700 rounded-2xl max-w-md mx-auto relative overflow-hidden">
      <h2 className="text-2xl font-bold mb-4 text-white">Biometric Verification</h2>
      
      {!error && (
        <p className={`text-center mb-6 font-medium ${statusMsg.includes("does not match") ? "text-red-400" : statusMsg.includes("Verified") ? "text-green-400" : "text-slate-400"}`}>
          {statusMsg}
        </p>
      )}

      {error ? (
        <p className="text-red-400 text-center font-medium bg-red-900/20 p-4 rounded-lg border border-red-500/30">{error}</p>
      ) : !modelsLoaded ? (
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-300">Loading AI Models...</p>
        </div>
      ) : (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black mb-6 border border-slate-600 shadow-lg">
          <Webcam
            ref={webcamRef}
            audio={false}
            className="absolute inset-0 w-full h-full object-cover"
            videoConstraints={{ facingMode: "user" }}
            onUserMedia={() => {
              if (!scanning && matcher) setScanning(true);
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
          onClick={() => { setScanning(true); setStatusMsg("Scanning for your face..."); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-xl transition-all"
        >
          {statusMsg.includes("Verified") ? "Verified" : "Retry Scan"}
        </button>
      ) : (
        <div className="h-10"></div>
      )}
    </div>
  );
};

export default FaceAuth;
