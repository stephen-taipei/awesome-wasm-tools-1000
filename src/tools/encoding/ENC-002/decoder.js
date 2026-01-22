/**
 * ENC-002: Base64 Decoder
 * Decodes Base64 to original text or binary file.
 */

class Base64Decoder {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.decodeBtn = document.getElementById('decodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.textResult = document.getElementById('textResult');

    this.decodedData = null;
    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.decode());
    this.decodeBtn.addEventListener('click', () => this.decode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.downloadBtn.addEventListener('click', () => this.download());
  }

  decode() {
    let input = this.inputText.value.trim();
    if (!input) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      // Normalize URL-safe Base64
      input = input.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      while (input.length % 4) {
        input += '=';
      }

      // Decode Base64
      const binary = atob(input);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      this.decodedData = bytes;

      // Try to decode as text
      const outputType = document.querySelector('input[name="outputType"]:checked').value;
      if (outputType === 'text') {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const text = decoder.decode(bytes);
        this.outputText.value = text;
        this.textResult.style.display = 'block';
      } else {
        this.outputText.value = `二進位資料 (${this.formatSize(bytes.length)})`;
        this.textResult.style.display = 'block';
      }

      this.resultArea.style.display = 'block';
      this.showStatus('success', '解碼完成！');
    } catch (error) {
      this.showStatus('error', '解碼失敗：無效的 Base64 格式');
      this.resultArea.style.display = 'none';
    }
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.decodedData = null;
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

  download() {
    if (!this.decodedData) return;

    const outputType = document.querySelector('input[name="outputType"]:checked').value;
    let blob, filename;

    if (outputType === 'text') {
      blob = new Blob([this.outputText.value], { type: 'text/plain' });
      filename = 'decoded_text.txt';
    } else {
      blob = new Blob([this.decodedData], { type: 'application/octet-stream' });
      filename = 'decoded_file.bin';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    this.showStatus('success', '檔案已下載！');
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
  window.base64Decoder = new Base64Decoder();
});

export default Base64Decoder;
