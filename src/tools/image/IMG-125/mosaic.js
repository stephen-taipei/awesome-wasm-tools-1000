/**
 * IMG-125 圖片馬賽克生成
 * 多種馬賽克風格效果
 */

class MosaicGenerator {
  constructor() {
    this.originalImage = null;
    this.currentStyle = 'pixel';
    this.blockSize = 15;
    this.colorCount = 64;
    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
  }

  bindElements() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.originalImg = document.getElementById('originalImage');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.ctx = this.resultCanvas.getContext('2d');
    this.previewSection = document.getElementById('previewSection');
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.applyBtn = document.getElementById('applyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.blockSizeInput = document.getElementById('blockSize');
    this.blockSizeValue = document.getElementById('blockSizeValue');
    this.colorCountInput = document.getElementById('colorCount');
    this.colorCountValue = document.getElementById('colorCountValue');
    this.styleItems = document.querySelectorAll('.style-item');
  }

  bindEvents() {
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', () => this.handleDragLeave());
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.styleItems.forEach(item => {
      item.addEventListener('click', () => this.selectStyle(item));
    });

    this.blockSizeInput.addEventListener('input', () => {
      this.blockSize = parseInt(this.blockSizeInput.value);
      this.blockSizeValue.textContent = `${this.blockSize} px`;
    });

    this.colorCountInput.addEventListener('input', () => {
      this.colorCount = parseInt(this.colorCountInput.value);
      this.colorCountValue.textContent = this.colorCount;
    });

    this.applyBtn.addEventListener('click', () => this.apply());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave() {
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      this.loadImage(file);
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.loadImage(file);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalImg.src = e.target.result;
        this.uploadZone.classList.add('has-file');
        this.previewSection.classList.add('active');
        this.applyBtn.disabled = false;

        document.getElementById('originalSize').textContent =
          `${img.width} x ${img.height}`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  selectStyle(item) {
    this.styleItems.forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    this.currentStyle = item.dataset.style;
  }

  async apply() {
    if (!this.originalImage) return;

    const startTime = performance.now();
    this.showProgress('開始處理...', 0);
    this.applyBtn.disabled = true;

    try {
      // Create temp canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.originalImage.width;
      tempCanvas.height = this.originalImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(this.originalImage, 0, 0);

      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

      // Set result canvas size
      this.resultCanvas.width = this.originalImage.width;
      this.resultCanvas.height = this.originalImage.height;

      // Apply selected style
      switch (this.currentStyle) {
        case 'pixel':
          await this.pixelMosaic(imageData);
          break;
        case 'circle':
          await this.circleMosaic(imageData);
          break;
        case 'hex':
          await this.hexMosaic(imageData);
          break;
        case 'diamond':
          await this.diamondMosaic(imageData);
          break;
        case 'triangle':
          await this.triangleMosaic(imageData);
          break;
        case 'lego':
          await this.legoMosaic(imageData);
          break;
        case 'ascii':
          await this.asciiMosaic(imageData);
          break;
        case 'dots':
          await this.dotsMosaic(imageData);
          break;
        case 'cross':
          await this.crossMosaic(imageData);
          break;
        case 'glass':
          await this.glassMosaic(imageData);
          break;
      }

      const endTime = performance.now();
      document.getElementById('processTime').textContent =
        `${((endTime - startTime) / 1000).toFixed(2)} 秒`;

      this.hideProgress();
      this.downloadBtn.disabled = false;
      this.showStatus('馬賽克生成完成！', 'success');

    } catch (error) {
      console.error('Mosaic error:', error);
      this.showStatus('處理失敗：' + error.message, 'error');
      this.hideProgress();
    }

    this.applyBtn.disabled = false;
  }

  getBlockColor(imageData, x, y, w, h) {
    const data = imageData.data;
    const width = imageData.width;
    let r = 0, g = 0, b = 0, count = 0;

    const endX = Math.min(x + w, imageData.width);
    const endY = Math.min(y + h, imageData.height);

    for (let py = y; py < endY; py++) {
      for (let px = x; px < endX; px++) {
        const idx = (py * width + px) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }

    if (count === 0) return { r: 0, g: 0, b: 0 };

    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    };
  }

  quantizeColor(color) {
    const levels = Math.ceil(Math.pow(this.colorCount, 1/3));
    const step = 255 / (levels - 1);
    return {
      r: Math.round(Math.round(color.r / step) * step),
      g: Math.round(Math.round(color.g / step) * step),
      b: Math.round(Math.round(color.b / step) * step)
    };
  }

  async pixelMosaic(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const size = this.blockSize;

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);

    let blockCount = 0;
    const totalBlocks = Math.ceil(width / size) * Math.ceil(height / size);

    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const color = this.quantizeColor(this.getBlockColor(imageData, x, y, size, size));
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.fillRect(x, y, size, size);
        blockCount++;
      }

      if (y % (size * 10) === 0) {
        this.showProgress(`處理中... ${Math.round(y / height * 100)}%`, y / height * 100);
        await this.sleep(1);
      }
    }

