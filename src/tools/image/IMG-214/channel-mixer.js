/**
 * IMG-214 圖片通道混合工具
 */
class ChannelMixerTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.matrix = {
      rr: 100, rg: 0, rb: 0,
      gr: 0, gg: 100, gb: 0,
      br: 0, bg: 0, bb: 100
    };
    this.presets = {
      normal: { rr: 100, rg: 0, rb: 0, gr: 0, gg: 100, gb: 0, br: 0, bg: 0, bb: 100 },
      grayscale: { rr: 30, rg: 59, rb: 11, gr: 30, gg: 59, gb: 11, br: 30, bg: 59, bb: 11 },
      sepia: { rr: 39, rg: 77, rb: 19, gr: 35, gg: 69, gb: 17, br: 27, bg: 53, bb: 13 },
      'swap-rg': { rr: 0, rg: 100, rb: 0, gr: 100, gg: 0, gb: 0, br: 0, bg: 0, bb: 100 },
      'swap-rb': { rr: 0, rg: 0, rb: 100, gr: 0, gg: 100, gb: 0, br: 100, bg: 0, bb: 0 },
      'swap-gb': { rr: 100, rg: 0, rb: 0, gr: 0, gg: 0, gb: 100, br: 0, bg: 100, bb: 0 }
    };
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

    ['rr', 'rg', 'rb', 'gr', 'gg', 'gb', 'br', 'bg', 'bb'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.matrix[id] = parseInt(e.target.value);
        document.getElementById(id + 'Value').textContent = this.matrix[id] + '%';
        this.render();
      });
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = this.presets[btn.dataset.preset];
        if (preset) {
          this.matrix = { ...preset };
          this.updateSliders();
          this.render();
        }
      });
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    ['rr', 'rg', 'rb', 'gr', 'gg', 'gb', 'br', 'bg', 'bb'].forEach(id => {
      document.getElementById(id).value = this.matrix[id];
      document.getElementById(id + 'Value').textContent = this.matrix[id] + '%';
    });
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
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const m = this.matrix;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      data[i] = Math.max(0, Math.min(255, (r * m.rr + g * m.rg + b * m.rb) / 100));
      data[i + 1] = Math.max(0, Math.min(255, (r * m.gr + g * m.gg + b * m.gb) / 100));
      data[i + 2] = Math.max(0, Math.min(255, (r * m.br + g * m.bg + b * m.bb) / 100));
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.matrix = { rr: 100, rg: 0, rb: 0, gr: 0, gg: 100, gb: 0, br: 0, bg: 0, bb: 100 };
    this.updateSliders();
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `channel_mixer_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ChannelMixerTool());
