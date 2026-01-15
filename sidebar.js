// 侧边栏脚本
class SidebarManager {
  constructor() {
    this.currentContent = null;
    this.currentUrl = null;
    this.currentTab = 'summary';
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.loadSettings();
    
    // 监听来自后台的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'sendToSidebar') {
        this.receiveContent(message.content, message.url);
      }
    });
  }
  
  bindEvents() {
    // Tab 切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
    
    // 关闭按钮
    document.getElementById('closeSidebar').addEventListener('click', () => {
      chrome.sidePanel.close();
    });
    
    // 生成按钮
    document.getElementById('generateSummary').addEventListener('click', () => this.generateSummary());
    document.getElementById('generateTranslate').addEventListener('click', () => this.generateTranslate());
    document.getElementById('generateExtract').addEventListener('click', () => this.generateExtract());
    document.getElementById('generateHighlights').addEventListener('click', () => this.generateHighlights());
    
    // 复制按钮
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => this.copyCurrentTab());
    });
    
    // 导出按钮
    document.querySelector('.export-btn')?.addEventListener('click', () => this.exportMarkdown());
    
    // 清除高亮按钮
    document.querySelector('.clear-btn')?.addEventListener('click', () => this.clearHighlights());
    
    // 语言选择
    document.getElementById('translateLang').addEventListener('change', (e) => {
      this.targetLanguage = e.target.value;
    });
  }
  
  async loadSettings() {
    const settings = await chrome.storage.local.get(['apiKey', 'model', 'language']);
    this.apiKey = settings.apiKey || '';
    this.model = settings.model || 'gpt-4';
    this.targetLanguage = settings.language || 'Chinese';
    
    document.getElementById('translateLang').value = this.targetLanguage;
  }
  
  switchTab(tabName) {
    // 更新按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabName + 'Tab');
    });
    
    this.currentTab = tabName;
  }
  
  async receiveContent(content, url) {
    this.currentContent = content;
    this.currentUrl = url;
    
    // 更新URL显示
    document.getElementById('currentUrl').textContent = url ? 
      (new URL(url).hostname + (url.length > 50 ? '...' : '')) : '-';
    
    // 隐藏空状态
    document.getElementById('emptyState').classList.add('hidden');
    
    // 启用生成按钮
    document.querySelectorAll('.generate-btn').forEach(btn => {
      btn.disabled = false;
    });
    
    this.updateStatus('内容已加载', 'success');
  }
  
  async generateSummary() {
    if (!this.currentContent) {
      this.updateStatus('请先打开网页内容', 'warning');
      return;
    }
    
    if (!this.apiKey) {
      this.updateStatus('请先配置 API Key', 'warning');
      return;
    }
    
    try {
      this.setLoading(true, '正在生成总结...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'summarize',
        content: this.currentContent.text,
        options: { language: this.targetLanguage }
      });
      
      if (response.success) {
        document.getElementById('summaryContent').innerHTML = this.formatContent(response.result);
        this.updateStatus('总结完成', 'success');
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      this.updateStatus('总结失败: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }
  
  async generateTranslate() {
    if (!this.currentContent) {
      this.updateStatus('请先打开网页内容', 'warning');
      return;
    }
    
    if (!this.apiKey) {
      this.updateStatus('请先配置 API Key', 'warning');
      return;
    }
    
    try {
      this.setLoading(true, '正在翻译...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'translate',
        content: this.currentContent.text,
        options: { language: this.targetLanguage }
      });
      
      if (response.success) {
        document.getElementById('translateContent').innerHTML = this.formatContent(response.result);
        this.updateStatus('翻译完成', 'success');
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      this.updateStatus('翻译失败: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }
  
  async generateExtract() {
    if (!this.currentContent) {
      this.updateStatus('请先打开网页内容', 'warning');
      return;
    }
    
    if (!this.apiKey) {
      this.updateStatus('请先配置 API Key', 'warning');
      return;
    }
    
    try {
      this.setLoading(true, '正在提取要点...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'extract',
        content: this.currentContent.text,
        options: {}
      });
      
      if (response.success) {
        document.getElementById('extractContent').innerHTML = this.formatContent(response.result);
        this.updateStatus('要点提取完成', 'success');
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      this.updateStatus('提取失败: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }
  
  async generateHighlights() {
    if (!this.currentContent) {
      this.updateStatus('请先打开网页内容', 'warning');
      return;
    }
    
    if (!this.apiKey) {
      this.updateStatus('请先配置 API Key', 'warning');
      return;
    }
    
    try {
      this.setLoading(true, '正在分析并高亮...');
      
      // 先获取要点
      const response = await chrome.runtime.sendMessage({
        action: 'extract',
        content: this.currentContent.text,
        options: {}
      });
      
      if (response.success) {
        // 解析要点列表
        const keyPoints = this.parseKeyPoints(response.result);
        
        // 在页面上高亮
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, {
          action: 'highlight',
          sentences: keyPoints
        });
        
        document.getElementById('highlightContent').innerHTML = `
          <p>已在页面中标记 ${keyPoints.length} 个关键信息点</p>
          <ul class="key-points-list">
            ${keyPoints.map(point => `<li>${point}</li>`).join('')}
          </ul>
        `;
        
        this.updateStatus('高亮完成', 'success');
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      this.updateStatus('高亮失败: ' + error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }
  
  parseKeyPoints(text) {
    // 解析要点列表
    const lines = text.split('\n');
    const points = [];
    
    lines.forEach(line => {
      const cleaned = line.replace(/^[\d\.\-\*\•]\s*/, '').trim();
      if (cleaned.length > 10) {
        points.push(cleaned);
      }
    });
    
    return points;
  }
  
  async clearHighlights() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
      this.updateStatus('已清除高亮', 'success');
    } catch (error) {
      this.updateStatus('清除失败', 'error');
    }
  }
  
  formatContent(text) {
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }
  
  copyCurrentTab() {
    let content;
    switch (this.currentTab) {
      case 'summary':
        content = document.getElementById('summaryContent').innerText;
        break;
      case 'translate':
        content = document.getElementById('translateContent').innerText;
        break;
      case 'extract':
        content = document.getElementById('extractContent').innerText;
        break;
    }
    
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        this.updateStatus('已复制到剪贴板', 'success');
      });
    }
  }
  
  exportMarkdown() {
    const content = document.getElementById('summaryContent').innerText;
    if (content) {
      const blob = new Blob([`# 网页内容总结\n\n来源: ${this.currentUrl}\n\n${content}`], 
        { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'summary.md';
      a.click();
      URL.revokeObjectURL(url);
      this.updateStatus('已导出', 'success');
    }
  }
  
  setLoading(loading, text) {
    const indicator = document.getElementById('statusIndicator');
    const dot = indicator.querySelector('.status-dot');
    const statusText = indicator.querySelector('.status-text');
    
    if (loading) {
      dot.classList.add('loading');
      statusText.textContent = text;
    } else {
      dot.classList.remove('loading');
      statusText.textContent = '准备就绪';
    }
    
    // 禁用/启用生成按钮
    document.querySelectorAll('.generate-btn').forEach(btn => {
      btn.disabled = loading;
    });
  }
  
  updateStatus(message, type = 'info') {
    const indicator = document.getElementById('statusIndicator');
    const dot = indicator.querySelector('.status-dot');
    const statusText = indicator.querySelector('.status-text');
    
    statusText.textContent = message;
    
    // 更新状态样式
    dot.className = 'status-dot';
    if (type === 'success') dot.classList.add('success');
    if (type === 'warning') dot.classList.add('warning');
    if (type === 'error') dot.classList.add('error');
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new SidebarManager();
});
