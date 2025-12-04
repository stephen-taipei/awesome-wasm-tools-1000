/**
 * IMG-106 Sprite 圖合併
 * 將多張小圖合併成 CSS Sprite 圖
 */

class SpriteGenerator {
  constructor() {
    this.images = [];
    this.spriteDataUrl = '';
    this.cssCode = '';
    this.spriteWidth = 0;
    this.spriteHeight = 0;

    this.init();
  }

  init() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.imagesList = document.getElementById('imagesList');
    this.imagesGrid = document.getElementById('imagesGrid');
    this.imageCount = document.getElementById('imageCount');
    this.settingsSection = document.getElementById('settingsSection');

    this.layoutSelect = document.getElementById('layout');
    this.paddingInput = document.getElementById('padding');
    this.classPrefixInput = document.getElementById('classPrefix');
    this.cssFormatSelect = document.getElementById('cssFormat');

    this.statusMessage = document.getElementById('statusMessage');
    this.resultSection = document.getElementById('resultSection');
    this.spriteImage = document.getElementById('spriteImage');
    this.outputStats = document.getElementById('outputStats');
    this.cssCodeEl = document.getElementById('cssCode');

    this.generateBtn = document.getElementById('generateBtn');
    this.downloadImageBtn = document.getElementById('downloadImageBtn');
    this.downloadCssBtn = document.getElementById('downloadCssBtn');
    this.copyCssBtn = document.getElementById('copyCssBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadZone.classList.add('dragover');
    });
    this.uploadZone.addEventListener('dragleave', () => {
      this.uploadZone.classList.remove('dragover');
    });
    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadZone.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });
    this.fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    // Buttons
    this.generateBtn.addEventListener('click', () => this.generate());
    this.downloadImageBtn.addEventListener('click', () => this.downloadImage());
    this.downloadCssBtn.addEventListener('click', () => this.downloadCss());
    this.copyCssBtn.addEventListener('click', () => this.copyCss());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      this.showStatus('error', '請選擇圖片檔案');
      return;
    }

    this.showStatus('processing', '正在載入圖片...');

    let loaded = 0;
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Generate a clean name from filename
          const name = file.name.replace(/\.[^.]+$/, '')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .toLowerCase();

          this.images.push({
            name,
            img,
            width: img.width,
            height: img.height,
            dataUrl: e.target.result
          });

          loaded++;
          if (loaded === imageFiles.length) {
            this.updateImagesList();
            this.showStatus('success', `成功載入 ${imageFiles.length} 張圖片`);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  updateImagesList() {
    this.imagesGrid.innerHTML = '';
    this.images.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'image-item';
      div.innerHTML = `
        <img src="${item.dataUrl}" alt="${item.name}">
        <button class="remove-btn" data-index="${index}">×</button>
        <div class="image-name">${item.name}</div>
      `;
      this.imagesGrid.appendChild(div);
    });

    // Add remove handlers
    this.imagesGrid.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        this.images.splice(index, 1);
        this.updateImagesList();
      });
    });

    this.imageCount.textContent = this.images.length;

    if (this.images.length > 0) {
      this.uploadZone.classList.add('has-file');
      this.imagesList.classList.add('active');
      this.settingsSection.classList.add('active');
      this.generateBtn.disabled = false;
    } else {
      this.uploadZone.classList.remove('has-file');
      this.imagesList.classList.remove('active');
      this.settingsSection.classList.remove('active');
      this.generateBtn.disabled = true;
    }
  }

  generate() {
    if (this.images.length === 0) return;

    this.showStatus('processing', '正在生成 Sprite 圖...');

    const layout = this.layoutSelect.value;
    const padding = parseInt(this.paddingInput.value) || 0;
    const prefix = this.classPrefixInput.value || 'sprite';
    const cssFormat = this.cssFormatSelect.value;

    // Calculate positions based on layout
    let positions = [];

    if (layout === 'horizontal') {
      positions = this.layoutHorizontal(padding);
    } else if (layout === 'vertical') {
      positions = this.layoutVertical(padding);
    } else {
      positions = this.layoutPacked(padding);
    }

    // Create sprite canvas
    const canvas = document.createElement('canvas');
    canvas.width = this.spriteWidth;
    canvas.height = this.spriteHeight;
    const ctx = canvas.getContext('2d');

    // Draw all images
    positions.forEach((pos, i) => {
      ctx.drawImage(this.images[i].img, pos.x, pos.y);
    });

    // Generate data URL
    this.spriteDataUrl = canvas.toDataURL('image/png');
    this.spriteImage.src = this.spriteDataUrl;

    // Generate CSS
    this.cssCode = this.generateCss(positions, prefix, cssFormat);
    this.cssCodeEl.textContent = this.cssCode;

    // Update stats
    this.outputStats.innerHTML = `
      <div class="stat-item">
        <div class="stat-label">Sprite 尺寸</div>
        <div class="stat-value">${this.spriteWidth} x ${this.spriteHeight}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">圖片數量</div>
        <div class="stat-value">${this.images.length}</div>
      </div>
    `;

    this.resultSection.classList.add('active');
    this.downloadImageBtn.disabled = false;
    this.downloadCssBtn.disabled = false;
    this.copyCssBtn.disabled = false;

    this.showStatus('success', 'Sprite 圖生成完成');
  }

  layoutHorizontal(padding) {
    let x = 0;
    let maxHeight = 0;
    const positions = [];

    this.images.forEach(item => {
      positions.push({ x, y: 0 });
      x += item.width + padding;
      maxHeight = Math.max(maxHeight, item.height);
    });

    this.spriteWidth = x - padding;
    this.spriteHeight = maxHeight;

    return positions;
  }

  layoutVertical(padding) {
    let y = 0;
    let maxWidth = 0;
    const positions = [];

    this.images.forEach(item => {
      positions.push({ x: 0, y });
      y += item.height + padding;
      maxWidth = Math.max(maxWidth, item.width);
    });

    this.spriteWidth = maxWidth;
    this.spriteHeight = y - padding;

    return positions;
  }

  layoutPacked(padding) {
    // Sort images by height (descending) for better packing
    const indexed = this.images.map((item, i) => ({ ...item, originalIndex: i }));
    indexed.sort((a, b) => b.height - a.height);

    // Simple bin packing algorithm
    const positions = new Array(this.images.length);
    const placed = [];

    // Estimate initial width
    const totalArea = this.images.reduce((sum, item) => sum + item.width * item.height, 0);
    let canvasWidth = Math.ceil(Math.sqrt(totalArea) * 1.2);

    // Place images
    indexed.forEach(item => {
      let bestX = 0;
      let bestY = Infinity;

      // Try each x position
      for (let x = 0; x <= canvasWidth - item.width; x += 10) {
        let y = 0;

        // Find the lowest y position at this x
        placed.forEach(p => {
          if (x < p.x + p.width + padding && x + item.width + padding > p.x) {
            y = Math.max(y, p.y + p.height + padding);
          }
        });

        if (y < bestY) {
          bestY = y;
          bestX = x;
        }
      }

      const pos = { x: bestX, y: bestY, width: item.width, height: item.height };
      placed.push(pos);
      positions[item.originalIndex] = { x: bestX, y: bestY };
    });

    // Calculate final dimensions
    this.spriteWidth = Math.max(...placed.map(p => p.x + p.width));
    this.spriteHeight = Math.max(...placed.map(p => p.y + p.height));

    return positions;
  }

  generateCss(positions, prefix, format) {
    let css = '';

    if (format === 'class') {
      // Base class
      css += `.${prefix} {\n`;
      css += `  background-image: url('sprite.png');\n`;
      css += `  background-repeat: no-repeat;\n`;
      css += `  display: inline-block;\n`;
      css += `}\n\n`;

      // Individual classes
      positions.forEach((pos, i) => {
        const item = this.images[i];
        css += `.${prefix}-${item.name} {\n`;
        css += `  width: ${item.width}px;\n`;
        css += `  height: ${item.height}px;\n`;
        css += `  background-position: -${pos.x}px -${pos.y}px;\n`;
        css += `}\n\n`;
      });
    } else if (format === 'mixin') {
      // SCSS mixin
      css += `@mixin ${prefix}($name) {\n`;
      css += `  background-image: url('sprite.png');\n`;
      css += `  background-repeat: no-repeat;\n`;
      css += `  display: inline-block;\n`;
      css += `}\n\n`;

      positions.forEach((pos, i) => {
        const item = this.images[i];
        css += `@mixin ${prefix}-${item.name} {\n`;
        css += `  @include ${prefix};\n`;
        css += `  width: ${item.width}px;\n`;
        css += `  height: ${item.height}px;\n`;
        css += `  background-position: -${pos.x}px -${pos.y}px;\n`;
        css += `}\n\n`;
      });
    } else if (format === 'variables') {
      // CSS variables
      css += `:root {\n`;
      css += `  --${prefix}-image: url('sprite.png');\n`;
      positions.forEach((pos, i) => {
        const item = this.images[i];
        css += `  --${prefix}-${item.name}-width: ${item.width}px;\n`;
        css += `  --${prefix}-${item.name}-height: ${item.height}px;\n`;
        css += `  --${prefix}-${item.name}-x: -${pos.x}px;\n`;
        css += `  --${prefix}-${item.name}-y: -${pos.y}px;\n`;
      });
      css += `}\n\n`;

      css += `.${prefix} {\n`;
      css += `  background-image: var(--${prefix}-image);\n`;
      css += `  background-repeat: no-repeat;\n`;
      css += `  display: inline-block;\n`;
      css += `}\n\n`;

      positions.forEach((pos, i) => {
        const item = this.images[i];
        css += `.${prefix}-${item.name} {\n`;
        css += `  width: var(--${prefix}-${item.name}-width);\n`;
        css += `  height: var(--${prefix}-${item.name}-height);\n`;
        css += `  background-position: var(--${prefix}-${item.name}-x) var(--${prefix}-${item.name}-y);\n`;
        css += `}\n\n`;
      });
    }

    return css;
  }

  downloadImage() {
    if (!this.spriteDataUrl) return;

    const link = document.createElement('a');
    link.href = this.spriteDataUrl;
    link.download = 'sprite.png';
    link.click();

    this.showStatus('success', 'Sprite 圖片已下載');
  }

  downloadCss() {
    if (!this.cssCode) return;

    const blob = new Blob([this.cssCode], { type: 'text/css' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sprite.css';
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'CSS 檔案已下載');
  }

  async copyCss() {
    if (!this.cssCode) return;

    try {
      await navigator.clipboard.writeText(this.cssCode);
      this.showStatus('success', 'CSS 已複製到剪貼簿');
    } catch (error) {
      this.showStatus('error', '複製失敗');
    }
  }

  reset() {
    this.images = [];
    this.spriteDataUrl = '';
    this.cssCode = '';
    this.spriteWidth = 0;
    this.spriteHeight = 0;

    this.uploadZone.classList.remove('has-file');
    this.imagesList.classList.remove('active');
    this.settingsSection.classList.remove('active');
    this.resultSection.classList.remove('active');

    this.imagesGrid.innerHTML = '';
    this.imageCount.textContent = '0';
    this.spriteImage.src = '';
    this.cssCodeEl.textContent = '';
    this.outputStats.innerHTML = '';

    this.fileInput.value = '';
    this.layoutSelect.value = 'horizontal';
    this.paddingInput.value = '2';
    this.classPrefixInput.value = 'sprite';
    this.cssFormatSelect.value = 'class';

    this.generateBtn.disabled = true;
    this.downloadImageBtn.disabled = true;
    this.downloadCssBtn.disabled = true;
    this.copyCssBtn.disabled = true;

    this.hideStatus();
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    if (type === 'success') {
      setTimeout(() => this.hideStatus(), 3000);
    }
  }

  hideStatus() {
    this.statusMessage.className = 'status-message';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new SpriteGenerator();
});
