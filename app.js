/**
 * TextShot - Notepad++ Style Text File Screenshot Tool
 * Core JavaScript Logic
 */

// ===== GLOBAL STATE =====
const state = {
  tabs: [],
  activeTab: -1,
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  wordWrap: false,
  zoom: 100,
  showMinimap: false,
  selectedLines: new Set(),
  lastSelectedLine: null,
  theme: 'dark',
  screenshotScope: 'full', // 'full' | 'selection' | 'range'
  // Search state
  searchQuery: '',
  searchMatches: [], // array of { lineIndex, charIndex, length }
  currentMatchIndex: -1,
  matchCase: false
};

const themes = {
  dark: {
    bgEditor: '#1e1e1e', bgGutter: '#252526', textPrimary: '#d4d4d4',
    textGutter: '#858585', lineHighlight: '#2a2d2e', bgSelection: 'rgba(38, 79, 120, 0.45)',
    gutterBorder: '#3e3e42', accent: '#007acc', statusbar: '#007acc'
  },
  monokai: {
    bgEditor: '#272822', bgGutter: '#2f302b', textPrimary: '#f8f8f2',
    textGutter: '#75715e', lineHighlight: '#3e3d32', bgSelection: 'rgba(73, 72, 62, 0.7)',
    gutterBorder: '#3b3a32', accent: '#a6e22e', statusbar: '#75715e'
  },
  dracula: {
    bgEditor: '#282a36', bgGutter: '#2d2f3d', textPrimary: '#f8f8f2',
    textGutter: '#6272a4', lineHighlight: '#44475a', bgSelection: 'rgba(68, 71, 90, 0.7)',
    gutterBorder: '#44475a', accent: '#bd93f9', statusbar: '#6272a4'
  },
  light: {
    bgEditor: '#ffffff', bgGutter: '#f3f3f3', textPrimary: '#333333',
    textGutter: '#999999', lineHighlight: '#f5f5f5', bgSelection: '#add6ff',
    gutterBorder: '#e0e0e0', accent: '#0066cc', statusbar: '#0066cc'
  },
  solarized: {
    bgEditor: '#002b36', bgGutter: '#073642', textPrimary: '#839496',
    textGutter: '#586e75', lineHighlight: '#073642', bgSelection: 'rgba(7, 54, 66, 0.8)',
    gutterBorder: '#586e75', accent: '#268bd2', statusbar: '#073642'
  }
};

// ===== DOM ELEMENTS =====
const fileInput = document.getElementById('fileInput');
const editorWrapper = document.getElementById('editorWrapper');
const editorPanel = document.getElementById('editorPanel');
const welcomeScreen = document.getElementById('welcomeScreen');
const dropZone = document.getElementById('dropZone');
const searchWidget = document.getElementById('searchWidget');
const searchInput = document.getElementById('searchInput');
const searchBadge = document.getElementById('searchBadge');
const selectionBar = document.getElementById('selectionBar');
const selCountEl = document.getElementById('selCount');
const selRangeEl = document.getElementById('selRange');
const ssSelectionBtn = document.getElementById('ssSelectionBtn');
const toastEl = document.getElementById('toast');
const progressOverlay = document.getElementById('progressOverlay');
const progressText = document.getElementById('progressText');
const screenshotModal = document.getElementById('screenshotModal');
const hidePanelBtn = document.getElementById('hidePanelBtn');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  setupFileOpen();
  setupDragAndDrop();
  setupKeyboardShortcuts();
  setupSnippingEvents();
});

// ===== FILE OPEN & READ =====
function setupFileOpen() {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(loadFile);
    }
    e.target.value = '';
  });
}

function openFile() {
  fileInput.click();
  closeAllMenus();
}

function loadFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const lines = content.split(/\r?\n/);
      const tab = {
        name: file.name,
        fullPath: file.webkitRelativePath || file.name,
        lines: lines,
        hiddenRanges: [],
        selectedLines: new Set(),
        scrollTop: 0,
        scrollLeft: 0
      };
      state.tabs.push(tab);
      state.activeTab = state.tabs.length - 1;
      state.selectedLines = new Set();
      state.lastSelectedLine = null;

      renderTabs();
      renderEditor();
      updateStatus();
      updateSelectionBar();
      welcomeScreen.style.display = 'none';
      editorPanel.style.display = 'flex';
      showToast(`File "${file.name}" berhasil dibuka (${lines.length} baris)`);
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses file: ' + err.message);
    }
  };
  reader.onerror = () => {
    showToast('Error membaca file!');
  };
  reader.readAsText(file);
}

// ===== DRAG AND DROP =====
function setupDragAndDrop() {
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('visible');
  });
  window.addEventListener('dragleave', (e) => {
    if (e.clientX <= 0 || e.clientY <= 0) {
      dropZone.classList.remove('visible');
    }
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('visible');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(loadFile);
    }
  });
}

// ===== TAB MANAGEMENT =====
function renderTabs() {
  const tabbar = document.getElementById('tabbar');
  tabbar.innerHTML = '';
  state.tabs.forEach((tab, i) => {
    const el = document.createElement('div');
    el.className = 'tab' + (i === state.activeTab ? ' active' : '');
    el.innerHTML = `
      <span class="file-icon">📄</span>
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${tab.fullPath || tab.name}">${tab.name}</span>
      <span class="tab-close" onclick="event.stopPropagation(); closeTab(${i})" title="Tutup">✕</span>
    `;
    el.onclick = () => switchTab(i);
    tabbar.appendChild(el);
  });
}

function switchTab(index) {
  if (state.activeTab >= 0 && state.activeTab < state.tabs.length) {
    if (editorWrapper) {
      state.tabs[state.activeTab].scrollTop = editorWrapper.scrollTop;
      state.tabs[state.activeTab].scrollLeft = editorWrapper.scrollLeft;
    }
    state.tabs[state.activeTab].selectedLines = new Set(state.selectedLines);
  }
  state.activeTab = index;
  if (index >= 0 && index < state.tabs.length) {
    state.selectedLines = new Set(state.tabs[index].selectedLines);
  }
  renderTabs();
  renderEditor();
  updateStatus();
  updateSelectionBar();
  clearSearch();

  if (index >= 0 && editorWrapper) {
    setTimeout(() => {
      editorWrapper.scrollTop = state.tabs[index].scrollTop || 0;
      editorWrapper.scrollLeft = state.tabs[index].scrollLeft || 0;
    }, 0);
  }
}

function closeTab(index) {
  state.tabs.splice(index, 1);
  if (state.tabs.length === 0) {
    state.activeTab = -1;
    welcomeScreen.style.display = 'flex';
    editorPanel.style.display = 'none';
    state.selectedLines.clear();
    state.lastSelectedLine = null;
    clearSearch();
  } else {
    state.activeTab = Math.min(index, state.tabs.length - 1);
    state.selectedLines = new Set(state.tabs[state.activeTab].selectedLines);
  }
  renderTabs();
  renderEditor();
  updateStatus();
  updateSelectionBar();
}

function closeCurrentTab() {
  if (state.activeTab >= 0) closeTab(state.activeTab);
  closeAllMenus();
}

// ===== UNIFIED ROW EDITOR RENDERING =====
// Gutter and Code Content are rendered in the SAME ROW (.editor-row)
// to guarantee 100% zero-drift alignment across 100,000+ lines.
function renderEditor() {
  const tab = state.tabs[state.activeTab];
  if (!tab) return;

  // Preserve scroll position so editor does not jump to top on re-render
  const prevScrollTop = editorWrapper ? editorWrapper.scrollTop : 0;
  const prevScrollLeft = editorWrapper ? editorWrapper.scrollLeft : 0;

  editorWrapper.innerHTML = '';
  const contentContainer = document.createElement('div');
  contentContainer.className = 'editor-content' + (state.wordWrap ? ' wrap' : '');
  contentContainer.id = 'editorContent';

  const hiddenSet = getHiddenLinesSet(tab);
  const digits = String(tab.lines.length).length;
  const gutterMinWidth = Math.max(65, digits * 10 + 36);

  const query = state.searchQuery.trim();
  const searchRegex = query ? new RegExp(escapeRegex(query), state.matchCase ? 'g' : 'gi') : null;

  let i = 0;
  let htmlBuffer = [];

  while (i < tab.lines.length) {
    if (hiddenSet.has(i)) {
      // Group contiguous hidden lines into one clean collapsible block
      let blockStart = i;
      while (i < tab.lines.length && hiddenSet.has(i)) {
        i++;
      }
      let blockEnd = i - 1;
      let count = blockEnd - blockStart + 1;

      htmlBuffer.push(`
        <div class="hidden-block-row" onclick="unhideBlock(${blockStart}, ${blockEnd})" title="Klik untuk menampilkan kembali baris ${blockStart + 1}–${blockEnd + 1}">
          <div class="row-gutter" style="min-width:${gutterMinWidth}px">
            <span class="npp-arrow-icon" title="Tampilkan baris tersembunyi">▲▼</span>
          </div>
          <div class="npp-line-track">
            <div class="npp-divider-line"></div>
            <span class="npp-unhide-pill">↕ ${count} baris disembunyikan (${blockStart + 1}–${blockEnd + 1})</span>
          </div>
        </div>
      `);
    } else {
      const lineNum = i + 1;
      const isSelected = state.selectedLines.has(i);
      let lineText = tab.lines[i] || '';

      // Highlight search matches
      let renderedContent = '';
      if (searchRegex) {
        renderedContent = highlightText(lineText, searchRegex, i);
      } else {
        renderedContent = escapeHtml(lineText) || '&nbsp;';
      }

      htmlBuffer.push(`
        <div class="editor-row${isSelected ? ' selected' : ''}" 
             data-line="${i}" 
             onclick="handleRowClick(${i}, event)">
          <div class="row-gutter" style="min-width:${gutterMinWidth}px" onclick="handleGutterClick(${i}, event)">
            <span class="quick-hide-btn" onclick="event.stopPropagation(); hideSingleLine(${i})" title="Sembunyikan baris ini (Hide)">👁</span>
            <span class="line-num">${lineNum}</span>
          </div>
          <div class="row-text">${renderedContent}</div>
        </div>
      `);
      i++;
    }
  }

  contentContainer.innerHTML = htmlBuffer.join('');
  editorWrapper.appendChild(contentContainer);

  // Restore scroll position
  if (editorWrapper) {
    editorWrapper.scrollTop = prevScrollTop;
    editorWrapper.scrollLeft = prevScrollLeft;
  }

  // Apply styling
  contentContainer.style.fontFamily = state.fontFamily;
  contentContainer.style.fontSize = state.fontSize + 'px';
  const lineHeight = Math.round(state.fontSize * 1.6);
  contentContainer.style.lineHeight = lineHeight + 'px';

  if (state.showMinimap) renderMinimap();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, regex, lineIndex) {
  let result = '';
  let lastIndex = 0;
  let match;
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    result += escapeHtml(text.slice(lastIndex, match.index));
    const isCurrent = state.currentMatchIndex >= 0 &&
                      state.searchMatches[state.currentMatchIndex] &&
                      state.searchMatches[state.currentMatchIndex].lineIndex === lineIndex &&
                      state.searchMatches[state.currentMatchIndex].charIndex === match.index;

    result += `<mark class="highlight-match${isCurrent ? ' current' : ''}">${escapeHtml(match[0])}</mark>`;
    lastIndex = regex.lastIndex;
    if (!regex.global) break;
  }
  result += escapeHtml(text.slice(lastIndex));
  return result || '&nbsp;';
}

