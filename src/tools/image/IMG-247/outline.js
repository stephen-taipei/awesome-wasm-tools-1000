/**
 * IMG-247 圖片輪廓描邊工具
 */
class OutlineTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      thickness: 2,
      sensitivity: 50,
      posterize: 0,
      outlineColor: '#000000',
      showOriginal: true,
      invertOutline: false
    };
    this.mode = 'outline';
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

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;
        this.render();
      });
    });

    document.getElementById('thickness').addEventListener('input', (e) => {
      this.settings.thickness = parseInt(e.target.value);
      document.getElementById('thicknessValue').textContent = this.settings.thickness;
      this.render();
    });

    document.getElementById('sensitivity').addEventListener('input', (e) => {
      this.settings.sensitivity = parseInt(e.target.value);
      document.getElementById('sensitivityValue').textContent = this.settings.sensitivity;
      this.render();
    });

    document.getElementById('posterize').addEventListener('input', (e) => {
      this.settings.posterize = parseInt(e.target.value);
      document.getElementById('posterizeValue').textContent = this.settings.posterize;
      this.render();
    });

    document.getElementById('outlineColor').addEventListener('input', (e) => {
      this.settings.outlineColor = e.target.value;
      this.render();
    });

    document.getElementById('showOriginal').addEventListener('change', (e) => {
      this.settings.showOriginal = e.target.checked;
      this.render();
    });

    document.getElementById('invertOutline').addEventListener('change', (e) => {
      this.settings.invertOutline = e.target.checked;
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

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  detectEdges(srcData, w, h) {
    const edges = new Float32Array(w * h);
    const threshold = (100 - this.settings.sensitivity) * 2.55;
    const thickness = this.settings.thickness;

    // Sobel operator for edge detection
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    // Convert to grayscale first
    const gray = new Float32Array(w * h);
    for (let i = 0; i < srcData.data.length; i += 4) {
      gray[i / 4] = 0.299 * srcData.data[i] + 0.587 * srcData.data[i + 1] + 0.114 * srcData.data[i + 2];
    }

    // Apply Sobel operator
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx * thickness));
            const py = Math.min(h - 1, Math.max(0, y + ky * thickness));
            const val = gray[py * w + px];
            gx += val * sobelX[ky + 1][kx + 1];
            gy += val * sobelY[ky + 1][kx + 1];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * w + x] = magnitude > threshold ? 1 : 0;
      }
    }

    // Dilate edges based on thickness
    if (thickness > 1) {
      const dilated = new Float32Array(w * h);
      const radius = Math.floor(thickness / 2);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let hasEdge = false;
          for (let dy = -radius; dy <= radius && !hasEdge; dy++) {
            for (let dx = -radius; dx <= radius && !hasEdge; dx++) {
              const px = Math.min(w - 1, Math.max(0, x + dx));
              const py = Math.min(h - 1, Math.max(0, y + dy));
              if (edges[py * w + px] > 0) hasEdge = true;
            }
          }
          dilated[y * w + x] = hasEdge ? 1 : 0;
        }
      }
      return dilated;
    }

    return edges;
  }

  posterizeColor(r, g, b, levels) {
    if (levels <= 0) return [r, g, b];
    const numColors = Math.pow(2, levels);
    const step = 256 / numColors;
    return [
      Math.floor(r / step) * step + step / 2,
      Math.floor(g / step) * step + step / 2,
      Math.floor(b / step) * step + step / 2
    ];
  }

  render() {
    if (!this.originalImage) return;
    const { posterize, showOriginal, invertOutline, outlineColor } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const srcData = this.ctx.getImageData(0, 0, w, h);
    const dstData = this.ctx.createImageData(w, h);

    // Detect edges
    const edges = this.detectEdges(srcData, w, h);
    const lineColor = this.hexToRgb(outlineColor);

    // Generate neon colors if in neon mode
    const neonColors = [];
    if (this.mode === 'neon') {
      for (let i = 0; i < w * h; i++) {
        const hue = (i / (w * h)) * 360;
        neonColors.push(this.hslToRgb(hue, 100, 50));
      }
    }

    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      let r = srcData.data[idx];
      let g = srcData.data[idx + 1];
      let b = srcData.data[idx + 2];

      // Apply posterize if needed
      if (posterize > 0) {
        [r, g, b] = this.posterizeColor(r, g, b, posterize);
      }

      const isEdge = invertOutline ? edges[i] === 0 : edges[i] > 0;

      if (isEdge) {
        if (this.mode === 'neon') {
          // Neon glow effect
          const neon = neonColors[i];
          dstData.data[idx] = neon.r;
          dstData.data[idx + 1] = neon.g;
          dstData.data[idx + 2] = neon.b;
        } else {
          // Use outline color
          dstData.data[idx] = lineColor.r;
          dstData.data[idx + 1] = lineColor.g;
          dstData.data[idx + 2] = lineColor.b;
        }
      } else if (showOriginal) {
        // Show original or posterized image
        dstData.data[idx] = r;
        dstData.data[idx + 1] = g;
        dstData.data[idx + 2] = b;
      } else {
        // White background
        dstData.data[idx] = 255;
        dstData.data[idx + 1] = 255;
        dstData.data[idx + 2] = 255;
      }
      dstData.data[idx + 3] = 255;
    }

    // For cartoon mode, add extra processing
    if (this.mode === 'cartoon' && showOriginal) {
      // Smooth colors by reducing detail
      this.smoothColors(dstData, w, h);
    }

    this.ctx.putImageData(dstData, 0, 0);
  }

  smoothColors(imageData, w, h) {
    const data = imageData.data;
    const temp = new Uint8ClampedArray(data);
    const radius = 2;

    for (let y = radius; y < h - radius; y++) {
      for (let x = radius; x < w - radius; x++) {
        const idx = (y * w + x) * 4;

        // Skip if this is an edge pixel (black or very dark)
        if (data[idx] < 30 && data[idx + 1] < 30 && data[idx + 2] < 30) continue;

        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nIdx = ((y + dy) * w + (x + dx)) * 4;
            // Skip edge pixels in averaging
            if (temp[nIdx] < 30 && temp[nIdx + 1] < 30 && temp[nIdx + 2] < 30) continue;
            sumR += temp[nIdx];
            sumG += temp[nIdx + 1];
            sumB += temp[nIdx + 2];
            count++;
          }
        }

        if (count > 0) {
          data[idx] = sumR / count;
          data[idx + 1] = sumG / count;
          data[idx + 2] = sumB / count;
        }
      }
    }
  }

  hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4))
    };
  }

  reset() {
    this.originalImage = null;
    this.settings = {
      thickness: 2,
      sensitivity: 50,
      posterize: 0,
      outlineColor: '#000000',
      showOriginal: true,
      invertOutline: false
    };
    this.mode = 'outline';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('thickness').value = 2;
    document.getElementById('thicknessValue').textContent = '2';
    document.getElementById('sensitivity').value = 50;
    document.getElementById('sensitivityValue').textContent = '50';
    document.getElementById('posterize').value = 0;
    document.getElementById('posterizeValue').textContent = '0';
    document.getElementById('outlineColor').value = '#000000';
    document.getElementById('showOriginal').checked = true;
    document.getElementById('invertOutline').checked = false;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `outline_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new OutlineTool());
