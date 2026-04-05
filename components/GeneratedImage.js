"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function GeneratedImage({
  src,
  isLoading,
  error,
  onRetry,
  selectedDress,
  provider,
}) {
  return (
    <div className="output-card">
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            className="loading-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="spinner-wrap">
              <div className="spinner-track" />
              <div className="spinner-arc" />
              <div className="spinner-inner" />
            </div>
            <p className="loading-title">Generating your look…</p>
            <p className="loading-sub">
              {selectedDress
                ? `Trying on: ${selectedDress.name}`
                : "Processing…"}
              {provider && (
                <>
                  <br />
                  <span style={{ opacity: 0.55, fontSize: 11 }}>
                    via {provider.label}
                  </span>
                </>
              )}
            </p>
            <LoadingDots />
          </motion.div>
        )}

        {error && !isLoading && (
          <motion.div
            key="error"
            className="error-box"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="error-icon-wrap">⚠️</div>
            <p className="error-msg">{error}</p>
            {onRetry && (
              <motion.button
                className="retry-btn"
                onClick={onRetry}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Try Again
              </motion.button>
            )}
          </motion.div>
        )}

        {src && !isLoading && !error && (
          <motion.div
            key={src}
            className="generated-wrapper"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Generated try-on result"
              className="generated-img"
            />
            {selectedDress && (
              <motion.div
                className="generated-label"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                {selectedDress.name}
              </motion.div>
            )}
          </motion.div>
        )}

        {!src && !isLoading && !error && (
          <motion.div
            key="placeholder"
            className="placeholder-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="placeholder-icon">✨</span>
            <p className="placeholder-title">Your look will appear here</p>
            <p className="placeholder-sub">
              Stand in front of the camera, then select a dress to try on
            </p>
            <div className="steps-hint">
              {[
                ["1", "Stand in frame"],
                ["2", "Pose detected"],
                ["3", "Pick a dress"],
              ].map(([n, t]) => (
                <div key={n} className="step-chip">
                  <span className="step-num">{n}</span>
                  {t}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="loading-dots">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="loading-dot"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -6, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
