<div align="center">

  <img src="./resources/icon.png" alt="ParrotLingo Logo" width="108" height="108" style="border-radius: 22px; margin-bottom: 12px;" />

# ParrotLingo

  <p align="center">
    <strong>AI 驱动的下一代沉浸式语言学习与即时划词翻译桌面助理</strong><br />
    <em>本地优先 • 隐私至上 • BYOK 自带密钥 • 多大模型自由接入</em>
  </p>

  <p align="center">
    <a href="README.md"><strong>English</strong></a> •
    <a href="README_zh.md"><strong>简体中文</strong></a>
  </p>

  <p align="center">
    <a href="https://github.com/zzice/parrot-lingo/releases/latest">
      <img src="https://img.shields.io/github/v/release/zzice/parrot-lingo?style=flat-square&color=10B981&label=Release" alt="Latest Release" />
    </a>
    <a href="https://github.com/zzice/parrot-lingo/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License" />
    </a>
    <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-6366F1?style=flat-square" alt="Platform" />
    <img src="https://img.shields.io/badge/Electron-39-475569?style=flat-square&logo=electron" alt="Electron" />
    <img src="https://img.shields.io/badge/React-19-0ea5e9?style=flat-square&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome" />
  </p>

  <p align="center">
    <a href="#-为什么选择-parrotlingo">为什么选择 ParrotLingo</a> •
    <a href="#-支持平台">支持平台</a> •
    <a href="#-核心亮点">核心亮点</a> •
    <a href="#-技术架构">技术架构</a> •
    <a href="#-快速开始">快速开始</a> •
    <a href="#-打包构建">打包构建</a> •
    <a href="#-致谢">致谢</a> •
    <a href="#-开源协议">开源协议</a>
  </p>

  <p align="center">
    <img src="./docs/images/hero-product.png" alt="ParrotLingo - AI 划词助手与沉浸式遇见回放工作台" width="880" style="border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,0.12);" />
  </p>

</div>

---

## 💡 为什么选择 ParrotLingo？

在日常阅读外文文献、浏览网页或编写代码时，频繁切换翻译软件不仅打断思路，查过的生词也容易随风消散。

**ParrotLingo** 专为追求极致效率与深度语言积累的用户打造：

- **全局极速划词**：屏幕任意区域划词即刻唤起，0ms 感知延迟，搭配多维深度解析（音标、语法辨析、语境例句、地道表达替代）。
- **本地优先（Local-First）**：生词与复习记录完全保存在本地 SQLite，隐私数据完全自主掌控。
- **BYOK (自带密钥模式)**：API 密钥只存本地，直连大模型服务商，无中间层转发。
- **记忆与复习闭环**：不仅是即时翻译，更将每次查询自动转化为个性化语料与「今日回放」复习卡片，助你真正掌握语言。

---

## 💻 支持平台

ParrotLingo 提供对主流桌面操作系统的原生级完整支持：

| 平台                | 适配架构                                   | 发布格式             | 状态        |
| :------------------ | :----------------------------------------- | :------------------- | :---------- |
| **macOS** (11.0+)   | Apple Silicon (M1/M2/M3/M4) 及 Intel (x64) | `.dmg` • `.zip`      | ✅ 完美支持 |
| **Windows** (10/11) | x64 及 ARM64                               | `.exe` (NSIS 安装包) | ✅ 完美支持 |

---

## ✨ 核心亮点

```
  ┌───────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
  │     全局极速划词      │ ───►  │    多模型 AI 智脑    │ ───►  │     本地优先语料库   │
  │ (胶囊悬浮 / 全局Hook) │       │  (BYOK + 本地离线LLM)│       │   (艾宾浩斯抗遗忘)   │
  └───────────────────────┘       └──────────────────────┘       └──────────────────────┘
```

### ⚡️ 1. 毫秒级全局划词悬浮胶囊与独立弹窗