// ===== LINE SELECTION LOGIC =====
function handleGutterClick(lineIndex, event) {
  event.stopPropagation();
  toggleLineSelect(lineIndex, event);
}

function handleRowClick(lineIndex, event) {
  // If user is selecting text inside row-text with mouse drag, don't toggle
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) return;
  toggleLineSelect(lineIndex, event);
}

function toggleLineSelect(lineIndex, event) {
  const tab = state.tabs[state.activeTab];
  const hiddenSet = tab ? getHiddenLinesSet(tab) : new Set();

  if (hiddenSet.has(lineIndex)) return;

  if (event && event.shiftKey && state.lastSelectedLine !== null) {
    const from = Math.min(state.lastSelectedLine, lineIndex);
    const to = Math.max(state.lastSelectedLine, lineIndex);
    for (let i = from; i <= to; i++) {
      if (!hiddenSet.has(i)) {
        state.selectedLines.add(i);
      }
    }
  } else if (event && (event.ctrlKey || event.metaKey)) {
    if (state.selectedLines.has(lineIndex)) {
      state.selectedLines.delete(lineIndex);
    } else {
      state.selectedLines.add(lineIndex);
    }
  } else {
    if (state.selectedLines.has(lineIndex)) {
      state.selectedLines.delete(lineIndex);
    } else {
      state.selectedLines.add(lineIndex);
    }
  }
  state.lastSelectedLine = lineIndex;
  updateRowSelectionDOM();
  updateSelectionBar();
  updateStatus();
}

// Fast DOM update for selection without rebuilding entire innerHTML
function updateRowSelectionDOM() {
  const rows = document.querySelectorAll('.editor-row');
  rows.forEach(row => {
    const line = parseInt(row.getAttribute('data-line'));
    if (state.selectedLines.has(line)) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });
}

function clearSelection() {
  state.selectedLines.clear();
  state.lastSelectedLine = null;
  updateRowSelectionDOM();
  updateSelectionBar();
  updateStatus();
}

function updateSelectionBar() {
  const count = state.selectedLines.size;
  if (count > 0) {
    selectionBar.classList.add('visible');
    selCountEl.textContent = count;
    ssSelectionBtn.disabled = false;
    const copySelectionBtn = document.getElementById('copySelectionBtn');
    if (copySelectionBtn) copySelectionBtn.disabled = false;

    const sorted = Array.from(state.selectedLines).sort((a, b) => a - b);
    const ranges = [];
    let rs = sorted[0], re = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === re + 1) {
        re = sorted[i];
      } else {
        ranges.push(rs === re ? `${rs + 1}` : `${rs + 1}–${re + 1}`);
        rs = sorted[i];
        re = sorted[i];
      }
    }
    ranges.push(rs === re ? `${rs + 1}` : `${rs + 1}–${re + 1}`);
    selRangeEl.textContent = `Baris: ${ranges.join(', ')}`;

    const scopeSelDesc = document.getElementById('scopeSelDesc');
    const scopeSelection = document.getElementById('scopeSelection');
    if (scopeSelDesc) scopeSelDesc.textContent = `${count} baris terpilih`;
    if (scopeSelection) scopeSelection.classList.remove('disabled');
  } else {
    selectionBar.classList.remove('visible');
    ssSelectionBtn.disabled = true;
    const copySelectionBtn = document.getElementById('copySelectionBtn');
    if (copySelectionBtn) copySelectionBtn.disabled = true;
    const scopeSelDesc = document.getElementById('scopeSelDesc');
    if (scopeSelDesc) scopeSelDesc.textContent = 'Pilih baris dahulu';
    if (state.screenshotScope === 'selection') {
      setScope('full');
    }
  }
}

// ===== HIDE LINES FEATURE =====
function getHiddenLinesSet(tab) {
  const set = new Set();
  if (!tab || !tab.hiddenRanges) return set;
  for (const range of tab.hiddenRanges) {
    for (let i = range.from; i <= range.to; i++) {
      set.add(i);
    }
  }
  return set;
}

function hideSingleLine(lineIndex) {
  const tab = state.tabs[state.activeTab];
  if (!tab) return;
  tab.hiddenRanges.push({ from: lineIndex, to: lineIndex });
  mergeHiddenRanges(tab);
  state.selectedLines.delete(lineIndex);
  renderEditor();
  updateStatus();
  updateSelectionBar();
  showToast(`Baris ${lineIndex + 1} disembunyikan`);
}

function hideSelectedLines() {
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

  renderEditor();
  updateStatus();
  updateSelectionBar();
  closeAllMenus();
  showToast(`${hiddenCount} baris berhasil disembunyikan`);
}

function addHideRange() {
  // Removed - sidebar panel no longer exists
}

function showAllLines() {
  const tab = state.tabs[state.activeTab];
  if (!tab) return;
  tab.hiddenRanges = [];
  renderEditor();
  updateStatus();
  closeAllMenus();
  showToast('Semua baris kembali ditampilkan');
}

function unhideBlock(from, to) {
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
  renderEditor();
  updateStatus();
  showToast(`Baris ${from + 1}–${to + 1} ditampilkan`);
}

