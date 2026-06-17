/**
 * CutWebImage - Popup 脚本
 * 处理历史记录入口和数量显示
 */

const DB_NAME = 'CutWebImageDB';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

// 历史记录按钮
document.getElementById('btnHistory').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('history/history.html') });
});

// 加载历史记录数量
async function loadHistoryCount() {
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
    });

    const count = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });

    document.getElementById('historyCount').textContent = count;
  } catch (err) {
    document.getElementById('historyCount').textContent = '0';
  }
}

loadHistoryCount();

// ========== 快捷键设置 ==========

const shortcutToggle = document.getElementById('shortcutToggle');
const shortcutKeyEl = document.getElementById('shortcutKey');
const btnModify = document.getElementById('btnModifyShortcut');
const modifyModal = document.getElementById('modifyModal');
const modalInput = document.getElementById('modalInput');
const modalPreview = document.getElementById('modalPreview');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');

// 悬浮球显示设置
const ballToggle = document.getElementById('ballToggle');
const ballSettingRow = document.getElementById('ballSettingRow');

// 更新悬浮球设置行的可见性
function updateBallSettingVisibility(shortcutEnabled) {
  if (shortcutEnabled) {
    ballSettingRow.style.display = 'flex';
  } else {
    ballSettingRow.style.display = 'none';
    // 快捷键关闭时，强制悬浮球为开启状态
    chrome.storage.local.set({ floatBallVisible: true });
    ballToggle.checked = true;
  }
}

// 加载快捷键设置
async function loadShortcutSettings() {
  chrome.storage.local.get(['shortcutEnabled', 'shortcutKey', 'floatBallVisible'], (result) => {
    const enabled = result.shortcutEnabled === true;
    const key = (result.shortcutKey || 'C').toUpperCase();
    const ballVisible = result.floatBallVisible !== false; // 默认 true
    shortcutToggle.checked = enabled;
    shortcutKeyEl.textContent = key;
    ballToggle.checked = ballVisible;
    updateBallSettingVisibility(enabled);
  });
}

loadShortcutSettings();

// 开关切换
shortcutToggle.addEventListener('change', () => {
  const enabled = shortcutToggle.checked;
  chrome.storage.local.set({ shortcutEnabled: enabled });
  updateBallSettingVisibility(enabled);
});

// 悬浮球开关切换
ballToggle.addEventListener('change', () => {
  chrome.storage.local.set({ floatBallVisible: ballToggle.checked });
});

// 打开修改弹窗
btnModify.addEventListener('click', () => {
  const currentKey = shortcutKeyEl.textContent;
  modalInput.value = '';
  modalPreview.textContent = currentKey;
  modifyModal.style.display = 'flex';
  setTimeout(() => modalInput.focus(), 50);
});

// 输入时实时更新预览
modalInput.addEventListener('input', () => {
  const val = modalInput.value.toUpperCase();
  if (/^[A-Z]$/.test(val)) {
    modalPreview.textContent = val;
  }
});

// 取消
modalCancel.addEventListener('click', () => {
  modifyModal.style.display = 'none';
});

// 确定
modalConfirm.addEventListener('click', () => {
  const val = modalInput.value.toUpperCase();
  if (/^[A-Z]$/.test(val)) {
    chrome.storage.local.set({ shortcutKey: val }, () => {
      shortcutKeyEl.textContent = val;
      modifyModal.style.display = 'none';
    });
  } else {
    modalInput.classList.add('input-error');
    setTimeout(() => modalInput.classList.remove('input-error'), 500);
  }
});

// 回车确认
modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    modalConfirm.click();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    modalCancel.click();
  }
});

// 点击遮罩关闭
modifyModal.addEventListener('click', (e) => {
  if (e.target === modifyModal) {
    modifyModal.style.display = 'none';
  }
});
