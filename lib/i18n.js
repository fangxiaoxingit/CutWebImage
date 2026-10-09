/** Shared translations and local language preferences for extension UI. */
(function () {
  'use strict';
  if (globalThis.CutWebImageI18n) return;

  // Each entry is [Simplified Chinese, English]. Keep UI messages bundled so
  // content scripts need no network requests or web-accessible resources.
  const messages = {
    languageLabel: ['语言', 'Language'],
    languageAuto: ['跟随浏览器', 'Follow browser'],
    languageChinese: ['中文（简体）', '中文（简体）'],
    languageEnglish: ['English', 'English'],
    languageSaveFailed: ['语言设置保存失败，请重试。', 'Could not save the language. Please try again.'],
    commonCancel: ['取消', 'Cancel'],
    commonConfirm: ['确定', 'Confirm'],
    commonDownload: ['下载', 'Download'],
    popupHistory: ['历史记录', 'History'],
    popupShortcutSettings: ['快捷键设置', 'Keyboard shortcut'],
    popupEnableShortcut: ['启用快捷键', 'Enable keyboard shortcut'],
    popupModify: ['修改', 'Edit'],
    popupShowBall: ['显示悬浮球', 'Show floating button'],
    popupInstructions: ['使用说明', 'How to capture'],
    popupStep1Before: ['点击页面右上角的', 'Click the '],
    popupStep1Strong: ['绿色浮球', 'green floating button'],
    popupStep1After: ['', ' at the top right of the page.'],
    popupStep2Before: ['按住鼠标', 'Click and '],
    popupStep2Strong: ['拖拽框选', 'drag'],
    popupStep2After: ['需要截图的区域', ' to select the area to capture.'],
    popupStep3Before: ['松开鼠标，截图自动', 'Release the mouse to automatically '],
    popupStep3Strong: ['复制到剪贴板', 'copy to the clipboard'],
    popupStep3After: ['', '.'],
    popupMoveBallTip: ['拖拽浮球可移动位置', 'Drag the floating button to move it.'],
    popupCancelTip: ['按 Esc 取消截图', 'Press Esc to cancel the capture.'],
    popupShortcutPrompt: ['输入一个字母作为快捷键', 'Enter a letter for the shortcut'],
    popupShortcutFormat: ['快捷键格式：Ctrl+Shift+', 'Shortcut: Ctrl+Shift+'],
    historyTitle: ['CutWebImage - 历史记录', 'CutWebImage - History'],
    historySelectAll: ['全选', 'Select all'],
    historyDeselectAll: ['取消全选', 'Deselect all'],
    historyExportSelected: ['导出已选', 'Export selected'],
    historyExportSelectedCount: ['导出已选({count})', 'Export selected ({count})'],
    historyDeleteSelected: ['清除已选', 'Delete selected'],
    historyDeleteSelectedCount: ['清除已选({count})', 'Delete selected ({count})'],
    historyRefresh: ['刷新', 'Refresh'],
    historyRefreshTitle: ['刷新列表', 'Refresh list'],
    historyEmptyTitle: ['暂无截图记录', 'No screenshots yet'],
    historyEmptyHelp: ['点击页面右上角的浮球开始截图', 'Click the floating button at the top right of a page to capture a screenshot.'],
    historyLoading: ['加载中...', 'Loading...'],
    historyClosePreview: ['关闭预览', 'Close preview'],
    historyPreview: ['截图预览', 'Screenshot preview'],
    historyCopyImage: ['复制图片', 'Copy image'],
    historyOpenUrl: ['打开原网址', 'Open original page'],
    historyOpenUrlTitle: ['打开原网址：{url}', 'Open original page: {url}'],
    historySnapshotAlt: ['截图 #{id}', 'Screenshot #{id}'],
    historySelectSnapshot: ['选择截图 #{id}', 'Select screenshot #{id}'],
    historyUntitled: ['无标题', 'Untitled'],
    historyRecordsCount: ['{count} 条截图记录', 'Screenshots: {count}'],
    historyDeleteConfirm: ['确定删除 {count} 条记录吗？', 'Delete selected records ({count})?'],
    historyDeleted: ['已删除 {count} 条记录', 'Deleted records: {count}'],
    historyLoadFailed: ['加载失败：{error}', 'Failed to load history: {error}'],
    historyDeleteFailed: ['删除失败：{error}', 'Failed to delete: {error}'],
    historyPacking: ['正在打包 {count} 张截图...', 'Packing screenshots ({count})...'],
    historyExported: ['已导出 {count} 张截图', 'Screenshots exported: {count}'],
    historyExportFailed: ['导出失败：{error}', 'Failed to export: {error}'],
    historyCopied: ['已复制到剪贴板', 'Copied to clipboard'],
    historyCopyFailed: ['复制失败：{error}', 'Failed to copy: {error}'],
    historyPngConversionFailed: ['PNG 转换失败', 'PNG conversion failed'],
    historyUnknownError: ['未知错误', 'Unknown error'],
    historyTodayTime: ['今天 {time}', 'Today {time}'],
    historyYesterdayTime: ['昨天 {time}', 'Yesterday {time}'],
    captureStart: ['开始截图', 'Capture screenshot'],
    captureLoading: ['正在截图...', 'Capturing screenshot...'],
    captureCopied: ['已复制到剪贴板', 'Copied to clipboard'],
    captureFailed: ['截图失败：{error}', 'Screenshot failed: {error}'],
    captureUnavailable: ['无法截取当前页面', 'Could not capture this page'],
    capturePngFailed: ['PNG 转换失败', 'PNG conversion failed'],
    captureImageFailed: ['截图图片加载失败', 'Could not load the screenshot image'],
    captureUnknownError: ['未知错误', 'Unknown error']
  };

  let preference = 'auto';
  let locale = browserLocale();
  let initialization;
  let preferenceRevision = 0;
  const listeners = new Set();

  function browserLocale() {
    const languages = globalThis.navigator?.languages || [];
    const candidates = [...languages, globalThis.navigator?.language];
    try { candidates.push(globalThis.chrome?.i18n?.getUILanguage()); } catch { /* use navigator */ }
    for (const language of candidates) {
      const base = String(language || '').toLowerCase().split(/[-_]/)[0];
      if (base === 'zh') return 'zh-CN';
      if (base === 'en') return 'en';
    }
    return 'en';
  }

  function normalizePreference(value) {
    return value === 'zh-CN' || value === 'en' ? value : 'auto';
  }

  function updatePreference(value) {
    const nextPreference = normalizePreference(value);
    const nextLocale = nextPreference === 'auto' ? browserLocale() : nextPreference;
    if (nextPreference === preference && nextLocale === locale) return;
    preference = nextPreference;
    locale = nextLocale;
    for (const listener of listeners) listener();
  }

  function init() {
    if (initialization) return initialization;
    initialization = (async () => {
      // Subscribe before reading to avoid losing a change from another page.
      try {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes.languagePreference) {
            preferenceRevision++;
            updatePreference(changes.languagePreference.newValue);
          }
        });
      } catch { /* browser defaults remain available if the extension was reloaded */ }
      globalThis.addEventListener?.('languagechange', () => {
        if (preference === 'auto') updatePreference('auto');
      });
      const revision = preferenceRevision;
      try {
        const settings = await chrome.storage.local.get('languagePreference');
        if (revision === preferenceRevision) updatePreference(settings.languagePreference);
      } catch { /* continue using the browser language */ }
    })();
    return initialization;
  }

  async function setPreference(value) {
    if (!['auto', 'zh-CN', 'en'].includes(value)) throw new Error('Unsupported language preference');
    await init();
    await chrome.storage.local.set({ languagePreference: value });
    updatePreference(value);
  }

  function t(key, params = {}) {
    const message = messages[key]?.[locale === 'zh-CN' ? 0 : 1] ?? key;
    return message.replace(/\{(\w+)\}/g, (placeholder, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder);
  }

  function localize(root = document) {
    if (root === document) document.documentElement.lang = locale;
    for (const element of root.querySelectorAll('[data-i18n]')) {
      element.textContent = t(element.dataset.i18n);
    }
    for (const attribute of ['title', 'aria-label', 'placeholder']) {
      const selector = `data-i18n-${attribute}`;
      for (const element of root.querySelectorAll(`[${selector}]`)) {
        element.setAttribute(attribute, t(element.getAttribute(selector)));
      }
    }
  }

  globalThis.CutWebImageI18n = {
    init, t, localize, setPreference,
    getLocale: () => locale,
    getPreference: () => preference,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
})();
