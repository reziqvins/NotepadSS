/**
 * HD Canvas Capture Engine (Notepad++ Light Theme), Modals, and Capture Actions
 */

import { state } from './state.js';
import { elements, showToast, showProgress, hideProgress, closeAllMenus } from './ui.js';
import { getHiddenLinesSet } from './hideLines.js';
import { clearSelection } from './editor.js';
import { openSnippingModal } from './snippingTool.js';

export function showScreenshotModal() {
  if (state.activeTab < 0) {
    showToast('Buka file terlebih dahulu');
    return;
  }
  const tab = state.tabs[state.activeTab];
  const scopeSelection = document.getElementById('scopeSelection');
  const scopeSelDesc = document.getElementById('scopeSelDesc');

  if (state.selectedLines.size > 0) {
    if (scopeSelection) scopeSelection.classList.remove('disabled');
    if (scopeSelDesc) scopeSelDesc.textContent = `${state.selectedLines.size} baris terpilih`;
  } else {
    if (scopeSelection) scopeSelection.classList.add('disabled');
    if (scopeSelDesc) scopeSelDesc.textContent = 'Pilih baris dahulu';
    if (state.screenshotScope === 'selection') setScope('full');
  }

  const rangeToInput = document.getElementById('ssRangeTo');
  const tabTitleInput = document.getElementById('ssTabTitle');
  if (rangeToInput) rangeToInput.value = tab.lines.length;
  if (tabTitleInput) tabTitleInput.value = tab.fullPath || tab.name;

  const modal = elements.screenshotModal;
  if (modal) modal.classList.add('visible');
  closeAllMenus();
}

export function closeScreenshotModal() {
  const modal = elements.screenshotModal;
  if (modal) modal.classList.remove('visible');
}

export function setScope(scope) {
  if (scope === 'selection' && state.selectedLines.size === 0) {
    showToast('Pilih baris terlebih dahulu dengan mengklik nomor baris');
    return;
  }
  state.screenshotScope = scope;
  document.querySelectorAll('.scope-option').forEach(el => {
    el.classList.remove('active', 'active-sel');
  });

  const scopeFull = document.getElementById('scopeFull');
  const scopeSelection = document.getElementById('scopeSelection');
  const scopeRange = document.getElementById('scopeRange');

  if (scope === 'full' && scopeFull) scopeFull.classList.add('active');
  else if (scope === 'selection' && scopeSelection) scopeSelection.classList.add('active-sel');
  else if (scope === 'range' && scopeRange) scopeRange.classList.add('active');

  const rangeInput = document.getElementById('rangeInput');
  if (rangeInput) rangeInput.style.display = scope === 'range' ? 'block' : 'none';

  if (scope === 'range' && state.activeTab >= 0) {
    const rangeToInput = document.getElementById('ssRangeTo');
    if (rangeToInput) rangeToInput.value = state.tabs[state.activeTab].lines.length;
  }
}

export function quickScreenshot(scope) {
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

export function copyScreenshot(scope) {
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

export function captureScreenshot() {
  const scope = state.screenshotScope;

  if (scope === 'selection' && state.selectedLines.size === 0) {
    showToast('⚠️ Belum ada baris yang dipilih!');
    return;
  }

  const tab = state.tabs[state.activeTab];
  closeScreenshotModal();
  const formatEl = document.getElementById('ssFormat');
  const scaleEl = document.getElementById('ssScale');
  const paddingEl = document.getElementById('ssPadding');
  const lineNumbersEl = document.getElementById('ssLineNumbers');
  const widthModeEl = document.getElementById('ssWidthMode');
  const includeHeaderEl = document.getElementById('ssIncludeHeader');
  const tabTitleEl = document.getElementById('ssTabTitle');
  const rangeFromEl = document.getElementById('ssRangeFrom');
  const rangeToEl = document.getElementById('ssRangeTo');

  const options = {
    scope: scope,
    format: formatEl ? formatEl.value : 'png',
    scale: scaleEl ? parseInt(scaleEl.value, 10) : 2,
    padding: paddingEl ? (parseInt(paddingEl.value, 10) || 24) : 24,
    lineNumbers: lineNumbersEl ? lineNumbersEl.checked : true,
    widthMode: widthModeEl ? widthModeEl.value : 'full',
    includeHeader: includeHeaderEl ? includeHeaderEl.checked : true,
    tabTitle: tabTitleEl && tabTitleEl.value.trim() ? tabTitleEl.value.trim() : tab.name,
    rangeFrom: rangeFromEl ? (parseInt(rangeFromEl.value, 10) || 1) : 1,
    rangeTo: rangeToEl ? (parseInt(rangeToEl.value, 10) || 1) : 1
  };
  doCapture(options);
}

export function captureScreenshotAndCopy() {
  const scope = state.screenshotScope;

  if (scope === 'selection' && state.selectedLines.size === 0) {
    showToast('⚠️ Belum ada baris yang dipilih!');
    return;
  }

  const tab = state.tabs[state.activeTab];
  closeScreenshotModal();
  const formatEl = document.getElementById('ssFormat');
  const scaleEl = document.getElementById('ssScale');
  const paddingEl = document.getElementById('ssPadding');
  const lineNumbersEl = document.getElementById('ssLineNumbers');
  const widthModeEl = document.getElementById('ssWidthMode');
  const includeHeaderEl = document.getElementById('ssIncludeHeader');
  const tabTitleEl = document.getElementById('ssTabTitle');
  const rangeFromEl = document.getElementById('ssRangeFrom');
  const rangeToEl = document.getElementById('ssRangeTo');

  const options = {
    scope: scope,
    format: formatEl ? formatEl.value : 'png',
    scale: scaleEl ? parseFloat(scaleEl.value) : 2,
    padding: paddingEl ? (parseInt(paddingEl.value, 10) || 24) : 24,
    lineNumbers: lineNumbersEl ? lineNumbersEl.checked : true,
    widthMode: widthModeEl ? widthModeEl.value : 'full',
    includeHeader: includeHeaderEl ? includeHeaderEl.checked : true,
    tabTitle: tabTitleEl && tabTitleEl.value ? tabTitleEl.value : (tab ? (tab.fullPath || tab.name) : 'Untitled'),
    rangeFrom: rangeFromEl ? (parseInt(rangeFromEl.value, 10) || 1) : 1,
    rangeTo: rangeToEl ? (parseInt(rangeToEl.value, 10) || (tab ? tab.lines.length : 1)) : 1,
    action: 'copy'
  };

  doCapture(options);
}

export function doCapture(options) {
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
          if (elements.editorPanel) elements.editorPanel.style.display = 'flex';
          if (elements.welcomeScreen) elements.welcomeScreen.style.display = 'none';

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
        if (elements.editorPanel) elements.editorPanel.style.display = 'flex';
        if (elements.welcomeScreen) elements.welcomeScreen.style.display = 'none';
      }

    } catch (err) {
      hideProgress();
      showToast('❌ Error render screenshot: ' + err.message);
      console.error(err);
    }
  }, 80);
}

export function wrapText(ctx, text, maxWidth) {
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
