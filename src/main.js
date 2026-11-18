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
