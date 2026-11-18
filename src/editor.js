/**
 * Unified Row Editor Rendering and Line Selection Logic
 *
 * Circular dependency note:
 *   editor.js ↔ view.js (renderMinimap) is broken by using a callback injected from main.js.
 */

import { state } from './state.js';
import { elements, updateStatus } from './ui.js';
import { escapeHtml, escapeRegex } from './utils.js';
import { getHiddenLinesSet } from './hideLines.js';

// Re-export utils for backward compatibility (other modules may import from editor)
export { escapeHtml, escapeRegex };

// Injected callback from view.js (set by main.js) to avoid circular imports
let _renderMinimap = () => {};

/**
 * Called once from main.js to inject renderMinimap callback.
 * @param {Function} renderMinimapFn
 */
export function setMinimapCallback(renderMinimapFn) {
  _renderMinimap = renderMinimapFn;
}

export function highlightText(text, regex, lineIndex) {
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

export function renderEditor() {
  const tab = state.tabs[state.activeTab];
  const editorWrapper = elements.editorWrapper;
  if (!tab || !editorWrapper) return;

  // Preserve scroll position so editor does not jump to top on re-render
  const prevScrollTop = editorWrapper.scrollTop;
  const prevScrollLeft = editorWrapper.scrollLeft;

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
  editorWrapper.scrollTop = prevScrollTop;
  editorWrapper.scrollLeft = prevScrollLeft;

  // Apply styling
  contentContainer.style.fontFamily = state.fontFamily;
  contentContainer.style.fontSize = state.fontSize + 'px';
  const lineHeight = Math.round(state.fontSize * 1.6);
  contentContainer.style.lineHeight = lineHeight + 'px';

  if (state.showMinimap) _renderMinimap();
}

export function handleGutterClick(lineIndex, event) {
  event.stopPropagation();
  toggleLineSelect(lineIndex, event);
}

export function handleRowClick(lineIndex, event) {
  // If user is selecting text inside row-text with mouse drag, don't toggle
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) return;
  toggleLineSelect(lineIndex, event);
}

export function toggleLineSelect(lineIndex, event) {
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

export function updateRowSelectionDOM() {
  const rows = document.querySelectorAll('.editor-row');
  rows.forEach(row => {
    const line = parseInt(row.getAttribute('data-line'), 10);
    if (state.selectedLines.has(line)) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });
}

export function clearSelection() {
  state.selectedLines.clear();
  state.lastSelectedLine = null;
  updateRowSelectionDOM();
  updateSelectionBar();
  updateStatus();
}

export function updateSelectionBar() {
  const count = state.selectedLines.size;
  const selectionBar = elements.selectionBar;
  const selCountEl = elements.selCountEl;
  const selRangeEl = elements.selRangeEl;
  const ssSelectionBtn = elements.ssSelectionBtn;
  const copySelectionBtn = document.getElementById('copySelectionBtn');
  const scopeSelDesc = document.getElementById('scopeSelDesc');
  const scopeSelection = document.getElementById('scopeSelection');

  if (count > 0) {
    if (selectionBar) selectionBar.classList.add('visible');
    if (selCountEl) selCountEl.textContent = count;
    if (ssSelectionBtn) ssSelectionBtn.disabled = false;
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
    if (selRangeEl) selRangeEl.textContent = `Baris: ${ranges.join(', ')}`;

    if (scopeSelDesc) scopeSelDesc.textContent = `${count} baris terpilih`;
    if (scopeSelection) scopeSelection.classList.remove('disabled');
  } else {
    if (selectionBar) selectionBar.classList.remove('visible');
    if (ssSelectionBtn) ssSelectionBtn.disabled = true;
    if (copySelectionBtn) copySelectionBtn.disabled = true;
    if (scopeSelDesc) scopeSelDesc.textContent = 'Pilih baris dahulu';
    if (state.screenshotScope === 'selection') {
      if (window.setScope) window.setScope('full');
    }
  }
}
