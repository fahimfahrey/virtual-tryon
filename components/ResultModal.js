"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useCallback } from "react";

export default function ResultModal({
  src,
  isLoading,
  error,
  onClose,
  onRetry,
  selectedDress,
  provider,
}) {
  const isOpen = isLoading || !!error || !!src;

  // Close on Escape
  const handleKey = useCallback(
    (e) => {
      if (e.key === "Escape" && !isLoading) onClose();
    },
    [isLoading, onClose],
  );

  useEffect(() => {
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, handleKey]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) onClose();
          }}
        >
          <motion.div
            className="modal-box"
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="modal-header">
              <span className="modal-title">
                {isLoading
                  ? "GENERATING LOOK"
                  : error
                    ? "GENERATION FAILED"
                    : "VIRTUAL TRY-ON RESULT"}
              </span>
              {!isLoading && (
                <button
                  className="modal-close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="modal-loading">
                <div className="modal-spinner-wrap">
                  <div className="modal-spinner-track" />
                  <div className="modal-spinner-arc" />
                  <div className="modal-spinner-inner" />
                </div>
                <p className="modal-loading-title">Processing…</p>
                <p className="modal-loading-sub">
                  {selectedDress ? selectedDress.name : "Generating"} · via{" "}
                  {provider?.label ?? "AI"}
                </p>
                <div className="modal-dots">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="modal-dot"
                      animate={{ opacity: [0.2, 1, 0.2], y: [0, -5, 0] }}
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="modal-error">
                <div className="modal-error-icon">⚠️</div>
                <p className="modal-error-msg">{error}</p>
                {onRetry && (
                  <motion.button
                    className="modal-retry-btn"
                    onClick={onRetry}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    RETRY
                  </motion.button>
                )}
              </div>
            )}

            {/* Result image */}
            {src && !isLoading && !error && (
              <>
                <div className="modal-img-wrap">
                  <motion.img
                    src={src}
                    alt="Generated try-on result"
                    className="modal-img"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <div className="modal-footer">
                  <div>
                    <div className="modal-dress-name">
                      {selectedDress?.name ?? "Result"}
                    </div>
                    <div className="modal-provider">
                      via {provider?.label ?? "AI"}
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button
                      className="modal-action-btn secondary"
                      onClick={onClose}
                    >
                      CLOSE
                    </button>
                    <a
                      href={src}
                      download="tryon-result.png"
                      className="modal-action-btn primary"
                      style={{
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      SAVE
                    </a>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
