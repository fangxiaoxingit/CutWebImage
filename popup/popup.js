/**
 * NewsToCard - Popup 脚本
 * 处理历史记录入口和数量显示
 */

const DB_NAME = 'NewsToCardDB';
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
