/**
 * TXT-017: Slug Generator
 *
 * Converts text to URL-friendly slugs.
 */

class SlugGenerator {
  constructor() {
    // Simple pinyin mapping for common characters
    this.pinyinMap = {
      '你': 'ni', '好': 'hao', '我': 'wo', '是': 'shi', '的': 'de', '在': 'zai',
      '有': 'you', '這': 'zhe', '個': 'ge', '不': 'bu', '了': 'le', '人': 'ren',
      '都': 'dou', '一': 'yi', '上': 'shang', '大': 'da', '來': 'lai', '就': 'jiu',
      '也': 'ye', '要': 'yao', '下': 'xia', '以': 'yi', '生': 'sheng', '會': 'hui',
      '自': 'zi', '著': 'zhe', '去': 'qu', '之': 'zhi', '過': 'guo', '家': 'jia',
      '學': 'xue', '對': 'dui', '可': 'ke', '她': 'ta', '他': 'ta', '時': 'shi',
      '很': 'hen', '想': 'xiang', '說': 'shuo', '出': 'chu', '能': 'neng', '用': 'yong',
      '年': 'nian', '為': 'wei', '而': 'er', '得': 'de', '那': 'na', '和': 'he',
      '與': 'yu', '如': 'ru', '所': 'suo', '但': 'dan', '到': 'dao', '還': 'hai',
      '因': 'yin', '從': 'cong', '或': 'huo', '被': 'bei', '最': 'zui', '其': 'qi'
    };
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.separator = document.getElementById('separator');
    this.lowercase = document.getElementById('lowercase');
    this.maxLength = document.getElementById('maxLength');
    this.transliterate = document.getElementById('transliterate');
    this.generateBtn = document.getElementById('generateBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.slugOutput = document.getElementById('slugOutput');
    this.urlPreview = document.getElementById('urlPreview');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.inputText.addEventListener('input', () => this.generate());
  }

  transliterateChinese(text) {
    let result = '';
    for (const char of text) {
      if (this.pinyinMap[char]) {
        result += this.pinyinMap[char] + ' ';
      } else if (/[\u4e00-\u9fa5]/.test(char)) {
        // Unknown Chinese character, skip or keep
        result += '';
      } else {
        result += char;
      }
    }
    return result;
  }

  generate() {
    let text = this.inputText.value;
    if (!text.trim()) {
      this.resultArea.style.display = 'none';
      return;
    }

    const sep = this.separator.value;
    const useLowercase = this.lowercase.checked;
    const maxLen = parseInt(this.maxLength.value) || 100;
    const shouldTransliterate = this.transliterate.checked;

    // Transliterate Chinese if enabled
    if (shouldTransliterate) {
      text = this.transliterateChinese(text);
    }

    let slug = text
      // Remove Chinese characters if not transliterated
      .replace(/[\u4e00-\u9fa5]/g, shouldTransliterate ? '' : '')
      // Convert to lowercase if enabled
      .toLowerCase()
      // Replace spaces and special chars with separator
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, sep)
      // Remove leading/trailing separators
      .replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '');

    if (!useLowercase) {
      // Preserve original case if lowercase is disabled
      slug = this.inputText.value
        .replace(/[\u4e00-\u9fa5]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, sep)
        .replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '');
    }

    // Truncate to max length
    if (slug.length > maxLen) {
      slug = slug.slice(0, maxLen).replace(new RegExp(`${sep}+$`), '');
    }

    this.slugOutput.textContent = slug;
    this.urlPreview.textContent = slug;
    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.slugOutput.textContent);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.inputText.value = '';
    this.slugOutput.textContent = '';
    this.urlPreview.textContent = '';
    this.resultArea.style.display = 'none';
    this.copyBtn.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.slugGenerator = new SlugGenerator();
});

export default SlugGenerator;
