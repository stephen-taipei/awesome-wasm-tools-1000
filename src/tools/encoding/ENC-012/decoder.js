/**
 * ENC-012: URL Decoder
 * Decodes URL percent-encoded text.
 */

class UrlDecoder {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.decodeBtn = document.getElementById('decodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.multiDecode = document.getElementById('multiDecode');
    this.plusToSpace = document.getElementById('plusToSpace');

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.decode());
    this.decodeBtn.addEventListener('click', () => this.decode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.multiDecode.addEventListener('change', () => this.decode());
    this.plusToSpace.addEventListener('change', () => this.decode());
  }

  decode() {
    let input = this.inputText.value;
    if (!input) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      // Replace + with space if option is enabled
      if (this.plusToSpace.checked) {
        input = input.replace(/\+/g, ' ');
      }

      let result = decodeURIComponent(input);

      // Multi-decode for double-encoded strings
      if (this.multiDecode.checked) {
        let prev = result;
        let maxIterations = 10;
        while (maxIterations-- > 0) {
          try {
            const decoded = decodeURIComponent(result.replace(/\+/g, ' '));
            if (decoded === result) break;
            prev = result;
            result = decoded;
          } catch {
            break;
          }
        }
      }

      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '解碼完成！');
    } catch (error) {
      this.showStatus('error', '解碼失敗：無效的 URL 編碼格式');
      this.resultArea.style.display = 'none';
    }
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.value);
      this.showStatus('success', '已複製到剪貼簿！');
    } catch (error) {
      this.showStatus('error', '複製失敗');
    }
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
  window.urlDecoder = new UrlDecoder();
});

export default UrlDecoder;
