/**
 * IMG-193 圖片邊框工具
 */
class BorderTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { style: 'solid', width: 20, color: '#ffffff' };
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
        this.settings.style = btn.dataset.style;
        this.render();
      });
    });

    document.getElementById('borderWidth').addEventListener('input', (e) => {
      this.settings.width = parseInt(e.target.value);
      document.getElementById('widthValue').textContent = this.settings.width + ' px';
      this.render();
    });

    document.getElementById('borderColor').addEventListener('input', (e) => {
      this.settings.color = e.target.value;
      document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
      this.render();
    });

    document.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        this.settings.color = preset.dataset.color;
        document.getElementById('borderColor').value = preset.dataset.color;
        this.render();
      });
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

  render() {
    if (!this.originalImage) return;
    const { style, width, color } = this.settings;
    const img = this.originalImage;

    let borderTop = width, borderBottom = width, borderLeft = width, borderRight = width;

    if (style === 'polaroid') {
      borderTop = width;
      borderLeft = width;
      borderRight = width;
      borderBottom = width * 3;
    }

    const w = img.width + borderLeft + borderRight;
    const h = img.height + borderTop + borderBottom;
    this.canvas.width = w;
    this.canvas.height = h;

    // Fill background
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, w, h);

    // Draw image
    this.ctx.drawImage(img, borderLeft, borderTop);

    // Apply style effects
    if (style === 'double') {
      const innerWidth = Math.max(2, width / 4);
      this.ctx.strokeStyle = this.adjustColor(color, -30);
      this.ctx.lineWidth = innerWidth;
      this.ctx.strokeRect(
        borderLeft - innerWidth * 2,
        borderTop - innerWidth * 2,
        img.width + innerWidth * 4,
        img.height + innerWidth * 4
      );
    } else if (style === 'dashed') {
      this.ctx.strokeStyle = this.adjustColor(color, -50);
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([10, 5]);
      this.ctx.strokeRect(borderLeft - 5, borderTop - 5, img.width + 10, img.height + 10);
      this.ctx.setLineDash([]);
    } else if (style === 'polaroid') {
      // Add shadow effect
      this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowOffsetX = 5;
      this.ctx.shadowOffsetY = 5;
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.shadowColor = 'transparent';
      this.ctx.drawImage(img, borderLeft, borderTop);
    }
  }

  adjustColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `rgb(${r},${g},${b})`;
  }

  reset() {
    this.originalImage = null;
    this.settings = { style: 'solid', width: 20, color: '#ffffff' };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('borderWidth').value = 20;
    document.getElementById('widthValue').textContent = '20 px';
    document.getElementById('borderColor').value = '#ffffff';
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.style-btn[data-style="solid"]').classList.add('active');
    document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
    document.querySelector('.color-preset[data-color="#ffffff"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `border_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new BorderTool());
