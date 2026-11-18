/**
 * Hide Lines Feature (Notepad++ Folding / Hidden Lines)
 *
 * To avoid a circular dependency with editor.js (which imports getHiddenLinesSet from here),
 * renderEditor and updateSelectionBar are injected via setEditorCallbacks() called from main.js.
 */

import { state } from './state.js';
import { showToast, closeAllMenus, updateStatus } from './ui.js';

// Injected callbacks from editor.js (set by main.js after both modules load)
let _renderEditor = () => {};
let _updateSelectionBar = () => {};

/**
 * Called once from main.js to inject editor callbacks and break the circular dependency.
 * @param {Function} renderEditorFn
 * @param {Function} updateSelectionBarFn
 */
export function setEditorCallbacks(renderEditorFn, updateSelectionBarFn) {
  _renderEditor = renderEditorFn;
  _updateSelectionBar = updateSelectionBarFn;
}

export function getHiddenLinesSet(tab) {
  const set = new Set();
  if (!tab || !tab.hiddenRanges) return set;
  for (const range of tab.hiddenRanges) {
    for (let i = range.from; i <= range.to; i++) {
      set.add(i);
    }
  }
  return set;
}

export function hideSingleLine(lineIndex) {
  const tab = state.tabs[state.activeTab];
  if (!tab) return;
  tab.hiddenRanges.push({ from: lineIndex, to: lineIndex });
  mergeHiddenRanges(tab);
  state.selectedLines.delete(lineIndex);
  _renderEditor();
  updateStatus();
  _updateSelectionBar();
  showToast(`Baris ${lineIndex + 1} disembunyikan`);
}

export function hideSelectedLines() {
  const tab = state.tabs[state.activeTab];
  if (!tab || state.selectedLines.size === 0) {
    showToast('Pilih baris yang ingin disembunyikan terlebih dahulu');
    return;
  }
  const sorted = Array.from(state.selectedLines).sort((a, b) => a - b);
  let rs = sorted[0], re = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === re + 1) {
      re = sorted[i];
    } else {
      tab.hiddenRanges.push({ from: rs, to: re });
      rs = sorted[i];
      re = sorted[i];
    }
  }
  tab.hiddenRanges.push({ from: rs, to: re });
  const hiddenCount = state.selectedLines.size;

  mergeHiddenRanges(tab);
  state.selectedLines.clear();
  state.lastSelectedLine = null;

  _renderEditor();
  updateStatus();
  _updateSelectionBar();
  closeAllMenus();
  showToast(`${hiddenCount} baris berhasil disembunyikan`);
}

export function addHideRange() {
  // Sidebar panel no longer exists
}

export function showAllLines() {
  const tab = state.tabs[state.activeTab];
  if (!tab) return;
  tab.hiddenRanges = [];
  _renderEditor();
  updateStatus();
  closeAllMenus();
  showToast('Semua baris kembali ditampilkan');
}

export function unhideBlock(from, to) {
  const tab = state.tabs[state.activeTab];
  if (!tab) return;
  const newRanges = [];
  for (const r of tab.hiddenRanges) {
    if (r.to < from || r.from > to) {
      newRanges.push(r);
    } else {
      if (r.from < from) newRanges.push({ from: r.from, to: from - 1 });
      if (r.to > to) newRanges.push({ from: to + 1, to: r.to });
    }
  }
  tab.hiddenRanges = newRanges;
  _renderEditor();
  updateStatus();
  showToast(`Baris ${from + 1}–${to + 1} ditampilkan`);
}

export function mergeHiddenRanges(tab) {
  if (!tab || !tab.hiddenRanges || tab.hiddenRanges.length <= 1) return;
  tab.hiddenRanges.sort((a, b) => a.from - b.from);
  const merged = [tab.hiddenRanges[0]];
  for (let i = 1; i < tab.hiddenRanges.length; i++) {
    const last = merged[merged.length - 1];
    const curr = tab.hiddenRanges[i];
    if (curr.from <= last.to + 1) {
      last.to = Math.max(last.to, curr.to);
    } else {
      merged.push(curr);
    }
  }
  tab.hiddenRanges = merged;
}

export function renderHiddenRanges() {
  // Inline in editor
}

export function removeHiddenRange(index) {
  const tab = state.tabs[state.activeTab];
  if (!tab || !tab.hiddenRanges) return;
  tab.hiddenRanges.splice(index, 1);
  _renderEditor();
  updateStatus();
}

export function toggleHidePanel() {
  hideSelectedLines();
}
