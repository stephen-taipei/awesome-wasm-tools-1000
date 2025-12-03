/**
 * IMG-084 邊框添加
 * 為圖片添加各種樣式邊框
 */

class BorderTool {
  constructor() {
    this.sourceImage = null;
    this.borderStyle = 'solid';
    this.borderWidth = 20;
    this.borderRadius = 0;
    this.borderColor = '#ffffff';
    this.secondColor = '#000000';

    // Border styles
    this.styles = [
      { id: 'solid', name: '純色' },
      { id: 'double', name: '雙線' },
      { id: 'dashed', name: '虛線' },
      { id: 'dotted', name: '點線' },
      { id: 'gradient', name: '漸層' },
      { id: 'shadow', name: '陰影' },
      { id: 'polaroid', name: '拍立得' },
      { id: 'film', name: '底片' },
      { id: 'vintage', name: '復古' },
      { id: 'torn', name: '撕裂' }
    ];

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');
    this.styleGrid = document.getElementById('styleGrid');

    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.widthSlider = document.getElementById('widthSlider');
    this.widthValue = document.getElementById('widthValue');
    this.radiusSlider = document.getElementById('radiusSlider');
    this.radiusValue = document.getElementById('radiusValue');
    this.colorPicker = document.getElementById('colorPicker');
    this.secondColorPicker = document.getElementById('secondColorPicker');
    this.secondColorRow = document.getElementById('secondColorRow');

    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.generateStyleGrid();
    this.bindEvents();
  }