function mergeHiddenRanges(tab) {
  if (tab.hiddenRanges.length <= 1) return;
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

function renderHiddenRanges() {
  // No-op: sidebar panel removed. Hidden ranges are shown inline in editor.
}

function removeHiddenRange(index) {
  const tab = state.tabs[state.activeTab];
  if (!tab) return;
  tab.hiddenRanges.splice(index, 1);
  renderEditor();
  updateStatus();
}

function toggleHidePanel() {
  hideSelectedLines();
}

// ===== SEARCH FEATURE (Ctrl + F) =====
function openSearch() {
  searchWidget.classList.add('visible');
  searchInput.focus();
  searchInput.select();
  if (searchInput.value) {
    performSearch();
  }
  closeAllMenus();
}

function closeSearch() {
  searchWidget.classList.remove('visible');
  clearSearch();
}

function toggleMatchCase() {
  state.matchCase = !state.matchCase;
  const btn = document.getElementById('matchCaseBtn');
  if (btn) btn.classList.toggle('active', state.matchCase);
  performSearch();
}

function onSearchInput() {
  state.searchQuery = searchInput.value;
  performSearch();
}

function performSearch() {
  const query = state.searchQuery.trim();
  const tab = state.tabs[state.activeTab];
  state.searchMatches = [];
  state.currentMatchIndex = -1;

  if (!query || !tab) {
    searchBadge.textContent = '0 matches';
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
    searchBadge.textContent = `1 of ${count}`;
    renderEditor();
    scrollToCurrentMatch();
  } else {
    searchBadge.textContent = '0 matches';
    renderEditor();
  }
}

function findNext() {
  if (state.searchMatches.length === 0) return;
  state.currentMatchIndex = (state.currentMatchIndex + 1) % state.searchMatches.length;
  searchBadge.textContent = `${state.currentMatchIndex + 1} of ${state.searchMatches.length}`;
  renderEditor();
  scrollToCurrentMatch();
}

function findPrev() {
  if (state.searchMatches.length === 0) return;
  state.currentMatchIndex = (state.currentMatchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
  searchBadge.textContent = `${state.currentMatchIndex + 1} of ${state.searchMatches.length}`;
  renderEditor();
  scrollToCurrentMatch();
}

function scrollToCurrentMatch() {
  if (state.currentMatchIndex < 0 || !state.searchMatches[state.currentMatchIndex]) return;
  const lineIdx = state.searchMatches[state.currentMatchIndex].lineIndex;
  const targetRow = document.querySelector(`.editor-row[data-line="${lineIdx}"]`);
  if (targetRow) {
    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function clearSearch() {
  state.searchQuery = '';
  state.searchMatches = [];
  state.currentMatchIndex = -1;
  searchBadge.textContent = '';
  renderEditor();
}

// Power feature: Select all lines matching search
function selectAllMatchingLines() {
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

// Power feature: Hide non-matching lines (Hanya tampilkan baris yang cocok!)
function hideNonMatchingLines() {
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

// Power feature: Hide matching lines (Sembunyikan semua baris yang cocok)
function hideMatchingLines() {
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

// ===== SCREENSHOT MODAL & CONTROLS =====
function showScreenshotModal() {
  if (state.activeTab < 0) {
    showToast('Buka file terlebih dahulu');
    return;
  }
  const tab = state.tabs[state.activeTab];

  if (state.selectedLines.size > 0) {
    document.getElementById('scopeSelection').classList.remove('disabled');
    document.getElementById('scopeSelDesc').textContent = `${state.selectedLines.size} baris terpilih`;
  } else {
    document.getElementById('scopeSelection').classList.add('disabled');
    document.getElementById('scopeSelDesc').textContent = 'Pilih baris dahulu';
    if (state.screenshotScope === 'selection') setScope('full');
  }

  document.getElementById('ssRangeTo').value = tab.lines.length;
  document.getElementById('ssTabTitle').value = tab.fullPath || tab.name;
  screenshotModal.classList.add('visible');
  closeAllMenus();
}

function closeScreenshotModal() {
  screenshotModal.classList.remove('visible');
}

function setScope(scope) {
  if (scope === 'selection' && state.selectedLines.size === 0) {
    showToast('Pilih baris terlebih dahulu dengan mengklik nomor baris');
    return;
  }
  state.screenshotScope = scope;
  document.querySelectorAll('.scope-option').forEach(el => {
    el.classList.remove('active', 'active-sel');
  });
  if (scope === 'full') document.getElementById('scopeFull').classList.add('active');
  else if (scope === 'selection') document.getElementById('scopeSelection').classList.add('active-sel');
  else if (scope === 'range') document.getElementById('scopeRange').classList.add('active');

  const rangeInput = document.getElementById('rangeInput');
  if (rangeInput) rangeInput.style.display = scope === 'range' ? 'block' : 'none';

  if (scope === 'range' && state.activeTab >= 0) {
    document.getElementById('ssRangeTo').value = state.tabs[state.activeTab].lines.length;
  }
}

function quickScreenshot(scope) {
  if (state.activeTab < 0) {
    showToast('Buka file terlebih dahulu');
    return;
  }
  closeAllMenus();

  if (scope === 'selection' && state.selectedLines.size === 0) {
    showToast('⚠️ Belum ada baris yang dipilih! Klik nomor baris terlebih dahulu.');
    return;
  }

  const tab = state.tabs[state.activeTab];
  doCapture({
    scope: scope || 'full',
    format: 'png',
    scale: 2,
    padding: 24,
    lineNumbers: true,
    widthMode: 'full', // Full Width - No Cut
    includeHeader: true,
    tabTitle: tab.fullPath || tab.name,
    rangeFrom: 0,
    rangeTo: 0
  });
}

function copyScreenshot(scope) {
  if (state.activeTab < 0) {
    showToast('Buka file terlebih dahulu');
    return;
  }
  closeAllMenus();

  if (scope === 'selection' && state.selectedLines.size === 0) {
    showToast('⚠️ Belum ada baris yang dipilih! Klik nomor baris terlebih dahulu.');
    return;
  }

  const tab = state.tabs[state.activeTab];
  doCapture({
    scope: scope || 'selection',
    format: 'png',
    scale: 2,
    padding: 24,
    lineNumbers: true,
    widthMode: 'full',
    includeHeader: true,
    tabTitle: tab.fullPath || tab.name,
    rangeFrom: 0,
    rangeTo: 0,
    action: 'copy' // Salin langsung ke clipboard tanpa download
  });
}

function captureScreenshot() {
  const scope = state.screenshotScope;

  if (scope === 'selection' && state.selectedLines.size === 0) {
    showToast('⚠️ Belum ada baris yang dipilih!');
    return;
  }

  const tab = state.tabs[state.activeTab];
  closeScreenshotModal();
  const options = {
    scope: scope,
    format: document.getElementById('ssFormat').value,
    scale: parseInt(document.getElementById('ssScale').value),
    padding: parseInt(document.getElementById('ssPadding').value) || 24,
    lineNumbers: document.getElementById('ssLineNumbers').checked,
    widthMode: document.getElementById('ssWidthMode').value,
    includeHeader: document.getElementById('ssIncludeHeader').checked,
    tabTitle: document.getElementById('ssTabTitle').value.trim() || tab.name,
    rangeFrom: parseInt(document.getElementById('ssRangeFrom').value) || 1,
    rangeTo: parseInt(document.getElementById('ssRangeTo').value) || 1
  };
  doCapture(options);
}

// ===== HD CANVAS CAPTURE ENGINE (NOTEPAD++ LIGHT THEME) =====
function doCapture(options) {
  const tab = state.tabs[state.activeTab];
  if (!tab) return;

  showProgress('Merender screenshot resolusi tinggi...');

  setTimeout(() => {
    try {
      // Notepad++ Light Palette
      const ssTheme = {
        menuBarBg: '#f0f0f0',
        menuBarBorder: '#d0d0d0',
        menuBarText: '#222222',
        tabBarBg: '#e6e6e6',
        tabActiveBg: '#ffffff',
        tabBorder: '#b5b5b5',
        tabActiveText: '#000000',
        tabBarBottomBorder: '#a0a0a0',
        tabAccent: '#0078d4',
        bgEditor: '#ffffff',
        bgGutter: '#f0f0f0',
        textPrimary: '#000000',
        textGutter: '#707070',
        gutterBorder: '#d4d4d4',
        outerBorder: '#b5b5b5',
        lineAltBg: '#fafafa'
      };

      const scale = options.scale || 2;
      const padding = (options.padding || 24) * scale;
      const fontSize = state.fontSize * scale;
      const lineHeight = Math.round(fontSize * 1.6);
      const gutterPadding = 14 * scale;
      const codePadding = 20 * scale;

      const includeHeader = options.includeHeader !== false;
      const fullFilePath = options.tabTitle || tab.fullPath || tab.name;

      const menuBarHeight = includeHeader ? Math.round(28 * scale) : 0;
      const tabBarHeight = includeHeader ? Math.round(34 * scale) : 0;
      const totalHeaderHeight = menuBarHeight + tabBarHeight;

      // 1. Determine target lines & handle hidden lines (Do not render hidden lines!)
      const hiddenSet = getHiddenLinesSet(tab);
      let linesToRender = [];

      if (options.scope === 'selection') {
        const selectedVisible = Array.from(state.selectedLines)
          .filter(idx => !hiddenSet.has(idx))
          .sort((a, b) => a - b);

        if (selectedVisible.length === 0) {
          hideProgress();
          showToast('⚠️ Belum ada baris yang dipilih!');
          return;
        }

        const minIdx = selectedVisible[0];
        const maxIdx = selectedVisible[selectedVisible.length - 1];

        let i = minIdx;
        while (i <= maxIdx) {
          if (hiddenSet.has(i)) {
            let blockStart = i;
            while (i <= maxIdx && hiddenSet.has(i)) {
              i++;
            }
            let blockEnd = i - 1;
            let count = blockEnd - blockStart + 1;
            linesToRender.push({
              isHidden: true,
              from: blockStart,
              to: blockEnd,
              count: count
            });
          } else {
            if (state.selectedLines.has(i)) {
              linesToRender.push({
                isHidden: false,
                index: i,
                text: tab.lines[i]
              });
            }
            i++;
          }
        }
      } else if (options.scope === 'range') {
        const from = Math.max(0, (options.rangeFrom || 1) - 1);
        const to = Math.min(tab.lines.length - 1, (options.rangeTo || 1) - 1);
        let i = from;
        while (i <= to) {
          if (hiddenSet.has(i)) {
            let blockStart = i;
            while (i <= to && hiddenSet.has(i)) {
              i++;
            }
            let blockEnd = i - 1;
            let count = blockEnd - blockStart + 1;
            linesToRender.push({
              isHidden: true,
              from: blockStart,
              to: blockEnd,
              count: count
            });
          } else {
            linesToRender.push({
              isHidden: false,
              index: i,
              text: tab.lines[i]
            });
            i++;
          }
        }
      } else {
        // 'full' scope
        let i = 0;
        while (i < tab.lines.length) {
          if (hiddenSet.has(i)) {
            let blockStart = i;
            while (i < tab.lines.length && hiddenSet.has(i)) {
              i++;
            }
            let blockEnd = i - 1;
            let count = blockEnd - blockStart + 1;
            linesToRender.push({
              isHidden: true,
              from: blockStart,
              to: blockEnd,
              count: count
            });
          } else {
            linesToRender.push({
              isHidden: false,
              index: i,
              text: tab.lines[i]
            });
            i++;
          }
        }
      }

      if (linesToRender.length === 0) {
        hideProgress();
        showToast('⚠️ Tidak ada baris yang dapat di-screenshot!');
        return;
      }

      // 2. Accurate measurement canvas
      const measureCanvas = document.createElement('canvas');
      const measureCtx = measureCanvas.getContext('2d');
      measureCtx.font = `${fontSize}px ${state.fontFamily}`;

      const visibleLinesOnly = linesToRender.filter(l => !l.isHidden);
      const maxLineNum = visibleLinesOnly.length > 0 ? Math.max(...visibleLinesOnly.map(l => l.index + 1)) : 1;
      const digits = String(maxLineNum).length;
      const gutterWidth = options.lineNumbers ? Math.round(digits * fontSize * 0.65 + gutterPadding * 2 + 10 * scale) : 0;

      let maxLineWidth = 0;
      const lineTexts = [];

      for (const line of linesToRender) {
        if (line.isHidden) {
          const pillText = `↕ ${line.count} baris disembunyikan (${line.from + 1}–${line.to + 1})`;
          const pillW = measureCtx.measureText(pillText).width + Math.round(80 * scale);
          if (pillW > maxLineWidth) maxLineWidth = pillW;
          lineTexts.push({ ...line, wrapped: [' '] });
        } else {
          let wrappedLines = [];
          if (options.widthMode === 'wrap120') {
            const charWidth = measureCtx.measureText('M').width;
            wrappedLines = wrapText(measureCtx, line.text, charWidth * 120);
          } else if (options.widthMode === 'wide') {
            const charWidth = measureCtx.measureText('M').width;
            wrappedLines = wrapText(measureCtx, line.text, charWidth * 180);
          } else {
            // 'full' mode: No cut / entire line preserved
            wrappedLines = [line.text || ' '];
          }

          lineTexts.push({ ...line, wrapped: wrappedLines });
          for (const wl of wrappedLines) {
            const w = measureCtx.measureText(wl).width;
            if (w > maxLineWidth) maxLineWidth = w;
          }
        }
      }

      let totalWrappedLines = 0;
      for (const lt of lineTexts) {
        totalWrappedLines += lt.wrapped.length;
      }

      // Measure tab width
      const tabFontSize = Math.round(13 * scale);
      measureCtx.font = `${tabFontSize}px Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
      const tabTitleText = fullFilePath;
      const titleTextWidth = measureCtx.measureText(tabTitleText).width;
      const minTabWidth = titleTextWidth + Math.round(80 * scale);

      // 3. Dynamic Canvas Sizing (Panjang & Lapang)
      const extraRightMargin = Math.round(60 * scale);
      const minCanvasWidth = Math.max(
        Math.round(1200 * scale),
        minTabWidth + padding * 2 + Math.round(100 * scale)
      );

      const calculatedWidth = gutterWidth + codePadding * 2 + maxLineWidth + extraRightMargin + padding * 2;
      const canvasWidth = Math.ceil(Math.max(calculatedWidth, minCanvasWidth));
      const bottomExtraPadding = Math.round(30 * scale);
      const canvasHeight = Math.ceil(totalWrappedLines * lineHeight + totalHeaderHeight + padding * 2 + bottomExtraPadding);

      // 4. Render Final Canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // White Editor Background
      ctx.fillStyle = ssTheme.bgEditor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 5. Draw Notepad++ Header
      if (includeHeader) {
        // Menu Bar
        ctx.fillStyle = ssTheme.menuBarBg;
        ctx.fillRect(0, 0, canvas.width, menuBarHeight);

        ctx.strokeStyle = ssTheme.menuBarBorder;
        ctx.lineWidth = scale;
        ctx.beginPath();
        ctx.moveTo(0, menuBarHeight);
        ctx.lineTo(canvas.width, menuBarHeight);
        ctx.stroke();

        ctx.font = `${Math.round(11 * scale)}px Segoe UI, Arial, sans-serif`;
        ctx.fillStyle = ssTheme.menuBarText;
        ctx.textBaseline = 'middle';
        const menus = ['File', 'Edit', 'Search', 'View', 'Encoding', 'Language', 'Settings', 'Tools', 'Macro', 'Run'];
        let mx = Math.round(10 * scale);
        for (const m of menus) {
          ctx.fillText(m, mx, menuBarHeight / 2);
          mx += ctx.measureText(m).width + Math.round(14 * scale);
        }

        // Tab Bar
        const tabY = menuBarHeight;
        ctx.fillStyle = ssTheme.tabBarBg;
        ctx.fillRect(0, tabY, canvas.width, tabBarHeight);

        ctx.strokeStyle = ssTheme.tabBarBottomBorder;
        ctx.lineWidth = scale;
        ctx.beginPath();
        ctx.moveTo(0, tabY + tabBarHeight);
        ctx.lineTo(canvas.width, tabY + tabBarHeight);
        ctx.stroke();

        // Active Tab
        const tabPadH = Math.round(14 * scale);
        ctx.font = `${tabFontSize}px Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
        const activeTabW = Math.round(titleTextWidth + 64 * scale);
        const activeTabX = Math.round(4 * scale);
        const activeTabY = tabY + Math.round(4 * scale);
        const activeTabH = tabBarHeight - Math.round(4 * scale);

        // Tab background (white, connected to editor)
        ctx.fillStyle = ssTheme.tabActiveBg;
        const radius = Math.round(4 * scale);
        ctx.beginPath();
        ctx.moveTo(activeTabX, tabY + tabBarHeight);
        ctx.lineTo(activeTabX, activeTabY + radius);
        ctx.quadraticCurveTo(activeTabX, activeTabY, activeTabX + radius, activeTabY);
        ctx.lineTo(activeTabX + activeTabW - radius, activeTabY);
        ctx.quadraticCurveTo(activeTabX + activeTabW, activeTabY, activeTabX + activeTabW, activeTabY + radius);
        ctx.lineTo(activeTabX + activeTabW, tabY + tabBarHeight);
        ctx.closePath();
        ctx.fill();

        // Tab border
        ctx.strokeStyle = ssTheme.tabBorder;
        ctx.lineWidth = scale;
        ctx.beginPath();
        ctx.moveTo(activeTabX, tabY + tabBarHeight);
        ctx.lineTo(activeTabX, activeTabY + radius);
        ctx.quadraticCurveTo(activeTabX, activeTabY, activeTabX + radius, activeTabY);
        ctx.lineTo(activeTabX + activeTabW - radius, activeTabY);
        ctx.quadraticCurveTo(activeTabX + activeTabW, activeTabY, activeTabX + activeTabW, activeTabY + radius);
        ctx.lineTo(activeTabX + activeTabW, tabY + tabBarHeight);
        ctx.stroke();

        // Notepad++ Active Tab Accent Top Line
        ctx.fillStyle = ssTheme.tabAccent;
        ctx.fillRect(activeTabX + 1, activeTabY, activeTabW - 2, Math.round(3 * scale));

        // Document Icon
        ctx.font = `${Math.round(14 * scale)}px Segoe UI, Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText('📄', activeTabX + tabPadH, activeTabY + activeTabH / 2);

        // Tab Title Text
        ctx.font = `${tabFontSize}px Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
        ctx.fillStyle = ssTheme.tabActiveText;
        ctx.fillText(tabTitleText, activeTabX + tabPadH + Math.round(20 * scale), activeTabY + activeTabH / 2);

        // Close Icon ×
        ctx.font = `${Math.round(14 * scale)}px Segoe UI, Arial, sans-serif`;
        ctx.fillStyle = '#888888';
        ctx.fillText('×', activeTabX + activeTabW - Math.round(18 * scale), activeTabY + activeTabH / 2);
      }

      // 6. Draw Gutter & Line Numbers
      const editorStartY = totalHeaderHeight;
      if (options.lineNumbers) {
        ctx.fillStyle = ssTheme.bgGutter;
        ctx.fillRect(padding, editorStartY + padding, gutterWidth, canvasHeight - editorStartY - padding * 2);

        ctx.strokeStyle = ssTheme.gutterBorder;
        ctx.lineWidth = scale;
        ctx.beginPath();
        ctx.moveTo(padding + gutterWidth, editorStartY + padding);
        ctx.lineTo(padding + gutterWidth, canvasHeight - padding);
        ctx.stroke();
      }

      // 7. Draw Text Lines & Notepad++ Hidden Line Indicators
      ctx.textBaseline = 'middle';
      let currY = editorStartY + padding;

      for (let li = 0; li < lineTexts.length; li++) {
        const line = lineTexts[li];

        if (line.isHidden) {
          const centerY = currY + lineHeight / 2;

          // Subtle green background tint for hidden block row
          ctx.fillStyle = 'rgba(46, 204, 113, 0.06)';
          ctx.fillRect(padding + gutterWidth + 1, currY, canvasWidth - padding * 2 - gutterWidth - 1, lineHeight);

          // Gutter fold indicator
          if (options.lineNumbers) {
            const badgeW = Math.round(22 * scale);
            const badgeH = Math.round(15 * scale);
            const badgeX = padding + gutterWidth - badgeW - Math.round(4 * scale);
            const badgeY = currY + (lineHeight - badgeH) / 2;

            ctx.fillStyle = 'rgba(46, 204, 113, 0.18)';
            ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = scale;
            ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

            ctx.font = `bold ${Math.round(9 * scale)}px Segoe UI, sans-serif`;
            ctx.fillStyle = '#27ae60';
            ctx.textAlign = 'center';
            ctx.fillText('▲▼', badgeX + badgeW / 2, centerY);
            ctx.textAlign = 'left';
          }

          // Green divider line across editor
          const lineStartX = padding + gutterWidth;
          const lineEndX = canvasWidth - padding;
          ctx.strokeStyle = '#27ae60';
          ctx.lineWidth = scale;
          ctx.beginPath();
          ctx.moveTo(lineStartX, centerY);
          ctx.lineTo(lineEndX, centerY);
          ctx.stroke();

          // Notepad++ Unhide Pill Badge (Indikator baris tersembunyi)
          const pillText = `↕ ${line.count} baris disembunyikan (${line.from + 1}–${line.to + 1})`;
          ctx.font = `${Math.round(11 * scale)}px Segoe UI, sans-serif`;
          const pillTextW = ctx.measureText(pillText).width;
          const pillPad = Math.round(10 * scale);
          const pillW = pillTextW + pillPad * 2;
          const pillH = Math.round(18 * scale);
          const pillX = padding + gutterWidth + Math.round(20 * scale);
          const pillY = currY + (lineHeight - pillH) / 2;
          const pr = pillH / 2;

          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#27ae60';
          ctx.lineWidth = scale;
          ctx.beginPath();
          ctx.arc(pillX + pr, pillY + pr, pr, Math.PI / 2, Math.PI * 1.5);
          ctx.arc(pillX + pillW - pr, pillY + pr, pr, -Math.PI / 2, Math.PI / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#27ae60';
          ctx.fillText(pillText, pillX + pillPad, centerY);

          currY += lineHeight;
        } else {
          const lineNum = line.index + 1;

          if (li % 2 === 1) {
            ctx.fillStyle = ssTheme.lineAltBg;
            const blockHeight = line.wrapped.length * lineHeight;
            ctx.fillRect(padding + gutterWidth + 1, currY, canvasWidth - padding * 2 - gutterWidth - 1, blockHeight);
          }

          for (let wi = 0; wi < line.wrapped.length; wi++) {
            const centerY = currY + lineHeight / 2;

            if (options.lineNumbers && wi === 0) {
              ctx.font = `${fontSize}px ${state.fontFamily}`;
              ctx.fillStyle = ssTheme.textGutter;
              const numStr = String(lineNum);
              const numW = ctx.measureText(numStr).width;
              ctx.fillText(numStr, padding + gutterWidth - numW - gutterPadding, centerY);
            }

            ctx.font = `${fontSize}px ${state.fontFamily}`;
            ctx.fillStyle = ssTheme.textPrimary;
            const textX = padding + gutterWidth + codePadding;
            ctx.fillText(line.wrapped[wi], textX, centerY);

            currY += lineHeight;
          }
        }
      }

      // 8. Outer Window Border
      ctx.strokeStyle = ssTheme.outerBorder;
      ctx.lineWidth = scale;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      if (options.action === 'copy') {
        // Mode Salin Gambar ke Clipboard & Tampilkan Snipping Tool Modal
        canvas.toBlob(async (blob) => {
          if (!blob) {
            hideProgress();
            showToast('❌ Gagal mengonversi gambar');
            return;
          }
          try {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            hideProgress();
            showToast('📋 Gambar berhasil disalin ke Clipboard! Tinggal tekan Ctrl+V.');
          } catch (clipErr) {
            console.error('Clipboard copy error:', clipErr);
            hideProgress();
            showToast('✂️ Gambar dibuka di Snipping Tool...');
          }
          clearSelection();
          if (editorPanel) editorPanel.style.display = 'flex';
          if (welcomeScreen) welcomeScreen.style.display = 'none';

          // Buka modal interaktif bergaya Windows 11 Snipping Tool
          openSnippingModal(canvas, tab.name);
        }, 'image/png');
      } else {
        // Mode Download Gambar
        const mime = options.format === 'jpeg' ? 'image/jpeg' : options.format === 'webp' ? 'image/webp' : 'image/png';
        const quality = options.format === 'jpeg' ? 0.95 : undefined;
        const dataUrl = canvas.toDataURL(mime, quality);

        let suffix = '';
        if (options.scope === 'selection') suffix = '_selection';
        else if (options.scope === 'range') suffix = `_L${options.rangeFrom}-${options.rangeTo}`;

        const link = document.createElement('a');
        link.download = `${tab.name}${suffix}_screenshot_${Date.now()}.${options.format}`;
        link.href = dataUrl;
        link.click();

        hideProgress();
        const scopeDesc = options.scope === 'selection' ? ` (${linesToRender.length} baris terpilih)` :
                          options.scope === 'range' ? ` (baris ${options.rangeFrom}–${options.rangeTo})` : ' (full)';
        showToast(`✅ Screenshot berhasil disimpan!${scopeDesc} Resolusi: ${canvas.width}×${canvas.height}px`);

        // File tetap terbuka dan hilangkan blok baris yang sebelumnya dipilih
        clearSelection();
        if (editorPanel) editorPanel.style.display = 'flex';
        if (welcomeScreen) welcomeScreen.style.display = 'none';
      }

    } catch (err) {
      hideProgress();
      showToast('❌ Error render screenshot: ' + err.message);
      console.error(err);
    }
  }, 80);
}

function wrapText(ctx, text, maxWidth) {
  if (maxWidth <= 0 || !text) return [text || ' '];
  const words = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ' || ch === '\t') {
      if (current) { words.push(current); current = ''; }
      words.push(ch === '\t' ? '    ' : ' ');
    } else {
      current += ch;
    }
  }
  if (current) words.push(current);

  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine + word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [' '];
}

// ===== MINIMAP =====
function toggleMinimap() {
  state.showMinimap = !state.showMinimap;
  const minimap = document.getElementById('minimap');
  minimap.style.display = state.showMinimap ? 'block' : 'none';
  if (state.showMinimap) renderMinimap();
  closeAllMenus();
}

function renderMinimap() {
  const tab = state.tabs[state.activeTab];
  if (!tab) return;
  const canvas = document.getElementById('minimapCanvas');
  const container = document.getElementById('minimap');
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  canvas.style.height = rect.height + 'px';
  const ctx = canvas.getContext('2d');
  const theme = themes[state.theme];
  ctx.fillStyle = theme.bgEditor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const hiddenSet = getHiddenLinesSet(tab);
  ctx.fillStyle = theme.textGutter;
  let y = 4;
  for (let i = 0; i < tab.lines.length && y < canvas.height; i++) {
    if (hiddenSet.has(i)) continue;
    const len = Math.min(tab.lines[i].length, 60);
    if (len > 0) {
      ctx.globalAlpha = state.selectedLines.has(i) ? 1 : 0.5;
      if (state.selectedLines.has(i)) ctx.fillStyle = '#17a2b8';
      else ctx.fillStyle = theme.textGutter;
      ctx.fillRect(4, y, len, 2);
      ctx.globalAlpha = 1;
    }
    y += 3;
  }
}

// ===== VIEW CONTROLS =====
function toggleWordWrap() {
  state.wordWrap = !state.wordWrap;
  const wrapBtn = document.getElementById('wrapBtn');
  if (wrapBtn) wrapBtn.classList.toggle('active', state.wordWrap);
  renderEditor();
  closeAllMenus();
}

function zoomIn() {
  state.zoom = Math.min(200, state.zoom + 10);
  state.fontSize = Math.round(14 * state.zoom / 100);
  document.getElementById('fontSizeInput').value = state.fontSize;
  document.getElementById('statusZoom').textContent = state.zoom + '%';
  renderEditor();
  closeAllMenus();
}

function zoomOut() {
  state.zoom = Math.max(50, state.zoom - 10);
  state.fontSize = Math.round(14 * state.zoom / 100);
  document.getElementById('fontSizeInput').value = state.fontSize;
  document.getElementById('statusZoom').textContent = state.zoom + '%';
  renderEditor();
  closeAllMenus();
}

function resetZoom() {
  state.zoom = 100;
  state.fontSize = 14;
  document.getElementById('fontSizeInput').value = 14;
  document.getElementById('statusZoom').textContent = '100%';
  renderEditor();
  closeAllMenus();
}

function changeFont(family) {
  state.fontFamily = family;
  renderEditor();
}

function changeFontSize(size) {
  state.fontSize = parseInt(size) || 14;
  state.zoom = Math.round(state.fontSize / 14 * 100);
  document.getElementById('statusZoom').textContent = state.zoom + '%';
  renderEditor();
}

function changeTheme(themeName) {
  state.theme = themeName;
  const t = themes[themeName];
  document.documentElement.style.setProperty('--bg-editor', t.bgEditor);
  document.documentElement.style.setProperty('--bg-gutter', t.bgGutter);
  document.documentElement.style.setProperty('--text-primary', t.textPrimary);
  document.documentElement.style.setProperty('--text-gutter', t.textGutter);
  document.documentElement.style.setProperty('--line-highlight', t.lineHighlight);
  document.documentElement.style.setProperty('--bg-selection', t.bgSelection);
  document.documentElement.style.setProperty('--border-color', t.gutterBorder);
  document.documentElement.style.setProperty('--bg-statusbar', t.statusbar);
  renderEditor();
}

// ===== MENU TOGGLE =====
function toggleMenu(el) {
  const wasActive = el.classList.contains('active');
  closeAllMenus();
  if (!wasActive) el.classList.add('active');
}

function closeAllMenus() {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-item')) closeAllMenus();
});

// ===== STATUS BAR =====
function updateStatus() {
  const tab = state.tabs[state.activeTab];
  if (tab) {
    document.getElementById('statusLines').textContent = `Lines: ${tab.lines.length}`;
    const hiddenCount = tab.hiddenRanges ? tab.hiddenRanges.reduce((sum, r) => sum + (r.to - r.from + 1), 0) : 0;
    document.getElementById('statusHidden').textContent = `Hidden: ${hiddenCount}`;
    document.getElementById('statusMode').textContent = tab.name;
    document.getElementById('statusSelected').textContent = `Selected: ${state.selectedLines.size}`;
  } else {
    document.getElementById('statusLines').textContent = 'Lines: 0';
    document.getElementById('statusHidden').textContent = 'Hidden: 0';
    document.getElementById('statusMode').textContent = 'Ready';
    document.getElementById('statusSelected').textContent = 'Selected: 0';
  }
}

// ===== TOAST & PROGRESS =====
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('visible');
  setTimeout(() => toastEl.classList.remove('visible'), 3200);
}

function showProgress(msg) {
  progressText.textContent = msg;
  progressOverlay.classList.add('visible');
}

function hideProgress() {
  progressOverlay.classList.remove('visible');
}

// ===== KEYBOARD SHORTCUTS =====
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Snipping Tool modal keyboard shortcuts
    const snipModal = document.getElementById('snippingModal');
    if (snipModal && snipModal.classList.contains('visible')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSnippingModal();
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        snipUndo();
        return;
      }
      if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        snipRedo();
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        snipCopyImage();
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        snipSaveImage();
        return;
      }
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key.toLowerCase() === 'p') { selectSnipTool('pen'); return; }
        if (e.key.toLowerCase() === 'h') { selectSnipTool('highlighter'); return; }
        if (e.key.toLowerCase() === 'e') { selectSnipTool('eraser'); return; }
        if (e.key.toLowerCase() === 'r') { selectSnipTool('shape'); return; }
      }
      return;
    }

    // Search: Ctrl + F
    if (e.ctrlKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openSearch();
      return;
    }
    // Enter in search
    if (searchWidget.classList.contains('visible') && e.target === searchInput) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) findPrev();
        else findNext();
        return;
      }
    }
    // Open: Ctrl + O
    if (e.ctrlKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      openFile();
      return;
    }
    // Close tab: Ctrl + W
    if (e.ctrlKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      closeCurrentTab();
      return;
    }
    // Hide panel: Ctrl + H
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      hideSelectedLines();
      return;
    }
    // Hide selected: Ctrl + Shift + H
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      hideSelectedLines();
      return;
    }
    // Show all lines: Ctrl + Shift + U
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      showAllLines();
      return;
    }
    // Copy screenshot image to clipboard: Ctrl + Shift + C or Ctrl + C (when rows selected)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copyScreenshot('selection');
      return;
    }
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'c' && state.selectedLines.size > 0 && document.activeElement !== searchInput) {
      const sel = window.getSelection();
      if (!sel || sel.toString().length === 0) {
        e.preventDefault();
        copyScreenshot('selection');
        return;
      }
    }
    // Screenshot options: F5
    if (e.key === 'F5') {
      e.preventDefault();
      showScreenshotModal();
      return;
    }
    // Quick full screenshot: F6
    if (e.key === 'F6') {
      e.preventDefault();
      quickScreenshot('full');
      return;
    }
    // Quick selection screenshot: F7
    if (e.key === 'F7') {
      e.preventDefault();
      quickScreenshot('selection');
      return;
    }
    // Word wrap: Alt + Z
    if (e.altKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      toggleWordWrap();
      return;
    }
    // Zoom: Ctrl + / Ctrl - / Ctrl 0
    if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      zoomIn();
      return;
    }
    if (e.ctrlKey && e.key === '-') {
      e.preventDefault();
      zoomOut();
      return;
    }
    if (e.ctrlKey && e.key === '0') {
      e.preventDefault();
      resetZoom();
      return;
    }
    // Escape: close modal, search, dropdowns
    if (e.key === 'Escape') {
      if (searchWidget.classList.contains('visible')) {
        closeSearch();
      } else {
        closeScreenshotModal();
        closeAllMenus();
      }
      return;
    }
    // Select all: Ctrl + A (Hanya pilih baris yang tidak disembunyikan)
    if (e.ctrlKey && e.key.toLowerCase() === 'a' && state.activeTab >= 0 && document.activeElement !== searchInput) {
      e.preventDefault();
      const tab = state.tabs[state.activeTab];
      const hiddenSet = getHiddenLinesSet(tab);
      state.selectedLines.clear();
      for (let i = 0; i < tab.lines.length; i++) {
        if (!hiddenSet.has(i)) {
          state.selectedLines.add(i);
        }
      }
      updateRowSelectionDOM();
      updateSelectionBar();
      updateStatus();
      return;
    }
  });
}

