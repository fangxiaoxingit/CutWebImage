/**
 * CutWebImage - 历史记录页面逻辑
 */

(function () {
  'use strict';

  const i18n = globalThis.CutWebImageI18n;
  const t = (key, params) => i18n.t(key, params);

  // DOM 引用
  const grid = document.getElementById('grid');
  const emptyState = document.getElementById('emptyState');
  const loading = document.getElementById('loading');
  const countBadge = document.getElementById('countBadge');
  const btnSelectAll = document.getElementById('btnSelectAll');
  const btnDeselectAll = document.getElementById('btnDeselectAll');
  const btnDeleteSelected = document.getElementById('btnDeleteSelected');
  const btnExportSelected = document.getElementById('btnExportSelected');
  const btnRefresh = document.getElementById('btnRefresh');
  const previewModal = document.getElementById('previewModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose = document.getElementById('modalClose');
  const modalImg = document.getElementById('modalImg');
  const modalInfo = document.getElementById('modalInfo');
  const btnCopyImage = document.getElementById('btnCopyImage');
  const btnOpenUrl = document.getElementById('btnOpenUrl');
  const btnDownload = document.getElementById('btnDownload');

  // 状态
  let snapshots = [];
  let selectedIds = new Set();
  let currentPreview = null; // 当前预览的记录
  let objectUrls = []; // 跟踪 object URL 以便释放
  const cardElements = new Map();
  const activeToasts = new Map();

  // ========== 加载数据 ==========

  async function loadSnapshots() {
    showLoading(true);
    try {
      snapshots = await getAllSnapshots();
      selectedIds.clear();
      render();
    } catch (err) {
      console.error('加载历史记录失败:', err);
      showToast('historyLoadFailed', { error: errorMessage(err) }, 'error');
    } finally {
      showLoading(false);
    }
  }

  // ========== 渲染 ==========

  function render() {
    // 释放旧的 object URLs
    revokeObjectUrls();
    grid.innerHTML = '';
    cardElements.clear();
    updateCountBadge();

    if (snapshots.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = '';
      updateToolbar();
      return;
    }

    emptyState.style.display = 'none';
    grid.style.display = '';
    snapshots.forEach((item, index) => {
      const card = createCardElement(item, index + 1);
      cardElements.set(item.id, { card, item });
      grid.appendChild(card);
    });

    updateToolbar();
  }

  function createCardElement(item, displayIndex) {
    const card = document.createElement('div');
    card.className = 'card' + (selectedIds.has(item.id) ? ' selected' : '');
    card.dataset.id = item.id;

    // 生成图片 URL
    const imgUrl = URL.createObjectURL(item.blob);
    objectUrls.push(imgUrl);

    card.innerHTML = `
      <div class="card-checkbox" data-action="select"></div>
      <div class="card-index">#${displayIndex}</div>
      <div class="card-image">
        <img src="${escapeHtml(imgUrl)}" alt="" loading="lazy">
      </div>
      <div class="card-info">
        <div class="card-info-left">
          <div class="card-title" title="${escapeHtml(item.title || '')}">${escapeHtml(item.title || '')}</div>
          <div class="card-size">${escapeHtml(item.width)} × ${escapeHtml(item.height)}</div>
          <div class="card-time"></div>
        </div>
        <div class="card-info-right">
          <a class="card-link-btn" href="${escapeHtml(item.url)}" target="_blank" data-action="url" title="${escapeHtml(item.url)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>
    `;
    localizeCard(card, item);

    // 点击事件
    card.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;

      if (action === 'select') {
        e.stopPropagation();
        toggleSelect(item.id);
      } else if (action === 'url') {
        // 链接默认行为
      } else {
        openPreview(item);
      }
    });

    return card;
  }

  function localizeCard(card, item) {
    const title = item.title || t('historyUntitled');
    const titleElement = card.querySelector('.card-title');
    titleElement.textContent = title;
    titleElement.title = title;
    card.querySelector('.card-time').textContent = formatTime(item.timestamp);
    card.querySelector('.card-image img').alt = t('historySnapshotAlt', { id: item.id });
    card.querySelector('.card-checkbox').setAttribute('aria-label', t('historySelectSnapshot', { id: item.id }));
    const link = card.querySelector('.card-link-btn');
    link.title = t('historyOpenUrlTitle', { url: item.url || '' });
    link.setAttribute('aria-label', t('historyOpenUrl'));
  }

  function updateCountBadge() {
    countBadge.textContent = new Intl.NumberFormat(i18n.getLocale()).format(snapshots.length);
    const label = t('historyRecordsCount', { count: snapshots.length });
    countBadge.title = label;
    countBadge.setAttribute('aria-label', label);
  }

  function localizeUI() {
    i18n.localize();
    cardElements.forEach(({ card, item }) => localizeCard(card, item));
    updateCountBadge();
    updateToolbar();
    updatePreviewInfo();
    activeToasts.forEach(({ key, params }, toast) => {
      toast.textContent = t(key, params);
    });
  }

  // ========== 选择操作 ==========

  function toggleSelect(id) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    updateCardSelection(id);
    updateToolbar();
  }

  function selectAll() {
    snapshots.forEach(item => selectedIds.add(item.id));
    document.querySelectorAll('.card').forEach(card => card.classList.add('selected'));
    updateToolbar();
  }

  function deselectAll() {
    selectedIds.clear();
    document.querySelectorAll('.card').forEach(card => card.classList.remove('selected'));
    updateToolbar();
  }

  function updateCardSelection(id) {
    const card = cardElements.get(id)?.card;
    if (card) {
      card.classList.toggle('selected', selectedIds.has(id));
    }
  }

  function updateToolbar() {
    const hasSelection = selectedIds.size > 0;
    btnDeleteSelected.disabled = !hasSelection;
    btnExportSelected.disabled = !hasSelection;
    btnDeleteSelected.querySelector('span').textContent = t(
      hasSelection ? 'historyDeleteSelectedCount' : 'historyDeleteSelected',
      { count: selectedIds.size }
    );
    btnExportSelected.querySelector('span').textContent = t(
      hasSelection ? 'historyExportSelectedCount' : 'historyExportSelected',
      { count: selectedIds.size }
    );
  }

  // ========== 删除 ==========

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(t('historyDeleteConfirm', { count }))) return;

    try {
      await deleteSnapshots([...selectedIds]);
      showToast('historyDeleted', { count }, 'success');
      await loadSnapshots();
    } catch (err) {
      showToast('historyDeleteFailed', { error: errorMessage(err) }, 'error');
    }
  }

  // ========== 批量导出 ==========

  async function exportSelected() {
    if (selectedIds.size === 0) return;

    const selectedItems = snapshots
      .filter(item => selectedIds.has(item.id))
      .sort((a, b) => a.timestamp - b.timestamp); // 按时间正序编号

    const count = selectedItems.length;
    showToast('historyPacking', { count });

    try {
      const zip = new JSZip();

      selectedItems.forEach((item, index) => {
        // 序号 + 页面标题作为文件名
        const seq = String(index + 1).padStart(3, '0');
        const name = sanitizeFilename(item.title || 'untitled');
        const filename = `${seq}_${name}_${item.width}x${item.height}.jpg`;
        zip.file(filename, item.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `CutWebImage_${dateStr}_${count}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      showToast('historyExported', { count }, 'success');
    } catch (err) {
      console.error('[CutWebImage] 导出失败:', err);
      showToast('historyExportFailed', { error: errorMessage(err) }, 'error');
    }
  }

  function sanitizeFilename(name) {
    // 移除文件名中不合法字符，截断长度
    return name
      .replace(/[\\/:*?"<>|\r\n\t]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 50) || 'untitled';
  }

  // ========== 预览弹窗 ==========

  function openPreview(item) {
    currentPreview = item;
    const imgUrl = URL.createObjectURL(item.blob);
    modalImg.src = imgUrl;
    updatePreviewInfo();
    previewModal.classList.add('active');
  }

  function updatePreviewInfo() {
    modalImg.alt = currentPreview
      ? t('historySnapshotAlt', { id: currentPreview.id })
      : t('historyPreview');
    if (!currentPreview) return;
    modalInfo.textContent = `${currentPreview.width} × ${currentPreview.height} · ${formatTime(currentPreview.timestamp)}`;
  }

  function closePreview() {
    previewModal.classList.remove('active');
    if (modalImg.src.startsWith('blob:')) {
      URL.revokeObjectURL(modalImg.src);
    }
    modalImg.src = '';
    currentPreview = null;
  }

  // ========== 预览操作 ==========

  async function copyCurrentImage() {
    if (!currentPreview) return;
    try {
      // 剪贴板仅支持 PNG，需转换
      const pngBlob = await convertToPng(currentPreview.blob);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);
      showToast('historyCopied', {}, 'success');
    } catch (err) {
      showToast('historyCopyFailed', { error: errorMessage(err) }, 'error');
    }
  }

  function convertToPng(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error(t('historyPngConversionFailed'))), 'image/png');
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  function openCurrentUrl() {
    if (!currentPreview || !currentPreview.url) return;
    chrome.tabs.create({ url: currentPreview.url });
  }

  function downloadCurrentImage() {
    if (!currentPreview) return;
    const url = URL.createObjectURL(currentPreview.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cutwebimage_${currentPreview.id}_${Date.now()}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ========== 工具函数 ==========

  function showLoading(show) {
    loading.classList.toggle('hidden', !show);
  }

  function revokeObjectUrls() {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
  }

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const locale = i18n.getLocale();
    const time = new Intl.DateTimeFormat(locale, {
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(d);
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return t('historyTodayTime', { time });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return t('historyYesterdayTime', { time });
    }

    return new Intl.DateTimeFormat(locale, {
      month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(d);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function errorMessage(err) {
    return err?.message || t('historyUnknownError');
  }

  function showToast(key, params = {}, type) {
    const toast = document.createElement('div');
    toast.className = 'toast-msg' + (type ? ' ' + type : '');
    toast.textContent = t(key, params);
    activeToasts.set(toast, { key, params });
    document.body.appendChild(toast);
    setTimeout(() => {
      activeToasts.delete(toast);
      toast.remove();
    }, type === 'error' ? 4000 : 2000);
  }

  // ========== 事件绑定 ==========

  btnSelectAll.addEventListener('click', selectAll);
  btnDeselectAll.addEventListener('click', deselectAll);
  btnDeleteSelected.addEventListener('click', deleteSelected);
  btnExportSelected.addEventListener('click', exportSelected);
  btnRefresh.addEventListener('click', loadSnapshots);
  modalBackdrop.addEventListener('click', closePreview);
  modalClose.addEventListener('click', closePreview);
  btnCopyImage.addEventListener('click', copyCurrentImage);
  btnOpenUrl.addEventListener('click', openCurrentUrl);
  btnDownload.addEventListener('click', downloadCurrentImage);

  // Esc 关闭预览
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && previewModal.classList.contains('active')) {
      closePreview();
    }
  });

  // ========== 初始化 ==========
  async function init() {
    await i18n.init();
    localizeUI();
    document.body.classList.remove('i18n-loading');
    i18n.onChange(localizeUI);
    await loadSnapshots();
  }

  init();

})();
