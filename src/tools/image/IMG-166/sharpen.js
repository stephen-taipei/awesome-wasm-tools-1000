/**
 * IMG-166 圖片銳化工具
 * 增強圖片清晰度與邊緣細節
 */

class SharpenTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');

    // History for undo
    this.originalData = null;

    // Settings
    this.settings = {
      type: 'standard',
      amount: 50,
      radius: 1,
      threshold: 0
    };

    // Mode descriptions
    this.modeDescriptions = {
      'standard': '標準銳化：適合一般用途，均勻增強整體清晰度',
      'unsharp': '遮罩銳化：專業級銳化，可精確控制效果',
      'edge': '邊緣增強：只增強邊緣，保持平滑區域'
    };

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Upload
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    // Type selector
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.type = btn.dataset.type;
        this.updateTypeUI();
      });
    });

    // Controls
    this.bindSlider('amount', '%');
    this.bindSlider('radius', 'px');
    this.bindSlider('threshold', '');

    // Buttons
    document.getElementById('previewBtn').addEventListener('click', () => this.applySharpen());
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  bindSlider(id, unit) {
    const input = document.getElementById(id);
    const valueDisplay = document.getElementById(id + 'Value');

    input.addEventListener('input', (e) => {
      this.settings[id] = parseInt(e.target.value);
      valueDisplay.textContent = this.settings[id] + unit;
    });
  }

  updateTypeUI() {
    const modeInfo = document.getElementById('modeInfo');
    const thresholdGroup = document.getElementById('thresholdGroup');

    modeInfo.textContent = this.modeDescriptions[this.settings.type];

    // Show threshold only for unsharp mask
    thresholdGroup.style.display = this.settings.type === 'unsharp' ? 'block' : 'none';
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) {
      this.showStatus('error', '不支援的檔案格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
        this.saveOriginal();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.drawImage(this.originalImage, 0, 0);
  }

  saveOriginal() {
    this.originalData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    document.getElementById('undoBtn').disabled = true;
  }

  applySharpen() {
    if (!this.originalImage) return;

    // First restore original
    this.ctx.putImageData(this.originalData, 0, 0);

    const { type, amount, radius, threshold } = this.settings;
    const strength = amount / 100;

    switch (type) {
      case 'standard':
        this.applyConvolution(this.getStandardKernel(strength));
        break;
      case 'unsharp':
        this.applyUnsharpMask(strength, radius, threshold);
        break;
      case 'edge':
        this.applyEdgeEnhancement(strength);
        break;
    }

    document.getElementById('undoBtn').disabled = false;
    this.showStatus('success', '銳化效果已套用');
  }

  getStandardKernel(strength) {
    const center = 1 + 4 * strength;
    const side = -strength;
    return [
      0, side, 0,
      side, center, side,
      0, side, 0
    ];
  }

  applyConvolution(kernel) {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const output = new Uint8ClampedArray(data);

    const kernelSize = 3;
    const half = Math.floor(kernelSize / 2);

    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const px = x + kx - half;
            const py = y + ky - half;
            const i = (py * width + px) * 4;
            const k = kernel[ky * kernelSize + kx];

            r += data[i] * k;
            g += data[i + 1] * k;
            b += data[i + 2] * k;
          }
        }

        const i = (y * width + x) * 4;
        output[i] = this.clamp(r);
        output[i + 1] = this.clamp(g);
        output[i + 2] = this.clamp(b);
      }
    }

    imageData.data.set(output);
    this.ctx.putImageData(imageData, 0, 0);
  }

  applyUnsharpMask(amount, radius, threshold) {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Create blurred version
    const blurred = this.gaussianBlur(data, width, height, radius);

    // Apply unsharp mask
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const original = data[i + c];
        const blur = blurred[i + c];
        const diff = original - blur;

        // Apply threshold
        if (Math.abs(diff) > threshold) {
          data[i + c] = this.clamp(original + diff * amount);
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  gaussianBlur(data, width, height, radius) {
    const output = new Uint8ClampedArray(data);
    const kernel = this.createGaussianKernel(radius);
    const size = kernel.length;
    const half = Math.floor(size / 2);

    // Horizontal pass
    const temp = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, sum = 0;

        for (let k = 0; k < size; k++) {
          const px = Math.min(Math.max(x + k - half, 0), width - 1);
          const i = (y * width + px) * 4;
          const weight = kernel[k];

          r += data[i] * weight;
          g += data[i + 1] * weight;
          b += data[i + 2] * weight;
          sum += weight;
        }

        const i = (y * width + x) * 4;
        temp[i] = r / sum;
        temp[i + 1] = g / sum;
        temp[i + 2] = b / sum;
        temp[i + 3] = data[i + 3];
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, sum = 0;

        for (let k = 0; k < size; k++) {
          const py = Math.min(Math.max(y + k - half, 0), height - 1);
          const i = (py * width + x) * 4;
          const weight = kernel[k];

          r += temp[i] * weight;
          g += temp[i + 1] * weight;
          b += temp[i + 2] * weight;
          sum += weight;
        }

        const i = (y * width + x) * 4;
        output[i] = r / sum;
        output[i + 1] = g / sum;
        output[i + 2] = b / sum;
        output[i + 3] = temp[i + 3];
      }
    }

    return output;
  }

  createGaussianKernel(radius) {
    const size = radius * 2 + 1;
    const kernel = new Array(size);
    const sigma = radius / 3;
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const x = i - radius;
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
      sum += kernel[i];
    }

    // Normalize
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }

    return kernel;
  }

  applyEdgeEnhancement(strength) {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const original = new Uint8ClampedArray(data);

    // Sobel edge detection
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gxR = 0, gyR = 0;
        let gxG = 0, gyG = 0;
        let gxB = 0, gyB = 0;

        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx - 1;
            const py = y + ky - 1;
            const i = (py * width + px) * 4;
            const kIdx = ky * 3 + kx;

            gxR += original[i] * sobelX[kIdx];
            gyR += original[i] * sobelY[kIdx];
            gxG += original[i + 1] * sobelX[kIdx];
            gyG += original[i + 1] * sobelY[kIdx];
            gxB += original[i + 2] * sobelX[kIdx];
            gyB += original[i + 2] * sobelY[kIdx];
          }
        }

        const i = (y * width + x) * 4;
        const edgeR = Math.sqrt(gxR * gxR + gyR * gyR);
        const edgeG = Math.sqrt(gxG * gxG + gyG * gyG);
        const edgeB = Math.sqrt(gxB * gxB + gyB * gyB);

        data[i] = this.clamp(original[i] + edgeR * strength);
        data[i + 1] = this.clamp(original[i + 1] + edgeG * strength);
        data[i + 2] = this.clamp(original[i + 2] + edgeB * strength);
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  undo() {
    if (!this.originalData) return;
    this.ctx.putImageData(this.originalData, 0, 0);
    document.getElementById('undoBtn').disabled = true;
    this.showStatus('success', '已復原');
  }

  reset() {
    this.originalImage = null;
    this.originalData = null;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';

    // Reset settings
    this.settings = {
      type: 'standard',
      amount: 50,
      radius: 1,
      threshold: 0
    };

    // Reset controls
    document.getElementById('amount').value = 50;
    document.getElementById('amountValue').textContent = '50%';
    document.getElementById('radius').value = 1;
    document.getElementById('radiusValue').textContent = '1px';
    document.getElementById('threshold').value = 0;
    document.getElementById('thresholdValue').textContent = '0';

    // Reset type
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.type-btn[data-type="standard"]').classList.add('active');
    document.getElementById('modeInfo').textContent = this.modeDescriptions['standard'];
    document.getElementById('thresholdGroup').style.display = 'none';

    document.getElementById('undoBtn').disabled = true;
  }

  download() {
    if (!this.canvas.width) return;

    const link = document.createElement('a');
    link.download = `sharpen_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  showStatus(type, message) {
    const el = document.getElementById('statusMessage');
    el.className = `status-message ${type}`;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SharpenTool();
});
