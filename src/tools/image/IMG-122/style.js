/**
 * IMG-122 圖片風格轉換
 * 套用多種藝術風格效果
 */

class StyleTransfer {
  constructor() {
    this.image = null;
    this.selectedStyle = 'cyberpunk';

    this.init();
  }

  init() {
    this.canvas = document.getElementById('resultCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

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
        this.handleFile(file);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });

    // Style selection
    document.querySelectorAll('.style-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.style-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.selectedStyle = item.dataset.style;
      });
    });

    // Sliders
    document.getElementById('intensity').addEventListener('input', (e) => {
      document.getElementById('intensityValue').textContent = `${e.target.value}%`;
    });

    document.getElementById('blend').addEventListener('input', (e) => {
      document.getElementById('blendValue').textContent = `${e.target.value}%`;
    });

    // Buttons
    document.getElementById('applyBtn').addEventListener('click', () => this.apply());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        document.getElementById('originalImage').src = e.target.result;
        document.getElementById('uploadZone').classList.add('has-file');
        document.getElementById('applyBtn').disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async apply() {
    if (!this.image) return;

    this.showProgress(true);
    this.updateProgress(0, '正在準備圖片...');

    const intensity = parseInt(document.getElementById('intensity').value) / 100;
    const blend = parseInt(document.getElementById('blend').value) / 100;

    // Setup canvas
    this.canvas.width = this.image.width;
    this.canvas.height = this.image.height;
    this.ctx.drawImage(this.image, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    await this.delay(100);
    this.updateProgress(20, `正在套用 ${this.getStyleName()} 風格...`);

    // Apply selected style
    const styledData = await this.applyStyle(imageData, this.selectedStyle, intensity);

    await this.delay(100);
    this.updateProgress(80, '正在混合效果...');

    // Blend with original
    if (blend < 1) {
      const originalData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.image, 0, 0);
      const origPixels = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      for (let i = 0; i < styledData.data.length; i += 4) {
        styledData.data[i] = origPixels.data[i] * (1 - blend) + styledData.data[i] * blend;
        styledData.data[i + 1] = origPixels.data[i + 1] * (1 - blend) + styledData.data[i + 1] * blend;
        styledData.data[i + 2] = origPixels.data[i + 2] * (1 - blend) + styledData.data[i + 2] * blend;
      }
    }

    this.ctx.putImageData(styledData, 0, 0);

    this.updateProgress(100, '完成！');

    document.getElementById('previewSection').classList.add('active');
    document.getElementById('downloadBtn').disabled = false;

    await this.delay(200);
    this.showProgress(false);
    this.showStatus('success', '風格轉換完成！');
  }

  async applyStyle(imageData, style, intensity) {
    const data = imageData.data;

    switch (style) {
      case 'cyberpunk':
        return this.applyCyberpunk(imageData, intensity);
      case 'vaporwave':
        return this.applyVaporwave(imageData, intensity);
      case 'retrowave':
        return this.applyRetrowave(imageData, intensity);
      case 'noir':
        return this.applyNoir(imageData, intensity);
      case 'pop':
        return this.applyPopArt(imageData, intensity);
      case 'infrared':
        return this.applyInfrared(imageData, intensity);
      case 'dreamy':
        return this.applyDreamy(imageData, intensity);
      case 'hdr':
        return this.applyHDR(imageData, intensity);
      case 'lomo':
        return this.applyLomo(imageData, intensity);
      case 'matrix':
        return this.applyMatrix(imageData, intensity);
      default:
        return imageData;
    }
  }

  applyCyberpunk(imageData, intensity) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Increase contrast
      r = this.clamp((r - 128) * 1.3 + 128);
      g = this.clamp((g - 128) * 1.3 + 128);
      b = this.clamp((b - 128) * 1.3 + 128);

      // Add cyan/magenta split toning
      const lum = (r + g + b) / 3;
      if (lum < 128) {
        // Shadows: Add cyan/blue
        b = this.clamp(b + 40 * intensity);
        g = this.clamp(g + 20 * intensity);
      } else {
        // Highlights: Add magenta/pink
        r = this.clamp(r + 30 * intensity);
        b = this.clamp(b + 15 * intensity);
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    return imageData;
  }

  applyVaporwave(imageData, intensity) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Pink/purple/cyan color shift
      const newR = this.clamp(r * 0.8 + g * 0.1 + b * 0.1 + 50 * intensity);
      const newG = this.clamp(r * 0.1 + g * 0.6 + b * 0.3);
      const newB = this.clamp(r * 0.2 + g * 0.2 + b * 0.6 + 40 * intensity);

      // Add saturation
      const gray = (newR + newG + newB) / 3;
      data[i] = this.clamp(gray + (newR - gray) * 1.4);
      data[i + 1] = this.clamp(gray + (newG - gray) * 1.4);
      data[i + 2] = this.clamp(gray + (newB - gray) * 1.4);
    }

    return imageData;
  }

  applyRetrowave(imageData, intensity) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let i = 0; i < data.length; i += 4) {
      const y = Math.floor((i / 4) / width);
      const progress = y / height;

      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Gradient from orange/pink to purple/blue
      const orangeAmount = (1 - progress) * intensity;
      const blueAmount = progress * intensity;

      r = this.clamp(r + 60 * orangeAmount - 20 * blueAmount);
      g = this.clamp(g - 30 * orangeAmount - 10 * blueAmount);
      b = this.clamp(b - 40 * orangeAmount + 80 * blueAmount);

      // Increase contrast
      r = this.clamp((r - 128) * 1.2 + 128);
      g = this.clamp((g - 128) * 1.2 + 128);
      b = this.clamp((b - 128) * 1.2 + 128);

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    return imageData;
  }

  applyNoir(imageData, intensity) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Convert to grayscale with high contrast
      let gray = r * 0.299 + g * 0.587 + b * 0.114;

      // Apply S-curve for contrast
      gray = gray / 255;
      gray = gray < 0.5
        ? 2 * gray * gray
        : 1 - 2 * (1 - gray) * (1 - gray);
      gray = gray * 255;

      // Crush blacks
      gray = this.clamp((gray - 30) * 1.1);

      // Add slight blue tint
      const finalR = this.clamp(gray - 5 * intensity);
      const finalG = this.clamp(gray);
      const finalB = this.clamp(gray + 10 * intensity);

      data[i] = finalR;
      data[i + 1] = finalG;
      data[i + 2] = finalB;
    }

    return imageData;
  }

  applyPopArt(imageData, intensity) {
    const data = imageData.data;
    const levels = Math.round(4 + (1 - intensity) * 4);

    for (let i = 0; i < data.length; i += 4) {
      // Posterize
      data[i] = Math.round(data[i] / (256 / levels)) * (256 / levels);
      data[i + 1] = Math.round(data[i + 1] / (256 / levels)) * (256 / levels);
      data[i + 2] = Math.round(data[i + 2] / (256 / levels)) * (256 / levels);

      // Boost saturation
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = this.clamp(gray + (data[i] - gray) * (1.5 + intensity));
      data[i + 1] = this.clamp(gray + (data[i + 1] - gray) * (1.5 + intensity));
      data[i + 2] = this.clamp(gray + (data[i + 2] - gray) * (1.5 + intensity));
    }

    return imageData;
  }

  applyInfrared(imageData, intensity) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Swap red and blue, boost green as red
      const newR = this.clamp((g * 1.2 + r * 0.3) * intensity + r * (1 - intensity));
      const newG = this.clamp(g * 0.3 * intensity + g * (1 - intensity));
      const newB = this.clamp((r * 0.8 + b * 0.2) * intensity + b * (1 - intensity));

      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;
    }

    return imageData;
  }

  applyDreamy(imageData, intensity) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // First pass: lighten and desaturate slightly
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Lift shadows
      r = this.clamp(r + 30 * intensity);
      g = this.clamp(g + 30 * intensity);
      b = this.clamp(b + 30 * intensity);

      // Reduce saturation
      const gray = (r + g + b) / 3;
      r = gray + (r - gray) * (1 - 0.3 * intensity);
      g = gray + (g - gray) * (1 - 0.3 * intensity);
      b = gray + (b - gray) * (1 - 0.3 * intensity);

      // Add warm tint
      r = this.clamp(r + 15 * intensity);
      b = this.clamp(b - 10 * intensity);

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    // Simple blur simulation (box blur)
    const tempData = new Uint8ClampedArray(data);
    const radius = Math.round(2 * intensity);

    if (radius > 0) {
      for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
          let sumR = 0, sumG = 0, sumB = 0, count = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4;
              sumR += tempData[idx];
              sumG += tempData[idx + 1];
              sumB += tempData[idx + 2];
              count++;
            }
          }

          const idx = (y * width + x) * 4;
          // Blend blur with original (screen blend mode effect)
          data[idx] = this.clamp(tempData[idx] * 0.7 + (sumR / count) * 0.3);
          data[idx + 1] = this.clamp(tempData[idx + 1] * 0.7 + (sumG / count) * 0.3);
          data[idx + 2] = this.clamp(tempData[idx + 2] * 0.7 + (sumB / count) * 0.3);
        }
      }
    }

    return imageData;
  }

  applyHDR(imageData, intensity) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Local contrast enhancement
      const lum = (r + g + b) / 3;

      // Tone mapping curve
      const mapped = 255 * (1 - Math.exp(-lum / 100));
      const factor = mapped / (lum + 1);

      r = this.clamp(r * (1 + (factor - 1) * intensity));
      g = this.clamp(g * (1 + (factor - 1) * intensity));
      b = this.clamp(b * (1 + (factor - 1) * intensity));

      // Boost saturation
      const gray = (r + g + b) / 3;
      r = this.clamp(gray + (r - gray) * (1 + 0.5 * intensity));
      g = this.clamp(gray + (g - gray) * (1 + 0.5 * intensity));
      b = this.clamp(gray + (b - gray) * (1 + 0.5 * intensity));

      // Add clarity (local contrast)
      const contrast = 1 + 0.3 * intensity;
      r = this.clamp((r - 128) * contrast + 128);
      g = this.clamp((g - 128) * contrast + 128);
      b = this.clamp((b - 128) * contrast + 128);

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    return imageData;
  }

  applyLomo(imageData, intensity) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Cross-process effect
      r = this.clamp(r * 1.1);
      g = this.clamp(g * 0.9);
      b = this.clamp(b * 1.2);

      // Increase contrast
      r = this.clamp((r - 128) * 1.3 + 128);
      g = this.clamp((g - 128) * 1.3 + 128);
      b = this.clamp((b - 128) * 1.3 + 128);

      // Boost saturation
      const gray = (r + g + b) / 3;
      r = this.clamp(gray + (r - gray) * 1.4);
      g = this.clamp(gray + (g - gray) * 1.4);
      b = this.clamp(gray + (b - gray) * 1.4);

      // Vignette
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const vignette = 1 - (dist / maxDist) * 0.7 * intensity;

      data[i] = this.clamp(r * vignette);
      data[i + 1] = this.clamp(g * vignette);
      data[i + 2] = this.clamp(b * vignette);
    }

    return imageData;
  }

  applyMatrix(imageData, intensity) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert to green-tinted grayscale
      const lum = r * 0.299 + g * 0.587 + b * 0.114;

      // Apply green matrix effect
      const newR = this.clamp(lum * 0.2 * intensity + r * (1 - intensity));
      const newG = this.clamp(lum * 1.2 * intensity + g * (1 - intensity));
      const newB = this.clamp(lum * 0.3 * intensity + b * (1 - intensity));

      // Add slight scanline effect based on position
      const y = Math.floor((i / 4) / imageData.width);
      const scanline = (y % 2 === 0) ? 1 : 0.9;

      data[i] = this.clamp(newR * scanline);
      data[i + 1] = this.clamp(newG * scanline);
      data[i + 2] = this.clamp(newB * scanline);
    }

    return imageData;
  }

  getStyleName() {
    const names = {
      cyberpunk: '賽博龐克',
      vaporwave: '蒸氣波',
      retrowave: '復古波',
      noir: '黑色電影',
      pop: '普普藝術',
      infrared: '紅外線',
      dreamy: '夢幻柔焦',
      hdr: 'HDR 效果',
      lomo: 'LOMO',
      matrix: '駭客任務'
    };
    return names[this.selectedStyle] || this.selectedStyle;
  }

  clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  download() {
    const link = document.createElement('a');
    link.download = `style_${this.selectedStyle}_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    this.showStatus('success', '圖片已下載！');
  }

  reset() {
    this.image = null;

    document.getElementById('fileInput').value = '';
    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('applyBtn').disabled = true;
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
  new StyleTransfer();
});
