/**
 * ENC-001: Base64 Encoder
 * Encodes text or files to Base64 format with URL-safe option.
 */

class Base64Encoder {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.fileInput = document.getElementById('fileInput');
    this.dropZone = document.getElementById('dropZone');
    this.fileName = document.getElementById('fileName');
    this.outputText = document.getElementById('outputText');
    this.encodeBtn = document.getElementById('encodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.urlSafe = document.getElementById('urlSafe');
    this.textInputSection = document.getElementById('textInputSection');
    this.fileInputSection = document.getElementById('fileInputSection');

    this.currentFile = null;
    this.bindEvents();
  }

  bindEvents() {
    // Input type toggle
    document.querySelectorAll('input[name="inputType"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.toggleInputType(e.target.value));
    });

    // Text input
    this.inputText.addEventListener('input', () => this.encode());

    // File input
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('drag-over');
    });
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    // Buttons
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.urlSafe.addEventListener('change', () => this.encode());
  }

  toggleInputType(type) {
    if (type === 'text') {
      this.textInputSection.style.display = 'block';
      this.fileInputSection.style.display = 'none';
    } else {
      this.textInputSection.style.display = 'none';
      this.fileInputSection.style.display = 'block';
    }
    this.clear();
  }

  handleFileSelect(e) {
    if (e.target.files.length) {
      this.handleFile(e.target.files[0]);
    }
  }

  handleFile(file) {
    this.currentFile = file;
    this.fileName.textContent = `${file.name} (${this.formatSize(file.size)})`;
    this.encode();
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  async encode() {
    const inputType = document.querySelector('input[name="inputType"]:checked').value;
    let result = '';

    try {
      if (inputType === 'text') {
        const text = this.inputText.value;
        if (!text) {
          this.resultArea.style.display = 'none';
          return;
        }
        // Encode text to Base64
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        result = this.arrayBufferToBase64(data);
      } else {
        if (!this.currentFile) {
          this.resultArea.style.display = 'none';
          return;
        }
        // Encode file to Base64
        const arrayBuffer = await this.currentFile.arrayBuffer();
        result = this.arrayBufferToBase64(new Uint8Array(arrayBuffer));
      }

      // Apply URL-safe encoding if selected
      if (this.urlSafe.checked) {
        result = result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      }

      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '編碼完成！');
    } catch (error) {
      this.showStatus('error', '編碼失敗：' + error.message);
    }
  }

  arrayBufferToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  clear() {
    this.inputText.value = '';
    this.currentFile = null;
    this.fileName.textContent = '';
    this.outputText.value = '';
    this.resultArea.style.display = 'none';
    this.fileInput.value = '';
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
    const blob = new Blob([this.outputText.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'base64_encoded.txt';
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
  window.base64Encoder = new Base64Encoder();
});

export default Base64Encoder;
