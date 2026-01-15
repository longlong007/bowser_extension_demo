// 设置页面脚本
class OptionsManager {
  constructor() {
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.loadSettings();
    this.registerShortcuts();
  }
  
  bindEvents() {
    document.getElementById('saveBtn').addEventListener('click', () => this.saveSettings());
    
    // 主题选择
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.applyTheme(e.target.dataset.theme);
      });
    });
  }
  
  async loadSettings() {
    const settings = await chrome.storage.local.get([
      'apiKey', 'model', 'defaultLength', 'defaultLanguage', 'theme'
    ]);
    
    if (settings.apiKey) {
      document.getElementById('apiKey').value = settings.apiKey;
    }
    
    if (settings.model) {
      document.getElementById('modelSelect').value = settings.model;
    }
    
    if (settings.defaultLength) {
      document.getElementById('defaultLength').value = settings.defaultLength;
    }
    
    if (settings.defaultLanguage) {
      document.getElementById('defaultLanguage').value = settings.defaultLanguage;
    }
    
    if (settings.theme) {
      this.applyTheme(settings.theme);
      document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === settings.theme);
      });
    }
  }
  
  async saveSettings() {
    const settings = {
      apiKey: document.getElementById('apiKey').value.trim(),
      model: document.getElementById('modelSelect').value,
      defaultLength: document.getElementById('defaultLength').value,
      defaultLanguage: document.getElementById('defaultLanguage').value,
      theme: document.querySelector('.theme-btn.active')?.dataset.theme || 'purple'
    };
    
    await chrome.storage.local.set(settings);
    this.showStatus('设置已保存', 'success');
  }
  
  applyTheme(theme) {
    const themes = {
      purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      blue: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
      green: 'linear-gradient(135deg, #4CAF45 0%, #388E3C 100%)',
      orange: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'
    };
    
    document.documentElement.style.setProperty('--primary-gradient', themes[theme]);
  }
  
  registerShortcuts() {
    // 注册快捷键 Alt+S 打开侧边栏
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        this.openSidePanel();
      }
    });
  }
  
  async openSidePanel() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ tabId: tab.id });
  }
  
  showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.classList.remove('hidden');
    
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 3000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});
