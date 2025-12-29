/**
 * IMG-246 圖片邊緣檢測工具
 */
class EdgeDetectionTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { threshold: 50, strength: 100, invert: false, overlay: false };
    this.mode = 'sobel';
    this.kernels = {
      sobel: {
        x: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
        y: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
      },
      prewitt: {
        x: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
        y: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]]
      },
      laplacian: {
        kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
      }
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

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;
        this.render();
      });
    });

    document.getElementById('threshold').addEventListener('input', (e) => {
      this.settings.threshold = parseInt(e.target.value);
      document.getElementById('thresholdValue').textContent = this.settings.threshold;
      this.render();
    });

    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = this.settings.strength + '%';
      this.render();
    });

    document.getElementById('invertColors').addEventListener('change', (e) => {
      this.settings.invert = e.target.checked;
      this.render();
    });

    document.getElementById('overlayOriginal').addEventListener('change', (e) => {
      this.settings.overlay = e.target.checked;
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

  convolve(data, w, h, kernel) {
    const result = new Float32Array(w * h);
    const kSize = kernel.length;
    const kHalf = Math.floor(kSize / 2);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx - kHalf));
            const py = Math.min(h - 1, Math.max(0, y + ky - kHalf));
            sum += data[py * w + px] * kernel[ky][kx];
          }
        }
        result[y * w + x] = sum;
      }
    }
    return result;
  }

  render() {
    if (!this.originalImage) return;
    const { threshold, strength, invert, overlay } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const srcData = this.ctx.getImageData(0, 0, w, h);
    const dstData = this.ctx.createImageData(w, h);

    // Convert to grayscale
    const gray = new Float32Array(w * h);
    for (let i = 0; i < srcData.data.length; i += 4) {
      gray[i / 4] = 0.299 * srcData.data[i] + 0.587 * srcData.data[i + 1] + 0.114 * srcData.data[i + 2];
    }

    let edges;
    const strengthFactor = strength / 100;

    if (this.mode === 'laplacian') {
      const lap = this.convolve(gray, w, h, this.kernels.laplacian.kernel);
      edges = lap.map(v => Math.abs(v) * strengthFactor);
    } else {
      const kernelData = this.kernels[this.mode];
      const gx = this.convolve(gray, w, h, kernelData.x);
      const gy = this.convolve(gray, w, h, kernelData.y);
      edges = new Float32Array(w * h);
      for (let i = 0; i < edges.length; i++) {
        edges[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]) * strengthFactor;
      }
    }

    // Apply threshold and create output
    for (let i = 0; i < edges.length; i++) {
      let edgeVal = edges[i] > threshold ? Math.min(255, edges[i]) : 0;

      if (invert) edgeVal = 255 - edgeVal;

      const idx = i * 4;
      if (overlay) {
        // Blend with original
        const blend = edgeVal / 255;
        dstData.data[idx] = srcData.data[idx] * (1 - blend) + edgeVal * blend;
        dstData.data[idx + 1] = srcData.data[idx + 1] * (1 - blend) + edgeVal * blend;
        dstData.data[idx + 2] = srcData.data[idx + 2] * (1 - blend) + edgeVal * blend;
      } else {
        dstData.data[idx] = edgeVal;
        dstData.data[idx + 1] = edgeVal;
        dstData.data[idx + 2] = edgeVal;
      }
      dstData.data[idx + 3] = 255;
    }

    this.ctx.putImageData(dstData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { threshold: 50, strength: 100, invert: false, overlay: false };
    this.mode = 'sobel';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('threshold').value = 50;
    document.getElementById('thresholdValue').textContent = '50';
    document.getElementById('strength').value = 100;
    document.getElementById('strengthValue').textContent = '100%';
    document.getElementById('invertColors').checked = false;
    document.getElementById('overlayOriginal').checked = false;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `edge_detection_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new EdgeDetectionTool());
