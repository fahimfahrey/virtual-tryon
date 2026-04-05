"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import SearchBar from "@/components/SearchBar";

const DRESS_COLORS = {
  1: ["#8b1a1a", "#c0392b"],
  2: ["#1a3a8b", "#2980b9"],
  3: ["#2d6a2d", "#f39c12"],
  4: ["#1a1a1a", "#666"],
  5: ["#e8e8e8", "#d4af37"],
};

// View mode definitions
const VIEW_MODES = [
  { id: "large", label: "L", title: "Large", icon: "⬛" },
  { id: "medium", label: "M", title: "Medium", icon: "▪" },
  { id: "small", label: "S", title: "Small", icon: "·" },
  { id: "tiles", label: "⊞", title: "Tiles", icon: "⊞" },
  { id: "list", label: "≡", title: "List", icon: "≡" },
  { id: "content", label: "❐", title: "Content", icon: "❐" },
  { id: "collage", label: "⊟", title: "Collage", icon: "⊟" },
];

// Natural aspect ratio for dress images — show full image, no crop
const ASPECT = {
  large: "aspect-[3/4]",
  medium: "aspect-[3/4]",
  small: "aspect-[3/4]",
  tiles: "aspect-[3/4]",
  list: null,
  content: "aspect-[3/4]",
  collage: "aspect-[3/4]",
};