// ===== CAPTURE SCREENSHOT & COPY TO CLIPBOARD =====
function captureScreenshotAndCopy() {
  const scope = state.screenshotScope;

  if (scope === 'selection' && state.selectedLines.size === 0) {
    showToast('⚠️ Belum ada baris yang dipilih!');
    return;
  }

  const tab = state.tabs[state.activeTab];
  closeScreenshotModal();
  const options = {
    scope: scope,
    format: document.getElementById('ssFormat').value,
    scale: parseFloat(document.getElementById('ssScale').value),
    padding: parseInt(document.getElementById('ssPadding').value) || 24,
    lineNumbers: document.getElementById('ssLineNumbers').checked,
    widthMode: document.getElementById('ssWidthMode').value,
    includeHeader: document.getElementById('ssIncludeHeader').checked,
    tabTitle: document.getElementById('ssTabTitle').value || (tab ? (tab.fullPath || tab.name) : 'Untitled'),
    rangeFrom: parseInt(document.getElementById('ssRangeFrom').value) || 1,
    rangeTo: parseInt(document.getElementById('ssRangeTo').value) || (tab ? tab.lines.length : 1),
    action: 'copy'
  };

  doCapture(options);
}

// ==========================================
// WINDOWS 11 SNIPPING TOOL MODAL & ENGINE
// ==========================================