- **无感系统级划词**：基于 macOS Accessibility 原生能力与底层全局按键 Hook，选中文本即刻弹出胶囊工具条。
- **快捷键极速直达**：支持双击 `Cmd/Ctrl` 快速唤起翻译或自定义触发规则。
- **独立功能弹窗**：支持置顶固定（Pin）、窗口透明度无级调节（20% ~ 100%）及原生毛玻璃模糊背景，多任务协同无干扰。

<p align="center">
  <img src="./docs/images/selection-assistant.png" alt="毫秒级划词翻译助手" width="520" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);" />
</p>

### 🧠 2. 自由接入 AI 大模型（BYOK 模式）

- **开箱即用预置模型**：内置预设 **ParrotLingo AI**、**DeepSeek**、**智谱 AI (GLM-4)** 等优质模型，一键即开即用。
- **BYOK 隐私安全**：支持 Bring Your Own Key，所有 API Key 仅保存在本地设备，无第三方中间层转发，安全透明。
- **自定义模型全兼容**：全面兼容 **OpenAI 标准接口协议**，可自由添加任意第三方大模型，或连接 **Ollama** / **LM Studio** 等本地离线大模型。
- **深度语义与语境分析**：拒绝生硬直译，输出地道表达、词性辨析、双语例句与真实语境用法建议。

#### 🎁 免费模型接入推荐：Agnes 全模态大模型

