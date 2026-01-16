// 后台脚本 - 处理 API 调用和状态管理

// 消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // 保持消息通道开放
});

async function handleMessage(request, sender, sendResponse) {
  try {
    // 获取存储的设置
    const settings = await chrome.storage.local.get(['apiKey', 'model', 'defaultLength', 'defaultLanguage']);
    
    if (!settings.apiKey) {
      sendResponse({
        success: false,
        error: 'API Key 未配置。请在扩展设置中配置智谱 AI API Key。'
      });
      return;
    }
    
    const apiKey = settings.apiKey;
    const model = settings.model || 'glm-4';
    
    const client = new ZhipuBackgroundClient(apiKey, model);
    
    let result;
    
    switch (request.action) {
      case 'summarize':
        result = await client.summarize(request.content, {
          length: request.options?.length || 'medium',
          language: request.options?.language || 'Chinese'
        });
        sendResponse({ success: true, result });
        break;
        
      case 'translate':
        result = await client.translate(request.content, request.options?.language || 'Chinese');
        sendResponse({ success: true, result });
        break;
        
      case 'extract':
        result = await client.extractKeyPoints(request.content);
        sendResponse({ success: true, result });
        break;
        
      case 'highlight':
        // 高亮不需要 API 调用，由 content script 处理
        sendResponse({ success: true, message: '高亮指令已发送' });
        break;
        
      default:
        sendResponse({ success: false, error: '未知操作' });
    }
    
  } catch (error) {
    console.error('Background script error:', error);
    sendResponse({
      success: false,
      error: error.message || '处理请求时发生错误'
    });
  }
}

// 智谱 Zhipu AI 后台客户端
class ZhipuBackgroundClient {
  constructor(apiKey, model = 'glm-4') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
  }
  
  async summarize(text, options = {}) {
    const { length = 'medium', language = 'Chinese' } = options;
    
    const lengthMap = {
      short: '约100字',
      medium: '约200-300字',
      long: '约500字'
    };
    
    const prompt = `请对以下网页内容进行总结，以${language}输出：

【总结要求】
- 风格：简洁、专业
- 长度：${lengthMap[length] || '中等'}
- 格式：使用 Markdown 格式，可使用 ### 和 ** 强调重点

【网页内容】
${text}

【总结】`;

    return await this.callAPI(prompt);
  }
  
  async translate(text, targetLanguage = 'Chinese') {
    const prompt = `请将以下内容翻译成${targetLanguage}，保持原文的 Markdown 格式和结构：

${text}

【翻译】`;

    return await this.callAPI(prompt);
  }
  
  async extractKeyPoints(text) {
    const prompt = `从以下文本中提取核心要点：

【要求】
- 提取 5-10 个最重要的要点
- 每个要点简洁明了，不超过一句话
- 使用清晰的列表格式
- 按重要性排序

【原文】
${text}

【核心要点】`;

    return await this.callAPI(prompt);
  }
  
  async callAPI(messages) {
    // 如果 messages 是字符串，转换为消息格式
    const chatMessages = typeof messages === 'string' 
      ? [{ role: 'user', content: messages }]
      : messages;
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的网页内容分析助手，善于总结、翻译和提取关键信息。输出时请使用 Markdown 格式，适当使用 ### 标题和 **加粗** 来组织内容。'
          },
          ...chatMessages
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API 错误: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// 安装清理监听器
chrome.runtime.onInstalled.addListener(() => {
  console.log('网页内容总结助手已安装 - 使用智谱 Zhipu AI');
});

// 快捷键监听
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-side-panel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
      }
    });
  }
});
