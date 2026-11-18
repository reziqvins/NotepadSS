/**
 * View controls (Word wrap, Zoom, Font, Theme, Minimap)
 *
 * To avoid circular dependency with editor.js (which imports renderMinimap from here),
 * renderEditor is injected via setRenderEditorCallback() called from main.js.
 */

import { state, themes } from './state.js';
import { closeAllMenus } from './ui.js';
import { getHiddenLinesSet } from './hideLines.js';

// Injected callback from editor.js (set by main.js)
let _renderEditor = () => {};

/**
 * Called once from main.js to inject renderEditor and break the circular dependency.
 * @param {Function} renderEditorFn
 */
export function setRenderEditorCallback(renderEditorFn) {
  _renderEditor = renderEditorFn;
}

export function toggleMinimap() {
  state.showMinimap = !state.showMinimap;
  const minimap = document.getElementById('minimap');
  if (minimap) minimap.style.display = state.showMinimap ? 'block' : 'none';
  if (state.showMinimap) renderMinimap();
  closeAllMenus();
}

export function renderMinimap() {
  const tab = state.tabs[state.activeTab];
  if (!tab) return;
  const canvas = document.getElementById('minimapCanvas');
  const container = document.getElementById('minimap');
  if (!canvas || !container) return;

  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  canvas.style.height = rect.height + 'px';
  const ctx = canvas.getContext('2d');
  const theme = themes[state.theme] || themes.dark;
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

export function toggleWordWrap() {
  state.wordWrap = !state.wordWrap;
  const wrapBtn = document.getElementById('wrapBtn');
  if (wrapBtn) wrapBtn.classList.toggle('active', state.wordWrap);
  _renderEditor();
  closeAllMenus();
}

export function zoomIn() {
  state.zoom = Math.min(200, state.zoom + 10);
  state.fontSize = Math.round(14 * state.zoom / 100);
  const sizeInput = document.getElementById('fontSizeInput');
  const zoomStatus = document.getElementById('statusZoom');
  if (sizeInput) sizeInput.value = state.fontSize;
  if (zoomStatus) zoomStatus.textContent = state.zoom + '%';
  _renderEditor();
  closeAllMenus();
}

export function zoomOut() {
  state.zoom = Math.max(50, state.zoom - 10);
  state.fontSize = Math.round(14 * state.zoom / 100);
  const sizeInput = document.getElementById('fontSizeInput');
  const zoomStatus = document.getElementById('statusZoom');
  if (sizeInput) sizeInput.value = state.fontSize;
  if (zoomStatus) zoomStatus.textContent = state.zoom + '%';
  _renderEditor();
  closeAllMenus();
}

export function resetZoom() {
  state.zoom = 100;
  state.fontSize = 14;
  const sizeInput = document.getElementById('fontSizeInput');
  const zoomStatus = document.getElementById('statusZoom');
  if (sizeInput) sizeInput.value = 14;
  if (zoomStatus) zoomStatus.textContent = '100%';
  _renderEditor();
  closeAllMenus();
}

export function changeFont(family) {
  state.fontFamily = family;
  _renderEditor();
}

export function changeFontSize(size) {
  state.fontSize = parseInt(size) || 14;
  state.zoom = Math.round(state.fontSize / 14 * 100);
  const zoomStatus = document.getElementById('statusZoom');
  if (zoomStatus) zoomStatus.textContent = state.zoom + '%';
  _renderEditor();
}

export function changeTheme(themeName) {
  state.theme = themeName;
  const t = themes[themeName];
  if (!t) return;
  document.documentElement.style.setProperty('--bg-editor', t.bgEditor);
  document.documentElement.style.setProperty('--bg-gutter', t.bgGutter);
  document.documentElement.style.setProperty('--text-primary', t.textPrimary);
  document.documentElement.style.setProperty('--text-gutter', t.textGutter);
  document.documentElement.style.setProperty('--line-highlight', t.lineHighlight);
  document.documentElement.style.setProperty('--bg-selection', t.bgSelection);
  document.documentElement.style.setProperty('--border-color', t.gutterBorder);
  document.documentElement.style.setProperty('--bg-statusbar', t.statusbar);
  _renderEditor();
}
