/**
 * IMG-196 圖片倒影工具
 */
class ReflectionTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { direction: 'bottom', height: 50, opacity: 50, gap: 5 };
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

    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.direction = btn.dataset.direction;
        this.render();
      });
    });

    document.getElementById('reflectionHeight').addEventListener('input', (e) => {
      this.settings.height = parseInt(e.target.value);
      document.getElementById('heightValue').textContent = this.settings.height + '%';
      this.render();
    });

    document.getElementById('opacity').addEventListener('input', (e) => {
      this.settings.opacity = parseInt(e.target.value);
      document.getElementById('opacityValue').textContent = this.settings.opacity + '%';
      this.render();
    });

    document.getElementById('gap').addEventListener('input', (e) => {
      this.settings.gap = parseInt(e.target.value);
      document.getElementById('gapValue').textContent = this.settings.gap + ' px';
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

  render() {
    if (!this.originalImage) return;
    const { direction, height, opacity, gap } = this.settings;
    const img = this.originalImage;
    const reflectionSize = direction === 'bottom' ? img.height * height / 100 : img.width * height / 100;

    let w, h;
    if (direction === 'bottom') {
      w = img.width;
      h = img.height + gap + reflectionSize;
    } else {
      w = img.width + gap + reflectionSize;
      h = img.height;
    }

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.clearRect(0, 0, w, h);

    // Draw original image
    this.ctx.drawImage(img, 0, 0);

    // Create reflection
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (direction === 'bottom') {
      tempCanvas.width = img.width;
      tempCanvas.height = reflectionSize;
      tempCtx.translate(0, reflectionSize);
      tempCtx.scale(1, -1);
      tempCtx.drawImage(img, 0, 0, img.width, reflectionSize, 0, 0, img.width, reflectionSize);

      // Apply gradient fade
      const gradient = this.ctx.createLinearGradient(0, img.height + gap, 0, h);
      gradient.addColorStop(0, `rgba(255,255,255,${opacity / 100})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');

      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.drawImage(tempCanvas, 0, img.height + gap);

      this.ctx.globalCompositeOperation = 'destination-in';
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, img.height + gap, w, reflectionSize);

      this.ctx.globalCompositeOperation = 'destination-over';
      this.ctx.drawImage(img, 0, 0);
    } else {
      tempCanvas.width = reflectionSize;
      tempCanvas.height = img.height;
      tempCtx.translate(reflectionSize, 0);
      tempCtx.scale(-1, 1);
      tempCtx.drawImage(img, img.width - reflectionSize, 0, reflectionSize, img.height, 0, 0, reflectionSize, img.height);

      const gradient = this.ctx.createLinearGradient(img.width + gap, 0, w, 0);
      gradient.addColorStop(0, `rgba(255,255,255,${opacity / 100})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');

      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.drawImage(tempCanvas, img.width + gap, 0);

      this.ctx.globalCompositeOperation = 'destination-in';
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(img.width + gap, 0, reflectionSize, h);

      this.ctx.globalCompositeOperation = 'destination-over';
      this.ctx.drawImage(img, 0, 0);
    }

    this.ctx.globalCompositeOperation = 'source-over';
  }

  reset() {
    this.originalImage = null;
    this.settings = { direction: 'bottom', height: 50, opacity: 50, gap: 5 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('reflectionHeight').value = 50;
    document.getElementById('heightValue').textContent = '50%';
    document.getElementById('opacity').value = 50;
    document.getElementById('opacityValue').textContent = '50%';
    document.getElementById('gap').value = 5;
    document.getElementById('gapValue').textContent = '5 px';
    document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.direction-btn[data-direction="bottom"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `reflection_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ReflectionTool());