    document.getElementById('blockCount').textContent = blockCount.toLocaleString();
    document.getElementById('usedColors').textContent = this.colorCount;
  }

  async circleMosaic(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const size = this.blockSize;

    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, width, height);

    let blockCount = 0;

    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const color = this.quantizeColor(this.getBlockColor(imageData, x, y, size, size));
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.beginPath();
        this.ctx.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
        this.ctx.fill();
        blockCount++;
      }

      if (y % (size * 10) === 0) {
        this.showProgress(`處理中... ${Math.round(y / height * 100)}%`, y / height * 100);
        await this.sleep(1);
      }
    }

    document.getElementById('blockCount').textContent = blockCount.toLocaleString();
    document.getElementById('usedColors').textContent = this.colorCount;
  }

  async hexMosaic(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const size = this.blockSize;
    const hexHeight = size * Math.sqrt(3);
    const hexWidth = size * 2;

    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, width, height);

    let blockCount = 0;

    const drawHex = (cx, cy, radius, color) => {
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i - Math.PI / 6;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.fill();
    };

    let row = 0;
    for (let y = 0; y < height + hexHeight; y += hexHeight * 0.75) {
      const offset = row % 2 === 0 ? 0 : hexWidth * 0.75;
      for (let x = offset; x < width + hexWidth; x += hexWidth * 1.5) {
        const sampleX = Math.max(0, Math.min(x - size, width - size));
        const sampleY = Math.max(0, Math.min(y - size, height - size));
        const color = this.quantizeColor(this.getBlockColor(imageData, sampleX, sampleY, size * 2, size * 2));
        drawHex(x, y, size, `rgb(${color.r}, ${color.g}, ${color.b})`);
        blockCount++;
      }
      row++;

      if (row % 10 === 0) {
        this.showProgress(`處理中... ${Math.round(y / height * 100)}%`, y / height * 100);
        await this.sleep(1);
      }
    }

    document.getElementById('blockCount').textContent = blockCount.toLocaleString();
    document.getElementById('usedColors').textContent = this.colorCount;
  }

  async diamondMosaic(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const size = this.blockSize;

    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, width, height);

    let blockCount = 0;

    const drawDiamond = (cx, cy, size, color) => {
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - size);
      this.ctx.lineTo(cx + size, cy);
      this.ctx.lineTo(cx, cy + size);
      this.ctx.lineTo(cx - size, cy);
      this.ctx.closePath();
      this.ctx.fill();
    };

    let row = 0;
    for (let y = 0; y < height + size; y += size) {
      const offset = row % 2 === 0 ? 0 : size;
      for (let x = offset; x < width + size * 2; x += size * 2) {
        const sampleX = Math.max(0, Math.min(x - size, width - size * 2));
        const sampleY = Math.max(0, Math.min(y - size, height - size * 2));
        const color = this.quantizeColor(this.getBlockColor(imageData, sampleX, sampleY, size * 2, size * 2));
        drawDiamond(x, y, size, `rgb(${color.r}, ${color.g}, ${color.b})`);
        blockCount++;
      }
      row++;

      if (row % 10 === 0) {
        this.showProgress(`處理中... ${Math.round(y / height * 100)}%`, y / height * 100);
        await this.sleep(1);
      }
    }

    document.getElementById('blockCount').textContent = blockCount.toLocaleString();
    document.getElementById('usedColors').textContent = this.colorCount;
  }

  async triangleMosaic(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const size = this.blockSize;
    const triHeight = size * Math.sqrt(3) / 2;

    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, width, height);

    let blockCount = 0;

    const drawTriangle = (x1, y1, x2, y2, x3, y3, color) => {
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.lineTo(x3, y3);
      this.ctx.closePath();
      this.ctx.fill();
    };

    for (let y = 0; y < height; y += triHeight) {
      for (let x = 0; x < width; x += size) {
        const row = Math.floor(y / triHeight);
        const pointUp = (Math.floor(x / size) + row) % 2 === 0;

        const sampleX = Math.max(0, Math.min(x, width - size));
        const sampleY = Math.max(0, Math.min(y, height - size));
        const color = this.quantizeColor(this.getBlockColor(imageData, sampleX, sampleY, size, size));
        const colorStr = `rgb(${color.r}, ${color.g}, ${color.b})`;

        if (pointUp) {
          drawTriangle(x, y + triHeight, x + size / 2, y, x + size, y + triHeight, colorStr);
        } else {
          drawTriangle(x, y, x + size / 2, y + triHeight, x + size, y, colorStr);
        }
        blockCount++;
      }

      if (Math.floor(y / triHeight) % 10 === 0) {
        this.showProgress(`處理中... ${Math.round(y / height * 100)}%`, y / height * 100);
        await this.sleep(1);
      }
    }

    document.getElementById('blockCount').textContent = blockCount.toLocaleString();
    document.getElementById('usedColors').textContent = this.colorCount;
  }

  async legoMosaic(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const size = this.blockSize;
    const studSize = size * 0.4;

    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(0, 0, width, height);

    let blockCount = 0;

    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const color = this.quantizeColor(this.getBlockColor(imageData, x, y, size, size));

        // Draw base brick
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

        // Draw stud (circular bump)
        const cx = x + size / 2;
        const cy = y + size / 2;

        // Stud highlight
        const lightColor = {
          r: Math.min(255, color.r + 40),
          g: Math.min(255, color.g + 40),
          b: Math.min(255, color.b + 40)
        };
        const darkColor = {
          r: Math.max(0, color.r - 40),
          g: Math.max(0, color.g - 40),
          b: Math.max(0, color.b - 40)
        };

        this.ctx.fillStyle = `rgb(${lightColor.r}, ${lightColor.g}, ${lightColor.b})`;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, studSize, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = `rgb(${darkColor.r}, ${darkColor.g}, ${darkColor.b})`;
        this.ctx.beginPath();
        this.ctx.arc(cx + 1, cy + 1, studSize * 0.7, 0, Math.PI * 2);
        this.ctx.fill();

        blockCount++;
      }

      if (y % (size * 10) === 0) {
        this.showProgress(`處理中... ${Math.round(y / height * 100)}%`, y / height * 100);
        await this.sleep(1);
      }
    }

    document.getElementById('blockCount').textContent = blockCount.toLocaleString();
    document.getElementById('usedColors').textContent = this.colorCount;
  }

  async asciiMosaic(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const size = this.blockSize;
    const chars = ' .:-=+*#%@';

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.font = `${size}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    let blockCount = 0;

    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const color = this.getBlockColor(imageData, x, y, size, size);
        const brightness = (color.r + color.g + color.b) / 3;
        const charIndex = Math.floor(brightness / 255 * (chars.length - 1));
        const char = chars[charIndex];

        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.fillText(char, x + size / 2, y + size / 2);
        blockCount++;
      }

      if (y % (size * 10) === 0) {
        this.showProgress(`處理中... ${Math.round(y / height * 100)}%`, y / height * 100);
        await this.sleep(1);
      }
    }

    document.getElementById('blockCount').textContent = blockCount.toLocaleString();
    document.getElementById('usedColors').textContent = this.colorCount;
  }

  async dotsMosaic(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const size = this.blockSize;

    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, width, height);

    let blockCount = 0;

    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const color = this.quantizeColor(this.getBlockColor(imageData, x, y, size, size));
        const brightness = (color.r + color.g + color.b) / 3;
        const radius = (1 - brightness / 255) * size / 2 * 0.9;

        if (radius > 0.5) {
          this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          this.ctx.beginPath();
          this.ctx.arc(x + size / 2, y + size / 2, radius, 0, Math.PI * 2);
          this.ctx.fill();
        }
        blockCount++;
      }

      if (y % (size * 10) === 0) {
        this.showProgress(`處理中... ${Math.round(y / height * 100)}%`, y / height * 100);
        await this.sleep(1);
      }
    }

    document.getElementById('blockCount').textContent = blockCount.toLocaleString();
    document.getElementById('usedColors').textContent = this.colorCount;
  }

  async crossMosaic(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const size = this.blockSize;

    this.ctx.fillStyle = '#f5f0e6';
    this.ctx.fillRect(0, 0, width, height);

    let blockCount = 0;

    const drawCross = (x, y, size, color) => {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;

      // Draw X stitch
      this.ctx.beginPath();
      this.ctx.moveTo(x + 2, y + 2);
      this.ctx.lineTo(x + size - 2, y + size - 2);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(x + size - 2, y + 2);
      this.ctx.lineTo(x + 2, y + size - 2);
      this.ctx.stroke();
    };

    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const color = this.quantizeColor(this.getBlockColor(imageData, x, y, size, size));
        drawCross(x, y, size, `rgb(${color.r}, ${color.g}, ${color.b})`);
        blockCount++;
      }

      if (y % (size * 10) === 0) {
        this.showProgress(`處理中... ${Math.round(y / height * 100)}%`, y / height * 100);
        await this.sleep(1);
      }
    }

    document.getElementById('blockCount').textContent = blockCount.toLocaleString();
    document.getElementById('usedColors').textContent = this.colorCount;
  }

  async glassMosaic(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const size = this.blockSize;

    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(0, 0, width, height);

    let blockCount = 0;

    // Create irregular glass tiles with Voronoi-like effect
    const points = [];
    for (let y = size / 2; y < height; y += size) {
      for (let x = size / 2; x < width; x += size) {
        points.push({
          x: x + (Math.random() - 0.5) * size * 0.6,
          y: y + (Math.random() - 0.5) * size * 0.6
        });
      }
    }

    // Draw each pixel with closest point's color
    const tempData = this.ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minDist = Infinity;
        let closestPoint = points[0];

        for (const p of points) {
          const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
          if (dist < minDist) {
            minDist = dist;
            closestPoint = p;
          }
        }

        const sampleX = Math.max(0, Math.min(Math.floor(closestPoint.x), width - 1));
        const sampleY = Math.max(0, Math.min(Math.floor(closestPoint.y), height - 1));
        const srcIdx = (sampleY * width + sampleX) * 4;

        let color = {
          r: imageData.data[srcIdx],
          g: imageData.data[srcIdx + 1],
          b: imageData.data[srcIdx + 2]
        };

        // Add glass-like transparency variation
        const edgeDist = minDist % (size * 0.8);
        if (edgeDist < 2) {
          color = { r: 50, g: 50, b: 50 }; // Dark grout
        }

        color = this.quantizeColor(color);

        const dstIdx = (y * width + x) * 4;
        tempData.data[dstIdx] = color.r;
        tempData.data[dstIdx + 1] = color.g;
        tempData.data[dstIdx + 2] = color.b;
        tempData.data[dstIdx + 3] = 255;
      }

      if (y % 50 === 0) {
        this.showProgress(`處理中... ${Math.round(y / height * 100)}%`, y / height * 100);
        await this.sleep(1);
      }
    }

    this.ctx.putImageData(tempData, 0, 0);

    document.getElementById('blockCount').textContent = points.length.toLocaleString();
    document.getElementById('usedColors').textContent = this.colorCount;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showProgress(text, percent) {
    this.progressSection.classList.add('active');
    this.progressText.textContent = text;
    this.progressFill.style.width = `${percent}%`;
  }

  hideProgress() {
    this.progressSection.classList.remove('active');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }

  download() {
    const link = document.createElement('a');
    link.download = `mosaic-${this.currentStyle}-${Date.now()}.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.originalImg.src = '';
    this.ctx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.applyBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';
    this.statusMessage.className = 'status-message';

    document.getElementById('originalSize').textContent = '-';
    document.getElementById('blockCount').textContent = '-';
    document.getElementById('usedColors').textContent = '-';
    document.getElementById('processTime').textContent = '-';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new MosaicGenerator();
});