const snipState = {
  activeTool: 'pen', // 'pen', 'highlighter', 'eraser', 'shape', 'emoji'
  penColor: '#e74c3c',
  penSize: 3,
  hlColor: '#f1c40f',
  hlSize: 18,
  shapeType: 'rect', // 'rect', 'arrow', 'circle', 'line'
  fillColor: '#0078d4', // Default Windows Blue Fill
  fillOpacity: 100,
  outlineColor: 'none', // Default No Outline (⊘) as in screenshot
  outlineOpacity: 100,
  outlineWidth: 3,
  selectedEmoji: '⭐',
  zoom: 100,
  history: [],
  historyIndex: -1,
  filename: '',
  isDrawing: false,
  startX: 0,
  startY: 0,
  snapshot: null
};

// 30 Windows 11 Fluent Colors
const FLUENT_COLORS = [
  'none',    '#000000', '#ffffff', '#c7c7c7', '#8a8a8a', '#616161',
  '#c0005a', '#e81123', '#ea6100', '#ff8c00', '#ffb900', '#fff100',
  '#bad80a', '#107c10', '#008272', '#00bcf2', '#0078d4', '#4f4bdd',
  '#744da9', '#492576', '#ffd8a8', '#c49c74', '#8e562e', '#4a2c11',
  '#ff68b6', '#ffb8b8', '#fff6a5', '#7fe9ad', '#92d9f8', '#b6b0fc'
];

