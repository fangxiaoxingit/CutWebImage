# NewsToCard - 网页截图工具

一款 Chrome 浏览器扩展，点击浮球、拖拽框选网页区域，一键截图复制到剪贴板。

## 功能特性

- **悬浮球入口** — 页面右上角常驻紫色浮球，可拖拽移动、自动吸附边缘
- **矩形框选截图** — 点击浮球后覆盖蒙版，鼠标拖拽画出矩形选区，实时显示尺寸
- **真实像素截图** — 使用 Chrome `captureVisibleTab` API，像素级精确截图
- **自动复制到剪贴板** — 截图完成后自动写入剪贴板，可直接粘贴使用
- **高清支持** — 自动处理 `devicePixelRatio`，Retina 屏幕下截图清晰锐利
- **历史记录** — 所有截图自动保存，支持查看、再次复制、下载、打开原网址
- **图片预览** — 点击历史卡片可大图预览，支持复制/下载/跳转原文
- **批量管理** — 历史列表支持全选、取消全选、批量删除
- **零依赖** — 无需任何第三方库，零构建配置，纯原生 JS 实现

## 安装使用

### 本地加载

1. 克隆本仓库：
   ```bash
   git clone https://github.com/fangxiaoxingit/newsToCard.git
   ```

2. 打开 Chrome 浏览器，访问 `chrome://extensions/`

3. 开启右上角 **开发者模式**

4. 点击 **加载已解压的扩展程序**，选择 `newsToCard` 目录

5. 扩展安装完成，所有网页右上角会出现紫色浮球

### 使用方法

| 操作 | 说明 |
|------|------|
| 点击浮球 | 进入截图模式，覆盖浅透明蒙版 |
| 鼠标拖拽 | 画矩形选区，实时显示宽高尺寸 |
| 松开鼠标 | 截图自动复制到剪贴板，Toast 提示成功 |
| 拖拽浮球 | 移动浮球位置，松手自动吸附边缘 |
| 按 Esc | 取消截图，退出截图模式 |
| 点击工具栏图标 | 打开 Popup 面板，进入历史记录 |

## 项目结构

```
newsToCard/
├── manifest.json                  # Chrome 扩展 Manifest V3 配置
├── background/
│   └── service-worker.js          # Service Worker（截图 + IndexedDB 存储）
├── content/
│   ├── content.js                 # 内容脚本（浮球、蒙版、框选、裁剪、Toast）
│   └── content.css                # 全局注入样式
├── history/
│   ├── history.html               # 历史记录页面
│   ├── history.css                # 历史页面样式
│   └── history.js                 # 历史页面逻辑
├── lib/
│   └── storage.js                 # IndexedDB 存储模块
├── popup/
│   ├── popup.html                 # 工具栏弹窗
│   ├── popup.css                  # 弹窗样式
│   └── popup.js                   # 弹窗逻辑
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 技术要点

- **Manifest V3** — 使用最新的 Chrome 扩展规范
- **Shadow DOM** — 浮球和 Toast 使用 Shadow DOM 封装，防止与目标网站 CSS 互相污染
- **captureVisibleTab** — Chrome 原生截图 API，像素级精确，无需第三方库
- **IndexedDB** — 存储截图 Blob 数据，支持大量图片存储，不受 localStorage 容量限制
- **事件拦截防滚动** — 截图模式通过拦截 wheel/touch/keyboard 事件阻止滚动，不修改 `overflow`，兼容所有页面布局

## License

MIT
