# 网页内容总结助手

一个使用 AI 智能总结、翻译和高亮网页内容的浏览器插件。

## 功能特性

- **智能总结**：使用 OpenAI API 对网页内容进行智能总结
- **多语言翻译**：支持中文、英文、日文、韩文等多种语言翻译
- **要点提取**：自动提取网页核心要点
- **关键信息高亮**：在页面上高亮显示关键信息
- **多种导出格式**：支持 Markdown 和 PDF 导出
- **侧边栏模式**：提供完整的侧边栏界面进行深度分析

## 安装方法

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 启用右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择本项目文件夹 `browser_extension_cursor`

## 使用说明

1. **首次配置**：
   - 点击浏览器工具栏中的扩展图标
   - 在弹窗中点击"API 设置"
   - 输入你的 OpenAI API Key
   - 选择合适的模型（GPT-4 推荐）
   - 点击"保存设置"

2. **基本操作**：
   - 访问任意网页
   - 点击扩展图标
   - 选择功能按钮：智能总结、翻译、提取要点或高亮

3. **侧边栏模式**：
   - 点击"打开侧边栏"按钮
   - 或使用快捷键 `Alt + S`
   - 在侧边栏中进行更详细的分析

4. **导出功能**：
   - 点击复制按钮复制到剪贴板
   - 点击导出按钮下载 Markdown 文件

## 文件结构

```
browser_extension_cursor/
├── manifest.json          # 扩展配置文件
├── popup.html            # 弹窗界面
├── popup.js              # 弹窗逻辑
├── sidebar.html          # 侧边栏界面
├── sidebar.js            # 侧边栏逻辑
├── options.html          # 设置页面
├── options.js            # 设置逻辑
├── content.js            # 内容脚本
├── background.js         # 后台脚本
├── styles/
│   ├── popup.css         # 弹窗样式
│   ├── sidebar.css       # 侧边栏样式
│   ├── content.css       # 内容脚本样式
│   └── options.css       # 设置页样式
├── utils/
│   ├── openai.js         # OpenAI API 封装
│   └── contentExtractor.js  # 内容提取工具
└── icons/                # 图标文件
```

## 技术栈

- **Manifest V3**：最新的浏览器扩展标准
- **原生 JavaScript**：无框架依赖，轻量快速
- **OpenAI API**：提供强大的 AI 能力
- **CSS3**：现代化样式设计

## 注意事项

- 需要有效的 OpenAI API Key
- 部分动态加载内容的页面可能无法正确提取
- 高亮功能在单页应用中可能有兼容性问题
- 请确保 API Key 的安全性，不要分享给他人

## 版本历史

- **v1.0.0** (2024-01-15)
  - 初始版本发布
  - 实现核心总结、翻译、提取功能
  - 添加高亮和导出功能
  - 支持侧边栏模式

## 许可证

MIT License

---

**Powered by OpenAI**