const EMOJI_LIST = [
  '⭐', '⚠️', '❌', '✅', '💡',
  '❓', '🎯', '🚀', '❤️', '👍',
  '👀', '🔥', '📌', '💯', '🚩',
  '💬', '⚡', '📝', '🔍', '🔒'
];

function hexToRgba(hex, alpha) {
  if (!hex || hex === 'none') return 'transparent';
  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function initFluentColorGrids() {
  const fillGrid = document.getElementById('fillColorsGrid');
  const outlineGrid = document.getElementById('outlineColorsGrid');
  const emojiGrid = document.getElementById('emojiGrid');

  if (fillGrid && fillGrid.children.length === 0) {
    FLUENT_COLORS.forEach((c) => {
      const swatch = document.createElement('div');
      if (c === 'none') {
        swatch.className = 'snip-fluent-swatch no-color';
        swatch.textContent = '⊘';
        swatch.title = 'No Fill (Transparan)';
      } else {
        swatch.className = 'snip-fluent-swatch' + (c === snipState.fillColor ? ' active' : '');
        swatch.style.background = c;
        swatch.title = c;
      }
      swatch.onclick = (e) => {
        e.stopPropagation();
        setFillColor(c, swatch);
      };
      fillGrid.appendChild(swatch);
    });
  }

  if (outlineGrid && outlineGrid.children.length === 0) {
    FLUENT_COLORS.forEach((c) => {
      const swatch = document.createElement('div');
      if (c === 'none') {
        swatch.className = 'snip-fluent-swatch no-color active';
        swatch.textContent = '⊘';
        swatch.title = 'No Outline (Tanpa Garis Tepi)';
      } else {
        swatch.className = 'snip-fluent-swatch';
        swatch.style.background = c;
        swatch.title = c;
      }
      swatch.onclick = (e) => {
        e.stopPropagation();
        setOutlineColor(c, swatch);
      };
      outlineGrid.appendChild(swatch);
    });
  }

  if (emojiGrid && emojiGrid.children.length === 0) {
    EMOJI_LIST.forEach((emoji) => {
      const item = document.createElement('div');
      item.className = 'snip-emoji-item';
      item.textContent = emoji;
      item.title = 'Tempel stiker ' + emoji;
      item.onclick = (e) => {
        e.stopPropagation();
        selectEmoji(emoji);
      };
      emojiGrid.appendChild(item);
    });
  }
}

function openSnippingToolDirectly() {
  if (state.activeTab >= 0) {
    const tab = state.tabs[state.activeTab];
    if (state.selectedLines && state.selectedLines.size > 0) {
      copyScreenshot('selection');
    } else {
      doCapture({
        scope: 'full',
        format: 'png',
        scale: 2,
        padding: 24,
        lineNumbers: true,
        widthMode: 'full',
        includeHeader: true,
        tabTitle: tab.fullPath || tab.name,
        rangeFrom: 0,
        rangeTo: 0,
        action: 'copy'
      });
    }
  } else {
    // Mode Kanvas Langsung
    const dummy = document.createElement('canvas');
    dummy.width = 1300;
    dummy.height = 750;
    const ctx = dummy.getContext('2d');
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, dummy.width, dummy.height);

    ctx.fillStyle = '#282c34';
    ctx.fillRect(30, 30, dummy.width - 60, dummy.height - 60);

    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#60cdff';
    ctx.textAlign = 'center';
    ctx.fillText('✂️ Windows 11 Snipping Tool - Mode Kanvas Langsung', dummy.width / 2, dummy.height / 2 - 25);

    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#999999';
    ctx.fillText('Buka file teks (Ctrl+O) atau tekan Ctrl+V untuk menempelkan gambar dari clipboard!', dummy.width / 2, dummy.height / 2 + 15);

    openSnippingModal(dummy, 'Snipping_Tool');
  }
}

function openSnippingModal(sourceCanvas, filename) {
  if (!sourceCanvas) return;
  const modal = document.getElementById('snippingModal');
  const baseCanvas = document.getElementById('snipBaseCanvas');
  const drawCanvas = document.getElementById('snipDrawCanvas');
  const stage = document.getElementById('snipStage');
  if (!modal || !baseCanvas || !drawCanvas || !stage) return;

  snipState.filename = filename || 'screenshot';

  // Sizing canvases to match source canvas resolution exactly
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  baseCanvas.width = w;
  baseCanvas.height = h;
  drawCanvas.width = w;
  drawCanvas.height = h;

  // Render base image
  const bCtx = baseCanvas.getContext('2d');
  bCtx.clearRect(0, 0, w, h);
  bCtx.drawImage(sourceCanvas, 0, 0);

  // Clear draw canvas
  const dCtx = drawCanvas.getContext('2d');
  dCtx.clearRect(0, 0, w, h);

  // Initialize history
  snipState.history = [dCtx.getImageData(0, 0, w, h)];
  snipState.historyIndex = 0;
  updateSnipHistoryButtons();

  // Populate color grids and emojis
  initFluentColorGrids();

  // Reset tool
  selectSnipTool('pen');

  // Show modal
  modal.classList.add('visible');

  // Compute initial zoom to fit comfortably in viewport
  setTimeout(() => {
    snipFitScreen();
  }, 50);
}

