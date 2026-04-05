"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import DressList from "@/components/DressList";
import ResultModal from "@/components/ResultModal";
import { DRESSES } from "@/lib/dresses";

const WebcamCrop = dynamic(() => import("@/components/WebcamCrop"), {
  ssr: false,
});

const PROVIDERS = [
  { id: "modelslab", label: "ModelsLab", endpoint: "/api/tryon" },
  { id: "gemini", label: "✦ Gemini", endpoint: "/api/tryon-gemini" },
];

const DRESSES_FALLBACK = [];

export default function Home() {
  const [selectedDress, setSelectedDress] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  const apiCallRef = useRef(false);

  const handleCropReady = useCallback((dataUrl) => {
    setCroppedImage(dataUrl);
    setPoseReady(true);
  }, []);

  const runTryOn = useCallback(
    async (dress) => {
      if (apiCallRef.current) return;
      if (!croppedImage) {
        setError("No pose detected yet. Stand in front of the camera.");
        setModalOpen(true);
        return;
      }

      apiCallRef.current = true;
      setSelectedDress(dress);
      setError(null);
      setGeneratedImage(null);
      setIsGenerating(true);
      setModalOpen(true);

      try {
        const res = await fetch(provider.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userImage: croppedImage,
            dressFile: dress.file,
            dressName: dress.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "API request failed");
        if (data.output) setGeneratedImage(data.output);
        else throw new Error("No output image returned");
      } catch (err) {
        console.error("[TryOn Error]", err);
        setError(err.message || "Something went wrong. Please try again.");
      } finally {
        setIsGenerating(false);
        setTimeout(() => {
          apiCallRef.current = false;
        }, 2000);
      }
    },
    [croppedImage, provider],
  );

  const handleDressSelect = (dress) => runTryOn(dress);

  const handleRetry = () => {
    if (selectedDress) runTryOn(selectedDress);
  };

  const handleCloseModal = () => {
    if (isGenerating) return;
    setModalOpen(false);
  };

  const switchProvider = (p) => {
    if (isGenerating) return;
    setProvider(p);
    setGeneratedImage(null);
    setError(null);
  };

  return (
    <div className="app-root">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-wordmark">
            MIRROR<span>AI</span>
          </div>
          <div className="header-divider" />
          <div className="header-sub">Virtual Try-On System</div>
        </div>

        <div className="header-right">
          <div className="live-badge">
            <span className="live-dot" />
            {poseReady ? "POSE LOCKED" : "LIVE"}
          </div>

          <div className="provider-toggle">
            {PROVIDERS.map((p) => (
              <motion.button
                key={p.id}
                className={`provider-btn${provider.id === p.id ? " active" : ""}`}
                onClick={() => switchProvider(p)}
                whileHover={!isGenerating ? { scale: 1.04 } : {}}
                whileTap={!isGenerating ? { scale: 0.96 } : {}}
                disabled={isGenerating}
              >
                {p.label}
              </motion.button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">
        {/* Left: fullscreen webcam */}
        <WebcamCrop onCropReady={handleCropReady} />

        {/* Right: dress panel */}
        <div className="right-panel">
          <div className="panel-header">
            <div className="panel-collection">Evening Wear</div>
            <div className="panel-season">Curated Selections · SS24</div>
          </div>

          <DressList
            dresses={DRESSES}
            selected={selectedDress}
            onSelect={handleDressSelect}
            disabled={isGenerating}
          />

          <div className="panel-cta">
            <motion.button
              className={`cta-btn${isGenerating ? " generating" : ""}`}
              onClick={() => selectedDress && runTryOn(selectedDress)}
              disabled={!selectedDress || isGenerating}
              whileHover={selectedDress && !isGenerating ? { scale: 1.01 } : {}}
              whileTap={selectedDress && !isGenerating ? { scale: 0.99 } : {}}
            >
              {isGenerating
                ? "GENERATING…"
                : selectedDress
                  ? "GENERATE LOOK"
                  : "SELECT A DRESS"}
            </motion.button>
          </div>
        </div>
      </main>

      {/* ── Result Modal ── */}
      <ResultModal
        src={modalOpen && !isGenerating && !error ? generatedImage : null}
        isLoading={isGenerating}
        error={modalOpen && !isGenerating ? error : null}
        onClose={handleCloseModal}
        onRetry={handleRetry}
        selectedDress={selectedDress}
        provider={provider}
      />
    </div>
  );
}
