/**
 * Global & Modal Keyboard Shortcuts
 */

import { state } from './state.js';
import { elements, updateStatus, closeAllMenus } from './ui.js';
import { openFile, closeCurrentTab } from './file.js';
import { hideSelectedLines, showAllLines, getHiddenLinesSet } from './hideLines.js';
import { showScreenshotModal, quickScreenshot, copyScreenshot, closeScreenshotModal } from './capture.js';
import { openSearch, closeSearch, findNext, findPrev } from './search.js';
import { toggleWordWrap, zoomIn, zoomOut, resetZoom } from './view.js';
import { updateRowSelectionDOM, updateSelectionBar } from './editor.js';
import { closeSnippingModal, snipUndo, snipRedo, snipCopyImage, snipSaveImage, selectSnipTool } from './snippingTool.js';

export function setupKeyboardShortcuts() {
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

    const searchWidget = elements.searchWidget;
    const searchInput = elements.searchInput;

    // Search: Ctrl + F
    if (e.ctrlKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openSearch();
      return;
    }
    // Enter in search
    if (searchWidget && searchWidget.classList.contains('visible') && e.target === searchInput) {
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
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'c' && document.activeElement !== searchInput) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      // Jika baris belum dipilih tetapi user menyeleksi teks dengan mouse drag di editor
      const sel = window.getSelection();
      if (state.selectedLines.size === 0 && sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const rows = document.querySelectorAll('.editor-row');
        rows.forEach(row => {
          if (sel.containsNode(row, true)) {
            const line = parseInt(row.getAttribute('data-line'), 10);
            if (!isNaN(line)) state.selectedLines.add(line);
          }
        });
        if (state.selectedLines.size > 0) {
          updateRowSelectionDOM();
          updateSelectionBar();
        }
      }

      if (state.selectedLines.size > 0) {
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
      if (searchWidget && searchWidget.classList.contains('visible')) {
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
