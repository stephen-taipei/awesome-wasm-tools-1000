/**
 * IMG-194 圖片圓角工具
 */
class RoundedTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.corners = { tl: 30, tr: 30, bl: 30, br: 30 };
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.radius;
        if (val === 'circle' && this.originalImage) {
          const r = Math.min(this.originalImage.width, this.originalImage.height) / 2;
          this.setAllCorners(r);
        } else {
          this.setAllCorners(parseInt(val));
        }
        this.render();
      });
    });

    document.getElementById('radius').addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = val + ' px';
      this.setAllCorners(val);
      this.render();
    });

    ['tl', 'tr', 'bl', 'br'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.corners[id] = parseInt(e.target.value);
        this.render();
      });
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  setAllCorners(val) {
    this.corners = { tl: val, tr: val, bl: val, br: val };
    document.getElementById('radius').value = val;
    document.getElementById('radiusValue').textContent = val + ' px';
    ['tl', 'tr', 'bl', 'br'].forEach(id => {
      document.getElementById(id).value = val;
    });
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.setAllCorners(30);
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
    const { tl, tr, bl, br } = this.corners;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.beginPath();
    this.ctx.moveTo(tl, 0);
    this.ctx.lineTo(w - tr, 0);
    this.ctx.quadraticCurveTo(w, 0, w, tr);
    this.ctx.lineTo(w, h - br);
    this.ctx.quadraticCurveTo(w, h, w - br, h);
    this.ctx.lineTo(bl, h);
    this.ctx.quadraticCurveTo(0, h, 0, h - bl);
    this.ctx.lineTo(0, tl);
    this.ctx.quadraticCurveTo(0, 0, tl, 0);
    this.ctx.closePath();
    this.ctx.clip();
    this.ctx.drawImage(this.originalImage, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.corners = { tl: 30, tr: 30, bl: 30, br: 30 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    this.setAllCorners(30);
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `rounded_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new RoundedTool());
