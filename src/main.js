/**
 * TextShot - Notepad++ Style Text File Screenshot Tool
 * Main Application Entry Point
 */

import { state, themes, snipState, FLUENT_COLORS, EMOJI_LIST, hexToRgba } from './state.js';
import { elements, showToast, showProgress, hideProgress, updateStatus, toggleMenu, closeAllMenus } from './ui.js';
import { setupFileOpen, openFile, loadFile, setupDragAndDrop, renderTabs, switchTab, closeTab, closeCurrentTab } from './file.js';
import {
  renderEditor,
  escapeHtml,
  escapeRegex,
  highlightText,
  handleGutterClick,
  handleRowClick,
  toggleLineSelect,
  updateRowSelectionDOM,
  clearSelection,
  updateSelectionBar,
  setMinimapCallback
} from './editor.js';
import {
  getHiddenLinesSet,
  hideSingleLine,
  hideSelectedLines,
  addHideRange,
  showAllLines,
  unhideBlock,
  mergeHiddenRanges,
  renderHiddenRanges,
  removeHiddenRange,
  toggleHidePanel,
  setEditorCallbacks
} from './hideLines.js';

import {
  openSearch,
  closeSearch,
  toggleMatchCase,
  onSearchInput,
  performSearch,
  findNext,
  findPrev,
  scrollToCurrentMatch,
  clearSearch,
  selectAllMatchingLines,
  hideNonMatchingLines,
  hideMatchingLines
} from './search.js';
import {
  showScreenshotModal,
  closeScreenshotModal,
  setScope,
  quickScreenshot,
  copyScreenshot,
  captureScreenshot,
  captureScreenshotAndCopy,
  doCapture,
  wrapText
} from './capture.js';
import {
  toggleWordWrap,
  zoomIn,
  zoomOut,
  resetZoom,
  changeFont,
  changeFontSize,
  changeTheme,
  toggleMinimap,
  renderMinimap,
  setRenderEditorCallback
} from './view.js';
import {
  initFluentColorGrids,
  openSnippingToolDirectly,
  openSnippingModal,
  closeSnippingModal,
  selectSnipTool,
  toggleSnipPopup,
  closeAllSnipPopups,
  setPenColor,
  setPenSize,
  setHighlighterColor,
  setHlSize,
  setShapeType,
  setFillColor,
  setFillOpacity,
  setOutlineColor,
  setOutlineOpacity,
  selectEmoji,
  getSnipCanvasCoords,
  setupSnippingEvents,
  drawLiveShape,
  drawSnipArrow,
  pushSnipHistory,
  snipUndo,
  snipRedo,
  updateSnipHistoryButtons,
  snipZoomIn,
  snipZoomOut,
  snipFitScreen,
  snipResetView,
  applySnipZoom,
  getMergedSnipCanvas,
  snipCopyImage,
  snipSaveImage,
  snipEditInPaint,
  snipShareImage,
  snipCopyText
} from './snippingTool.js';
import { setupKeyboardShortcuts } from './shortcuts.js';

// Inject editor callbacks to break circular dependencies.
// All imports are hoisted and fully evaluated before these lines run.
setEditorCallbacks(renderEditor, updateSelectionBar);
setRenderEditorCallback(renderEditor);
setMinimapCallback(renderMinimap);

