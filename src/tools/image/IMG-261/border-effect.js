/**
 * IMG-261 圖片邊框效果工具
 */
class BorderEffectTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      borderWidth: 20,
      borderRadius: 0,
      padding: 0,
      borderColor: '#ffffff',
      bgColor: '#1a1a2e',
      addShadow: false
    };
    this.style = 'solid';
    this.init();
  }

  init() { this.bindEvents(); }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.style = btn.dataset.style;
        this.render();
      });
    });

    document.getElementById('borderWidth').addEventListener('input', (e) => {
      this.settings.borderWidth = parseInt(e.target.value);
      document.getElementById('widthValue').textContent = this.settings.borderWidth;
      this.render();
    });

    document.getElementById('borderRadius').addEventListener('input', (e) => {
      this.settings.borderRadius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = this.settings.borderRadius;
      this.render();
    });

    document.getElementById('padding').addEventListener('input', (e) => {
      this.settings.padding = parseInt(e.target.value);
      document.getElementById('paddingValue').textContent = this.settings.padding;
      this.render();
    });

    document.getElementById('borderColor').addEventListener('input', (e) => {
      this.settings.borderColor = e.target.value;
      this.render();
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    document.getElementById('addShadow').addEventListener('change', (e) => {
      this.settings.addShadow = e.target.checked;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  render() {
    if (!this.originalImage) return;
    const { borderWidth, borderRadius, padding, borderColor, bgColor, addShadow } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    let totalPadding = borderWidth + padding;
    let canvasW = w + totalPadding * 2;
    let canvasH = h + totalPadding * 2;

    // Adjust for polaroid style
    if (this.style === 'polaroid') {
      canvasH += borderWidth * 2;
    }

    // Add shadow padding
    if (addShadow) {
      canvasW += 40;
      canvasH += 40;
    }

    this.canvas.width = canvasW;
    this.canvas.height = canvasH;

    // Fill background
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, canvasW, canvasH);

    const offsetX = addShadow ? 20 : 0;
    const offsetY = addShadow ? 20 : 0;

    // Draw shadow
    if (addShadow) {
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowOffsetX = 5;
      this.ctx.shadowOffsetY = 5;
      this.ctx.fillStyle = borderColor;

      if (this.style === 'rounded' || borderRadius > 0) {
        this.roundRect(offsetX, offsetY, w + totalPadding * 2, h + totalPadding * 2 + (this.style === 'polaroid' ? borderWidth * 2 : 0), borderRadius + borderWidth);
        this.ctx.fill();
      } else {
        this.ctx.fillRect(offsetX, offsetY, w + totalPadding * 2, h + totalPadding * 2 + (this.style === 'polaroid' ? borderWidth * 2 : 0));
      }
      this.ctx.restore();
    }

    // Draw border based on style
    this.ctx.fillStyle = borderColor;

    switch (this.style) {
      case 'solid':
        if (borderRadius > 0) {
          this.roundRect(offsetX, offsetY, w + totalPadding * 2, h + totalPadding * 2, borderRadius + borderWidth);
          this.ctx.fill();
        } else {
          this.ctx.fillRect(offsetX, offsetY, w + totalPadding * 2, h + totalPadding * 2);
        }
        break;

      case 'double':
        this.ctx.fillRect(offsetX, offsetY, w + totalPadding * 2, h + totalPadding * 2);
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(offsetX + borderWidth * 0.3, offsetY + borderWidth * 0.3, w + totalPadding * 2 - borderWidth * 0.6, h + totalPadding * 2 - borderWidth * 0.6);
        this.ctx.fillStyle = borderColor;
        this.ctx.fillRect(offsetX + borderWidth * 0.6, offsetY + borderWidth * 0.6, w + totalPadding * 2 - borderWidth * 1.2, h + totalPadding * 2 - borderWidth * 1.2);
        break;

      case 'dashed':
        this.ctx.fillRect(offsetX, offsetY, w + totalPadding * 2, h + totalPadding * 2);
        this.ctx.fillStyle = bgColor;
        const dashSize = borderWidth;
        for (let i = 0; i < (w + totalPadding * 2) / (dashSize * 2); i++) {
          this.ctx.fillRect(offsetX + i * dashSize * 2, offsetY, dashSize, borderWidth);
          this.ctx.fillRect(offsetX + i * dashSize * 2, offsetY + h + totalPadding * 2 - borderWidth, dashSize, borderWidth);
        }
        for (let i = 0; i < (h + totalPadding * 2) / (dashSize * 2); i++) {
          this.ctx.fillRect(offsetX, offsetY + i * dashSize * 2, borderWidth, dashSize);
          this.ctx.fillRect(offsetX + w + totalPadding * 2 - borderWidth, offsetY + i * dashSize * 2, borderWidth, dashSize);
        }
        break;

      case 'rounded':
        const r = Math.min(borderRadius + borderWidth, (w + totalPadding * 2) / 2, (h + totalPadding * 2) / 2);
        this.roundRect(offsetX, offsetY, w + totalPadding * 2, h + totalPadding * 2, r);
        this.ctx.fill();
        break;

      case 'polaroid':
        this.ctx.fillRect(offsetX, offsetY, w + totalPadding * 2, h + totalPadding * 2 + borderWidth * 2);
        break;

      case 'film':
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(offsetX, offsetY, w + totalPadding * 2, h + totalPadding * 2);
        // Film sprocket holes
        this.ctx.fillStyle = '#000';
        const holeSize = borderWidth * 0.4;
        const holeSpacing = borderWidth * 1.2;
        for (let i = 0; i < (h + totalPadding * 2) / holeSpacing; i++) {
          this.ctx.fillRect(offsetX + borderWidth * 0.15, offsetY + i * holeSpacing + holeSpacing / 4, holeSize, holeSize);
          this.ctx.fillRect(offsetX + w + totalPadding * 2 - borderWidth * 0.15 - holeSize, offsetY + i * holeSpacing + holeSpacing / 4, holeSize, holeSize);
        }
        break;
    }

    // Draw image
    this.ctx.save();
    if (this.style === 'rounded' || borderRadius > 0) {
      const r = borderRadius > 0 ? borderRadius : Math.min(borderRadius, w / 2, h / 2);
      this.roundRect(offsetX + borderWidth, offsetY + borderWidth, w + padding * 2, h + padding * 2, r);
      this.ctx.clip();
    }
    this.ctx.drawImage(this.originalImage, offsetX + totalPadding, offsetY + totalPadding);
    this.ctx.restore();
  }

  reset() {
    this.originalImage = null;
    this.settings = { borderWidth: 20, borderRadius: 0, padding: 0, borderColor: '#ffffff', bgColor: '#1a1a2e', addShadow: false };
    this.style = 'solid';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('borderWidth').value = 20;
    document.getElementById('widthValue').textContent = '20';
    document.getElementById('borderRadius').value = 0;
    document.getElementById('radiusValue').textContent = '0';
    document.getElementById('padding').value = 0;
    document.getElementById('paddingValue').textContent = '0';
    document.getElementById('borderColor').value = '#ffffff';
    document.getElementById('bgColor').value = '#1a1a2e';
    document.getElementById('addShadow').checked = false;
    document.querySelectorAll('.style-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `bordered_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new BorderEffectTool());
