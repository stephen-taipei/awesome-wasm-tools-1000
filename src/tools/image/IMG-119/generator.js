/**
 * IMG-119 圖片懶人包生成器
 * 批量處理圖片並生成 Lazy Load 代碼
 */

class LazyPackGenerator {
  constructor() {
    this.images = [];
    this.processedData = [];
    this.currentTab = 'code';

    this.init();
  }

  init() {
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
      this.handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    // Code tabs
    document.querySelectorAll('.code-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.displayCode();
      });
    });

    // Buttons
    document.getElementById('generateBtn').addEventListener('click', () => this.generate());
    document.getElementById('copyBtn').addEventListener('click', () => this.copyCode());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.images.push({
            file: file,
            name: file.name,
            img: img,
            dataUrl: e.target.result
          });

          this.updatePreview();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  updatePreview() {
    const grid = document.getElementById('previewGrid');
    const count = document.getElementById('previewCount');
    const fileCount = document.getElementById('fileCount');

    grid.innerHTML = this.images.map((item, index) => `
      <div class="preview-item" data-index="${index}">
        <img src="${item.dataUrl}" alt="${item.name}">
        <button class="remove-btn" onclick="generator.removeImage(${index})">×</button>
        <span class="item-index">${index + 1}</span>
      </div>
    `).join('');

    count.textContent = `${this.images.length} 張圖片`;
    fileCount.textContent = `已選 ${this.images.length} 張圖片`;
    fileCount.style.display = this.images.length > 0 ? 'inline-block' : 'none';

    document.getElementById('previewSection').classList.toggle('active', this.images.length > 0);
    document.getElementById('uploadZone').classList.toggle('has-file', this.images.length > 0);
    document.getElementById('generateBtn').disabled = this.images.length === 0;
  }

  removeImage(index) {
    this.images.splice(index, 1);
    this.updatePreview();
  }

  async generate() {
    if (this.images.length === 0) return;

    this.showProgress(true);
    this.processedData = [];

    const thumbWidth = parseInt(document.getElementById('thumbWidth').value);
    const quality = parseFloat(document.getElementById('quality').value);
    const includeBlur = document.getElementById('includeBlur').checked;
    const includeAspect = document.getElementById('includeAspect').checked;
    const includeAlt = document.getElementById('includeAlt').checked;

    for (let i = 0; i < this.images.length; i++) {
      const item = this.images[i];

      this.updateProgress(
        Math.round(((i + 0.5) / this.images.length) * 100),
        `處理中: ${item.name}...`
      );

      const data = {
        index: i,
        name: item.name,
        originalWidth: item.img.width,
        originalHeight: item.img.height,
        aspectRatio: (item.img.width / item.img.height).toFixed(4)
      };

      if (includeBlur) {
        // Generate tiny blurred placeholder
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const ratio = item.img.height / item.img.width;
        canvas.width = thumbWidth;
        canvas.height = Math.round(thumbWidth * ratio);

        ctx.drawImage(item.img, 0, 0, canvas.width, canvas.height);
        data.placeholder = canvas.toDataURL('image/jpeg', quality);
      }

      if (includeAlt) {
        // Generate alt text from filename
        data.alt = this.generateAltText(item.name);
      }

      if (includeAspect) {
        data.aspectRatio = (item.img.width / item.img.height).toFixed(4);
      }

      this.processedData.push(data);

      await this.delay(50);
    }

    this.updateProgress(100, '完成！');

    // Generate code
    this.displayCode();

    document.getElementById('outputSection').classList.add('active');
    document.getElementById('copyBtn').disabled = false;
    document.getElementById('downloadBtn').disabled = false;

    this.showProgress(false);
    this.showStatus('success', '懶人包生成完成！');
  }

  generateAltText(filename) {
    // Remove extension and convert to readable text
    const name = filename.replace(/\.[^/.]+$/, '');
    return name
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  displayCode() {
    const codeOutput = document.getElementById('codeOutput');
    const format = document.getElementById('codeFormat').value;
    const includeBlur = document.getElementById('includeBlur').checked;

    let code = '';

    switch (this.currentTab) {
      case 'code':
        code = this.generateMainCode(format, includeBlur);
        break;
      case 'css':
        code = this.generateCSS();
        break;
      case 'js':
        code = this.generateJS();
        break;
    }

    codeOutput.textContent = code;
  }

  generateMainCode(format, includeBlur) {
    if (format === 'html') {
      return this.processedData.map((data, i) => {
        let html = `<div class="lazy-image-wrapper" style="aspect-ratio: ${data.aspectRatio};">`;

        if (includeBlur && data.placeholder) {
          html += `\n  <img class="lazy-placeholder" src="${data.placeholder}" alt="">`;
        }

        html += `\n  <img class="lazy-image"
    data-src="images/${data.name}"
    ${data.alt ? `alt="${data.alt}"` : 'alt=""'}
    loading="lazy">`;

        html += `\n</div>`;
        return html;
      }).join('\n\n');
    }

    if (format === 'react') {
      return `import React from 'react';
import LazyImage from './LazyImage';

const ImageGallery = () => {
  const images = [
${this.processedData.map(data => `    {
      src: 'images/${data.name}',
      ${data.placeholder ? `placeholder: '${data.placeholder}',` : ''}
      alt: '${data.alt || ''}',
      aspectRatio: ${data.aspectRatio}
    }`).join(',\n')}
  ];

  return (
    <div className="gallery">
      {images.map((img, index) => (
        <LazyImage key={index} {...img} />
      ))}
    </div>
  );
};

export default ImageGallery;`;
    }

    if (format === 'vue') {
      return `<template>
  <div class="gallery">
    <LazyImage
      v-for="(img, index) in images"
      :key="index"
      v-bind="img"
    />
  </div>
</template>

<script setup>
const images = [
${this.processedData.map(data => `  {
    src: 'images/${data.name}',
    ${data.placeholder ? `placeholder: '${data.placeholder}',` : ''}
    alt: '${data.alt || ''}',
    aspectRatio: ${data.aspectRatio}
  }`).join(',\n')}
];
</script>`;
    }

    return '';
  }

  generateCSS() {
    return `.lazy-image-wrapper {
  position: relative;
  overflow: hidden;
  background: #f0f0f0;
}

.lazy-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px);
  transform: scale(1.1);
  transition: opacity 0.3s ease;
}

.lazy-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.lazy-image.loaded {
  opacity: 1;
}

.lazy-image.loaded + .lazy-placeholder,
.lazy-image.loaded ~ .lazy-placeholder {
  opacity: 0;
}

/* Gallery layout */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
}

@media (max-width: 768px) {
  .gallery {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
    padding: 8px;
  }
}`;
  }

  generateJS() {
    return `// Lazy Load Implementation using Intersection Observer
class LazyLoader {
  constructor(options = {}) {
    this.options = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    };

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      this.options
    );

    this.init();
  }

  init() {
    const images = document.querySelectorAll('.lazy-image[data-src]');
    images.forEach(img => this.observer.observe(img));
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Create new image to preload
    const newImg = new Image();
    newImg.onload = () => {
      img.src = src;
      img.classList.add('loaded');
      img.removeAttribute('data-src');
    };
    newImg.onerror = () => {
      console.error('Failed to load:', src);
    };
    newImg.src = src;
  }

  // Manual refresh for dynamically added images
  refresh() {
    const images = document.querySelectorAll('.lazy-image[data-src]');
    images.forEach(img => {
      if (!img.classList.contains('loaded')) {
        this.observer.observe(img);
      }
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.lazyLoader = new LazyLoader();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LazyLoader;
}`;
  }

  copyCode() {
    const code = document.getElementById('codeOutput').textContent;
    navigator.clipboard.writeText(code).then(() => {
      this.showStatus('success', '代碼已複製到剪貼簿！');
    });
  }

  async download() {
    if (this.processedData.length === 0) return;

    this.showProgress(true);
    this.updateProgress(0, '正在打包...');

    const zip = new JSZip();
    const format = document.getElementById('codeFormat').value;

    // Add images folder
    const imagesFolder = zip.folder('images');
    for (let i = 0; i < this.images.length; i++) {
      const item = this.images[i];
      // Convert data URL to blob
      const response = await fetch(item.dataUrl);
      const blob = await response.blob();
      imagesFolder.file(item.name, blob);

      this.updateProgress(
        Math.round(((i + 1) / this.images.length) * 50),
        `打包圖片 ${i + 1} / ${this.images.length}...`
      );
    }

    // Add code files
    const ext = format === 'react' ? 'jsx' : format === 'vue' ? 'vue' : 'html';
    const mainCode = this.generateMainCode(format, document.getElementById('includeBlur').checked);

    zip.file(`gallery.${ext}`, mainCode);
    zip.file('lazy-load.css', this.generateCSS());
    zip.file('lazy-load.js', this.generateJS());

    // Add README
    zip.file('README.md', this.generateReadme(format));

    this.updateProgress(80, '生成 ZIP...');

    const content = await zip.generateAsync({ type: 'blob' });

    this.updateProgress(100, '下載中...');

    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lazy-image-pack_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    this.showProgress(false);
    this.showStatus('success', 'ZIP 下載完成！');
  }

  generateReadme(format) {
    return `# 圖片懶人包

由 WASM Tools IMG-119 生成

## 檔案說明

- \`images/\` - 原始圖片
- \`gallery.${format === 'react' ? 'jsx' : format === 'vue' ? 'vue' : 'html'}\` - 主要代碼
- \`lazy-load.css\` - 樣式檔案
- \`lazy-load.js\` - Lazy Load 腳本

## 使用方式

### HTML
\`\`\`html
<link rel="stylesheet" href="lazy-load.css">
<script src="lazy-load.js"><\/script>
\`\`\`

### React/Vue
直接導入組件使用

## 特性

- 使用 Intersection Observer API
- 低解析度模糊佔位圖
- 平滑淡入效果
- 響應式網格布局

## 瀏覽器支援

- Chrome 51+
- Firefox 55+
- Safari 12.1+
- Edge 15+

---
Generated by WASM Tools IMG-119
`;
  }

  reset() {
    this.images = [];
    this.processedData = [];

    document.getElementById('fileInput').value = '';
    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('fileCount').style.display = 'none';
    document.getElementById('previewSection').classList.remove('active');
    document.getElementById('previewGrid').innerHTML = '';
    document.getElementById('outputSection').classList.remove('active');
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
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
let generator;
document.addEventListener('DOMContentLoaded', () => {
  generator = new LazyPackGenerator();
});
