"use client";

/**
 * SearchBar — ultra-fast search UI for 1cr+ dress catalog
 *
 * - Debounced 200ms so we fire at most 5 req/s per user
 * - Abort controller cancels in-flight requests on new keystroke
 * - Filter chips: category, color, price range
 * - Shows total hit count + "X of 1,00,00,000" style display
 */

import { useState, useEffect, useRef, useCallback } from "react";

const PRICE_RANGES = [
  { label: "All", min: undefined, max: undefined },
  { label: "Under ₹2K", min: undefined, max: 1999 },
  { label: "₹2K–5K",   min: 2000,     max: 4999 },
  { label: "₹5K+",     min: 5000,     max: undefined },
];

export default function SearchBar({ onResults, onSearching }) {
  const [query,    setQuery]    = useState("");
  const [category, setCategory] = useState("");
  const [color,    setColor]    = useState("");
  const [priceIdx, setPriceIdx] = useState(0);
  const [meta,     setMeta]     = useState({ categories: [], colors: [] });
  const [status,   setStatus]   = useState({ total: null, query: "" });
  const [open,     setOpen]     = useState(false); // filter panel open

  const abortRef   = useRef(null);
  const debounceRef = useRef(null);
  const inputRef   = useRef(null);

  const doSearch = useCallback(async (q, cat, col, pIdx) => {
    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const pr = PRICE_RANGES[pIdx];
    const params = new URLSearchParams({ q, page: 1, limit: 20 });
    if (cat) params.set("category", cat);
    if (col) params.set("color", col);
    if (pr.min != null) params.set("minPrice", pr.min);
    if (pr.max != null) params.set("maxPrice", pr.max);

    onSearching?.(true);
    try {
      const res = await fetch(`/api/search?${params}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      onResults?.(data.items, data.total);
      setStatus({ total: data.total, query: q });
      if (data.meta?.categories?.length) setMeta(data.meta);
    } catch (e) {
      if (e.name !== "AbortError") console.error("[Search]", e);
    } finally {
      onSearching?.(false);
    }
  }, [onResults, onSearching]);

  // Debounced trigger
  const trigger = useCallback((q, cat, col, pIdx) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q, cat, col, pIdx), 200);
  }, [doSearch]);

  // Re-search whenever any filter changes
  useEffect(() => { trigger(query, category, color, priceIdx); }, [query, category, color, priceIdx, trigger]);

  // Initial load
  useEffect(() => { doSearch("", "", "", 0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAll = () => {
    setQuery(""); setCategory(""); setColor(""); setPriceIdx(0);
    inputRef.current?.focus();
  };

  const hasFilters = query || category || color || priceIdx !== 0;

  return (
    <div className="search-root">
      {/* ── Search input row ── */}
      <div className="search-input-row">
        <span className="search-icon">⌕</span>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Search dresses…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        {hasFilters && (
          <button className="search-clear" onClick={clearAll} title="Clear all">✕</button>
        )}
        <button
          className={`search-filter-btn${open ? " active" : ""}${hasFilters && !open ? " has-filters" : ""}`}
          onClick={() => setOpen(o => !o)}
          title="Filters"
        >
          ⊟ FILTER
        </button>
      </div>

      {/* ── Filter panel ── */}
      {open && (
        <div className="search-filters">
          {/* Category */}
          <div className="filter-group">
            <span className="filter-label">CATEGORY</span>
            <div className="filter-chips">
              <button
                className={`filter-chip${!category ? " active" : ""}`}
                onClick={() => setCategory("")}
              >ALL</button>
              {meta.categories.map(c => (
                <button
                  key={c}
                  className={`filter-chip${category === c ? " active" : ""}`}
                  onClick={() => setCategory(category === c ? "" : c)}
                >{c.toUpperCase()}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="filter-group">
            <span className="filter-label">COLOR</span>
            <div className="filter-chips">
              <button
                className={`filter-chip${!color ? " active" : ""}`}
                onClick={() => setColor("")}
              >ALL</button>
              {meta.colors.map(c => (
                <button
                  key={c}
                  className={`filter-chip${color === c ? " active" : ""}`}
                  onClick={() => setColor(color === c ? "" : c)}
                >{c.toUpperCase()}</button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="filter-group">
            <span className="filter-label">PRICE</span>
            <div className="filter-chips">
              {PRICE_RANGES.map((pr, i) => (
                <button
                  key={pr.label}
                  className={`filter-chip${priceIdx === i ? " active" : ""}`}
                  onClick={() => setPriceIdx(i)}
                >{pr.label.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Result count ── */}
      {status.total !== null && (
        <div className="search-status">
          {status.total === 0
            ? <span className="search-status-none">NO RESULTS</span>
            : <span className="search-status-count">
                {status.total.toLocaleString("en-IN")} RESULT{status.total !== 1 ? "S" : ""}
                {status.query ? <> FOR <em>"{status.query}"</em></> : ""}
              </span>
          }
        </div>
      )}
    </div>
  );
}
