/**
 * Windows 11 Snipping Tool Modal & Canvas Drawing Engine
 */

import { state, snipState, FLUENT_COLORS, EMOJI_LIST, hexToRgba } from './state.js';
import { showToast } from './ui.js';
import { getHiddenLinesSet } from './hideLines.js';
import { copyScreenshot, doCapture } from './capture.js';

export function initFluentColorGrids() {
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

export function openSnippingToolDirectly() {
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

export function openSnippingModal(sourceCanvas, filename) {
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

export function closeSnippingModal() {
  const modal = document.getElementById('snippingModal');
  if (modal) modal.classList.remove('visible');
  closeAllSnipPopups();
}

export function selectSnipTool(toolName) {
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

export function toggleSnipPopup(popupId) {
  const el = document.getElementById(popupId);
  if (!el) return;
  const isVis = el.classList.contains('visible');
  closeAllSnipPopups();
  if (!isVis) {
    el.classList.add('visible');
  }
}

export function closeAllSnipPopups() {
  document.querySelectorAll('.snip-popup, .snip-fluent-popup').forEach(p => p.classList.remove('visible'));
}

export function setPenColor(color, swatchEl) {
  snipState.penColor = color;
  if (swatchEl) {
    const palette = swatchEl.closest('.snip-palette');
    if (palette) {
      palette.querySelectorAll('.snip-color-swatch').forEach(s => s.classList.remove('active'));
    }
    swatchEl.classList.add('active');
  }
  selectSnipTool('pen');
}

export function setPenSize(val) {
  snipState.penSize = parseInt(val, 10) || 3;
  const label = document.getElementById('penSizeVal');
  if (label) label.textContent = `${snipState.penSize}px`;
}

export function setHighlighterColor(color, swatchEl) {
  snipState.hlColor = color;
  if (swatchEl) {
    const palette = swatchEl.closest('.snip-palette');
    if (palette) {
      palette.querySelectorAll('.snip-color-swatch').forEach(s => s.classList.remove('active'));
    }
    swatchEl.classList.add('active');
  }
  selectSnipTool('highlighter');
}

export function setHlSize(val) {
  snipState.hlSize = parseInt(val, 10) || 18;
  const label = document.getElementById('hlSizeVal');
  if (label) label.textContent = `${snipState.hlSize}px`;
}

export function setShapeType(type, btnEl) {
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

export function setFillColor(color, swatchEl) {
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
    const grid = swatchEl.closest('.snip-fluent-grid');
    if (grid) {
      grid.querySelectorAll('.snip-fluent-swatch').forEach(s => s.classList.remove('active'));
    }
    swatchEl.classList.add('active');
  }

  selectSnipTool('shape');
}

export function setFillOpacity(val) {
  snipState.fillOpacity = parseInt(val, 10) || 0;
  const label = document.getElementById('fillOpacityVal');
  if (label) label.textContent = `${snipState.fillOpacity}%`;
}

export function setOutlineColor(color, swatchEl) {
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
    const grid = swatchEl.closest('.snip-fluent-grid');
    if (grid) {
      grid.querySelectorAll('.snip-fluent-swatch').forEach(s => s.classList.remove('active'));
    }
    swatchEl.classList.add('active');
  }

  selectSnipTool('shape');
}

export function setOutlineOpacity(val) {
  snipState.outlineOpacity = parseInt(val, 10) || 0;
  const label = document.getElementById('outlineOpacityVal');
  if (label) label.textContent = `${snipState.outlineOpacity}%`;
}

export function selectEmoji(emoji) {
  snipState.selectedEmoji = emoji;
  selectSnipTool('emoji');
  closeAllSnipPopups();
  showToast(`Stiker ${emoji} dipilih! Klik pada gambar untuk menempelkan.`);
}

export function getSnipCanvasCoords(e) {
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

export function setupSnippingEvents() {
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

export function drawLiveShape(ctx, x1, y1, x2, y2, type) {
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

export function drawSnipArrow(ctx, fromX, fromY, toX, toY, color, width) {
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

export function pushSnipHistory() {
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

export function snipUndo() {
  if (snipState.historyIndex > 0) {
    snipState.historyIndex--;
    const drawCanvas = document.getElementById('snipDrawCanvas');
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    ctx.putImageData(snipState.history[snipState.historyIndex], 0, 0);
    updateSnipHistoryButtons();
  }
}

export function snipRedo() {
  if (snipState.historyIndex < snipState.history.length - 1) {
    snipState.historyIndex++;
    const drawCanvas = document.getElementById('snipDrawCanvas');
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    ctx.putImageData(snipState.history[snipState.historyIndex], 0, 0);
    updateSnipHistoryButtons();
  }
}

export function updateSnipHistoryButtons() {
  const undoBtn = document.getElementById('snipUndoBtn');
  const redoBtn = document.getElementById('snipRedoBtn');
  if (undoBtn) {
    undoBtn.disabled = snipState.historyIndex <= 0;
  }
  if (redoBtn) {
    redoBtn.disabled = snipState.historyIndex >= snipState.history.length - 1;
  }
}

export function snipZoomIn() {
  snipState.zoom = Math.min(300, snipState.zoom + 15);
  applySnipZoom();
}

export function snipZoomOut() {
  snipState.zoom = Math.max(20, snipState.zoom - 15);
  applySnipZoom();
}

export function snipFitScreen() {
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

export function snipResetView() {
  snipState.zoom = 100;
  applySnipZoom();
}

export function applySnipZoom() {
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

export function getMergedSnipCanvas() {
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

export async function snipCopyImage() {
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

export function snipSaveImage() {
  const merged = getMergedSnipCanvas();
  if (!merged) return;

  const link = document.createElement('a');
  link.download = `${snipState.filename}_snip_${Date.now()}.png`;
  link.href = merged.toDataURL('image/png');
  link.click();
  showToast('💾 Gambar screenshot berhasil disimpan!');
}

export function snipEditInPaint() {
  snipSaveImage();
  showToast('🎨 Gambar diunduh! Anda dapat langsung membukanya di MS Paint.');
}

export async function snipShareImage() {
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

export function snipCopyText() {
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