export default function DressList({ dresses, selected, onSelect, disabled }) {
  const [view, setView] = useState("large");
  // Initialize with prop dresses so there's no empty flash before first search response
  const [searchResults, setSearchResults] = useState({ items: dresses, total: dresses.length });
  const [isSearching, setIsSearching] = useState(false);

  const handleResults = useCallback((items, total) => {
    setSearchResults({ items, total });
  }, []);

  const { items: displayDresses, total: itemCount } = searchResults;

  return (
    <div className="dress-panel-inner">
      {/* ── Search ── */}
      <SearchBar onResults={handleResults} onSearching={setIsSearching} />

      {/* ── View mode toolbar ── */}
      <div className="view-toolbar">
        <span className="view-toolbar-label">VIEW</span>
        <div className="view-mode-group">
          {VIEW_MODES.map((m) => (
            <button
              key={m.id}
              className={`view-btn${view === m.id ? " active" : ""}`}
              onClick={() => setView(m.id)}
              title={m.title}
              aria-label={`${m.title} view`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="view-count">
          {isSearching ? "…" : `${itemCount.toLocaleString("en-IN")} ITEMS`}
        </span>
      </div>

      {/* ── Dress grid / list ── */}
      <div className={`dress-list view-${view}`}>
        <AnimatePresence mode="popLayout">
          {displayDresses.map((dress, i) => {
            const isSelected = selected?.id === dress.id;
            const colors = DRESS_COLORS[dress.id] || ["#444", "#666"];
            return (
              <DressCard
                key={dress.id}
                dress={dress}
                index={i}
                view={view}
                isSelected={isSelected}
                disabled={disabled}
                colors={colors}
                onSelect={onSelect}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DressCard({
  dress,
  index,
  view,
  isSelected,
  disabled,
  colors,
  onSelect,
}) {
  const isList = view === "list";
  const isContent = view === "content";
  const isCollage = view === "collage";
  const isSmall = view === "small";
  const isTiles = view === "tiles";

  // List view: horizontal compact row
  if (isList) {
    return (
      <motion.button
        className={`dress-card view-list-card${isSelected ? " selected" : ""}${disabled ? " disabled" : ""}`}
        onClick={() => !disabled && onSelect(dress)}
        layout
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{
          delay: index * 0.04,
          type: "spring",
          stiffness: 260,
          damping: 24,
        }}
        whileHover={!disabled ? { x: -2 } : {}}
        aria-label={`Select ${dress.name}`}
        aria-pressed={isSelected}
      >
        {/* Thumbnail */}
        <div className="list-thumb">
          <span className="dress-placeholder-icon" style={{ fontSize: 18 }}>
            👗
          </span>
          <Image
            src={dress.file}
            alt={dress.name}
            fill
            sizes="56px"
            style={{ objectFit: "contain", zIndex: 1 }}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
        {/* Info */}
        <div className="list-info">
          <div className="dress-card-name" style={{ fontSize: 11 }}>
            {dress.name}
          </div>
          <div className="dress-card-meta">SS24</div>
          <div className="dress-card-colors" style={{ marginTop: 4 }}>
            {colors.map((c, ci) => (
              <div
                key={ci}
                className="color-dot"
                style={{ background: c, width: 7, height: 7 }}
              />
            ))}
          </div>
        </div>
        {/* Selected */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              className="dress-selected-badge"
              style={{
                position: "relative",
                top: "auto",
                right: "auto",
                marginLeft: "auto",
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              SEL
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  // Content view: image left, rich text right
  if (isContent) {
    return (
      <motion.button
        className={`dress-card view-content-card${isSelected ? " selected" : ""}${disabled ? " disabled" : ""}`}
        onClick={() => !disabled && onSelect(dress)}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{
          delay: index * 0.05,
          type: "spring",
          stiffness: 240,
          damping: 22,
        }}
        whileHover={!disabled ? { x: -2 } : {}}
        aria-label={`Select ${dress.name}`}
        aria-pressed={isSelected}
      >
        <div className="content-img">
          <span className="dress-placeholder-icon" style={{ fontSize: 22 }}>
            👗
          </span>
          <Image
            src={dress.file}
            alt={dress.name}
            fill
            sizes="90px"
            style={{ objectFit: "contain", zIndex: 1 }}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
        <div className="content-body">
          <div className="dress-card-name">{dress.name}</div>
          <div className="dress-card-meta">SS24 · COLLECTION</div>
          <div className="dress-card-colors" style={{ marginTop: 6 }}>
            {colors.map((c, ci) => (
              <div key={ci} className="color-dot" style={{ background: c }} />
            ))}
          </div>
          <div className="content-desc">
            Curated selection for the modern wardrobe.
          </div>
        </div>
        <AnimatePresence>
          {isSelected && (
            <motion.div
              className="dress-selected-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              SELECTED
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  // All other views: vertical card with full-ratio image
  return (
    <motion.button
      className={`dress-card${isSelected ? " selected" : ""}${disabled ? " disabled" : ""}`}
      onClick={() => !disabled && onSelect(dress)}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        delay: index * 0.04,
        type: "spring",
        stiffness: 260,
        damping: 24,
      }}
      whileHover={!disabled ? { y: -2, scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      aria-label={`Select ${dress.name}`}
      aria-pressed={isSelected}
    >
      {/* Image — Large mode: plain img so full natural height is never clipped */}
      <div
        className={view === "large" ? "dress-img-full" : "dress-img-natural"}
      >
        <span className="dress-placeholder-icon">👗</span>
        {view === "large" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dress.file}
            alt={dress.name}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              position: "relative",
              zIndex: 1,
            }}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <Image
            src={dress.file}
            alt={dress.name}
            fill
            sizes="(max-width: 340px) 50vw, 300px"
            style={{ objectFit: isTiles ? "cover" : "contain", zIndex: 1 }}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
      </div>

      {/* Info — hidden in small/tiles to save space */}
      {!isSmall && !isTiles && (
        <div className="dress-card-body">
          <div className="dress-card-name">
            {dress.name}
            {dress.price ? ` · ${dress.price}` : ""}
          </div>
          <div className="dress-card-meta">SS24 · COLLECTION</div>
          <div className="dress-card-colors">
            {colors.map((c, ci) => (
              <div key={ci} className="color-dot" style={{ background: c }} />
            ))}
          </div>
        </div>
      )}

      {/* Tiles/small: name tooltip on hover */}
      {(isSmall || isTiles) && <div className="tile-name">{dress.name}</div>}

      <AnimatePresence>
        {isSelected && (
          <motion.div
            className="dress-selected-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {isSmall || isTiles ? "✓" : "SELECTED"}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
