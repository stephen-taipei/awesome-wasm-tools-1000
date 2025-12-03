/**
 * IMG-093 調色盤提取
 * 從圖片中提取主要顏色組成調色盤
 */

class PaletteExtractor {
  constructor() {
    this.sourceImage = null;
    this.palette = [];
    this.colorCount = 6;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.resultSection = document.getElementById('resultSection');
    this.previewImage = document.getElementById('previewImage');
    this.paletteDisplay = document.getElementById('paletteDisplay');
    this.paletteStrip = document.getElementById('paletteStrip');
    this.loading = document.getElementById('loading');
    this.colorCountSelect = document.getElementById('colorCount');

    this.exportBtn = document.getElementById('exportBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('drag-over');
    });
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('drag-over');
    });
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file);
    });

    // Color count change
    this.colorCountSelect.addEventListener('change', () => {
      this.colorCount = parseInt(this.colorCountSelect.value);
      if (this.sourceImage) {
        this.extractPalette();
      }
    });

    // Buttons
    this.exportBtn.addEventListener('click', () => this.exportPalette());
    this.downloadBtn.addEventListener('click', () => this.downloadPaletteImage());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.previewImage.src = e.target.result;
        this.uploadArea.style.display = 'none';
        this.resultSection.classList.add('active');
        this.exportBtn.disabled = false;
        this.downloadBtn.disabled = false;

        this.extractPalette();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  extractPalette() {
    this.loading.style.display = 'block';
    this.paletteDisplay.innerHTML = '';
    this.paletteStrip.innerHTML = '';

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const colors = this.quantize(this.sourceImage, this.colorCount);
      this.palette = colors;
      this.displayPalette(colors);
      this.loading.style.display = 'none';
      this.showStatus('success', `已提取 ${colors.length} 個主要顏色`);
    }, 100);
  }

  quantize(img, numColors) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Sample at smaller size for performance
    const maxSize = 150;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = [];

    // Collect pixels
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Skip transparent pixels
      if (imageData.data[i + 3] < 128) continue;

      pixels.push({
        r: imageData.data[i],
        g: imageData.data[i + 1],
        b: imageData.data[i + 2]
      });
    }

    // K-means clustering
    return this.kMeans(pixels, numColors);
  }

  kMeans(pixels, k) {
    if (pixels.length === 0) return [];

    // Initialize centroids randomly
    const centroids = [];
    const usedIndices = new Set();

    while (centroids.length < k && centroids.length < pixels.length) {
      const idx = Math.floor(Math.random() * pixels.length);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        centroids.push({ ...pixels[idx] });
      }
    }

    const maxIterations = 20;
    let assignments = new Array(pixels.length).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign pixels to nearest centroid
      const newAssignments = pixels.map(pixel => {
        let minDist = Infinity;
        let nearest = 0;

        for (let c = 0; c < centroids.length; c++) {
          const dist = this.colorDistance(pixel, centroids[c]);
          if (dist < minDist) {
            minDist = dist;
            nearest = c;
          }
        }

        return nearest;
      });

      // Check for convergence
      let changed = false;
      for (let i = 0; i < newAssignments.length; i++) {
        if (newAssignments[i] !== assignments[i]) {
          changed = true;
          break;
        }
      }

      assignments = newAssignments;

      if (!changed) break;

      // Update centroids
      for (let c = 0; c < centroids.length; c++) {
        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        for (let i = 0; i < pixels.length; i++) {
          if (assignments[i] === c) {
            sumR += pixels[i].r;
            sumG += pixels[i].g;
            sumB += pixels[i].b;
            count++;
          }
        }

        if (count > 0) {
          centroids[c] = {
            r: Math.round(sumR / count),
            g: Math.round(sumG / count),
            b: Math.round(sumB / count)
          };
        }
      }
    }

    // Count pixels per cluster
    const counts = new Array(centroids.length).fill(0);
    for (const a of assignments) {
      counts[a]++;
    }

    // Create result with percentages
    const result = centroids.map((c, i) => ({
      r: c.r,
      g: c.g,
      b: c.b,
      hex: this.rgbToHex(c.r, c.g, c.b),
      percentage: Math.round((counts[i] / pixels.length) * 100)
    }));

    // Sort by percentage (most dominant first)
    result.sort((a, b) => b.percentage - a.percentage);

    return result;
  }

  colorDistance(c1, c2) {
    // Weighted Euclidean distance (human perception)
    const rMean = (c1.r + c2.r) / 2;
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;

    return Math.sqrt(
      (2 + rMean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rMean) / 256) * db * db
    );
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  displayPalette(colors) {
    this.paletteDisplay.innerHTML = '';
    this.paletteStrip.innerHTML = '';

    colors.forEach(color => {
      // Palette item
      const item = document.createElement('div');
      item.className = 'palette-color';
      item.innerHTML = `
        <div class="color-swatch" style="background: ${color.hex}"></div>
        <div class="color-info">
          <div class="color-hex">${color.hex.toUpperCase()}</div>
          <div class="color-rgb">rgb(${color.r}, ${color.g}, ${color.b})</div>
          <div class="color-percentage">${color.percentage}% 佔比</div>
        </div>
        <div class="copy-indicator">點擊複製</div>
      `;
      item.addEventListener('click', () => {
        navigator.clipboard.writeText(color.hex).then(() => {
          this.showStatus('success', `已複製 ${color.hex}`);
        });
      });
      this.paletteDisplay.appendChild(item);

      // Strip color
      const strip = document.createElement('div');
      strip.className = 'palette-strip-color';
      strip.style.background = color.hex;
      strip.style.flex = color.percentage;
      strip.title = `${color.hex} (${color.percentage}%)`;
      strip.addEventListener('click', () => {
        navigator.clipboard.writeText(color.hex).then(() => {
          this.showStatus('success', `已複製 ${color.hex}`);
        });
      });
      this.paletteStrip.appendChild(strip);
    });
  }

  exportPalette() {
    if (this.palette.length === 0) return;

    let text = '調色盤\n======\n\n';
    this.palette.forEach((color, i) => {
      text += `顏色 ${i + 1}: ${color.hex.toUpperCase()}\n`;
      text += `RGB: rgb(${color.r}, ${color.g}, ${color.b})\n`;
      text += `佔比: ${color.percentage}%\n\n`;
    });

    // CSS variables format
    text += '\nCSS 變數格式:\n';
    this.palette.forEach((color, i) => {
      text += `--color-${i + 1}: ${color.hex};\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      this.showStatus('success', '調色盤已複製到剪貼簿');
    });
  }

  downloadPaletteImage() {
    if (this.palette.length === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const swatchSize = 100;
    const padding = 20;
    canvas.width = this.palette.length * swatchSize + padding * 2;
    canvas.height = swatchSize + padding * 2 + 40;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw color swatches
    this.palette.forEach((color, i) => {
      const x = padding + i * swatchSize;
      const y = padding;

      // Color swatch
      ctx.fillStyle = color.hex;
      ctx.fillRect(x, y, swatchSize - 4, swatchSize);

      // Hex label
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(color.hex.toUpperCase(), x + swatchSize / 2 - 2, y + swatchSize + 20);
    });

    canvas.toBlob(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `palette_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '調色盤圖片已下載');
    });
  }

  reset() {
    this.sourceImage = null;
    this.palette = [];
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.resultSection.classList.remove('active');
    this.exportBtn.disabled = true;
    this.downloadBtn.disabled = true;

    this.previewImage.src = '';
    this.paletteDisplay.innerHTML = '';
    this.paletteStrip.innerHTML = '';
    this.colorCountSelect.value = '6';
    this.colorCount = 6;

    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        this.statusMessage.style.display = 'none';
      }, 2000);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new PaletteExtractor();
});
