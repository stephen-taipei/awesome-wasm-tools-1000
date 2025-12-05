/**
 * IMG-145 圖片隱寫術（嵌入）
 * Steganography Embed Tool
 */

class SteganographyEmbed {
  constructor() {
    this.originalImage = null;
    this.resultCanvas = null;
    this.maxCapacity = 0;

    this.settings = {
      bitsPerChannel: 2,
      channels: 'rgb',
      password: '',
      quality: 'png'
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
    this.capacity = document.getElementById('capacity');
    this.format = document.getElementById('format');

    // Message elements
    this.messageSection = document.getElementById('messageSection');
    this.messageInput = document.getElementById('messageInput');
    this.charCount = document.getElementById('charCount');
    this.usagePercent = document.getElementById('usagePercent');
    this.capacityFill = document.getElementById('capacityFill');

    // Settings elements
    this.settingsSection = document.getElementById('settingsSection');
    this.bitsPerChannelSelect = document.getElementById('bitsPerChannel');
    this.channelsSelect = document.getElementById('channels');
    this.passwordInput = document.getElementById('password');
    this.qualitySelect = document.getElementById('quality');

    // Buttons
    this.embedBtn = document.getElementById('embedBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
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

    // Message input
    this.messageInput.addEventListener('input', () => this.updateCapacityUsage());

    // Settings
    this.bitsPerChannelSelect.addEventListener('change', (e) => {
      this.settings.bitsPerChannel = parseInt(e.target.value);
      this.updateCapacity();
    });

    this.channelsSelect.addEventListener('change', (e) => {
      this.settings.channels = e.target.value;
      this.updateCapacity();
    });

    this.passwordInput.addEventListener('change', (e) => {
      this.settings.password = e.target.value;
    });

    this.qualitySelect.addEventListener('change', (e) => {
      this.settings.quality = e.target.value;
    });

    // Buttons
    this.embedBtn.addEventListener('click', () => this.embedMessage());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
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
        this.originalImage = img;
        this.previewImage.src = e.target.result;

        // 更新資訊
        this.imageSize.textContent = `${img.width} × ${img.height}`;
        this.format.textContent = file.type.split('/')[1].toUpperCase();

        // 顯示區塊
        this.uploadZone.classList.add('has-file');
        this.previewSection.classList.add('active');
        this.messageSection.classList.add('active');
        this.settingsSection.classList.add('active');
        this.embedBtn.disabled = false;

        this.updateCapacity();
        this.showStatus('圖片載入成功！', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateCapacity() {
    if (!this.originalImage) return;

    const width = this.originalImage.width;
    const height = this.originalImage.height;
    const totalPixels = width * height;

    // 計算可用通道數
    let channelCount;
    switch (this.settings.channels) {
      case 'rgb': channelCount = 3; break;
      case 'rg': channelCount = 2; break;
      case 'r': channelCount = 1; break;
      default: channelCount = 3;
    }

    // 計算容量（位元）
    const totalBits = totalPixels * channelCount * this.settings.bitsPerChannel;
    // 減去標頭資訊所需空間
    const headerBits = (this.MARKER.length + this.VERSION.length + 4) * 8; // 4 bytes for length
    const availableBits = totalBits - headerBits;

    // 轉換為字元數（UTF-8 平均約 1.5 bytes per char for 中文，簡化為 2 bytes）
    this.maxCapacity = Math.floor(availableBits / 16);

    this.capacity.textContent = `${this.formatBytes(this.maxCapacity)} (約 ${this.maxCapacity} 字元)`;
    this.updateCapacityUsage();
  }

  updateCapacityUsage() {
    const message = this.messageInput.value;
    const byteLength = new TextEncoder().encode(message).length;
    const charLength = message.length;

    this.charCount.textContent = charLength;

    const usagePercent = this.maxCapacity > 0 ? Math.min(100, (byteLength / this.maxCapacity) * 100) : 0;
    this.usagePercent.textContent = usagePercent.toFixed(1);
    this.capacityFill.style.width = `${usagePercent}%`;

    // 更新顏色
    this.capacityFill.classList.remove('warning', 'danger');
    if (usagePercent > 90) {
      this.capacityFill.classList.add('danger');
    } else if (usagePercent > 70) {
      this.capacityFill.classList.add('warning');
    }
  }

  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  embedMessage() {
    const message = this.messageInput.value;

    if (!message) {
      this.showStatus('請輸入要隱藏的訊息', 'error');
      return;
    }

    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    try {
      // 創建畫布
      this.resultCanvas = document.createElement('canvas');
      this.resultCanvas.width = this.originalImage.width;
      this.resultCanvas.height = this.originalImage.height;
      const ctx = this.resultCanvas.getContext('2d');

      // 繪製原始圖片
      ctx.drawImage(this.originalImage, 0, 0);

      // 獲取圖片數據
      const imageData = ctx.getImageData(0, 0, this.resultCanvas.width, this.resultCanvas.height);

      // 準備訊息數據
      let messageData = message;

      // 加密（如果有密碼）
      if (this.settings.password) {
        messageData = this.encrypt(message, this.settings.password);
      }

      // 編碼訊息為二進位
      const encodedMessage = new TextEncoder().encode(messageData);

      // 建立完整數據包（標記 + 版本 + 長度 + 訊息）
      const header = new TextEncoder().encode(this.MARKER + this.VERSION);
      const lengthBytes = new Uint8Array(4);
      new DataView(lengthBytes.buffer).setUint32(0, encodedMessage.length, false);

      const fullData = new Uint8Array(header.length + lengthBytes.length + encodedMessage.length);
      fullData.set(header, 0);
      fullData.set(lengthBytes, header.length);
      fullData.set(encodedMessage, header.length + lengthBytes.length);

      // 嵌入數據
      this.embedData(imageData.data, fullData);

      // 寫回畫布
      ctx.putImageData(imageData, 0, 0);

      this.downloadBtn.disabled = false;
      this.showStatus('訊息嵌入成功！', 'success');
    } catch (error) {
      console.error('Embed error:', error);
      this.showStatus('嵌入過程中發生錯誤', 'error');
    }
  }

  embedData(pixels, data) {
    const bitsPerChannel = this.settings.bitsPerChannel;
    const channels = this.settings.channels;

    // 確定要使用的通道索引
    let channelIndices;
    switch (channels) {
      case 'rgb': channelIndices = [0, 1, 2]; break;
      case 'rg': channelIndices = [0, 1]; break;
      case 'r': channelIndices = [0]; break;
      default: channelIndices = [0, 1, 2];
    }

    // 將數據轉換為位元陣列
    const bits = [];
    for (const byte of data) {
      for (let i = 7; i >= 0; i--) {
        bits.push((byte >> i) & 1);
      }
    }

    // 建立位元遮罩
    const mask = (1 << bitsPerChannel) - 1;
    const clearMask = ~mask;

    let bitIndex = 0;
    let pixelIndex = 0;

    while (bitIndex < bits.length && pixelIndex < pixels.length / 4) {
      const baseIndex = pixelIndex * 4;

      for (const channelIdx of channelIndices) {
        if (bitIndex >= bits.length) break;

        // 取出要嵌入的位元
        let valueBits = 0;
        for (let b = 0; b < bitsPerChannel && bitIndex < bits.length; b++) {
          valueBits = (valueBits << 1) | bits[bitIndex++];
        }

        // 嵌入到像素
        pixels[baseIndex + channelIdx] = (pixels[baseIndex + channelIdx] & clearMask) | valueBits;
      }

      pixelIndex++;
    }

    if (bitIndex < bits.length) {
      throw new Error('圖片容量不足以嵌入訊息');
    }
  }

  // 簡單的 XOR 加密
  encrypt(text, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const key = encoder.encode(password);

    const encrypted = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ key[i % key.length];
    }

    // 轉為 base64
    return btoa(String.fromCharCode(...encrypted));
  }

  downloadImage() {
    if (!this.resultCanvas) {
      this.showStatus('請先嵌入訊息', 'error');
      return;
    }

    const link = document.createElement('a');
    const timestamp = Date.now();

    if (this.settings.quality === 'png') {
      link.download = `steganography_${timestamp}.png`;
      link.href = this.resultCanvas.toDataURL('image/png');
    } else {
      link.download = `steganography_${timestamp}.bmp`;
      // BMP 需要特殊處理，這裡簡化為 PNG
      link.href = this.resultCanvas.toDataURL('image/png');
    }

    link.click();
    this.showStatus('隱寫圖片已下載！', 'success');
  }

  reset() {
    this.originalImage = null;
    this.resultCanvas = null;
    this.maxCapacity = 0;

    // 重置 UI
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.messageSection.classList.remove('active');
    this.settingsSection.classList.remove('active');
    this.embedBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // 重置輸入
    this.messageInput.value = '';
    this.passwordInput.value = '';
    this.charCount.textContent = '0';
    this.usagePercent.textContent = '0';
    this.capacityFill.style.width = '0%';

    // 重置設定
    this.bitsPerChannelSelect.value = '2';
    this.channelsSelect.value = 'rgb';
    this.qualitySelect.value = 'png';
    this.settings = {
      bitsPerChannel: 2,
      channels: 'rgb',
      password: '',
      quality: 'png'
    };

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
  new SteganographyEmbed();
});