  generateStyleGrid() {
    this.styles.forEach((style, index) => {
      const item = document.createElement('div');
      item.className = 'style-item' + (index === 0 ? ' active' : '');
      item.dataset.style = style.id;

      // Create preview
      const preview = document.createElement('div');
      preview.className = 'style-preview';
      this.applyStylePreview(preview, style.id);

      const name = document.createElement('div');
      name.className = 'style-name';
      name.textContent = style.name;

      item.appendChild(preview);
      item.appendChild(name);
      this.styleGrid.appendChild(item);

      item.addEventListener('click', () => {
        document.querySelectorAll('.style-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        this.borderStyle = style.id;
        this.secondColorRow.style.display = (style.id === 'gradient' || style.id === 'double') ? 'flex' : 'none';
        if (this.sourceImage) this.processImage();
      });
    });
  }

  applyStylePreview(preview, styleId) {
    switch (styleId) {
      case 'solid':
        preview.style.border = '4px solid #fff';
        break;
      case 'double':
        preview.style.border = '4px double #fff';
        break;
      case 'dashed':
        preview.style.border = '4px dashed #fff';
        break;
      case 'dotted':
        preview.style.border = '4px dotted #fff';
        break;
      case 'gradient':
        preview.style.border = '4px solid transparent';
        preview.style.background = 'linear-gradient(#667eea, #667eea) padding-box, linear-gradient(135deg, #667eea, #f59e0b) border-box';
        break;
      case 'shadow':
        preview.style.border = '2px solid #fff';
        preview.style.boxShadow = '3px 3px 6px rgba(0,0,0,0.5)';
        break;
      case 'polaroid':
        preview.style.border = '4px solid #fff';
        preview.style.borderBottom = '15px solid #fff';
        break;
      case 'film':
        preview.style.border = '4px solid #333';
        preview.style.position = 'relative';
        break;
      case 'vintage':
        preview.style.border = '4px solid #d4a574';
        preview.style.borderRadius = '2px';
        break;
      case 'torn':
        preview.style.border = '4px solid #f5f5dc';
        preview.style.borderRadius = '1px';
        break;
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

    // Sliders
    this.widthSlider.addEventListener('input', () => {
      this.borderWidth = parseInt(this.widthSlider.value);
      this.widthValue.textContent = this.borderWidth + ' px';
      if (this.sourceImage) this.processImage();
    });

    this.radiusSlider.addEventListener('input', () => {
      this.borderRadius = parseInt(this.radiusSlider.value);
      this.radiusValue.textContent = this.borderRadius + '%';
      if (this.sourceImage) this.processImage();
    });

    // Color pickers
    this.colorPicker.addEventListener('input', () => {
      this.borderColor = this.colorPicker.value;
      document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
      if (this.sourceImage) this.processImage();
    });

    this.secondColorPicker.addEventListener('input', () => {
      this.secondColor = this.secondColorPicker.value;
      if (this.sourceImage) this.processImage();
    });

    // Color presets
    document.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        this.borderColor = preset.dataset.color;
        this.colorPicker.value = this.borderColor;
        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        if (this.sourceImage) this.processImage();
      });
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

    const imgW = this.sourceImage.width;
    const imgH = this.sourceImage.height;
    const bw = this.borderWidth;

    // Calculate canvas size based on style
    let canvasW, canvasH;
    let bottomExtra = 0;

    if (this.borderStyle === 'polaroid') {
      bottomExtra = bw * 2;
      canvasW = imgW + bw * 2;
      canvasH = imgH + bw * 2 + bottomExtra;
    } else if (this.borderStyle === 'shadow') {
      canvasW = imgW + bw * 2 + bw;
      canvasH = imgH + bw * 2 + bw;
    } else {
      canvasW = imgW + bw * 2;
      canvasH = imgH + bw * 2;
    }

    this.resultCanvas.width = canvasW;
    this.resultCanvas.height = canvasH;

    const ctx = this.resultCtx;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Calculate radius
    const maxRadius = Math.min(canvasW, canvasH) / 2;
    const radius = maxRadius * (this.borderRadius / 100);

    switch (this.borderStyle) {
      case 'solid':
        this.drawSolidBorder(ctx, imgW, imgH, bw, radius);
        break;
      case 'double':
        this.drawDoubleBorder(ctx, imgW, imgH, bw, radius);
        break;
      case 'dashed':
        this.drawDashedBorder(ctx, imgW, imgH, bw, radius);
        break;
      case 'dotted':
        this.drawDottedBorder(ctx, imgW, imgH, bw, radius);
        break;
      case 'gradient':
        this.drawGradientBorder(ctx, imgW, imgH, bw, radius);
        break;
      case 'shadow':
        this.drawShadowBorder(ctx, imgW, imgH, bw, radius);
        break;
      case 'polaroid':
        this.drawPolaroidBorder(ctx, imgW, imgH, bw, bottomExtra, radius);
        break;
      case 'film':
        this.drawFilmBorder(ctx, imgW, imgH, bw, radius);
        break;
      case 'vintage':
        this.drawVintageBorder(ctx, imgW, imgH, bw, radius);
        break;
      case 'torn':
        this.drawTornBorder(ctx, imgW, imgH, bw, radius);
        break;
    }

    const styleName = this.styles.find(s => s.id === this.borderStyle)?.name || '';
    this.previewInfo.textContent = `${styleName} | ${canvasW} × ${canvasH} px | 邊框: ${bw}px`;
    this.showStatus('success', '邊框添加完成');
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawSolidBorder(ctx, imgW, imgH, bw, radius) {
    ctx.fillStyle = this.borderColor;
    this.roundRect(ctx, 0, 0, imgW + bw * 2, imgH + bw * 2, radius);
    ctx.fill();

    ctx.save();
    this.roundRect(ctx, bw, bw, imgW, imgH, Math.max(0, radius - bw));
    ctx.clip();
    ctx.drawImage(this.sourceImage, bw, bw);
    ctx.restore();
  }

  drawDoubleBorder(ctx, imgW, imgH, bw, radius) {
    const outer = bw;
    const gap = Math.max(2, bw / 4);
    const inner = outer - gap * 2;

    // Outer border
    ctx.fillStyle = this.borderColor;
    this.roundRect(ctx, 0, 0, imgW + bw * 2, imgH + bw * 2, radius);
    ctx.fill();

    // Gap
    ctx.fillStyle = this.secondColor;
    this.roundRect(ctx, gap, gap, imgW + bw * 2 - gap * 2, imgH + bw * 2 - gap * 2, Math.max(0, radius - gap));
    ctx.fill();

    // Inner border
    ctx.fillStyle = this.borderColor;
    this.roundRect(ctx, gap * 2, gap * 2, imgW + bw * 2 - gap * 4, imgH + bw * 2 - gap * 4, Math.max(0, radius - gap * 2));
    ctx.fill();

    // Image
    ctx.save();
    this.roundRect(ctx, bw, bw, imgW, imgH, Math.max(0, radius - bw));
    ctx.clip();
    ctx.drawImage(this.sourceImage, bw, bw);
    ctx.restore();
  }

  drawDashedBorder(ctx, imgW, imgH, bw, radius) {
    // Background
    ctx.fillStyle = '#1a1a2e';
    this.roundRect(ctx, 0, 0, imgW + bw * 2, imgH + bw * 2, radius);
    ctx.fill();

    // Dashed stroke
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = Math.max(2, bw / 3);
    ctx.setLineDash([bw / 2, bw / 4]);
    this.roundRect(ctx, bw / 2, bw / 2, imgW + bw, imgH + bw, Math.max(0, radius - bw / 2));
    ctx.stroke();
    ctx.setLineDash([]);

    // Image
    ctx.save();
    this.roundRect(ctx, bw, bw, imgW, imgH, Math.max(0, radius - bw));
    ctx.clip();
    ctx.drawImage(this.sourceImage, bw, bw);
    ctx.restore();
  }

  drawDottedBorder(ctx, imgW, imgH, bw, radius) {
    // Background
    ctx.fillStyle = '#1a1a2e';
    this.roundRect(ctx, 0, 0, imgW + bw * 2, imgH + bw * 2, radius);
    ctx.fill();

    // Dotted pattern
    const dotSize = Math.max(3, bw / 5);
    const spacing = dotSize * 2.5;
    ctx.fillStyle = this.borderColor;

    // Top and bottom
    for (let x = bw; x < imgW + bw; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, bw / 2, dotSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, imgH + bw * 1.5, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left and right
    for (let y = bw; y < imgH + bw; y += spacing) {
      ctx.beginPath();
      ctx.arc(bw / 2, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(imgW + bw * 1.5, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Image
    ctx.drawImage(this.sourceImage, bw, bw);
  }

  drawGradientBorder(ctx, imgW, imgH, bw, radius) {
    const gradient = ctx.createLinearGradient(0, 0, imgW + bw * 2, imgH + bw * 2);
    gradient.addColorStop(0, this.borderColor);
    gradient.addColorStop(1, this.secondColor);

    ctx.fillStyle = gradient;
    this.roundRect(ctx, 0, 0, imgW + bw * 2, imgH + bw * 2, radius);
    ctx.fill();

    ctx.save();
    this.roundRect(ctx, bw, bw, imgW, imgH, Math.max(0, radius - bw));
    ctx.clip();
    ctx.drawImage(this.sourceImage, bw, bw);
    ctx.restore();
  }

  drawShadowBorder(ctx, imgW, imgH, bw, radius) {
    const shadowOffset = bw / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.roundRect(ctx, bw + shadowOffset, bw + shadowOffset, imgW, imgH, Math.max(0, radius - bw));
    ctx.fill();

    // Border
    ctx.fillStyle = this.borderColor;
    this.roundRect(ctx, 0, 0, imgW + bw * 2, imgH + bw * 2, radius);
    ctx.fill();

    // Image
    ctx.save();
    this.roundRect(ctx, bw, bw, imgW, imgH, Math.max(0, radius - bw));
    ctx.clip();
    ctx.drawImage(this.sourceImage, bw, bw);
    ctx.restore();
  }

  drawPolaroidBorder(ctx, imgW, imgH, bw, bottomExtra, radius) {
    // White background
    ctx.fillStyle = this.borderColor;
    this.roundRect(ctx, 0, 0, imgW + bw * 2, imgH + bw * 2 + bottomExtra, radius);
    ctx.fill();

    // Subtle shadow on image area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(bw, bw, imgW, imgH);

    // Image
    ctx.drawImage(this.sourceImage, bw, bw);
  }

  drawFilmBorder(ctx, imgW, imgH, bw, radius) {
    // Black background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, imgW + bw * 2, imgH + bw * 2);

    // Film sprocket holes
    const holeSize = Math.max(6, bw / 3);
    const holeSpacing = holeSize * 3;
    ctx.fillStyle = '#333';

    for (let y = holeSpacing; y < imgH + bw * 2 - holeSpacing; y += holeSpacing) {
      // Left holes
      ctx.fillRect(bw / 4 - holeSize / 2, y - holeSize / 2, holeSize, holeSize * 0.6);
      // Right holes
      ctx.fillRect(imgW + bw * 1.75 - holeSize / 2, y - holeSize / 2, holeSize, holeSize * 0.6);
    }

    // Image
    ctx.drawImage(this.sourceImage, bw, bw);
  }

  drawVintageBorder(ctx, imgW, imgH, bw, radius) {
    // Aged paper color
    ctx.fillStyle = '#d4a574';
    this.roundRect(ctx, 0, 0, imgW + bw * 2, imgH + bw * 2, radius);
    ctx.fill();

    // Inner darker border
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    this.roundRect(ctx, bw / 3, bw / 3, imgW + bw * 4 / 3, imgH + bw * 4 / 3, Math.max(0, radius - bw / 3));
    ctx.stroke();

    // Image with slight sepia overlay
    ctx.save();
    this.roundRect(ctx, bw, bw, imgW, imgH, Math.max(0, radius - bw));
    ctx.clip();
    ctx.drawImage(this.sourceImage, bw, bw);
    ctx.fillStyle = 'rgba(180, 140, 80, 0.15)';
    ctx.fillRect(bw, bw, imgW, imgH);
    ctx.restore();
  }

  drawTornBorder(ctx, imgW, imgH, bw, radius) {
    // Paper background
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(0, 0, imgW + bw * 2, imgH + bw * 2);

    // Torn edges effect
    ctx.fillStyle = '#e8e8d0';
    const tearSize = bw / 4;

    // Top edge
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x < imgW + bw * 2; x += tearSize) {
      ctx.lineTo(x, Math.random() * tearSize);
    }
    ctx.lineTo(imgW + bw * 2, 0);
    ctx.fill();

    // Bottom edge
    ctx.beginPath();
    ctx.moveTo(0, imgH + bw * 2);
    for (let x = 0; x < imgW + bw * 2; x += tearSize) {
      ctx.lineTo(x, imgH + bw * 2 - Math.random() * tearSize);
    }
    ctx.lineTo(imgW + bw * 2, imgH + bw * 2);
    ctx.fill();

    // Image
    ctx.drawImage(this.sourceImage, bw, bw);
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bordered_${this.borderStyle}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.borderStyle = 'solid';
    this.borderWidth = 20;
    this.borderRadius = 0;
    this.borderColor = '#ffffff';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.secondColorRow.style.display = 'none';
    this.downloadBtn.disabled = true;

    document.querySelectorAll('.style-item').forEach((el, idx) => {
      el.classList.toggle('active', idx === 0);
    });
    document.querySelectorAll('.color-preset').forEach((p, idx) => {
      p.classList.toggle('active', idx === 0);
    });

    this.widthSlider.value = 20;
    this.widthValue.textContent = '20 px';
    this.radiusSlider.value = 0;
    this.radiusValue.textContent = '0%';
    this.colorPicker.value = '#ffffff';

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
  new BorderTool();
});
