/**
 * UI helpers, toast notifications, progress bar, menu management, and status bar
 */

import { state } from './state.js';

export const elements = {
  get fileInput() { return document.getElementById('fileInput'); },
  get editorWrapper() { return document.getElementById('editorWrapper'); },
  get editorPanel() { return document.getElementById('editorPanel'); },
  get welcomeScreen() { return document.getElementById('welcomeScreen'); },
  get dropZone() { return document.getElementById('dropZone'); },
  get searchWidget() { return document.getElementById('searchWidget'); },
  get searchInput() { return document.getElementById('searchInput'); },
  get searchBadge() { return document.getElementById('searchBadge'); },
  get selectionBar() { return document.getElementById('selectionBar'); },
  get selCountEl() { return document.getElementById('selCount'); },
  get selRangeEl() { return document.getElementById('selRange'); },
  get ssSelectionBtn() { return document.getElementById('ssSelectionBtn'); },
  get toastEl() { return document.getElementById('toast'); },
  get progressOverlay() { return document.getElementById('progressOverlay'); },
  get progressText() { return document.getElementById('progressText'); },
  get screenshotModal() { return document.getElementById('screenshotModal'); },
  get hidePanelBtn() { return document.getElementById('hidePanelBtn'); }
};

export function showToast(msg) {
  const toastEl = elements.toastEl;
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('visible');
  setTimeout(() => toastEl.classList.remove('visible'), 3200);
}

export function showProgress(msg) {
  const progressText = elements.progressText;
  const progressOverlay = elements.progressOverlay;
  if (progressText) progressText.textContent = msg;
  if (progressOverlay) progressOverlay.classList.add('visible');
}

export function hideProgress() {
  const progressOverlay = elements.progressOverlay;
  if (progressOverlay) progressOverlay.classList.remove('visible');
}

export function toggleMenu(el) {
  const wasActive = el.classList.contains('active');
  closeAllMenus();
  if (!wasActive) el.classList.add('active');
}

export function closeAllMenus() {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
}

export function updateStatus() {
  const tab = state.tabs[state.activeTab];
  const linesEl = document.getElementById('statusLines');
  const hiddenEl = document.getElementById('statusHidden');
  const modeEl = document.getElementById('statusMode');
  const selEl = document.getElementById('statusSelected');

  if (tab) {
    if (linesEl) linesEl.textContent = `Lines: ${tab.lines.length}`;
    const hiddenCount = tab.hiddenRanges ? tab.hiddenRanges.reduce((sum, r) => sum + (r.to - r.from + 1), 0) : 0;
    if (hiddenEl) hiddenEl.textContent = `Hidden: ${hiddenCount}`;
    if (modeEl) modeEl.textContent = tab.name;
    if (selEl) selEl.textContent = `Selected: ${state.selectedLines.size}`;
  } else {
    if (linesEl) linesEl.textContent = 'Lines: 0';
    if (hiddenEl) hiddenEl.textContent = 'Hidden: 0';
    if (modeEl) modeEl.textContent = 'Ready';
    if (selEl) selEl.textContent = 'Selected: 0';
  }
}
