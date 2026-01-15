// 内容脚本 - 注入到网页中执行
class ContentScript {
  constructor() {
    this.highlights = [];
    this.init();
  }
  
  init() {
    // 监听来自扩展的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });
  }
  
  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'extractContent':
        sendResponse(this.extractContent());
        break;
        
      case 'highlight':
        this.highlightSentences(request.sentences);
        sendResponse({ success: true });
        break;
        
      case 'clearHighlights':
        this.clearHighlights();
        sendResponse({ success: true });
        break;
    }
    
    return true;
  }
  
  extractContent() {
    // 尝试多种选择器获取主要内容
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.blog-content',
      '.content-body',
      '.text-content',
      '#content',
      '.content'
    ];
    
    let mainElement = null;
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && this.hasEnoughContent(element)) {
        mainElement = element;
        break;
      }
    }
    
    // 如果没有找到合适的容器，使用 body
    if (!mainElement) {
      mainElement = document.body;
    }
    
    const cleanedContent = this.cleanContent(mainElement);
    
    return {
      success: true,
      content: {
        title: document.title,
        url: window.location.href,
        text: cleanedContent.text,
        html: cleanedContent.html,
        wordCount: cleanedContent.wordCount
      }
    };
  }
  
  hasEnoughContent(element) {
    const text = element.innerText || '';
    const words = text.split(/\s+/).length;
    return words > 100;
  }
  
  cleanContent(element) {
    const clone = element.cloneNode(true);
    
    // 移除不需要的元素
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer',
      'iframe', 'noscript', 'ins', 'advertisement',
      '.ad', '.ads', '.advertisement', '.social-share',
      '.share-buttons', '.comments', '.comment-area',
      '.sidebar', '.widget', '.popup', '.modal',
      '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
      '.hidden', '.hide', '[aria-hidden="true"]'
    ];
    
    unwantedSelectors.forEach(selector => {
      try {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // 无效选择器，跳过
      }
    });
    
    // 清理内联样式和脚本
    clone.querySelectorAll('script, style, link[rel="stylesheet"]').forEach(el => el.remove());
    
    // 提取纯文本
    let text = clone.innerText || '';
    text = text.replace(/\s+/g, ' ').trim();
    
    // 限制文本长度
    const maxLength = 15000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return {
      text: text,
      html: clone.innerHTML,
      wordCount: text.split(/\s+/).length
    };
  }
  
  highlightSentences(sentences) {
    // 清除旧的高亮
    this.clearHighlights();
    
    const sentencesArray = Array.isArray(sentences) ? sentences : [sentences];
    
    // 创建高亮容器样式
    this.addHighlightStyles();
    
    sentencesArray.forEach(sentence => {
      if (sentence && sentence.length > 5) {
        this.findAndHighlight(sentence.trim());
      }
    });
    
    // 滚动到第一个高亮位置
    const firstHighlight = document.querySelector('.ai-highlight');
    if (firstHighlight) {
      firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  findAndHighlight(text) {
    const textLower = text.toLowerCase();
    
    // 使用 TreeWalker 遍历所有文本节点
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 跳过已经高亮的节点
          if (node.parentElement.classList.contains('ai-highlight')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // 检查文本是否包含目标内容
          const parent = node.parentElement;
          const excludedTags = ['script', 'style', 'nav', 'header', 'footer', 'aside'];
          
          if (excludedTags.includes(parent.tagName.toLowerCase())) {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (node.textContent.toLowerCase().includes(textLower)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
      nodes.push(node);
    }
    
    nodes.forEach(textNode => {
      this.highlightTextNode(textNode, text);
    });
  }
  
  highlightTextNode(node, searchText) {
    const text = node.textContent;
    const index = text.toLowerCase().indexOf(searchText.toLowerCase());
    
    if (index === -1) return;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + searchText.length);
    const after = text.substring(index + searchText.length);
    
    const span = document.createElement('span');
    span.className = 'ai-highlight';
    span.dataset.originalText = match;
    span.dataset.summary = searchText;
    span.title = 'AI 总结关键信息';
    
    span.appendChild(document.createTextNode(match));
    
    const fragment = document.createDocumentFragment();
    if (before) fragment.appendChild(document.createTextNode(before));
    fragment.appendChild(span);
    if (after) fragment.appendChild(document.createTextNode(after));
    
    node.parentNode.replaceChild(fragment, node);
    this.highlights.push(span);
  }
  
  addHighlightStyles() {
    if (document.getElementById('ai-highlight-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ai-highlight-styles';
    style.textContent = `
      .ai-highlight {
        background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%);
        padding: 2px 4px;
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .ai-highlight:hover {
        background: linear-gradient(120deg, #fed6e3 0%, #a8edea 100%);
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
    `;
    document.head.appendChild(style);
  }
  
  clearHighlights() {
    document.querySelectorAll('.ai-highlight').forEach(el => {
      const text = el.dataset.originalText || el.textContent;
      el.parentNode.replaceChild(document.createTextNode(text), el);
    });
    this.highlights = [];
  }
}

// 初始化内容脚本
new ContentScript();
