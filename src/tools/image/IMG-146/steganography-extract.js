/**
 * IMG-146 圖片隱寫術（提取）
 * Steganography Extract Tool
 */

class SteganographyExtract {
  constructor() {
    this.loadedImage = null;
    this.imageData = null;

    this.settings = {
      bitsPerChannel: 2,
      channels: 'rgb',
      password: '',
      autoDetect: 'auto'
    };

    // 訊息標記（用於識別隱寫訊息）
    this.MARKER = 'STEG';
    this.VERSION = '01';

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Preview elements
    this.previewSection = document.getElementById('previewSection');
    this.previewImage = document.getElementById('previewImage');
    this.imageSize = document.getElementById('imageSize');
    this.detectStatus = document.getElementById('detectStatus');
    this.format = document.getElementById('format');

    // Settings elements
    this.settingsSection = document.getElementById('settingsSection');
    this.bitsPerChannelSelect = document.getElementById('bitsPerChannel');
    this.channelsSelect = document.getElementById('channels');
    this.passwordInput = document.getElementById('password');
    this.autoDetectSelect = document.getElementById('autoDetect');

    // Result elements
    this.resultSection = document.getElementById('resultSection');
    this.resultStatus = document.getElementById('resultStatus');
    this.resultContent = document.getElementById('resultContent');
    this.messageLength = document.getElementById('messageLength');
    this.messageBytes = document.getElementById('messageBytes');
    this.copyBtn = document.getElementById('copyBtn');

    // Buttons
    this.extractBtn = document.getElementById('extractBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Settings
    this.bitsPerChannelSelect.addEventListener('change', (e) => {
      this.settings.bitsPerChannel = parseInt(e.target.value);
    });

    this.channelsSelect.addEventListener('change', (e) => {
      this.settings.channels = e.target.value;
    });

    this.passwordInput.addEventListener('change', (e) => {
      this.settings.password = e.target.value;
    });

    this.autoDetectSelect.addEventListener('change', (e) => {
      this.settings.autoDetect = e.target.value;
    });

    // Buttons
    this.extractBtn.addEventListener('click', () => this.extractMessage());
    this.copyBtn.addEventListener('click', () => this.copyMessage());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  loadImage(file) {
    if (!file.type.startsWith('image/')) {
      this.showStatus('請選擇圖片檔案', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImage = img;
        this.previewImage.src = e.target.result;

        // 獲取圖片數據
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        this.imageData = ctx.getImageData(0, 0, img.width, img.height);

        // 更新資訊
        this.imageSize.textContent = `${img.width} × ${img.height}`;
        this.format.textContent = file.type.split('/')[1].toUpperCase();

        // 嘗試偵測隱寫訊息
        this.detectSteganography();

        // 顯示區塊
        this.uploadZone.classList.add('has-file');
        this.previewSection.classList.add('active');
        this.settingsSection.classList.add('active');
        this.extractBtn.disabled = false;

        this.showStatus('圖片載入成功！', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  detectSteganography() {
    // 嘗試偵測是否有隱寫訊息
    const configs = [
      { bits: 2, channels: 'rgb' },
      { bits: 1, channels: 'rgb' },
      { bits: 3, channels: 'rgb' },
      { bits: 2, channels: 'rg' },
      { bits: 2, channels: 'r' }
    ];

    for (const config of configs) {
      const header = this.tryExtractHeader(config.bits, config.channels);
      if (header && header.startsWith(this.MARKER)) {
        this.detectStatus.textContent = '已偵測到隱寫訊息';
        this.detectStatus.style.color = '#22c55e';
        this.bitsPerChannelSelect.value = config.bits;
        this.channelsSelect.value = config.channels;
        this.settings.bitsPerChannel = config.bits;
        this.settings.channels = config.channels;
        return;
      }
    }

    this.detectStatus.textContent = '未偵測到標準格式';
    this.detectStatus.style.color = '#f59e0b';
  }

  tryExtractHeader(bitsPerChannel, channels) {
    try {
      const headerLength = this.MARKER.length + this.VERSION.length;
      const data = this.extractData(bitsPerChannel, channels, headerLength);
      return new TextDecoder().decode(data);
    } catch {
      return null;
    }
  }

  extractData(bitsPerChannel, channels, byteCount) {
    const pixels = this.imageData.data;

    // 確定要使用的通道索引
    let channelIndices;
    switch (channels) {
      case 'rgb': channelIndices = [0, 1, 2]; break;
      case 'rg': channelIndices = [0, 1]; break;
      case 'r': channelIndices = [0]; break;
      default: channelIndices = [0, 1, 2];
    }

    // 建立位元遮罩
    const mask = (1 << bitsPerChannel) - 1;

    // 提取位元
    const bits = [];
    let pixelIndex = 0;

    while (bits.length < byteCount * 8 && pixelIndex < pixels.length / 4) {
      const baseIndex = pixelIndex * 4;

      for (const channelIdx of channelIndices) {
        if (bits.length >= byteCount * 8) break;

        const value = pixels[baseIndex + channelIdx] & mask;

        // 將位元加入陣列
        for (let b = bitsPerChannel - 1; b >= 0; b--) {
          bits.push((value >> b) & 1);
        }
      }

      pixelIndex++;
    }

    // 將位元轉換為位元組
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        byte = (byte << 1) | (bits[i * 8 + b] || 0);
      }
      bytes[i] = byte;
    }

    return bytes;
  }

  extractMessage() {
    if (!this.imageData) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    try {
      const bitsPerChannel = this.settings.autoDetect === 'auto'
        ? this.settings.bitsPerChannel
        : parseInt(this.bitsPerChannelSelect.value);

      const channels = this.settings.autoDetect === 'auto'
        ? this.settings.channels
        : this.channelsSelect.value;

      // 先提取標頭
      const headerLength = this.MARKER.length + this.VERSION.length + 4; // 4 bytes for length
      const headerData = this.extractData(bitsPerChannel, channels, headerLength);

      // 檢查標記
      const marker = new TextDecoder().decode(headerData.slice(0, this.MARKER.length));
      if (marker !== this.MARKER) {
        this.showExtractError('未找到有效的隱寫訊息標記');
        return;
      }

      // 檢查版本
      const version = new TextDecoder().decode(headerData.slice(this.MARKER.length, this.MARKER.length + this.VERSION.length));
      if (version !== this.VERSION) {
        this.showExtractError('版本不相容');
        return;
      }

      // 讀取訊息長度
      const lengthBytes = headerData.slice(this.MARKER.length + this.VERSION.length);
      const messageLength = new DataView(lengthBytes.buffer, lengthBytes.byteOffset).getUint32(0, false);

      if (messageLength <= 0 || messageLength > 10000000) {
        this.showExtractError('訊息長度異常');
        return;
      }

      // 提取完整訊息
      const totalLength = headerLength + messageLength;
      const fullData = this.extractData(bitsPerChannel, channels, totalLength);
      const messageData = fullData.slice(headerLength);

      // 解碼訊息
      let message = new TextDecoder().decode(messageData);

      // 解密（如果有密碼）
      if (this.settings.password) {
        try {
          message = this.decrypt(message, this.settings.password);
        } catch (e) {
          this.showExtractError('解密失敗，密碼可能不正確');
          return;
        }
      }

      // 顯示結果
      this.showExtractResult(message, messageData.length);

    } catch (error) {
      console.error('Extract error:', error);
      this.showExtractError('提取過程中發生錯誤');
    }
  }

  showExtractResult(message, bytes) {
    this.resultSection.classList.add('active');
    this.resultStatus.textContent = '成功';
    this.resultStatus.className = 'result-status success';
    this.resultContent.textContent = message;
    this.messageLength.textContent = message.length;
    this.messageBytes.textContent = bytes;

    this.showStatus('訊息提取成功！', 'success');
  }

  showExtractError(errorMessage) {
    this.resultSection.classList.add('active');
    this.resultStatus.textContent = '失敗';
    this.resultStatus.className = 'result-status error';
    this.resultContent.textContent = errorMessage;
    this.messageLength.textContent = '0';
    this.messageBytes.textContent = '0';

    this.showStatus(errorMessage, 'error');
  }

  // 簡單的 XOR 解密
  decrypt(encryptedText, password) {
    // 從 base64 解碼
    const encrypted = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    const encoder = new TextEncoder();
    const key = encoder.encode(password);

    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ key[i % key.length];
    }

    return new TextDecoder().decode(decrypted);
  }

  copyMessage() {
    const message = this.resultContent.textContent;
    navigator.clipboard.writeText(message).then(() => {
      this.showStatus('訊息已複製到剪貼簿', 'success');
    }).catch(() => {
      this.showStatus('複製失敗', 'error');
    });
  }

  reset() {
    this.loadedImage = null;
    this.imageData = null;

    // 重置 UI
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.settingsSection.classList.remove('active');
    this.resultSection.classList.remove('active');
    this.extractBtn.disabled = true;
    this.fileInput.value = '';

    // 重置輸入
    this.passwordInput.value = '';

    // 重置設定
    this.bitsPerChannelSelect.value = '2';
    this.channelsSelect.value = 'rgb';
    this.autoDetectSelect.value = 'auto';
    this.settings = {
      bitsPerChannel: 2,
      channels: 'rgb',
      password: '',
      autoDetect: 'auto'
    };

    // 重置偵測狀態
    this.detectStatus.textContent = '檢查中...';
    this.detectStatus.style.color = '';

    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new SteganographyExtract();
});