function closeSnippingModal() {
  const modal = document.getElementById('snippingModal');
  if (modal) modal.classList.remove('visible');
  closeAllSnipPopups();
}

function selectSnipTool(toolName) {
  snipState.activeTool = toolName;
  closeAllSnipPopups();

  // Update button active state on top toolbar
  document.querySelectorAll('.snipping-toolbar-center .snip-tool-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const toolBtnMap = {
    pen: 'snipToolPen',
    highlighter: 'snipToolHighlighter',
    eraser: 'snipToolEraser',
    shape: 'snipToolShapes',
    emoji: 'snipToolShapes'
  };

  const btnId = toolBtnMap[toolName];
  if (btnId) {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');
  }

  // Show or hide secondary shapes floating bar
  const subBar = document.getElementById('snipShapesSubToolbar');
  if (subBar) {
    if (toolName === 'shape' || toolName === 'emoji') {
      subBar.classList.remove('hidden');
    } else {
      subBar.classList.add('hidden');
    }
  }

  // Update canvas cursor
  const drawCanvas = document.getElementById('snipDrawCanvas');
  if (drawCanvas) {
    drawCanvas.className = '';
    if (toolName === 'pen') drawCanvas.classList.add('cursor-pen');
    else if (toolName === 'highlighter') drawCanvas.classList.add('cursor-highlighter');
    else if (toolName === 'eraser') drawCanvas.classList.add('cursor-eraser');
    else if (toolName === 'shape') drawCanvas.classList.add('cursor-shape');
    else if (toolName === 'emoji') drawCanvas.style.cursor = 'cell';
  }
}

function toggleSnipPopup(popupId) {
  const el = document.getElementById(popupId);
  if (!el) return;
  const isVis = el.classList.contains('visible');
  closeAllSnipPopups();
  if (!isVis) {
    el.classList.add('visible');
  }
}

function closeAllSnipPopups() {
  document.querySelectorAll('.snip-popup, .snip-fluent-popup').forEach(p => p.classList.remove('visible'));
}

function setPenColor(color, swatchEl) {
  snipState.penColor = color;
  if (swatchEl) {
    swatchEl.closest('.snip-palette').querySelectorAll('.snip-color-swatch').forEach(s => s.classList.remove('active'));
    swatchEl.classList.add('active');
  }
  selectSnipTool('pen');
}

function setPenSize(val) {
  snipState.penSize = parseInt(val) || 3;
  const label = document.getElementById('penSizeVal');
  if (label) label.textContent = `${snipState.penSize}px`;
}

function setHighlighterColor(color, swatchEl) {
  snipState.hlColor = color;
  if (swatchEl) {
    swatchEl.closest('.snip-palette').querySelectorAll('.snip-color-swatch').forEach(s => s.classList.remove('active'));
    swatchEl.classList.add('active');
  }
  selectSnipTool('highlighter');
}

function setHlSize(val) {
  snipState.hlSize = parseInt(val) || 18;
  const label = document.getElementById('hlSizeVal');
  if (label) label.textContent = `${snipState.hlSize}px`;
}

function setShapeType(type, btnEl) {
  snipState.shapeType = type;
  closeAllSnipPopups();

  const map = {
    rect: 'subShapeRect',
    circle: 'subShapeCircle',
    line: 'subShapeLine',
    arrow: 'subShapeArrow'
  };

  document.querySelectorAll('.snip-sub-toolbar .snip-sub-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtnId = map[type];
  if (activeBtnId) {
    const el = document.getElementById(activeBtnId);
    if (el) el.classList.add('active');
  }

  selectSnipTool('shape');
}

function setFillColor(color, swatchEl) {
  snipState.fillColor = color;
  const indicator = document.getElementById('fillColorIndicator');
  if (indicator) {
    if (color === 'none') {
      indicator.className = 'snip-color-indicator slash';
      indicator.textContent = '⊘';
      indicator.style.background = 'transparent';
    } else {
      indicator.className = 'snip-color-indicator';
      indicator.textContent = '';
      indicator.style.background = color;
    }
  }

  const slider = document.getElementById('fillOpacitySlider');
  if (slider && color !== 'none') {
    slider.style.setProperty('--active-slider-color', color);
  }

  if (swatchEl) {
    swatchEl.closest('.snip-fluent-grid').querySelectorAll('.snip-fluent-swatch').forEach(s => s.classList.remove('active'));
    swatchEl.classList.add('active');
  }

  selectSnipTool('shape');
}

function setFillOpacity(val) {
  snipState.fillOpacity = parseInt(val) || 0;
  const label = document.getElementById('fillOpacityVal');
  if (label) label.textContent = `${snipState.fillOpacity}%`;
}

function setOutlineColor(color, swatchEl) {
  snipState.outlineColor = color;
  const indicator = document.getElementById('outlineColorIndicator');
  if (indicator) {
    if (color === 'none') {
      indicator.className = 'snip-color-indicator slash';
      indicator.textContent = '⊘';
      indicator.style.background = 'transparent';
    } else {
      indicator.className = 'snip-color-indicator';
      indicator.textContent = '';
      indicator.style.background = color;
    }
  }

  const slider = document.getElementById('outlineOpacitySlider');
  if (slider && color !== 'none') {
    slider.style.setProperty('--active-slider-color', color);
  }

  if (swatchEl) {
    swatchEl.closest('.snip-fluent-grid').querySelectorAll('.snip-fluent-swatch').forEach(s => s.classList.remove('active'));
    swatchEl.classList.add('active');
  }

  selectSnipTool('shape');
}

function setOutlineOpacity(val) {
  snipState.outlineOpacity = parseInt(val) || 0;
  const label = document.getElementById('outlineOpacityVal');
  if (label) label.textContent = `${snipState.outlineOpacity}%`;
}

function selectEmoji(emoji) {
  snipState.selectedEmoji = emoji;
  selectSnipTool('emoji');
  closeAllSnipPopups();
  showToast(`Stiker ${emoji} dipilih! Klik pada gambar untuk menempelkan.`);
}

// Coordinate calculation accounting for any zoom scaling & bounding rect
function getSnipCanvasCoords(e) {
  const drawCanvas = document.getElementById('snipDrawCanvas');
  const rect = drawCanvas.getBoundingClientRect();
  const scaleX = drawCanvas.width / rect.width;
  const scaleY = drawCanvas.height / rect.height;

  let clientX = e.clientX;
  let clientY = e.clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function setupSnippingEvents() {
  const drawCanvas = document.getElementById('snipDrawCanvas');
  if (!drawCanvas) return;
  const ctx = drawCanvas.getContext('2d');

  function startDraw(e) {
    e.preventDefault();
    closeAllSnipPopups();
    const coords = getSnipCanvasCoords(e);
    snipState.isDrawing = true;
    snipState.startX = coords.x;
    snipState.startY = coords.y;

    if (snipState.activeTool === 'emoji') {
      ctx.save();
      ctx.font = '34px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(snipState.selectedEmoji, coords.x, coords.y);
      ctx.restore();
      pushSnipHistory();
      snipState.isDrawing = false;
      return;
    }

    if (snipState.activeTool === 'pen') {
      ctx.save();
      ctx.strokeStyle = snipState.penColor;
      ctx.lineWidth = snipState.penSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x + 0.1, coords.y + 0.1);
      ctx.stroke();
    } else if (snipState.activeTool === 'highlighter') {
      ctx.save();
      ctx.strokeStyle = snipState.hlColor;
      ctx.lineWidth = snipState.hlSize;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
      ctx.globalAlpha = 0.38;
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x + 0.1, coords.y + 0.1);
      ctx.stroke();
    } else if (snipState.activeTool === 'eraser') {
      eraseAt(coords.x, coords.y);
    } else if (snipState.activeTool === 'shape') {
      snipState.snapshot = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    }
  }

  function moveDraw(e) {
    if (!snipState.isDrawing) return;
    e.preventDefault();
    const coords = getSnipCanvasCoords(e);

    if (snipState.activeTool === 'pen') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (snipState.activeTool === 'highlighter') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (snipState.activeTool === 'eraser') {
      eraseAt(coords.x, coords.y);
    } else if (snipState.activeTool === 'shape' && snipState.snapshot) {
      ctx.putImageData(snipState.snapshot, 0, 0);
      drawLiveShape(ctx, snipState.startX, snipState.startY, coords.x, coords.y, snipState.shapeType);
    }
  }

  function endDraw(e) {
    if (!snipState.isDrawing) return;
    snipState.isDrawing = false;

    if (snipState.activeTool === 'pen' || snipState.activeTool === 'highlighter') {
      ctx.closePath();
      ctx.restore();
    }

    pushSnipHistory();
  }

  function eraseAt(x, y) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCanvas.addEventListener('mousedown', startDraw);
  window.addEventListener('mousemove', (e) => {
    if (snipState.isDrawing) moveDraw(e);
  });
  window.addEventListener('mouseup', (e) => {
    if (snipState.isDrawing) endDraw(e);
  });

  // Touch support
  drawCanvas.addEventListener('touchstart', startDraw, { passive: false });
  window.addEventListener('touchmove', (e) => {
    if (snipState.isDrawing) moveDraw(e);
  }, { passive: false });
  window.addEventListener('touchend', (e) => {
    if (snipState.isDrawing) endDraw(e);
  });

  // Zoom on Ctrl + Wheel in viewport
  const viewport = document.getElementById('snipViewport');
  if (viewport) {
    viewport.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) snipZoomIn();
        else snipZoomOut();
      }
    }, { passive: false });
  }

  // Paste image directly from clipboard into Snipping Tool
  window.addEventListener('paste', (e) => {
    if (!e.clipboardData || !e.clipboardData.items) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const img = new Image();
          img.onload = () => {
            const pasteCanvas = document.createElement('canvas');
            pasteCanvas.width = img.width;
            pasteCanvas.height = img.height;
            const pCtx = pasteCanvas.getContext('2d');
            pCtx.drawImage(img, 0, 0);
            openSnippingModal(pasteCanvas, 'pasted_image');
            showToast('📋 Gambar berhasil ditempel dari clipboard ke Snipping Tool!');
          };
          img.src = URL.createObjectURL(blob);
        }
        break;
      }
    }
  });

  // Close popups if clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.snip-tool-btn') && 
        !e.target.closest('.snip-popup') && 
        !e.target.closest('.snip-sub-btn') && 
        !e.target.closest('.snip-sub-dropdown-btn') && 
        !e.target.closest('.snip-fluent-popup')) {
      closeAllSnipPopups();
    }
  });
}

