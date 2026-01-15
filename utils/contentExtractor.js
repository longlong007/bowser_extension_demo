// 内容提取工具类
// 专门用于提取网页主要内容

class ContentExtractor {
  constructor() {
    this.selectors = {
      // 主要内容容器
      main: [
        'article',
        '[role="main"]',
        'main',
        '.post-content',
        '.article-content',
        '.entry-content',
        '.blog-content',
        '.content-body',
        '.text-content',
        '.story-body',
        '.post-body',
        '#content',
        '.content',
        '[itemprop="articleBody"]',
        '.article-body'
      ],
      
      // 需要排除的元素
      unwanted: [
        'script', 'style', 'nav', 'header', 'footer',
        'iframe', 'noscript', 'ins',
        '.ad', '.ads', '.advertisement', '.ad-wrapper',
        '.social-share', '.share-buttons', '.sharing',
        '.comments', '.comment-area', '.comments-section',
        '.sidebar', '.widget', '.popup', '.modal',
        '.navigation', '.nav', '.menu',
        '[role="banner"]', '[role="navigation"]', 
        '[role="complementary"]', '[role="contentinfo"]',
        '.hidden', '.hide', '[aria-hidden="true"]',
        '.promo', '.promoted', '.sponsored'
      ]
    };
  }
  
  // 主提取方法
  extract() {
    const title = document.title;
    const url = window.location.href;
    const mainElement = this.findMainContent();
    
    if (!mainElement) {
      // 如果找不到主要内容，返回整个 body
      return this.extractFromElement(document.body, title, url);
    }
    
    return this.extractFromElement(mainElement, title, url);
  }
  
  // 查找主要内容容器
  findMainContent() {
    for (const selector of this.selectors.main) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (this.isMainContent(element)) {
          return element;
        }
      }
    }
    return null;
  }
  
  // 判断是否是主要内容
  isMainContent(element) {
    const text = element.innerText || '';
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    
    // 至少需要有 50 个单词
    return words > 50;
  }
  
  // 从元素中提取内容
  extractFromElement(element, title, url) {
    const clone = element.cloneNode(true);
    
    // 清理不需要的元素
    this.cleanElement(clone);
    
    // 提取文本
    let text = clone.innerText || '';
    text = this.cleanText(text);
    
    // 限制文本长度
    const maxLength = 15000;
    const truncated = text.length > maxLength;
    if (truncated) {
      text = text.substring(0, maxLength) + '...';
    }
    
    // 提取段落
    const paragraphs = this.extractParagraphs(clone);
    
    // 提取标题
    const headings = this.extractHeadings(clone);
    
    return {
      title,
      url,
      text,
      html: clone.innerHTML,
      wordCount: text.split(/\s+/).length,
      paragraphs,
      headings,
      truncated
    };
  }
  
  // 清理元素
  cleanElement(element) {
    // 移除不需要的元素
    this.selectors.unwanted.forEach(selector => {
      try {
        element.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // 忽略无效选择器
      }
    });
    
    // 移除空的元素
    element.querySelectorAll('*').forEach(el => {
      if (!el.innerText.trim() && !el.querySelector('img, svg, video, audio')) {
        el.remove();
      }
    });
  }
  
  // 清理文本
  cleanText(text) {
    return text
      // 规范化空白字符
      .replace(/\s+/g, ' ')
      // 移除特殊字符
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
      // 移除多余的换行
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }
  
  // 提取段落
  extractParagraphs(element) {
    const paragraphs = [];
    element.querySelectorAll('p').forEach(p => {
      const text = p.innerText.trim();
      if (text.length > 20) {
        paragraphs.push(text);
      }
    });
    return paragraphs;
  }
  
  // 提取标题
  extractHeadings(element) {
    const headings = [];
    element.querySelectorAll('h1, h2, h3, h4').forEach(h => {
      const text = h.innerText.trim();
      const level = parseInt(h.tagName.charAt(1));
      if (text) {
        headings.push({ level, text });
      }
    });
    return headings;
  }
}

// 导出
window.ContentExtractor = ContentExtractor;
