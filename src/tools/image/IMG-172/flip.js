/**
 * IMG-172 圖片翻轉工具
 */
class FlipTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.flipH = false;
    this.flipV = false;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault(); uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.getElementById('flipH').addEventListener('click', () => {
      this.flipH = !this.flipH;
      document.getElementById('flipH').classList.toggle('active', this.flipH);
      this.render();
    });
    document.getElementById('flipV').addEventListener('click', () => {
      this.flipV = !this.flipV;
      document.getElementById('flipV').classList.toggle('active', this.flipV);
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
        this.flipH = false; this.flipV = false;
        document.getElementById('flipH').classList.remove('active');
        document.getElementById('flipV').classList.remove('active');
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
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.save();
    this.ctx.translate(this.flipH ? w : 0, this.flipV ? h : 0);
    this.ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.ctx.restore();
  }

  reset() {
    this.originalImage = null;
    this.flipH = false; this.flipV = false;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('flipH').classList.remove('active');
    document.getElementById('flipV').classList.remove('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `flip_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new FlipTool());
