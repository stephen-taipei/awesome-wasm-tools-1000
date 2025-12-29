/**
 * IMG-222 圖片去背工具
 */
class BgRemovalTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      bgColor: { r: 255, g: 255, b: 255 },
      tolerance: 30,
      feather: 5,
      contiguous: true
    };
    this.clickPoint = null;
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

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      // Get color from original image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.originalImage.width;
      tempCanvas.height = this.originalImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(this.originalImage, 0, 0);
      const pixel = tempCtx.getImageData(x, y, 1, 1).data;

      this.settings.bgColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
      this.clickPoint = { x, y };
      this.updateColorPreview();
      this.render();
    });

    document.getElementById('tolerance').addEventListener('input', (e) => {
      this.settings.tolerance = parseInt(e.target.value);
      document.getElementById('toleranceValue').textContent = this.settings.tolerance;
      this.render();
    });

    document.getElementById('feather').addEventListener('input', (e) => {
      this.settings.feather = parseInt(e.target.value);
      document.getElementById('featherValue').textContent = this.settings.feather;
      this.render();
    });

    document.getElementById('contiguous').addEventListener('input', (e) => {
      this.settings.contiguous = parseInt(e.target.value) === 1;
      document.getElementById('contiguousValue').textContent = this.settings.contiguous ? '開啟' : '關閉';
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateColorPreview() {
    const { r, g, b } = this.settings.bgColor;
    document.getElementById('bgColorSwatch').style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    document.getElementById('bgColorHex').textContent = this.rgbToHex(r, g, b);
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join('');
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

  colorDistance(c1, c2) {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  }

  floodFill(imageData, startX, startY, targetColor, tolerance) {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    const visited = new Uint8Array(w * h);
    const result = new Uint8Array(w * h);
    const stack = [[startX, startY]];
    const maxDist = tolerance * 4.41;

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= w || y < 0 || y >= h) continue;

      const idx = y * w + x;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const i = idx * 4;
      const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
      const dist = this.colorDistance(pixel, targetColor);

      if (dist <= maxDist) {
        result[idx] = 1;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }

    return result;
  }

  render() {
    if (!this.originalImage) return;
    const { bgColor, tolerance, feather, contiguous } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const maxDist = tolerance * 4.41;
    const featherDist = feather * 4.41;

    let mask;
    if (contiguous && this.clickPoint) {
      mask = this.floodFill(imageData, this.clickPoint.x, this.clickPoint.y, bgColor, tolerance);
    }

    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
      const dist = this.colorDistance(pixel, bgColor);

      let shouldRemove = false;
      if (contiguous && mask) {
        shouldRemove = mask[idx] === 1;
      } else {
        shouldRemove = dist <= maxDist + featherDist;
      }

      if (shouldRemove) {
        if (dist <= maxDist) {
          data[i + 3] = 0;
        } else if (dist <= maxDist + featherDist) {
          const alpha = ((dist - maxDist) / featherDist) * 255;
          data[i + 3] = Math.min(data[i + 3], alpha);
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.clickPoint = null;
    this.settings = {
      bgColor: { r: 255, g: 255, b: 255 },
      tolerance: 30,
      feather: 5,
      contiguous: true
    };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('tolerance').value = 30;
    document.getElementById('toleranceValue').textContent = '30';
    document.getElementById('feather').value = 5;
    document.getElementById('featherValue').textContent = '5';
    document.getElementById('contiguous').value = 1;
    document.getElementById('contiguousValue').textContent = '開啟';
    document.getElementById('bgColorSwatch').style.backgroundColor = '#ffffff';
    document.getElementById('bgColorHex').textContent = '#FFFFFF';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `bg_removed_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new BgRemovalTool());
