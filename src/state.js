/**
 * State and Theme definitions for TextShot
 */

export const state = {
  tabs: [],
  activeTab: -1,
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  wordWrap: false,
  zoom: 100,
  showMinimap: false,
  selectedLines: new Set(),
  lastSelectedLine: null,
  theme: 'dark',
  screenshotScope: 'full', // 'full' | 'selection' | 'range'
  // Search state
  searchQuery: '',
  searchMatches: [], // array of { lineIndex, charIndex, length }
  currentMatchIndex: -1,
  matchCase: false
};

export const themes = {
  dark: {
    bgEditor: '#1e1e1e', bgGutter: '#252526', textPrimary: '#d4d4d4',
    textGutter: '#858585', lineHighlight: '#2a2d2e', bgSelection: 'rgba(38, 79, 120, 0.45)',
    gutterBorder: '#3e3e42', accent: '#007acc', statusbar: '#007acc'
  },
  monokai: {
    bgEditor: '#272822', bgGutter: '#2f302b', textPrimary: '#f8f8f2',
    textGutter: '#75715e', lineHighlight: '#3e3d32', bgSelection: 'rgba(73, 72, 62, 0.7)',
    gutterBorder: '#3b3a32', accent: '#a6e22e', statusbar: '#75715e'
  },
  dracula: {
    bgEditor: '#282a36', bgGutter: '#2d2f3d', textPrimary: '#f8f8f2',
    textGutter: '#6272a4', lineHighlight: '#44475a', bgSelection: 'rgba(68, 71, 90, 0.7)',
    gutterBorder: '#44475a', accent: '#bd93f9', statusbar: '#6272a4'
  },
  light: {
    bgEditor: '#ffffff', bgGutter: '#f3f3f3', textPrimary: '#333333',
    textGutter: '#999999', lineHighlight: '#f5f5f5', bgSelection: '#add6ff',
    gutterBorder: '#e0e0e0', accent: '#0066cc', statusbar: '#0066cc'
  },
  solarized: {
    bgEditor: '#002b36', bgGutter: '#073642', textPrimary: '#839496',
    textGutter: '#586e75', lineHighlight: '#073642', bgSelection: 'rgba(7, 54, 66, 0.8)',
    gutterBorder: '#586e75', accent: '#268bd2', statusbar: '#073642'
  }
};

export const snipState = {
  activeTool: 'pen', // 'pen', 'highlighter', 'eraser', 'shape', 'emoji'
  penColor: '#e74c3c',
  penSize: 3,
  hlColor: '#f1c40f',
  hlSize: 18,
  shapeType: 'rect', // 'rect', 'arrow', 'circle', 'line'
  fillColor: '#0078d4', // Default Windows Blue Fill
  fillOpacity: 100,
  outlineColor: 'none', // Default No Outline (⊘) as in screenshot
  outlineOpacity: 100,
  outlineWidth: 3,
  selectedEmoji: '⭐',
  zoom: 100,
  history: [],
  historyIndex: -1,
  filename: '',
  isDrawing: false,
  startX: 0,
  startY: 0,
  snapshot: null
};

// 30 Windows 11 Fluent Colors
export const FLUENT_COLORS = [
  'none',    '#000000', '#ffffff', '#c7c7c7', '#8a8a8a', '#616161',
  '#c0005a', '#e81123', '#ea6100', '#ff8c00', '#ffb900', '#fff100',
  '#bad80a', '#107c10', '#008272', '#00bcf2', '#0078d4', '#4f4bdd',
  '#744da9', '#492576', '#ffd8a8', '#c49c74', '#8e562e', '#4a2c11',
  '#ff68b6', '#ffb8b8', '#fff6a5', '#7fe9ad', '#92d9f8', '#b6b0fc'
];

export const EMOJI_LIST = [
  '⭐', '⚠️', '❌', '✅', '💡',
  '❓', '🎯', '🚀', '❤️', '👍',
  '👀', '🔥', '📌', '💯', '🚩',
  '💬', '⚡', '📝', '🔍', '🔒'
];

export function hexToRgba(hex, alpha) {
  if (!hex || hex === 'none') return 'transparent';
  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
