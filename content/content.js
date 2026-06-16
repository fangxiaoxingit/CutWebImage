/**
 * NewsToCard - 主内容脚本
 * 功能：浮球、蒙版、矩形框选、截图裁剪、剪贴板、Toast
 */

(function () {
  'use strict';

  // 防止重复注入
  if (window.__ntcInjected) return;
  window.__ntcInjected = true;

  // ========== 状态变量 ==========
  let isCapturing = false;        // 是否处于截图模式
  let isDragging = false;         // 是否正在拖拽画矩形
  let isDraggingBall = false;     // 是否正在拖拽浮球
  let startX = 0, startY = 0;    // 矩形起始点
  let ballStartX = 0, ballStartY = 0; // 浮球拖拽起始鼠标位置
  let ballOrigLeft = 0, ballOrigTop = 0; // 浮球拖拽起始位置
  let rafId = null;               // requestAnimationFrame ID
  let currentRect = null;         // 当前矩形选区 {left, top, width, height}

  // DOM 引用
  let floatBall = null;           // 浮球元素 (shadow host)
  let overlay = null;             // 蒙版
  let selectionRect = null;       // 矩形选择框
  let sizeLabel = null;           // 尺寸标签
  let toastHost = null;           // Toast shadow host

  // ========== 浮球模块 ==========

  function createFloatBall() {
    // Shadow DOM host
    floatBall = document.createElement('div');
    floatBall.id = 'ntc-float-ball-host';
    Object.assign(floatBall.style, {
      position: 'fixed',
      zIndex: '2147483647',
      width: '44px',
      height: '44px',
      pointerEvents: 'none'
    });

    // 恢复保存的位置，否则使用默认右上角
    const savedPos = loadBallPosition();
    if (savedPos) {
      floatBall.style.left = savedPos.left + 'px';
      floatBall.style.top = savedPos.top + 'px';
    } else {
      floatBall.style.right = '20px';
      floatBall.style.top = '20px';
    }

    const shadow = floatBall.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host { pointer-events: none; }
      .ball {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        pointer-events: auto;
        transition: transform 0.2s, box-shadow 0.2s;
        user-select: none;
        -webkit-user-select: none;
      }
      .ball:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }
      .ball:active {
        transform: scale(0.95);
      }
      .ball svg {
        width: 22px;
        height: 22px;
        fill: white;
        pointer-events: none;
      }
    `;

    // 剪刀图标 SVG
    const ballDiv = document.createElement('div');
    ballDiv.className = 'ball';
    ballDiv.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zM19 3l-6 6 2 2 7-7V3h-3z"/>
    </svg>`;

    shadow.appendChild(style);
    shadow.appendChild(ballDiv);
    document.body.appendChild(floatBall);

    // 事件绑定
    ballDiv.addEventListener('mousedown', onBallMouseDown, true);
  }

  function onBallMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    ballStartX = e.clientX;
    ballStartY = e.clientY;

    // 使用 getBoundingClientRect 获取当前浮球位置
    const rect = floatBall.getBoundingClientRect();
    ballOrigLeft = rect.left;
    ballOrigTop = rect.top;

    isDraggingBall = false;

    document.addEventListener('mousemove', onBallMouseMove, true);
    document.addEventListener('mouseup', onBallMouseUp, true);
  }

  function onBallMouseMove(e) {
    const dx = e.clientX - ballStartX;
    const dy = e.clientY - ballStartY;

    if (!isDraggingBall && Math.sqrt(dx * dx + dy * dy) > 5) {
      isDraggingBall = true;
    }

    if (isDraggingBall) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const newLeft = ballOrigLeft + dx;
        const newTop = ballOrigTop + dy;
        floatBall.style.left = Math.max(0, Math.min(newLeft, window.innerWidth - 44)) + 'px';
        floatBall.style.top = Math.max(0, Math.min(newTop, window.innerHeight - 44)) + 'px';
        floatBall.style.right = 'auto'; // 切换为 left 定位
      });
    }
  }

  function onBallMouseUp(e) {
    document.removeEventListener('mousemove', onBallMouseMove, true);
    document.removeEventListener('mouseup', onBallMouseUp, true);

    if (isDraggingBall) {
      // 边缘吸附
      snapBallToEdge();
      saveBallPosition();
      isDraggingBall = false;
    } else {
      // 点击 - 进入截图模式
      enterCaptureMode();
    }
  }

  function snapBallToEdge() {
    const rect = floatBall.getBoundingClientRect();
    const centerX = rect.left + 22;
    const viewWidth = window.innerWidth;

    // 吸附到最近的左/右边缘
    if (centerX < viewWidth / 2) {
      floatBall.style.left = '10px';
      floatBall.style.right = 'auto';
    } else {
      floatBall.style.left = 'auto';
      floatBall.style.right = '10px';
    }
  }

  function saveBallPosition() {
    try {
      const rect = floatBall.getBoundingClientRect();
      localStorage.setItem('ntc-ball-pos', JSON.stringify({
        left: rect.left,
        top: rect.top
      }));
    } catch (e) { /* ignore */ }
  }

  function loadBallPosition() {
    try {
      const data = localStorage.getItem('ntc-ball-pos');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  // ========== 截图模式（蒙版 + 矩形框选） ==========

  function enterCaptureMode() {
    if (isCapturing) return;
    isCapturing = true;

    // 隐藏浮球（避免被截进去）
    floatBall.style.display = 'none';

    // 禁止页面选择
    document.body.classList.add('ntc-capturing');

    // 通过事件拦截阻止滚动（不修改 overflow，避免滚动位置丢失）
    addScrollBlockers();

    // 创建蒙版
    overlay = document.createElement('div');
    overlay.id = 'ntc-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.15)',
      zIndex: '2147483646',
      cursor: 'crosshair'
    });
    document.body.appendChild(overlay);

    // 创建矩形选择框（初始不可见）
    selectionRect = document.createElement('div');
    selectionRect.id = 'ntc-selection-rect';
    Object.assign(selectionRect.style, {
      position: 'fixed',
      border: '2px dashed #4A90D9',
      background: 'rgba(74, 144, 217, 0.08)',
      zIndex: '2147483647',
      display: 'none',
      pointerEvents: 'none',
      boxSizing: 'border-box'
    });
    document.body.appendChild(selectionRect);

    // 尺寸标签
    sizeLabel = document.createElement('div');
    sizeLabel.id = 'ntc-size-label';
    Object.assign(sizeLabel.style, {
      position: 'fixed',
      background: 'rgba(74, 144, 217, 0.9)',
      color: '#fff',
      fontSize: '12px',
      fontFamily: 'monospace',
      padding: '2px 6px',
      borderRadius: '3px',
      zIndex: '2147483647',
      display: 'none',
      pointerEvents: 'none',
      whiteSpace: 'nowrap'
    });
    document.body.appendChild(sizeLabel);

    // 绑定事件
    overlay.addEventListener('mousedown', onOverlayMouseDown, true);
    document.addEventListener('keydown', onKeyDown, true);
  }

  function exitCaptureMode() {
    isCapturing = false;
    isDragging = false;

    // 移除蒙版和选区
    if (overlay) { overlay.remove(); overlay = null; }
    if (selectionRect) { selectionRect.remove(); selectionRect = null; }
    if (sizeLabel) { sizeLabel.remove(); sizeLabel = null; }

    // 恢复页面
    document.body.classList.remove('ntc-capturing');
    removeScrollBlockers();

    // 恢复浮球
    if (floatBall) floatBall.style.display = '';

    // 清理事件
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('keydown', onKeyDown, true);

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    currentRect = null;
  }

  function onOverlayMouseDown(e) {
    if (e.button !== 0) return; // 仅左键
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    currentRect = { left: startX, top: startY, width: 0, height: 0 };

    // 将事件绑定到 document 以捕获超出 overlay 的鼠标事件
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
  }

  function onMouseMove(e) {
    if (!isDragging) return;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const x = e.clientX;
      const y = e.clientY;

      const left = Math.min(startX, x);
      const top = Math.min(startY, y);
      const width = Math.abs(x - startX);
      const height = Math.abs(y - startY);

      currentRect = { left, top, width, height };

      // 更新矩形选择框
      if (selectionRect) {
        selectionRect.style.display = 'block';
        selectionRect.style.left = left + 'px';
        selectionRect.style.top = top + 'px';
        selectionRect.style.width = width + 'px';
        selectionRect.style.height = height + 'px';
      }

      // 更新尺寸标签
      if (sizeLabel) {
        sizeLabel.style.display = 'block';
        sizeLabel.textContent = `${Math.round(width)} × ${Math.round(height)}`;
        sizeLabel.style.left = left + 'px';
        sizeLabel.style.top = Math.max(0, top - 22) + 'px';
      }
    });
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;

    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('mouseup', onMouseUp, true);

    const endX = e.clientX;
    const endY = e.clientY;
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    // 最小选区判断
    if (width < 10 || height < 10) {
      exitCaptureMode();
      return;
    }

    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);

    // 先移除蒙版和选区（避免截到它们）
    if (overlay) { overlay.remove(); overlay = null; }
    if (selectionRect) { selectionRect.remove(); selectionRect = null; }
    if (sizeLabel) { sizeLabel.remove(); sizeLabel = null; }
    document.body.classList.remove('ntc-capturing');
    removeScrollBlockers();

    // 执行截图
    performCapture({ left, top, width, height });
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      exitCaptureMode();
    }
    // 阻止截图模式下的键盘滚动（Space, PageUp, PageDown, 方向键）
    const scrollKeys = ['Space', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (scrollKeys.includes(e.code)) {
      e.preventDefault();
    }
  }

  // ========== 滚动拦截（不修改 overflow，避免所有滚动位置问题） ==========

  function preventScroll(e) {
    e.preventDefault();
  }

  function addScrollBlockers() {
    // 在 document 上拦截所有滚动事件
    document.addEventListener('wheel', preventScroll, { passive: false, capture: true });
    document.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
    document.addEventListener('touchstart', preventScroll, { passive: false, capture: true });
    document.addEventListener('scroll', blockScrollReset, { capture: true });
  }

  function removeScrollBlockers() {
    document.removeEventListener('wheel', preventScroll, true);
    document.removeEventListener('touchmove', preventScroll, true);
    document.removeEventListener('touchstart', preventScroll, true);
    document.removeEventListener('scroll', blockScrollReset, true);
  }

  function blockScrollReset(e) {
    // 如果有元素试图滚动，立即还原
    if (e.target !== document && e.target !== document.documentElement && e.target !== document.body) {
      e.target.scrollTop = 0;
      e.target.scrollLeft = 0;
    }
  }

  // ========== 截图 + 裁剪 + 剪贴板 ==========

  async function performCapture(rect) {
    showToast('loading', '正在截图...');

    try {
      // 等一帧让蒙版完全移除
      await new Promise(r => requestAnimationFrame(r));
      // 再等一小段时间确保渲染完成
      await new Promise(r => setTimeout(r, 50));

      // 请求 service worker 截图
      const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });

      if (!response || response.error || !response.dataUrl) {
        throw new Error(response?.error || '截图失败');
      }

      // 加载截图
      const img = await loadImage(response.dataUrl);

      // 裁剪
      const dpr = window.devicePixelRatio || 1;
      const sx = Math.round(rect.left * dpr);
      const sy = Math.round(rect.top * dpr);
      const sw = Math.round(rect.width * dpr);
      const sh = Math.round(rect.height * dpr);

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      // 转为 Blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob 失败')), 'image/png');
      });

      // 写入剪贴板
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      // 保存历史记录（发送 dataURL 到 service worker）
      const imageDataUrl = canvas.toDataURL('image/png');
      try {
        await chrome.runtime.sendMessage({
          type: 'SAVE_SNAPSHOT',
          data: {
            imageDataUrl: imageDataUrl,
            url: window.location.href,
            title: document.title,
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        });
      } catch (e) {
        console.warn('[NewsToCard] 保存历史记录失败:', e);
      }

      showToast('success', '已复制到剪贴板 ✓');
    } catch (err) {
      console.error('[NewsToCard] 截图失败:', err);
      showToast('error', '截图失败: ' + err.message);
    } finally {
      // 恢复浮球
      isCapturing = false;
      if (floatBall) floatBall.style.display = '';
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // ========== Toast 通知 ==========

  function showToast(type, message) {
    removeToast();

    toastHost = document.createElement('div');
    toastHost.id = 'ntc-toast-host';
    Object.assign(toastHost.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      pointerEvents: 'none'
    });

    const shadow = toastHost.attachShadow({ mode: 'closed' });

    const colors = {
      loading: { bg: '#333', icon: '⏳' },
      success: { bg: '#22c55e', icon: '✓' },
      error: { bg: '#ef4444', icon: '✕' }
    };
    const config = colors[type] || colors.loading;
    const duration = type === 'error' ? 4000 : 2000;

    const style = document.createElement('style');
    style.textContent = `
      .toast {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 8px;
        background: ${config.bg};
        color: #fff;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: toastIn 0.3s ease-out;
        white-space: nowrap;
      }
      .toast.fade-out {
        animation: toastOut 0.3s ease-in forwards;
      }
      .icon {
        font-size: 16px;
        display: flex;
        align-items: center;
      }
      ${type === 'loading' ? `
      .icon {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }` : ''}
      @keyframes toastIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes toastOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
      }
    `;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="icon">${config.icon}</span><span>${message}</span>`;

    shadow.appendChild(style);
    shadow.appendChild(toast);
    document.body.appendChild(toastHost);

    // 自动消失
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(removeToast, 300);
    }, duration);
  }

  function removeToast() {
    if (toastHost) {
      toastHost.remove();
      toastHost = null;
    }
  }

  // ========== 初始化 ==========

  function init() {
    // 等待 body 存在
    if (document.body) {
      createFloatBall();
    } else {
      document.addEventListener('DOMContentLoaded', createFloatBall);
    }

    // SPA 路由切换时确保浮球存在
    const observer = new MutationObserver(() => {
      if (!document.getElementById('ntc-float-ball-host') && !isCapturing) {
        createFloatBall();
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true });
      });
    }
  }

  init();
})();
