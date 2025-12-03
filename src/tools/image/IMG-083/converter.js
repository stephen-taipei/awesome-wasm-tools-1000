/**
 * IMG-083 紋理疊加
 * 為圖片疊加紋理效果（紙張、布料等）
 */

class TextureOverlayTool {
  constructor() {
    this.sourceImage = null;
    this.selectedTexture = 'paper';
    this.blendMode = 'multiply';
    this.opacity = 50;
    this.scale = 100;

    // Texture definitions
    this.textures = [
      { id: 'paper', name: '紙張' },
      { id: 'canvas', name: '畫布' },
      { id: 'linen', name: '亞麻布' },
      { id: 'denim', name: '牛仔布' },
      { id: 'leather', name: '皮革' },
      { id: 'concrete', name: '水泥' },
      { id: 'wood', name: '木紋' },
      { id: 'noise', name: '雜訊' },
      { id: 'grain', name: '顆粒' },
      { id: 'scratches', name: '刮痕' },
      { id: 'dust', name: '灰塵' },
      { id: 'vintage', name: '復古' }
    ];

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');
    this.textureGrid = document.getElementById('textureGrid');

    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.opacitySlider = document.getElementById('opacitySlider');
    this.opacityValue = document.getElementById('opacityValue');
    this.scaleSlider = document.getElementById('scaleSlider');
    this.scaleValue = document.getElementById('scaleValue');

    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.generateTextureGrid();
    this.bindEvents();
  }

  generateTextureGrid() {
    this.textures.forEach((texture, index) => {
      const item = document.createElement('div');
      item.className = 'texture-item' + (index === 0 ? ' active' : '');
      item.dataset.texture = texture.id;

      // Generate texture preview canvas
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      canvas.className = 'texture-preview';
      const ctx = canvas.getContext('2d');
      this.drawTexturePreview(ctx, texture.id, 100, 100);

      const name = document.createElement('div');
      name.className = 'texture-name';
      name.textContent = texture.name;

      item.appendChild(canvas);
      item.appendChild(name);
      this.textureGrid.appendChild(item);

      item.addEventListener('click', () => {
        document.querySelectorAll('.texture-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        this.selectedTexture = texture.id;
        if (this.sourceImage) this.processImage();
      });
    });
  }

  drawTexturePreview(ctx, textureId, width, height) {
    // Generate procedural texture preview
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    switch (textureId) {
      case 'paper':
        this.generatePaperTexture(data, width, height);
        break;
      case 'canvas':
        this.generateCanvasTexture(data, width, height);
        break;
      case 'linen':
        this.generateLinenTexture(data, width, height);
        break;
      case 'denim':
        this.generateDenimTexture(data, width, height);
        break;
      case 'leather':
        this.generateLeatherTexture(data, width, height);
        break;
      case 'concrete':
        this.generateConcreteTexture(data, width, height);
        break;
      case 'wood':
        this.generateWoodTexture(data, width, height);
        break;
      case 'noise':
        this.generateNoiseTexture(data, width, height);
        break;
      case 'grain':
        this.generateGrainTexture(data, width, height);
        break;
      case 'scratches':
        this.generateScratchesTexture(data, width, height);
        break;
      case 'dust':
        this.generateDustTexture(data, width, height);
        break;
      case 'vintage':
        this.generateVintageTexture(data, width, height);
        break;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  generatePaperTexture(data, w, h) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const noise = Math.random() * 30 - 15;
        const v = 240 + noise;
        data[idx] = v;
        data[idx + 1] = v - 5;
        data[idx + 2] = v - 10;
        data[idx + 3] = 255;
      }
    }
  }