// Expose all functions to window for 100% backward compatibility with index.html inline attributes
const exportedFunctions = {
  // State
  state,
  themes,
  snipState,
  FLUENT_COLORS,
  EMOJI_LIST,
  hexToRgba,

  // UI
  showToast,
  showProgress,
  hideProgress,
  updateStatus,
  toggleMenu,
  closeAllMenus,

  // File & Tabs
  openFile,
  loadFile,
  renderTabs,
  switchTab,
  closeTab,
  closeCurrentTab,

  // Editor & Selection
  renderEditor,
  escapeHtml,
  escapeRegex,
  highlightText,
  handleGutterClick,
  handleRowClick,
  toggleLineSelect,
  updateRowSelectionDOM,
  clearSelection,
  updateSelectionBar,

  // Hide Lines
  getHiddenLinesSet,
  hideSingleLine,
  hideSelectedLines,
  addHideRange,
  showAllLines,
  unhideBlock,
  mergeHiddenRanges,
  renderHiddenRanges,
  removeHiddenRange,
  toggleHidePanel,

  // Search
  openSearch,
  closeSearch,
  toggleMatchCase,
  onSearchInput,
  performSearch,
  findNext,
  findPrev,
  scrollToCurrentMatch,
  clearSearch,
  selectAllMatchingLines,
  hideNonMatchingLines,
  hideMatchingLines,

  // View Controls
  toggleWordWrap,
  zoomIn,
  zoomOut,
  resetZoom,
  changeFont,
  changeFontSize,
  changeTheme,
  toggleMinimap,
  renderMinimap,

  // Capture & Screenshot
  showScreenshotModal,
  closeScreenshotModal,
  setScope,
  quickScreenshot,
  copyScreenshot,
  captureScreenshot,
  captureScreenshotAndCopy,
  doCapture,
  wrapText,

  // Snipping Tool
  initFluentColorGrids,
  openSnippingToolDirectly,
  openSnippingModal,
  closeSnippingModal,
  selectSnipTool,
  toggleSnipPopup,
  closeAllSnipPopups,
  setPenColor,
  setPenSize,
  setHighlighterColor,
  setHlSize,
  setShapeType,
  setFillColor,
  setFillOpacity,
  setOutlineColor,
  setOutlineOpacity,
  selectEmoji,
  getSnipCanvasCoords,
  drawLiveShape,
  drawSnipArrow,
  pushSnipHistory,
  snipUndo,
  snipRedo,
  updateSnipHistoryButtons,
  snipZoomIn,
  snipZoomOut,
  snipFitScreen,
  snipResetView,
  applySnipZoom,
  getMergedSnipCanvas,
  snipCopyImage,
  snipSaveImage,
  snipEditInPaint,
  snipShareImage,
  snipCopyText
};

Object.assign(window, exportedFunctions);

// Global click handler to close menu bar dropdowns when clicked outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-item')) {
    closeAllMenus();
  }
  // Close context menu on any click
  const ctx = document.getElementById('contextMenu');
  if (ctx && !e.target.closest('#contextMenu')) {
    ctx.classList.remove('visible');
  }
});

// ─── Right-click Context Menu ───────────────────────────────────────────────
let _contextLineIndex = -1;

function showContextMenu(e, lineIndex) {
  e.preventDefault();
  _contextLineIndex = lineIndex;
  const ctx = document.getElementById('contextMenu');
  if (!ctx) return;
  ctx.style.left = e.clientX + 'px';
  ctx.style.top  = e.clientY + 'px';
  ctx.classList.add('visible');
}

window.contextHideLines = function() {
  const ctx = document.getElementById('contextMenu');
  if (ctx) ctx.classList.remove('visible');
  // Hide selected lines if any, otherwise hide the right-clicked line
  if (state.selectedLines.size > 0) {
    hideSelectedLines();
  } else if (_contextLineIndex >= 0) {
    hideSingleLine(_contextLineIndex);
  }
};

window.contextCopyText = function() {
  const ctx = document.getElementById('contextMenu');
  if (ctx) ctx.classList.remove('visible');
  const tab = state.tabs[state.activeTab];
  if (!tab) return;

  // Jika belum ada baris yang dipilih, otomatis pilih baris yang diklik kanan
  // atau baris yang dicakup seleksi teks mouse
  if (state.selectedLines.size === 0) {
    const sel = window.getSelection();
    let detectedLines = [];
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const rows = document.querySelectorAll('.editor-row');
      rows.forEach(row => {
        if (sel.containsNode(row, true)) {
          const line = parseInt(row.getAttribute('data-line'), 10);
          if (!isNaN(line)) detectedLines.push(line);
        }
      });
    }

    if (detectedLines.length > 0) {
      detectedLines.forEach(l => state.selectedLines.add(l));
    } else if (_contextLineIndex >= 0 && tab.lines[_contextLineIndex] !== undefined) {
      state.selectedLines.add(_contextLineIndex);
    }

    updateRowSelectionDOM();
    updateSelectionBar();
  }

  // Salin teks baris ke clipboard teks (fallback & text copy)
  if (state.selectedLines.size > 0) {
    const sorted = Array.from(state.selectedLines).sort((a, b) => a - b);
    const textToCopy = sorted.map(i => tab.lines[i] || '').join('\n');
    if (textToCopy && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
    }
  }

  // Picu screenshot dan buka modal Windows 11 Snipping Tool (sama seperti Ctrl+C)
  copyScreenshot('selection');
};

// Attach right-click on editorWrapper (delegated)
document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('editorWrapper');
  if (wrapper) {
    wrapper.addEventListener('contextmenu', (e) => {
      const row = e.target.closest('.editor-row');
      if (row) {
        const lineIndex = parseInt(row.getAttribute('data-line'), 10);
        showContextMenu(e, lineIndex);
      }
    });
  }
});

// App Initialization
function initApp() {
  setupFileOpen();
  setupDragAndDrop();
  setupKeyboardShortcuts();
  setupSnippingEvents();
  updateStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
