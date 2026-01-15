// Popup 脚本 - 处理用户交互和API调用
class PopupManager {
  constructor() {
    this.currentResult = null;
    this.currentUrl = null;
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.loadSettings();
  }
  
  bindEvents() {
    // 主要功能按钮
    document.getElementById('summarizeBtn').addEventListener('click', () => this.handleSummarize());
    document.getElementById('translateBtn').addEventListener('click', () => this.handleTranslate());
    document.getElementById('extractBtn').addEventListener('click', () => this.handleExtract());
    document.getElementById('highlightBtn').addEventListener('click', () => this.handleHighlight());
    document.getElementById('sidebarBtn').addEventListener('click', () => this.openSidebar());
    
    // 设置相关
    document.getElementById('settingsToggle').addEventListener('click', () => this.toggleSettings());
    document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
    
    // 结果操作
    document.getElementById('copyBtn').addEventListener('click', () => this.copyResult());
    document.getElementById('exportMdBtn').addEventListener('click', () => this.exportMarkdown());
    document.getElementById('closeResult').addEventListener('click', () => this.closeResult());
  }
  
  async loadSettings() {
    const settings = await chrome.storage.local.get(['apiKey', 'model', 'summaryLength', 'language']);
    if (settings.apiKey) {
      document.getElementById('apiKey').value = settings.apiKey;
    }
    if (settings.model) {
      document.getElementById('modelSelect').value = settings.model;
    }
    if (settings.summaryLength) {
      document.getElementById('summaryLength').value = settings.summaryLength;
    }
    if (settings.language) {
      document.getElementById('languageSelect').value = settings.language;
    }
    
    this.updateApiKeyStatus();
  }
  
  async saveSettings() {
    const settings = {
      apiKey: document.getElementById('apiKey').value.trim(),
      model: document.getElementById('modelSelect').value,
      summaryLength: document.getElementById('summaryLength').value,
      language: document.getElementById('languageSelect').value
    };
    
    await chrome.storage.local.set(settings);
    this.showNotification('设置已保存', 'success');
    this.updateApiKeyStatus();
  }
  
  updateApiKeyStatus() {
    const apiKey = document.getElementById('apiKey').value.trim();
    let statusEl = document.getElementById('apiKeyStatus');
    
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'apiKeyStatus';
      statusEl.className = 'api-status';
      document.querySelector('.settings-panel').appendChild(statusEl);
    }
    
    if (apiKey) {
      statusEl.innerHTML = '<span class="status valid">✓ API Key 已配置</span>';
    } else {
      statusEl.innerHTML = '<span class="status warning">⚠ 请配置 API Key</span>';
    }
  }
  
  toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    const toggle = document.getElementById('settingsToggle');
    const arrow = toggle.querySelector('.arrow');
    
    panel.classList.toggle('open');
    arrow.classList.toggle('rotated');
  }
  
  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  
  async extractContent() {
    const tab = await this.getCurrentTab();
    this.currentUrl = tab.url;
    
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, (response) => {
        if (chrome.runtime.lastError) {
          // 内容脚本可能未注入，尝试注入
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['utils/contentExtractor.js', 'content.js']
          }).then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, resolve);
            }, 500);
          }).catch(reject);
        } else {
          resolve(response);
        }
      });
    });
  }
  
  async handleSummarize() {
    await this.processContent('summarize', '正在总结页面内容...');
  }
  
  async handleTranslate() {
    await this.processContent('translate', '正在翻译页面内容...');
  }
  
  async handleExtract() {
    await this.processContent('extract', '正在提取核心要点...');
  }
  
  async handleHighlight() {
    await this.processContent('highlight', '正在分析并高亮关键信息...');
  }
  
  async processContent(action, loadingText) {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
      this.showNotification('请先配置 API Key', 'error');
      this.openSettings();
      return;
    }
    
    try {
      this.showLoading(loadingText);
      this.hideResult();
      
      // 获取页面内容
      const contentResponse = await this.extractContent();
      
      if (!contentResponse || !contentResponse.success) {
        throw new Error('无法获取页面内容');
      }
      
      const content = contentResponse.content;
      
      // 调用后台脚本处理
      const response = await chrome.runtime.sendMessage({
        action: action,
        content: content.text,
        options: {
          length: document.getElementById('summaryLength').value,
          language: document.getElementById('languageSelect').value
        }
      });
      
      if (!response.success) {
        throw new Error(response.error || '处理失败');
      }
      
      this.currentResult = response.result;
      this.showResult(response.result, action);
      
    } catch (error) {
      this.showNotification(error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }
  
  async openSidebar() {
    const tab = await this.getCurrentTab();
    await chrome.sidePanel.open({ tabId: tab.id });
    
    // 发送内容到侧边栏
    const contentResponse = await this.extractContent();
    if (contentResponse && contentResponse.success) {
      chrome.runtime.sendMessage({
        action: 'sendToSidebar',
        content: contentResponse.content,
        url: this.currentUrl
      });
    }
  }
  
  showResult(result, type) {
    const panel = document.getElementById('resultPanel');
    const content = document.getElementById('resultContent');
    const title = document.getElementById('resultTitle');
    
    // 根据类型设置标题
    const titles = {
      summarize: '📝 智能总结',
      translate: '🌐 翻译结果',
      extract: '🎯 核心要点',
      highlight: '✨ 关键信息高亮'
    };
    
    title.textContent = titles[type] || '处理结果';
    
    // 渲染内容
    content.innerHTML = this.formatResult(result);
    panel.classList.remove('hidden');
  }
  
  formatResult(text) {
    // 处理 Markdown 格式
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  }
  
  hideResult() {
    document.getElementById('resultPanel').classList.add('hidden');
    this.currentResult = null;
  }
  
  closeResult() {
    this.hideResult();
  }
  
  async copyResult() {
    if (!this.currentResult) return;
    
    try {
      await navigator.clipboard.writeText(this.currentResult);
      this.showNotification('已复制到剪贴板', 'success');
    } catch (error) {
      this.showNotification('复制失败', 'error');
    }
  }
  
  exportMarkdown() {
    if (!this.currentResult) return;
    
    const content = `# 网页内容总结\n\n${this.currentResult}`;
    this.downloadFile(content, 'summary.md', 'text/markdown');
    this.showNotification('已导出 Markdown', 'success');
  }
  
  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  showLoading(text) {
    const loading = document.getElementById('loading');
    document.getElementById('loadingText').textContent = text;
    loading.classList.remove('hidden');
  }
  
  hideLoading() {
    document.getElementById('loading').classList.add('hidden');
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  openSettings() {
    const panel = document.getElementById('settingsPanel');
    if (!panel.classList.contains('open')) {
      this.toggleSettings();
    }
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