  generateCanvasTexture(data, w, h) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const weave = ((x % 4 < 2) !== (y % 4 < 2)) ? 20 : 0;
        const noise = Math.random() * 15;
        const v = 200 + weave + noise;
        data[idx] = v;
        data[idx + 1] = v - 10;
        data[idx + 2] = v - 20;
        data[idx + 3] = 255;
      }
    }
  }

  generateLinenTexture(data, w, h) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const horizontal = (y % 3 === 0) ? 15 : 0;
        const vertical = (x % 3 === 0) ? 15 : 0;
        const v = 210 + horizontal + vertical + Math.random() * 10;
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v - 5;
        data[idx + 3] = 255;
      }
    }
  }

  generateDenimTexture(data, w, h) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const diagonal = ((x + y) % 3 === 0) ? 20 : 0;
        const noise = Math.random() * 15;
        data[idx] = 80 + diagonal + noise;
        data[idx + 1] = 100 + diagonal + noise;
        data[idx + 2] = 150 + diagonal + noise;
        data[idx + 3] = 255;
      }
    }
  }

  generateLeatherTexture(data, w, h) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const wrinkle = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 15;
        const noise = Math.random() * 20;
        const v = 100 + wrinkle + noise;
        data[idx] = v + 30;
        data[idx + 1] = v + 10;
        data[idx + 2] = v;
        data[idx + 3] = 255;
      }
    }
  }

  generateConcreteTexture(data, w, h) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const noise = Math.random() * 40 - 20;
        const v = 150 + noise;
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v + 5;
        data[idx + 3] = 255;
      }
    }
  }

  generateWoodTexture(data, w, h) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const grain = Math.sin(x * 0.1 + Math.sin(y * 0.05) * 5) * 30;
        const noise = Math.random() * 10;
        const v = 140 + grain + noise;
        data[idx] = v + 20;
        data[idx + 1] = v;
        data[idx + 2] = v - 40;
        data[idx + 3] = 255;
      }
    }
  }

  generateNoiseTexture(data, w, h) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const v = Math.random() * 255;
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = 255;
      }
    }
  }

  generateGrainTexture(data, w, h) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const base = 128;
        const grain = (Math.random() - 0.5) * 80;
        const v = base + grain;
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
        data[idx + 3] = 255;
      }
    }
  }

  generateScratchesTexture(data, w, h) {
    // Fill with mid-gray
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i + 1] = data[i + 2] = 128;
      data[i + 3] = 255;
    }
    // Add scratches
    for (let s = 0; s < 20; s++) {
      const startX = Math.random() * w;
      const startY = Math.random() * h;
      const length = Math.random() * 50 + 20;
      const angle = Math.random() * Math.PI;
      for (let i = 0; i < length; i++) {
        const x = Math.floor(startX + Math.cos(angle) * i);
        const y = Math.floor(startY + Math.sin(angle) * i);
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const idx = (y * w + x) * 4;
          const v = Math.random() > 0.5 ? 200 : 80;
          data[idx] = data[idx + 1] = data[idx + 2] = v;
        }
      }
    }
  }

  generateDustTexture(data, w, h) {
    // Fill with mid-gray
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i + 1] = data[i + 2] = 128;
      data[i + 3] = 255;
    }
    // Add dust particles
    for (let d = 0; d < 200; d++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);
      const size = Math.random() * 2 + 1;
      const bright = Math.random() > 0.5 ? 200 : 80;
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          if (x + dx < w && y + dy < h) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            data[idx] = data[idx + 1] = data[idx + 2] = bright;
          }
        }
      }
    }
  }

  generateVintageTexture(data, w, h) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const vignette = 1 - Math.sqrt(Math.pow((x - w/2) / w, 2) + Math.pow((y - h/2) / h, 2)) * 0.5;
        const noise = Math.random() * 30;
        const v = (180 + noise) * vignette;
        data[idx] = v + 20;
        data[idx + 1] = v;
        data[idx + 2] = v - 20;
        data[idx + 3] = 255;
      }
    }
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

    // Blend mode buttons
    document.querySelectorAll('.blend-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.blendMode = btn.dataset.blend;
        document.querySelectorAll('.blend-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.sourceImage) this.processImage();
      });
    });

    // Sliders
    this.opacitySlider.addEventListener('input', () => {
      this.opacity = parseInt(this.opacitySlider.value);
      this.opacityValue.textContent = this.opacity + '%';
      if (this.sourceImage) this.processImage();
    });

    this.scaleSlider.addEventListener('input', () => {
      this.scale = parseInt(this.scaleSlider.value);
      this.scaleValue.textContent = this.scale + '%';
      if (this.sourceImage) this.processImage();
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
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
        this.uploadArea.style.display = 'none';
        this.optionsPanel.style.display = 'block';
        this.previewSection.style.display = 'block';
        this.downloadBtn.disabled = false;

        this.processImage();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  processImage() {
    if (!this.sourceImage) return;

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.resultCanvas.width = width;
    this.resultCanvas.height = height;

    // Draw original image
    this.resultCtx.drawImage(this.sourceImage, 0, 0);

    // Generate texture at scaled size
    const scaledW = Math.ceil(width * (this.scale / 100));
    const scaledH = Math.ceil(height * (this.scale / 100));

    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = scaledW;
    textureCanvas.height = scaledH;
    const textureCtx = textureCanvas.getContext('2d');

    this.drawTexturePreview(textureCtx, this.selectedTexture, scaledW, scaledH);

    // Create pattern from texture
    const pattern = this.resultCtx.createPattern(textureCanvas, 'repeat');

    // Get image data for blending
    const srcData = this.resultCtx.getImageData(0, 0, width, height);
    const src = srcData.data;

    // Get texture data (tiled)
    const tiledTextureCanvas = document.createElement('canvas');
    tiledTextureCanvas.width = width;
    tiledTextureCanvas.height = height;
    const tiledCtx = tiledTextureCanvas.getContext('2d');
    tiledCtx.fillStyle = pattern;
    tiledCtx.fillRect(0, 0, width, height);
    const texData = tiledCtx.getImageData(0, 0, width, height).data;

    // Apply blend mode
    const alpha = this.opacity / 100;

    for (let i = 0; i < src.length; i += 4) {
      const sr = src[i] / 255;
      const sg = src[i + 1] / 255;
      const sb = src[i + 2] / 255;
      const tr = texData[i] / 255;
      const tg = texData[i + 1] / 255;
      const tb = texData[i + 2] / 255;

      let br, bg, bb;

      switch (this.blendMode) {
        case 'multiply':
          br = sr * tr;
          bg = sg * tg;
          bb = sb * tb;
          break;
        case 'overlay':
          br = sr < 0.5 ? 2 * sr * tr : 1 - 2 * (1 - sr) * (1 - tr);
          bg = sg < 0.5 ? 2 * sg * tg : 1 - 2 * (1 - sg) * (1 - tg);
          bb = sb < 0.5 ? 2 * sb * tb : 1 - 2 * (1 - sb) * (1 - tb);
          break;
        case 'soft-light':
          br = (1 - 2 * tr) * sr * sr + 2 * tr * sr;
          bg = (1 - 2 * tg) * sg * sg + 2 * tg * sg;
          bb = (1 - 2 * tb) * sb * sb + 2 * tb * sb;
          break;
        case 'hard-light':
          br = tr < 0.5 ? 2 * sr * tr : 1 - 2 * (1 - sr) * (1 - tr);
          bg = tg < 0.5 ? 2 * sg * tg : 1 - 2 * (1 - sg) * (1 - tg);
          bb = tb < 0.5 ? 2 * sb * tb : 1 - 2 * (1 - sb) * (1 - tb);
          break;
        case 'screen':
          br = 1 - (1 - sr) * (1 - tr);
          bg = 1 - (1 - sg) * (1 - tg);
          bb = 1 - (1 - sb) * (1 - tb);
          break;
        default:
          br = tr;
          bg = tg;
          bb = tb;
      }

      // Blend with original based on opacity
      src[i] = Math.round((sr * (1 - alpha) + br * alpha) * 255);
      src[i + 1] = Math.round((sg * (1 - alpha) + bg * alpha) * 255);
      src[i + 2] = Math.round((sb * (1 - alpha) + bb * alpha) * 255);
    }

    this.resultCtx.putImageData(srcData, 0, 0);

    const textureName = this.textures.find(t => t.id === this.selectedTexture)?.name || '';
    const blendNames = {
      'multiply': '正片疊底',
      'overlay': '覆蓋',
      'soft-light': '柔光',
      'hard-light': '強光',
      'screen': '濾色'
    };

    this.previewInfo.textContent = `${textureName} | ${blendNames[this.blendMode]} | 透明度: ${this.opacity}%`;
    this.showStatus('success', '紋理疊加完成');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `textured_${this.selectedTexture}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.selectedTexture = 'paper';
    this.blendMode = 'multiply';
    this.opacity = 50;
    this.scale = 100;

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    document.querySelectorAll('.texture-item').forEach((el, idx) => {
      el.classList.toggle('active', idx === 0);
    });
    document.querySelectorAll('.blend-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.blend === 'multiply');
    });
    this.opacitySlider.value = 50;
    this.opacityValue.textContent = '50%';
    this.scaleSlider.value = 100;
    this.scaleValue.textContent = '100%';

    this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.previewInfo.textContent = '';
    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new TextureOverlayTool();
});
