// 智谱 Zhipu AI API 客户端工具类
// 用于 Popup 和 Sidebar 中的 API 调用

class ZhipuClient {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
    this.model = 'glm-4-flash';
  }
  
  setApiKey(key) {
    this.apiKey = key;
  }
  
  setModel(model) {
    this.model = model;
  }
  
  async summarize(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('API Key 未配置');
    }
    
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
- 格式：使用 Markdown 格式

【网页内容】
${text}

【总结】`;

    return await this.callAPI(prompt);
  }
  
  async translate(text, targetLanguage = 'Chinese') {
    if (!this.apiKey) {
      throw new Error('API Key 未配置');
    }
    
    const prompt = `请将以下内容翻译成${targetLanguage}，保持原文格式：

${text}

【翻译】`;

    return await this.callAPI(prompt);
  }
  
  async extractKeyPoints(text) {
    if (!this.apiKey) {
      throw new Error('API Key 未配置');
    }
    
    const prompt = `从以下文本中提取5-10个核心要点：

【要求】
- 每个要点简洁明了
- 使用列表格式
- 按重要性排序

【原文】
${text}

【核心要点】`;

    return await this.callAPI(prompt);
  }
  
  async callAPI(messages) {
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
            content: '你是一个专业的网页内容分析助手，善于总结、翻译和提取关键信息。'
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

// 导出（同时保留 OpenAI 别名以保持兼容性）
window.ZhipuClient = ZhipuClient;
window.OpenAIClient = ZhipuClient;