ParrotLingo 支持标准 OpenAI 协议，可零成本对接 [Agnes](https://www.agnes-ai.cn/) 提供的免费全模态大模型服务：

1. **获取密钥**：前往 [Agnes 官网](https://www.agnes-ai.cn/) 注册并获取免费 API 密钥（`sk-xxxx`）。
2. **进入配置页面**：打开 ParrotLingo 客户端，点击 **「设置」** ➔ **「模型服务」** ➔ 点击 **「添加服务商」**。
3. **填写接入参数**：
   - **协议类型**：`OpenAI (Chat)`
   - **服务商名称**：`Agnes`（或自定义名称）
   - **API 地址 (Base URL)**：`https://api.openai.com/v1`
   - **API 密钥**：`sk-xxxx`（填入 Agnes 申请的 API Key）
   - **默认模型 ID**：`agnes-2.5-flash`
4. **保存启用**：点击 **「确认保存」**，即可直接享受极速、免费的高质量 AI 划词解析与语料翻译！

### 📚 3. 语料库与「今日回放」复习系统

- **一键生词入库**：划词界面随时将生词、短语及上下文原句加入本地语料库。
- **艾宾浩斯抗遗忘算法**：智能规划每日复习队列，按掌握度打分（熟记/模糊/忘记），形成从“阅读遇到”到“真正掌握”的闭环。
- **数据完全本地化**：基于高效嵌入式 SQLite 引擎，百万级词汇流畅检索，支持完整 JSON 备份与跨设备迁移。

<p align="center">
  <img src="./docs/images/spaced-review.png" alt="今日遇见回放学习流程" width="820" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);" />
</p>

### 🎨 4. 现代桌面设计美学 & 严格 5 语国际化

- 🌓 **深浅模式自适应**：完美契合 macOS / Windows 系统外观切换。
- 🎨 **动态调色系统**：内置 7 种设计师精选配色（翡翠绿、深邃蓝、皇家紫、玫瑰粉、琥珀橙、青碧色、板岩灰），并支持任意自定义 Hex 强调色。
- 🌐 **严格 5 语言国际化**：全界面原生支持 **简体中文**、**繁體中文**、**English**、**日本語**、**한국어**。

---

## 🛠️ 技术架构

ParrotLingo 采用现代前端与底层桌面系统的深度融合架构：

| 层次             | 技术选型                                    | 说明                         |
| :--------------- | :------------------------------------------ | :--------------------------- |
| **桌面运行时**   | `Electron 39` + `Node.js 22`                | 高性能多进程桌面容器         |
| **工程脚手架**   | `electron-vite 5` + `Vite 7`                | 毫秒级 HMR 与极速打包        |
| **前端架构**     | `React 19` + `TypeScript 5.9`               | 严格类型安全与现代组件范式   |
| **样式与动效**   | `Tailwind CSS v4` + `Radix UI` + `Lucide`   | 极致精美的高清桌面视觉体验   |
| **状态管理**     | `Zustand 5` (多窗口 IPC 状态实时广播)       | 统一响应式数据流             |
| **本地数据库**   | `better-sqlite3 13`                         | 高并发本地存储与极速全文检索 |
| **系统底层集成** | `macOS Accessibility APIs` / `uiohook-napi` | 原生光标定位与全局事件拦截   |

---

## 🚀 快速开始

### 开发环境要求

- **Node.js** >= 22.0.0
- **pnpm** >= 9.0.0
- **macOS** (支持 Intel & Apple Silicon M 系列) 或 **Windows 10/11**

### 1. 克隆代码并安装依赖

```bash
git clone https://github.com/zzice/parrot-lingo.git
cd parrot-lingo

pnpm install
```

### 2. 启动开发模式

```bash
pnpm dev
```

### 3. 类型检查与代码校验

```bash
# 执行完整类型校验
pnpm typecheck

# 代码格式化与 Lint
pnpm format
pnpm lint
```

---

## 📦 打包构建

应用支持针对各平台一键构建发布版本：

```bash
# macOS 打包 (生成 .dmg 与 .zip，自动支持 Apple Silicon & Intel)
pnpm build:mac:all

# Windows 打包 (生成 .exe NSIS 安装包)
pnpm build:win

# 生产环境预编译检查
pnpm build
```

---

## ❓ 常见问题 (FAQ)

### macOS 提示「应用已损坏，应将它移到废纸篓」怎么办？

由于开源客户端尚未购买 Apple 付费开发者证书签名公证，macOS Gatekeeper 会对从浏览器下载的应用施加安全隔离（Quarantine）。
**解决方法**：打开「终端（Terminal）」，复制执行以下命令即可正常打开：

```bash
sudo xattr -rd com.apple.quarantine /Applications/ParrotLingo.app
```

---

## 🔄 自动化更新机制

ParrotLingo 配置了完整的 CI/CD 自动发布与客户端静默增量更新流：

1. 本地更新版本号后推送 Git Tag（如 `git tag v0.0.1 && git push origin --tags`）。
2. GitHub Actions 自动在多平台云端编译产物并创建 GitHub Release。
3. 客户端内置 `electron-updater` 自动检测并提示用户一键升级。

---

## 🤝 参与贡献

欢迎提交 Issue、功能建议或 Pull Request！

1. Fork 本仓库并创建特性分支 (`git checkout -b feature/AmazingFeature`)
2. 提交代码 (`git commit -m 'feat: add some amazing feature'`)
3. 推送到远程分支 (`git push origin feature/AmazingFeature`)
4. 发起 Pull Request

---

## 🙏 特别致谢

ParrotLingo 的开发受益于开源社区的优秀灵感与开源项目：

- **[selection-hook](https://github.com/0xfullex/selection-hook)** — 优秀的跨平台全局文本划选监听与屏幕坐标定位开源库，为系统的毫秒级划词响应提供了底层技术支撑。
- **[Cherry Studio](https://github.com/CherryHQ/cherry-studio)** — 极其出色的多模型 AI 桌面客户端，向其卓越的产品体验设计与开源贡献致敬。
- **[Electron Vite](https://electron-vite.org)** — 新一代极速 Electron 桌面开发工具链。
- **[Radix UI](https://www.radix-ui.com/)** & **[Tailwind CSS](https://tailwindcss.com/)** — 无障碍设计系统与现代响应式原子化 CSS 框架。

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。你可以自由使用、修改和分发。

<div align="center">
  <br />
  <sub>Made with ❤️ for lifelong language learners across the world.</sub>
</div>
