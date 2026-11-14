import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "btnx_recent_searches";
const SYNC_EVENT = "btnx_search_history_updated";
const MAX_ITEMS = 3;

function readHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeHistory(items: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function useSearchHistory() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readHistory());

  useEffect(() => {
    const handleSync = () => {
      setRecentSearches(readHistory());
    };
    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const saveSearchQuery = useCallback((rawQuery: string) => {
    const clean = rawQuery.trim();
    if (!clean) return;
    const current = readHistory();
    const filtered = current.filter((item) => item.toLowerCase() !== clean.toLowerCase());
    const next = [clean, ...filtered].slice(0, MAX_ITEMS);
    setRecentSearches(next);
    writeHistory(next);
  }, []);

  const removeSearchQuery = useCallback((target: string) => {
    const current = readHistory();
    const next = current.filter((item) => item.toLowerCase() !== target.toLowerCase());
    setRecentSearches(next);
    writeHistory(next);
  }, []);

  const clearSearchHistory = useCallback(() => {
    setRecentSearches([]);
    writeHistory([]);
  }, []);

  return {
    recentSearches,
    saveSearchQuery,
    removeSearchQuery,
    clearSearchHistory,
  };
}
