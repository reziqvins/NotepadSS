/**
 * File Loading, Drag and Drop, and Tab Management
 */

import { state } from './state.js';
import { elements, showToast, updateStatus, closeAllMenus } from './ui.js';
import { renderEditor, updateSelectionBar } from './editor.js';
import { clearSearch } from './search.js';

export function setupFileOpen() {
  const fileInput = elements.fileInput;
  if (!fileInput) return;
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(loadFile);
    }
    e.target.value = '';
  });
}

export function openFile() {
  const fileInput = elements.fileInput;
  if (fileInput) fileInput.click();
  closeAllMenus();
}

export function loadFile(file) {
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
      if (elements.welcomeScreen) elements.welcomeScreen.style.display = 'none';
      if (elements.editorPanel) elements.editorPanel.style.display = 'flex';
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

export function setupDragAndDrop() {
  const dropZone = elements.dropZone;
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dropZone) dropZone.classList.add('visible');
  });
  window.addEventListener('dragleave', (e) => {
    if (e.clientX <= 0 || e.clientY <= 0) {
      if (dropZone) dropZone.classList.remove('visible');
    }
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dropZone) dropZone.classList.remove('visible');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(loadFile);
    }
  });
}

export function renderTabs() {
  const tabbar = document.getElementById('tabbar');
  if (!tabbar) return;
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

export function switchTab(index) {
  const editorWrapper = elements.editorWrapper;
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

export function closeTab(index) {
  state.tabs.splice(index, 1);
  if (state.tabs.length === 0) {
    state.activeTab = -1;
    if (elements.welcomeScreen) elements.welcomeScreen.style.display = 'flex';
    if (elements.editorPanel) elements.editorPanel.style.display = 'none';
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

export function closeCurrentTab() {
  if (state.activeTab >= 0) closeTab(state.activeTab);
  closeAllMenus();
}
