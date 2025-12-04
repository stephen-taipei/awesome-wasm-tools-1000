/**
 * IMG-118 圖片連續變形動畫
 * 將兩張圖片製作成平滑的漸變動畫
 */

class ImageMorpher {
  constructor() {
    this.images = [null, null];
    this.frames = [];
    this.isPlaying = false;
    this.currentFrame = 0;
    this.animationId = null;
    this.gifData = null;

    this.init();
  }

  init() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.bindEvents();
  }

  bindEvents() {
    // Setup both upload zones
    [1, 2].forEach(index => {
      const uploadZone = document.getElementById(`uploadZone${index}`);
      const fileInput = document.getElementById(`fileInput${index}`);

      uploadZone.addEventListener('click', () => fileInput.click());

      uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
      });

      uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
      });

      uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          this.handleFile(file, index - 1);
        }
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.handleFile(file, index - 1);
      });
    });

    // Settings
    document.getElementById('frameCount').addEventListener('input', (e) => {
      document.getElementById('frameCountValue').textContent = `${e.target.value} 幀`;
    });

    document.getElementById('duration').addEventListener('input', (e) => {
      document.getElementById('durationValue').textContent = `${(e.target.value / 1000).toFixed(1)} 秒`;
    });

    // Buttons
    document.getElementById('generateBtn').addEventListener('click', () => this.generate());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    document.getElementById('playBtn').addEventListener('click', () => this.togglePlay());
  }

  handleFile(file, index) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.images[index] = img;

        // Update upload zone
        const uploadZone = document.getElementById(`uploadZone${index + 1}`);
        uploadZone.classList.add('has-file');
        uploadZone.innerHTML = `<img src="${e.target.result}" alt="Image ${index + 1}">`;

        this.checkReady();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  checkReady() {
    const ready = this.images[0] !== null && this.images[1] !== null;
    document.getElementById('generateBtn').disabled = !ready;
  }

  getEasing(t, type) {
    switch (type) {
      case 'linear':
        return t;
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return t * (2 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'bounce':
        if (t < 0.5) {
          return 2 * t * t;
        } else {
          const p = 2 * t - 1;
          return 0.5 + 0.5 * Math.sin(p * Math.PI * 2) * Math.exp(-p * 3) + 0.5 * p;
        }
      default:
        return t;
    }
  }

  async generate() {
    if (!this.images[0] || !this.images[1]) return;

    this.stopAnimation();
    this.showProgress(true);
    this.updateProgress(0, '正在準備圖片...');

    const frameCount = parseInt(document.getElementById('frameCount').value);
    const easingType = document.getElementById('easingType').value;

    // Determine canvas size (use larger dimensions)
    const width = Math.max(this.images[0].width, this.images[1].width);
    const height = Math.max(this.images[0].height, this.images[1].height);

    // Limit max size
    const maxSize = 600;
    let canvasWidth = width;
    let canvasHeight = height;
    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      canvasWidth = Math.round(width * ratio);
      canvasHeight = Math.round(height * ratio);
    }

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    // Get image data for both images
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;

    // Draw and get data for image 1
    tempCtx.drawImage(this.images[0], 0, 0, canvasWidth, canvasHeight);
    const data1 = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);

    // Draw and get data for image 2
    tempCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    tempCtx.drawImage(this.images[1], 0, 0, canvasWidth, canvasHeight);
    const data2 = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);

    this.frames = [];

    // Generate frames
    for (let i = 0; i < frameCount; i++) {
      const progress = i / (frameCount - 1);
      const easedProgress = this.getEasing(progress, easingType);

      // Create frame by interpolating pixels
      const frameData = this.ctx.createImageData(canvasWidth, canvasHeight);

      for (let j = 0; j < data1.data.length; j += 4) {
        frameData.data[j] = Math.round(data1.data[j] + (data2.data[j] - data1.data[j]) * easedProgress);
        frameData.data[j + 1] = Math.round(data1.data[j + 1] + (data2.data[j + 1] - data1.data[j + 1]) * easedProgress);
        frameData.data[j + 2] = Math.round(data1.data[j + 2] + (data2.data[j + 2] - data1.data[j + 2]) * easedProgress);
        frameData.data[j + 3] = Math.round(data1.data[j + 3] + (data2.data[j + 3] - data1.data[j + 3]) * easedProgress);
      }

      this.frames.push(frameData);

      this.updateProgress(
        Math.round(((i + 1) / frameCount) * 100),
        `正在生成幀 ${i + 1} / ${frameCount}...`
      );

      // Yield to UI
      await this.delay(10);
    }

    // Show first frame
    this.ctx.putImageData(this.frames[0], 0, 0);
    this.currentFrame = 0;
    this.updateFrameIndicator();

    document.getElementById('previewSection').classList.add('active');
    document.getElementById('downloadBtn').disabled = false;

    this.showProgress(false);
    this.showStatus('success', '動畫生成完成！');

    // Auto play
    this.startAnimation();
  }

  startAnimation() {
    if (this.frames.length === 0) return;

    this.isPlaying = true;
    document.getElementById('playBtn').textContent = '⏸';

    const duration = parseInt(document.getElementById('duration').value);
    const frameDelay = duration / this.frames.length;
    let lastTime = 0;

    const animate = (timestamp) => {
      if (!this.isPlaying) return;

      if (timestamp - lastTime >= frameDelay) {
        this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        this.ctx.putImageData(this.frames[this.currentFrame], 0, 0);
        this.updateFrameIndicator();
        lastTime = timestamp;
      }

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  stopAnimation() {
    this.isPlaying = false;
    document.getElementById('playBtn').textContent = '▶';
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
  }

  updateFrameIndicator() {
    document.getElementById('frameIndicator').textContent =
      `${this.currentFrame + 1} / ${this.frames.length}`;
  }

  async download() {
    if (this.frames.length === 0) return;

    this.showProgress(true);
    this.updateProgress(0, '正在生成 GIF...');

    const duration = parseInt(document.getElementById('duration').value);
    const delay = Math.round(duration / this.frames.length / 10); // GIF delay in centiseconds

    // Simple GIF encoder
    const gif = await this.encodeGIF(delay);

    this.updateProgress(100, '下載中...');

    const blob = new Blob([gif], { type: 'image/gif' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morph_animation_${Date.now()}.gif`;
    a.click();
    URL.revokeObjectURL(url);

    this.showProgress(false);
    this.showStatus('success', 'GIF 下載完成！');
  }

  async encodeGIF(delay) {
    // Simple uncompressed GIF encoder
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Build color table from all frames
    const colorMap = new Map();
    const colors = [];

    // Sample colors from frames
    for (const frame of this.frames) {
      for (let i = 0; i < frame.data.length; i += 4) {
        const r = frame.data[i] & 0xF8;
        const g = frame.data[i + 1] & 0xF8;
        const b = frame.data[i + 2] & 0xF8;
        const key = (r << 16) | (g << 8) | b;

        if (!colorMap.has(key) && colors.length < 256) {
          colorMap.set(key, colors.length);
          colors.push([r, g, b]);
        }
      }
    }

    // Pad to 256 colors
    while (colors.length < 256) {
      colors.push([0, 0, 0]);
    }

    const output = [];

    // GIF Header
    output.push(...this.stringToBytes('GIF89a'));

    // Logical Screen Descriptor
    output.push(width & 0xFF, (width >> 8) & 0xFF);
    output.push(height & 0xFF, (height >> 8) & 0xFF);
    output.push(0xF7); // Global Color Table Flag + Color Resolution + Sort Flag + Size
    output.push(0x00); // Background Color Index
    output.push(0x00); // Pixel Aspect Ratio

    // Global Color Table
    for (const [r, g, b] of colors) {
      output.push(r, g, b);
    }

    // Netscape Extension for looping
    output.push(0x21, 0xFF, 0x0B);
    output.push(...this.stringToBytes('NETSCAPE2.0'));
    output.push(0x03, 0x01, 0x00, 0x00, 0x00);

    // Generate frames
    for (let f = 0; f < this.frames.length; f++) {
      const frame = this.frames[f];

      // Graphic Control Extension
      output.push(0x21, 0xF9, 0x04);
      output.push(0x00); // Disposal method
      output.push(delay & 0xFF, (delay >> 8) & 0xFF); // Delay
      output.push(0x00); // Transparent color index
      output.push(0x00);

      // Image Descriptor
      output.push(0x2C);
      output.push(0x00, 0x00); // Left
      output.push(0x00, 0x00); // Top
      output.push(width & 0xFF, (width >> 8) & 0xFF);
      output.push(height & 0xFF, (height >> 8) & 0xFF);
      output.push(0x00); // No local color table

      // Image Data
      const minCodeSize = 8;
      output.push(minCodeSize);

      // Convert frame to indexed colors
      const indexed = [];
      for (let i = 0; i < frame.data.length; i += 4) {
        const r = frame.data[i] & 0xF8;
        const g = frame.data[i + 1] & 0xF8;
        const b = frame.data[i + 2] & 0xF8;
        const key = (r << 16) | (g << 8) | b;
        indexed.push(colorMap.get(key) || 0);
      }

      // LZW encode
      const lzwData = this.lzwEncode(indexed, minCodeSize);

      // Split into sub-blocks
      for (let i = 0; i < lzwData.length; i += 255) {
        const blockSize = Math.min(255, lzwData.length - i);
        output.push(blockSize);
        output.push(...lzwData.slice(i, i + blockSize));
      }
      output.push(0x00); // Block terminator

      this.updateProgress(
        Math.round(((f + 1) / this.frames.length) * 90),
        `正在編碼幀 ${f + 1} / ${this.frames.length}...`
      );

      await this.delay(5);
    }

    // GIF Trailer
    output.push(0x3B);

    return new Uint8Array(output);
  }

  lzwEncode(data, minCodeSize) {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;

    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    const dictionary = new Map();

    // Initialize dictionary
    for (let i = 0; i < clearCode; i++) {
      dictionary.set(String(i), i);
    }

    const output = [];
    let buffer = 0;
    let bufferLength = 0;

    const writeCode = (code) => {
      buffer |= code << bufferLength;
      bufferLength += codeSize;

      while (bufferLength >= 8) {
        output.push(buffer & 0xFF);
        buffer >>= 8;
        bufferLength -= 8;
      }
    };

    writeCode(clearCode);

    let current = String(data[0]);

    for (let i = 1; i < data.length; i++) {
      const char = String(data[i]);
      const combined = current + ',' + char;

      if (dictionary.has(combined)) {
        current = combined;
      } else {
        writeCode(dictionary.get(current));

        if (nextCode < 4096) {
          dictionary.set(combined, nextCode++);

          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          writeCode(clearCode);
          codeSize = minCodeSize + 1;
          nextCode = eoiCode + 1;
          dictionary.clear();
          for (let j = 0; j < clearCode; j++) {
            dictionary.set(String(j), j);
          }
        }

        current = char;
      }
    }

    writeCode(dictionary.get(current));
    writeCode(eoiCode);

    if (bufferLength > 0) {
      output.push(buffer & 0xFF);
    }

    return output;
  }

  stringToBytes(str) {
    return str.split('').map(c => c.charCodeAt(0));
  }

  reset() {
    this.stopAnimation();
    this.images = [null, null];
    this.frames = [];
    this.currentFrame = 0;
    this.gifData = null;

    [1, 2].forEach(index => {
      const uploadZone = document.getElementById(`uploadZone${index}`);
      uploadZone.classList.remove('has-file');
      uploadZone.innerHTML = `
        <div class="upload-icon">🖼️</div>
        <div class="upload-text">點擊或拖曳${index === 1 ? '起始' : '結束'}圖片</div>
        <div class="upload-hint">PNG、JPG、WebP</div>
      `;
      document.getElementById(`fileInput${index}`).value = '';
    });

    document.getElementById('generateBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('previewSection').classList.remove('active');
    document.getElementById('statusMessage').className = 'status-message';
  }

  showProgress(show) {
    document.getElementById('progressSection').classList.toggle('active', show);
  }

  updateProgress(percent, text) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = text;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showStatus(type, message) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.className = `status-message ${type}`;
    statusEl.textContent = message;

    if (type === 'success') {
      setTimeout(() => {
        statusEl.className = 'status-message';
      }, 3000);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageMorpher();
});
