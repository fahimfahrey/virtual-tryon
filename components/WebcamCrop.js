"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";

const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe";
const SHOULDER_L = 11,
  SHOULDER_R = 12,
  HIP_L = 23,
  HIP_R = 24,
  NOSE = 0;

// Landmark pairs to render as dots on the detection box
const HUD_DOTS = [SHOULDER_L, SHOULDER_R, HIP_L, HIP_R];

function loadScript(src, globalName) {
  return new Promise((resolve, reject) => {
    if (globalName && window[globalName]) return resolve();

    let s = document.querySelector(`script[src="${src}"]`);
    if (s) {
      if (s.getAttribute('data-loaded') === 'true') return resolve();
      const onLoaded = () => resolve();
      s.addEventListener('load', onLoaded);
      s.addEventListener('error', reject);
      return;
    }

    s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => {
      s.setAttribute('data-loaded', 'true');
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function WebcamCrop({ onCropReady }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const lastCropRef = useRef(0);
  const wrapRef = useRef(null);

  const [status, setStatus] = useState("initializing");
  const [scanY, setScanY] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [landmarks, setLandmarks] = useState(null); // for HUD dots
  const [latency, setLatency] = useState(null);
  const [frameCount, setFrameCount] = useState(0);

  const cropAndEmit = useCallback(
    (lm, videoEl) => {
      const canvas = canvasRef.current;
      if (!canvas || !videoEl) return;
      const vw = videoEl.videoWidth,
        vh = videoEl.videoHeight;
      if (!vw || !vh) return;

      const xs = [lm[SHOULDER_L].x, lm[SHOULDER_R].x, lm[HIP_L].x, lm[HIP_R].x];
      const ys = [lm[SHOULDER_L].y, lm[SHOULDER_R].y, lm[HIP_L].y, lm[HIP_R].y];
      const minX = Math.min(...xs),
        maxX = Math.max(...xs);
      const minY = Math.min(...ys),
        maxY = Math.max(...ys);

      const padX = (maxX - minX) * 0.5;
      const padYTop = (maxY - minY) * 1.2;
      const padYBot = (maxY - minY) * 0.8;

      const x = Math.max(0, (minX - padX) * vw);
      const y = Math.max(0, (minY - padYTop) * vh);
      const w = Math.min(vw - x, (maxX - minX + padX * 2) * vw);
      const h = Math.min(vh - y, (maxY - minY + padYTop + padYBot) * vh);

      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(videoEl, x, y, w, h, 0, 0, w, h);
      onCropReady(canvas.toDataURL("image/jpeg", 0.85));
    },
    [onCropReady],
  );

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await loadScript(`${CDN}/pose/pose.js`, 'Pose');
        await loadScript(`${CDN}/camera_utils/camera_utils.js`, 'Camera');
        if (cancelled) return;

        const pose = new window.Pose({ locateFile: (f) => `${CDN}/pose/${f}` });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        let t0 = Date.now();
        pose.onResults((results) => {
          if (cancelled) return;
          const ms = Date.now() - t0;
          t0 = Date.now();
          setLatency(ms);
          setFrameCount((n) => n + 1);

          if (!results.poseLandmarks) {
            setStatus("detecting");
            setScanning(false);
            setLandmarks(null);
            return;
          }
          setStatus("detected");
          setScanning(true);
          setLandmarks(results.poseLandmarks);

          const now = Date.now();
          if (now - lastCropRef.current > 1500) {
            lastCropRef.current = now;
            cropAndEmit(results.poseLandmarks, webcamRef.current?.video);
          }
        });
        poseRef.current = pose;
      } catch (err) {
        console.error("[MediaPipe]", err);
        if (!cancelled) setStatus("error");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [cropAndEmit]);

  // Scan bar
  useEffect(() => {
    if (!scanning) return;
    let frame,
      y = 0,
      dir = 1;
    const tick = () => {
      y += dir * 1.5;
      if (y >= 100) dir = -1;
      if (y <= 0) dir = 1;
      setScanY(y);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scanning]);

  const handleWebcamReady = useCallback(() => {
    const videoEl = webcamRef.current?.video;
    if (!videoEl) return;
    setStatus("detecting");
    const startCamera = () => {
      if (!poseRef.current || !window.Camera) {
        setTimeout(startCamera, 300);
        return;
      }
      const cam = new window.Camera(videoEl, {
        onFrame: async () => {
          if (poseRef.current) await poseRef.current.send({ image: videoEl });
        },
        width: 640,
        height: 480,
      });
      cam.start();
      cameraRef.current = cam;
    };
    startCamera();
  }, []);

  useEffect(
    () => () => {
      cameraRef.current?.stop();
      poseRef.current?.close();
    },
    [],
  );

  // Compute detection box from landmarks (as % of wrapper)
  const detBox =
    landmarks && wrapRef.current
      ? (() => {
          const lm = landmarks;
          const xs = [
            lm[SHOULDER_L].x,
            lm[SHOULDER_R].x,
            lm[HIP_L].x,
            lm[HIP_R].x,
          ];
          const ys = [
            lm[NOSE].y,
            lm[SHOULDER_L].y,
            lm[SHOULDER_R].y,
            lm[HIP_L].y,
            lm[HIP_R].y,
          ];
          const minX = Math.min(...xs),
            maxX = Math.max(...xs);
          const minY = Math.min(...ys),
            maxY = Math.max(...ys);
          const padX = (maxX - minX) * 0.45,
            padY = (maxY - minY) * 0.25;
          return {
            left: `${Math.max(0, (minX - padX) * 100)}%`,
            top: `${Math.max(0, (minY - padY) * 100)}%`,
            width: `${Math.min(100, (maxX - minX + padX * 2) * 100)}%`,
            height: `${Math.min(100, (maxY - minY + padY * 2.5) * 100)}%`,
          };
        })()
      : null;

  const fidelity = landmarks
    ? Math.round(
        (landmarks.reduce((s, l) => s + (l.visibility ?? 1), 0) /
          landmarks.length) *
          100,
      )
    : null;

  if (webcamError) {
    return (
      <div className="webcam-error">
        <span style={{ fontSize: 32 }}>📷</span>
        <p
          style={{
            color: "#ff5555",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Camera Unavailable
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
          {webcamError}
        </p>
      </div>
    );
  }

  return (
    <div className="webcam-section" ref={wrapRef}>
      <Webcam
        ref={webcamRef}
        audio={false}
        videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
        onUserMedia={handleWebcamReady}
        onUserMediaError={(e) =>
          setWebcamError(e.message || "Permission denied")
        }
        className="webcam-video"
        mirrored
      />

      {/* Scan line */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            className="scan-line"
            style={{ top: `${scanY}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Detection bounding box */}
      <AnimatePresence>
        {detBox && (
          <motion.div
            className="detection-box"
            style={{
              position: "absolute",
              zIndex: 8,
              pointerEvents: "none",
              ...detBox,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {["tl", "tr", "bl", "br"].map((c) => (
              <div key={c} className={`det-corner ${c}`} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pose landmark dots */}
      <AnimatePresence>
        {landmarks &&
          HUD_DOTS.map((idx) => {
            const lm = landmarks[idx];
            if (!lm) return null;
            return (
              <motion.div
                key={idx}
                className="pose-dot"
                style={{ left: `${lm.x * 100}%`, top: `${lm.y * 100}%` }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.9, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
            );
          })}
      </AnimatePresence>

      {/* HUD telemetry */}
      <div className="hud-telemetry">
        <div className={`hud-row${status === "detected" ? " active" : ""}`}>
          POSE:{" "}
          {status === "detected"
            ? "DETECTED"
            : status === "detecting"
              ? "SCANNING"
              : status.toUpperCase()}
        </div>
        {latency !== null && (
          <div className="hud-row active">LATENCY: {latency}MS</div>
        )}
        {fidelity !== null && (
          <div className="hud-row active">FIDELITY: {fidelity}%</div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="webcam-statusbar">
        {status === "initializing" || status === "detecting" ? (
          <div className="statusbar-item active">
            <div className="statusbar-spinner" />
            ANALYZING POSE
            <div className="statusbar-progress">
              <div className="statusbar-progress-fill" />
            </div>
          </div>
        ) : (
          <div className="statusbar-item active">
            ✓ POSE LOCKED · FRAME {frameCount}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
