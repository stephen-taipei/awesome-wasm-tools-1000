/**
 * IMG-225 圖片紅眼移除工具
 */
class RedeyeRemovalTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { brushSize: 20, sensitivity: 50, preserve: 70 };
    this.corrections = [];
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

    document.getElementById('brushSize').addEventListener('input', (e) => {
      this.settings.brushSize = parseInt(e.target.value);
      document.getElementById('brushSizeValue').textContent = this.settings.brushSize;
    });

    document.getElementById('sensitivity').addEventListener('input', (e) => {
      this.settings.sensitivity = parseInt(e.target.value);
      document.getElementById('sensitivityValue').textContent = this.settings.sensitivity;
      this.render();
    });

    document.getElementById('preserve').addEventListener('input', (e) => {
      this.settings.preserve = parseInt(e.target.value);
      document.getElementById('preserveValue').textContent = this.settings.preserve + '%';
      this.render();
    });

    this.canvas.addEventListener('click', (e) => this.correctAt(e));

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY)
    };
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.corrections = [];
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
        this.updateCorrectionsList();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  correctAt(e) {
    const pos = this.getCanvasPos(e);
    this.corrections.push({
      x: pos.x,
      y: pos.y,
      size: this.settings.brushSize
    });
    this.render();
    this.updateCorrectionsList();
  }

  updateCorrectionsList() {
    const list = document.getElementById('correctionsList');
    list.innerHTML = '';

    this.corrections.forEach((c, i) => {
      const item = document.createElement('div');
      item.className = 'correction-item';
      item.innerHTML = `
        <span>修正 #${i + 1} (${c.x}, ${c.y})</span>
        <button class="correction-remove" data-index="${i}">×</button>
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('.correction-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        this.corrections.splice(idx, 1);
        this.render();
        this.updateCorrectionsList();
      });
    });
  }

  render() {
    if (!this.originalImage) return;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (this.corrections.length === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const sensitivity = this.settings.sensitivity / 100;
    const preserve = this.settings.preserve / 100;

    this.corrections.forEach(correction => {
      const r = correction.size / 2;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > r) continue;

          const px = Math.floor(correction.x + dx);
          const py = Math.floor(correction.y + dy);
          if (px < 0 || px >= w || py < 0 || py >= h) continue;

          const i = (py * w + px) * 4;
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];

          // Check if pixel is "red" (high red relative to green and blue)
          const isRed = red > 60 &&
                        red > green * (1 + sensitivity) &&
                        red > blue * (1 + sensitivity);

          if (isRed) {
            // Calculate luminance
            const lum = 0.299 * red + 0.587 * green + 0.114 * blue;

            // Replace with desaturated version
            const newR = lum * preserve + Math.min(green, blue) * (1 - preserve);

            // Feather based on distance from center
            const feather = 1 - (dist / r);
            data[i] = red * (1 - feather) + newR * feather;
          }
        }
      }
    });

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.corrections = [];
    this.settings = { brushSize: 20, sensitivity: 50, preserve: 70 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('brushSize').value = 20;
    document.getElementById('brushSizeValue').textContent = '20';
    document.getElementById('sensitivity').value = 50;
    document.getElementById('sensitivityValue').textContent = '50';
    document.getElementById('preserve').value = 70;
    document.getElementById('preserveValue').textContent = '70%';
    document.getElementById('correctionsList').innerHTML = '';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `redeye_removed_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new RedeyeRemovalTool());
