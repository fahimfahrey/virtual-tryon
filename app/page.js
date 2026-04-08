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
  { id: "puter", label: "⚡ Puter", endpoint: null }, // client-side via puter.js
];

/** Loads an image element, first trying with crossOrigin then without */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const tryLoad = (withCors) => {
      const img = new Image();
      if (withCors) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (withCors) tryLoad(false); // retry without CORS header
        else reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    };
    tryLoad(true);
  });
}

/**
 * Fetches a same-origin dress image as a blob URL so canvas won't be tainted.
 * Falls back to direct src if fetch fails.
 */
async function loadDressImage(dressFile) {
  try {
    const res = await fetch(dressFile);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const img = await loadImage(blobUrl);
    URL.revokeObjectURL(blobUrl);
    return img;
  } catch {
    return loadImage(dressFile);
  }
}

/**
 * Combines the user photo (left) and dress image (right) into a single
 * side-by-side PNG collage. Returns raw base64 (no data URL prefix).
 */
async function buildCollage(userDataUrl, dressFile) {
  const [userImg, dressImg] = await Promise.all([
    loadImage(userDataUrl),
    loadDressImage(dressFile),
  ]);

  const h = Math.max(userImg.height, dressImg.height, 512);
  const scale = (img) => h / img.height;
  const uw = Math.round(userImg.width * scale(userImg));
  const dw = Math.round(dressImg.width * scale(dressImg));

  const canvas = document.createElement("canvas");
  canvas.width = uw + dw;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(userImg, 0, 0, uw, h);
  ctx.drawImage(dressImg, uw, 0, dw, h);

  // Canvas always outputs PNG — mime type is always image/png
  return canvas.toDataURL("image/png").split(",")[1];
}

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
        let outputImage;

        if (provider.id === "puter") {
          // ── Client-side via puter.js ─────────────────────────────────────────
          // puter is a global injected by https://js.puter.com/v2/
          if (typeof puter === "undefined") {
            throw new Error("Puter.js not loaded yet. Please wait a moment and try again.");
          }

          // Build side-by-side collage: [user | dress] → single PNG base64
          const collageBase64 = await buildCollage(croppedImage, dress.file);

          const prompt =
            `This image is a side-by-side collage. The LEFT half shows a person. The RIGHT half shows a dress/outfit. ` +
            `Your task: generate a single photorealistic image of the person from the LEFT wearing the exact dress from the RIGHT. ` +
            `CRITICAL RULES: ` +
            `(1) Reproduce the dress EXACTLY — every color, pattern, embroidery, print, texture, cut, neckline, sleeve length, and hem must be identical to the right-side reference. Do NOT alter any design detail. ` +
            `(2) Preserve the person's face COMPLETELY — same facial features, skin tone, expression, hair, and head position. Do NOT change anything above the shoulders. ` +
            `(3) Keep the person's body proportions, posture, and background unchanged. ` +
            `(4) Only replace the clothing — nothing else. ` +
            `Output: a single photorealistic full-body fashion photo of the person wearing the dress, sharp details, natural lighting.`;

          const imgElement = await puter.ai.txt2img(prompt, {
            model: "gemini-2.5-flash-image-preview",
            input_image: collageBase64,
            input_image_mime_type: "image/png",
          });

          outputImage = imgElement.src; // data URL
        } else {
          // ── Server-side providers ───────────────────────────────────────────
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
          if (!data.output) throw new Error("No output image returned");
          outputImage = data.output;
        }

        setGeneratedImage(outputImage);
      } catch (err) {
        console.error("[TryOn Error]", err);
        setError(err.message || "Something went wrong. Please try again.");
      } finally {
        setIsGenerating(false);
        setTimeout(() => { apiCallRef.current = false; }, 2000);
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
