# NutZip 🚀

![NutZip Banner](assets/nut-icon.svg)

**NutZip** 是一款由 **Squ4sh000** 开发的高性能、高颜值的现代化压缩软件。它结合了极简主义的科技感 UI 与强大的 C 语言后端核心，旨在为 Windows 用户提供极致的压缩体验。

## ✨ 核心特性

- 💎 **现代视觉设计**：全深色透明科技风界面，基于 React + Framer Motion 构建，流畅动效。
- 📦 **全格式支持**：原生支持 `.zip`, `.tar`, `.gz`, `.xz` 等多种主流压缩格式。
- 🔩 **极致压缩 (.nutz)**：独家推出的 `.nutz` 格式，采用先打包后极限压缩的策略，追求极致的体积缩减。
- 📂 **智能路径处理**：自动识别并剥离冗余后缀，支持多文件、文件夹直接拖拽打包。
- 💻 **强大 CLI 支持**：内置标准化命令行工具，支持生产力级别的自动化操作。
- ⚙️ **个性化设置**：支持设置持久化记忆、任务完成后自动打开目录等便捷功能。

## 🚀 使用教程

### 图形界面 (GUI) 模式
1. **压缩文件**：
   - 打开 NutZip，进入“压缩”选项卡。
   - 点击“选择文件”或“选择文件夹”，或直接将目标拖入窗口。
   - 在下方选择目标格式（推荐使用 `.nutz` 以获得极致体积）。
   - 点击“立即压缩”，完成后可自动打开所在目录。
2. **解压文件**：
   - 切换到“解压”选项卡。
   - 拖入压缩包，程序会自动建议一个干净的解压目录。
   - 点击“立即解压”即可。

### 命令行 (CLI) 模式
核心程序位于安装目录下的 `backend/nutzip.exe`：
- **压缩**：`nutzip c -o output.zip file1.txt folder1`
- **解压**：`nutzip x -i archive.nutz -o ./extracted`
- **帮助**：`nutzip --help`

## 🛠️ 技术架构

- **Frontend**: Vite + React + Tailwind CSS
- **Shell**: Electron
- **Backend**: C (MinGW-w64 GCC 15.1.0)
- **Algorithms**: zlib + tar-wrap implementation

## 👤 作者

**Squ4sh000**
- 🌐 [个人主页](https://squ4sh000.github.io/)
- 💻 [GitHub](https://github.com/Squ4sh000)

---
*NutZip - 极致压缩，不仅是速度。*
