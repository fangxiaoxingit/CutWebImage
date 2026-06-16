/**
 * NewsToCard - 历史记录页面逻辑
 */

(function () {
  'use strict';

  // DOM 引用
  const grid = document.getElementById('grid');
  const emptyState = document.getElementById('emptyState');
  const loading = document.getElementById('loading');
  const countBadge = document.getElementById('countBadge');
  const btnSelectAll = document.getElementById('btnSelectAll');
  const btnDeselectAll = document.getElementById('btnDeselectAll');
  const btnDeleteSelected = document.getElementById('btnDeleteSelected');
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

  // ========== 加载数据 ==========

  async function loadSnapshots() {
    showLoading(true);
    try {
      snapshots = await getAllSnapshots();
      selectedIds.clear();
      render();
    } catch (err) {
      console.error('加载历史记录失败:', err);
      showToast('加载失败: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  // ========== 渲染 ==========

  function render() {
    // 释放旧的 object URLs
    revokeObjectUrls();

    if (snapshots.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = '';
      countBadge.textContent = '0';
      updateToolbar();
      return;
    }

    emptyState.style.display = 'none';
    grid.style.display = '';
    countBadge.textContent = snapshots.length;

    grid.innerHTML = '';
    snapshots.forEach((item, index) => {
      const card = createCardElement(item, index + 1);
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

    const time = formatTime(item.timestamp);
    const urlShort = truncateUrl(item.url);

    card.innerHTML = `
      <div class="card-checkbox" data-action="select"></div>
      <div class="card-index">#${displayIndex}</div>
      <div class="card-image">
        <img src="${imgUrl}" alt="截图 #${item.id}" loading="lazy">
      </div>
      <div class="card-info">
        <div class="card-meta">
          <span class="card-size">${item.width} × ${item.height}</span>
          <span class="card-time">${time}</span>
        </div>
        <a class="card-url" href="${escapeHtml(item.url)}" target="_blank" data-action="url" title="${escapeHtml(item.url)}">${escapeHtml(urlShort)}</a>
        ${item.title ? `<div class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>` : ''}
      </div>
    `;

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
    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (card) {
      card.classList.toggle('selected', selectedIds.has(id));
    }
  }

  function updateToolbar() {
    const hasSelection = selectedIds.size > 0;
    btnDeleteSelected.disabled = !hasSelection;
    if (hasSelection) {
      btnDeleteSelected.querySelector('svg').nextSibling.textContent =
        ` 清除已选(${selectedIds.size})`;
    } else {
      btnDeleteSelected.querySelector('svg').nextSibling.textContent = ' 清除已选';
    }
  }

  // ========== 删除 ==========

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`确定删除 ${count} 条记录吗？`)) return;

    try {
      await deleteSnapshots([...selectedIds]);
      showToast(`已删除 ${count} 条记录`, 'success');
      await loadSnapshots();
    } catch (err) {
      showToast('删除失败: ' + err.message, 'error');
    }
  }

  // ========== 预览弹窗 ==========

  function openPreview(item) {
    currentPreview = item;
    const imgUrl = URL.createObjectURL(item.blob);
    modalImg.src = imgUrl;
    modalInfo.textContent = `${item.width} × ${item.height} · ${formatTime(item.timestamp)}`;
    previewModal.classList.add('active');
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
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': currentPreview.blob })
      ]);
      showToast('已复制到剪贴板', 'success');
    } catch (err) {
      showToast('复制失败: ' + err.message, 'error');
    }
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
    a.download = `newstocard_${currentPreview.id}_${Date.now()}.png`;
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
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `昨天 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function pad(n) {
    return n.toString().padStart(2, '0');
  }

  function truncateUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname.length > 20 ? u.pathname.slice(0, 20) + '...' : u.pathname);
    } catch {
      return url.length > 40 ? url.slice(0, 40) + '...' : url;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = 'toast-msg' + (type ? ' ' + type : '');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), type === 'error' ? 4000 : 2000);
  }

  // ========== 事件绑定 ==========

  btnSelectAll.addEventListener('click', selectAll);
  btnDeselectAll.addEventListener('click', deselectAll);
  btnDeleteSelected.addEventListener('click', deleteSelected);
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
  loadSnapshots();

})();
