/**
 * Search Feature (Ctrl + F, Match Navigation, Filter Results)
 */

import { state } from './state.js';
import { elements, showToast, updateStatus, closeAllMenus } from './ui.js';
import { renderEditor, updateRowSelectionDOM, updateSelectionBar, escapeRegex } from './editor.js';
import { getHiddenLinesSet, mergeHiddenRanges } from './hideLines.js';

export function openSearch() {
  const searchWidget = elements.searchWidget;
  const searchInput = elements.searchInput;
  if (!searchWidget || !searchInput) return;

  searchWidget.classList.add('visible');
  searchInput.focus();
  searchInput.select();
  if (searchInput.value) {
    performSearch();
  }
  closeAllMenus();
}

export function closeSearch() {
  const searchWidget = elements.searchWidget;
  if (searchWidget) searchWidget.classList.remove('visible');
  clearSearch();
}

export function toggleMatchCase() {
  state.matchCase = !state.matchCase;
  const btn = document.getElementById('matchCaseBtn');
  if (btn) btn.classList.toggle('active', state.matchCase);
  performSearch();
}

export function onSearchInput() {
  const searchInput = elements.searchInput;
  if (searchInput) {
    state.searchQuery = searchInput.value;
  }
  performSearch();
}

export function performSearch() {
  const query = state.searchQuery.trim();
  const tab = state.tabs[state.activeTab];
  const searchBadge = elements.searchBadge;
  state.searchMatches = [];
  state.currentMatchIndex = -1;

  if (!query || !tab) {
    if (searchBadge) searchBadge.textContent = '0 matches';
    renderEditor();
    return;
  }

  const regex = new RegExp(escapeRegex(query), state.matchCase ? 'g' : 'gi');
  const hiddenSet = getHiddenLinesSet(tab);

  for (let i = 0; i < tab.lines.length; i++) {
    if (hiddenSet.has(i)) continue;
    const text = tab.lines[i];
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      state.searchMatches.push({
        lineIndex: i,
        charIndex: match.index,
        length: match[0].length
      });
      if (!regex.global) break;
    }
  }

  const count = state.searchMatches.length;
  if (count > 0) {
    state.currentMatchIndex = 0;
    if (searchBadge) searchBadge.textContent = `1 of ${count}`;
    renderEditor();
    scrollToCurrentMatch();
  } else {
    if (searchBadge) searchBadge.textContent = '0 matches';
    renderEditor();
  }
}

export function findNext() {
  if (state.searchMatches.length === 0) return;
  state.currentMatchIndex = (state.currentMatchIndex + 1) % state.searchMatches.length;
  const searchBadge = elements.searchBadge;
  if (searchBadge) searchBadge.textContent = `${state.currentMatchIndex + 1} of ${state.searchMatches.length}`;
  renderEditor();
  scrollToCurrentMatch();
}

export function findPrev() {
  if (state.searchMatches.length === 0) return;
  state.currentMatchIndex = (state.currentMatchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
  const searchBadge = elements.searchBadge;
  if (searchBadge) searchBadge.textContent = `${state.currentMatchIndex + 1} of ${state.searchMatches.length}`;
  renderEditor();
  scrollToCurrentMatch();
}

export function scrollToCurrentMatch() {
  if (state.currentMatchIndex < 0 || !state.searchMatches[state.currentMatchIndex]) return;
  const lineIdx = state.searchMatches[state.currentMatchIndex].lineIndex;
  const targetRow = document.querySelector(`.editor-row[data-line="${lineIdx}"]`);
  if (targetRow) {
    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function clearSearch() {
  state.searchQuery = '';
  state.searchMatches = [];
  state.currentMatchIndex = -1;
  const searchBadge = elements.searchBadge;
  if (searchBadge) searchBadge.textContent = '';
  renderEditor();
}

export function selectAllMatchingLines() {
  if (state.searchMatches.length === 0) {
    showToast('Tidak ada hasil pencarian');
    return;
  }
  state.searchMatches.forEach(m => state.selectedLines.add(m.lineIndex));
  updateRowSelectionDOM();
  updateSelectionBar();
  updateStatus();
  showToast(`${state.searchMatches.length} baris hasil pencarian berhasil dipilih! Tekan F7 untuk screenshot.`);
}

export function hideNonMatchingLines() {
  const tab = state.tabs[state.activeTab];
  if (!tab || state.searchMatches.length === 0) {
    showToast('Tidak ada hasil pencarian');
    return;
  }
  const matchingLineSet = new Set(state.searchMatches.map(m => m.lineIndex));
  tab.hiddenRanges = [];
  let rangeStart = null;

  for (let i = 0; i < tab.lines.length; i++) {
    if (!matchingLineSet.has(i)) {
      if (rangeStart === null) rangeStart = i;
    } else {
      if (rangeStart !== null) {
        tab.hiddenRanges.push({ from: rangeStart, to: i - 1 });
        rangeStart = null;
      }
    }
  }
  if (rangeStart !== null) {
    tab.hiddenRanges.push({ from: rangeStart, to: tab.lines.length - 1 });
  }

  mergeHiddenRanges(tab);
  renderEditor();
  updateStatus();
  showToast('Semua baris non-matching berhasil disembunyikan!');
}

export function hideMatchingLines() {
  const tab = state.tabs[state.activeTab];
  if (!tab || state.searchMatches.length === 0) {
    showToast('Tidak ada hasil pencarian');
    return;
  }
  const matchingLineSet = new Set(state.searchMatches.map(m => m.lineIndex));
  matchingLineSet.forEach(idx => {
    tab.hiddenRanges.push({ from: idx, to: idx });
  });

  mergeHiddenRanges(tab);
  clearSearch();
  renderEditor();
  updateStatus();
  showToast('Semua baris hasil pencarian berhasil disembunyikan!');
}
