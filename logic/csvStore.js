// Central CSV state store for MUDDHA
// Responsible for keeping accumulated CSV rows and syncing with localStorage + window globals.

const STORAGE_KEY = "muddhaCsvAccumRows";

let csvState = {
  accumRows: [],
};

/**
 * Get current accumulated CSV rows from the in-memory store.
 * Falls back to window.csvAccumRows if present.
 */
export function getAccumRows() {
  if (Array.isArray(csvState.accumRows) && csvState.accumRows.length) {
    return csvState.accumRows;
  }
  if (typeof window !== "undefined" && Array.isArray(window.csvAccumRows)) {
    return window.csvAccumRows;
  }
  return [];
}

/**
 * Replace the accumulated CSV rows and sync to window + localStorage.
 */
export function setAccumRows(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  csvState.accumRows = arr;
  if (typeof window !== "undefined") {
    window.csvAccumRows = arr;
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }
  } catch (e) {
    console.error("CSV 상태를 localStorage에 저장하지 못했습니다.", e);
  }
}

/**
 * Load accumulated rows from localStorage into the store and window.
 * Returns the loaded array (or [] if nothing).
 */
export function loadAccumRowsFromStorage() {
  try {
    if (typeof localStorage === "undefined") {
      return getAccumRows();
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return getAccumRows();
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length) {
      setAccumRows(parsed);
      return parsed;
    }
  } catch (e) {
    console.error("CSV 상태를 localStorage에서 불러오지 못했습니다.", e);
  }
  return getAccumRows();
}