function drawLiveShape(ctx, x1, y1, x2, y2, type) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  const hasFill = snipState.fillColor !== 'none' && snipState.fillOpacity > 0;
  let hasOutline = snipState.outlineColor !== 'none' && snipState.outlineOpacity > 0;

  // If user selected none for both, give visible outline so shape is not invisible
  if (!hasFill && !hasOutline) {
    hasOutline = true;
    ctx.strokeStyle = '#0078d4';
  } else if (hasOutline) {
    ctx.strokeStyle = hexToRgba(snipState.outlineColor, snipState.outlineOpacity / 100);
  }

  if (hasFill) {
    ctx.fillStyle = hexToRgba(snipState.fillColor, snipState.fillOpacity / 100);
  }

  ctx.lineWidth = snipState.outlineWidth || 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);

  if (type === 'rect') {
    if (hasFill) ctx.fillRect(left, top, w, h);
    if (hasOutline) ctx.strokeRect(left, top, w, h);
  } else if (type === 'circle') {
    const rx = w / 2;
    const ry = h / 2;
    const cx = left + rx;
    const cy = top + ry;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (hasFill) ctx.fill();
    if (hasOutline) ctx.stroke();
  } else if (type === 'arrow') {
    const arrowColor = hasOutline ? hexToRgba(snipState.outlineColor, snipState.outlineOpacity / 100) : 
                       (hasFill ? hexToRgba(snipState.fillColor, snipState.fillOpacity / 100) : '#0078d4');
    drawSnipArrow(ctx, x1, y1, x2, y2, arrowColor, snipState.outlineWidth || 3);
  } else if (type === 'line') {
    const lineColor = hasOutline ? hexToRgba(snipState.outlineColor, snipState.outlineOpacity / 100) : 
                      (hasFill ? hexToRgba(snipState.fillColor, snipState.fillOpacity / 100) : '#0078d4');
    ctx.strokeStyle = lineColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSnipArrow(ctx, fromX, fromY, toX, toY, color, width) {
  const headlen = Math.max(16, width * 3.5);
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Shaft
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 7), toY - headlen * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 7), toY - headlen * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function pushSnipHistory() {
  const drawCanvas = document.getElementById('snipDrawCanvas');
  if (!drawCanvas) return;
  const ctx = drawCanvas.getContext('2d');

  // Truncate redo
  snipState.history = snipState.history.slice(0, snipState.historyIndex + 1);

  // Push new snapshot
  snipState.history.push(ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
  if (snipState.history.length > 30) {
    snipState.history.shift();
  }
  snipState.historyIndex = snipState.history.length - 1;
  updateSnipHistoryButtons();
}

function snipUndo() {
  if (snipState.historyIndex > 0) {
    snipState.historyIndex--;
    const drawCanvas = document.getElementById('snipDrawCanvas');
    const ctx = drawCanvas.getContext('2d');
    ctx.putImageData(snipState.history[snipState.historyIndex], 0, 0);
    updateSnipHistoryButtons();
  }
}

function snipRedo() {
  if (snipState.historyIndex < snipState.history.length - 1) {
    snipState.historyIndex++;
    const drawCanvas = document.getElementById('snipDrawCanvas');
    const ctx = drawCanvas.getContext('2d');
    ctx.putImageData(snipState.history[snipState.historyIndex], 0, 0);
    updateSnipHistoryButtons();
  }
}

function updateSnipHistoryButtons() {
  const undoBtn = document.getElementById('snipUndoBtn');
  const redoBtn = document.getElementById('snipRedoBtn');
  if (undoBtn) {
    undoBtn.disabled = snipState.historyIndex <= 0;
  }
  if (redoBtn) {
    redoBtn.disabled = snipState.historyIndex >= snipState.history.length - 1;
  }
}

// Zoom controls
function snipZoomIn() {
  snipState.zoom = Math.min(300, snipState.zoom + 15);
  applySnipZoom();
}

function snipZoomOut() {
  snipState.zoom = Math.max(20, snipState.zoom - 15);
  applySnipZoom();
}

function snipFitScreen() {
  const viewport = document.getElementById('snipViewport');
  const baseCanvas = document.getElementById('snipBaseCanvas');
  if (!viewport || !baseCanvas || baseCanvas.width === 0) return;

  const availW = Math.max(200, viewport.clientWidth - 80);
  const availH = Math.max(200, viewport.clientHeight - 80);

  const scaleX = availW / baseCanvas.width;
  const scaleY = availH / baseCanvas.height;
  let fitScale = Math.min(scaleX, scaleY, 1.0);

  snipState.zoom = Math.max(20, Math.round(fitScale * 100));
  applySnipZoom();
}

function snipResetView() {
  snipState.zoom = 100;
  applySnipZoom();
}

function applySnipZoom() {
  const stage = document.getElementById('snipStage');
  const baseCanvas = document.getElementById('snipBaseCanvas');
  const label = document.getElementById('snipZoomLabel');
  if (!stage || !baseCanvas || baseCanvas.width === 0) return;

  const scale = snipState.zoom / 100;
  stage.style.width = Math.round(baseCanvas.width * scale) + 'px';
  stage.style.height = Math.round(baseCanvas.height * scale) + 'px';

  if (label) {
    label.textContent = `${Math.round(snipState.zoom)}%`;
  }
}

// Merged canvas (Base screenshot + annotations)
function getMergedSnipCanvas() {
  const baseCanvas = document.getElementById('snipBaseCanvas');
  const drawCanvas = document.getElementById('snipDrawCanvas');
  if (!baseCanvas || !drawCanvas) return null;

  const merged = document.createElement('canvas');
  merged.width = baseCanvas.width;
  merged.height = baseCanvas.height;
  const ctx = merged.getContext('2d');

  // 1. Draw base screenshot
  ctx.drawImage(baseCanvas, 0, 0);

  // 2. Draw annotations on top
  ctx.drawImage(drawCanvas, 0, 0);

  return merged;
}

// Action: Copy to clipboard
async function snipCopyImage() {
  const merged = getMergedSnipCanvas();
  if (!merged) return;

  merged.toBlob(async (blob) => {
    if (!blob) {
      showToast('❌ Gagal menyiapkan gambar untuk clipboard');
      return;
    }
    try {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      showToast('📋 Gambar berhasil disalin ke Clipboard! Siap di-paste (Ctrl+V).');
    } catch (err) {
      console.error('Clipboard copy error:', err);
      snipSaveImage();
      showToast('⚠️ Clipboard dibatasi browser, gambar otomatis diunduh.');
    }
  }, 'image/png');
}

// Action: Save to disk
function snipSaveImage() {
  const merged = getMergedSnipCanvas();
  if (!merged) return;

  const link = document.createElement('a');
  link.download = `${snipState.filename}_snip_${Date.now()}.png`;
  link.href = merged.toDataURL('image/png');
  link.click();
  showToast('💾 Gambar screenshot berhasil disimpan!');
}

// Action: Edit in Paint
function snipEditInPaint() {
  snipSaveImage();
  showToast('🎨 Gambar diunduh! Anda dapat langsung membukanya di MS Paint.');
}

// Action: Share
async function snipShareImage() {
  const merged = getMergedSnipCanvas();
  if (!merged) return;

  if (navigator.share && navigator.canShare) {
    merged.toBlob(async (blob) => {
      const file = new File([blob], `${snipState.filename}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Screenshot ' + snipState.filename,
            text: 'Screenshot dari Notepad++ Style Tool'
          });
          showToast('✅ Berhasil dibagikan!');
          return;
        } catch (e) {
          console.log('Share canceled or failed', e);
        }
      }
      snipCopyImage();
    }, 'image/png');
  } else {
    snipCopyImage();
  }
}

// Action: Text extractor / OCR fallback
function snipCopyText() {
  const tab = state.tabs[state.activeTab];
  if (!tab) {
    showToast('Tidak ada tab aktif');
    return;
  }
  const hiddenSet = getHiddenLinesSet(tab);
  let textToCopy = '';
  if (state.selectedLines && state.selectedLines.size > 0) {
    const sorted = Array.from(state.selectedLines).filter(i => !hiddenSet.has(i)).sort((a, b) => a - b);
    textToCopy = sorted.map(i => tab.lines[i] || '').join('\n');
  } else {
    textToCopy = tab.lines.filter((_, i) => !hiddenSet.has(i)).join('\n');
  }

  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast('📝 Teks berhasil disalin ke Clipboard (tanpa baris tersembunyi)!');
  }).catch(() => {
    showToast('❌ Gagal menyalin teks');
  });
}

