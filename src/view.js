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

  const root = document.documentElement;
  root.style.setProperty('--bg-editor', t.bgEditor);
  root.style.setProperty('--bg-gutter', t.bgGutter);
  root.style.setProperty('--text-primary', t.textPrimary);
  root.style.setProperty('--text-gutter', t.textGutter);
  root.style.setProperty('--line-highlight', t.lineHighlight);
  root.style.setProperty('--bg-selection', t.bgSelection);
  root.style.setProperty('--border-color', t.gutterBorder);
  root.style.setProperty('--bg-statusbar', t.statusbar);
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--accent-hover', t.accent);

  // Derive surrounding UI colors from theme
  const isDark = themeName !== 'light';
  const menubarBg = isDark ? shadeColor(t.bgGutter, -10) : '#f0f0f0';
  const toolbarBg = isDark ? shadeColor(t.bgGutter, -5) : '#e8e8e8';
  const secondaryBg = isDark ? shadeColor(t.bgEditor, 10) : '#fafafa';
  const tertiaryBg  = isDark ? shadeColor(t.bgEditor, 20) : '#efefef';
  const tabInactive = isDark ? shadeColor(t.bgEditor, 15) : '#d8d8d8';
  const textMenu    = isDark ? '#cccccc' : '#333333';
  const textSecondary = isDark ? '#969696' : '#777777';
  const hoverBg     = isDark ? shadeColor(t.bgGutter, 15) : '#d9d9d9';

  root.style.setProperty('--bg-primary', t.bgEditor);
  root.style.setProperty('--bg-secondary', secondaryBg);
  root.style.setProperty('--bg-tertiary', tertiaryBg);
  root.style.setProperty('--bg-menubar', menubarBg);
  root.style.setProperty('--bg-toolbar', toolbarBg);
  root.style.setProperty('--bg-tab-active', t.bgEditor);
  root.style.setProperty('--bg-tab-inactive', tabInactive);
  root.style.setProperty('--bg-hover', hoverBg);
  root.style.setProperty('--text-menu', textMenu);
  root.style.setProperty('--text-secondary', textSecondary);
  root.style.setProperty('--scrollbar-track', t.bgEditor);
  root.style.setProperty('--minimap-bg', t.bgEditor);
  root.style.setProperty('--text-active-line', isDark ? '#ffffff' : '#000000');
  root.style.setProperty('--text-statusbar', '#ffffff');

  _renderEditor();
  closeAllMenus();
}

/** Lighten/darken a hex color by amount (-255..255) */
function shadeColor(hex, amount) {
  if (!hex || hex === 'transparent') return hex;
  let col = hex.replace('#', '');
  if (col.length === 3) col = col[0]+col[0]+col[1]+col[1]+col[2]+col[2];
  const num = parseInt(col, 16);
  let r = Math.min(255, Math.max(0, (num >> 16) + amount));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  let b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
