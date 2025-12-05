/**
 * IMG-139 色盲模擬工具
 * Color Blindness Simulation Tool
 */

class ColorBlindSimulator {
  constructor() {
    this.originalImage = null;
    this.currentCVDType = 'protanopia';
    this.severity = 100;
    this.history = [];
    this.maxHistory = 20;

    // 色盲模擬矩陣 (Brettel, Viénot, Mollon 1997 / Machado 2009)
    this.cvdMatrices = {
      // 紅色盲 (L-cone deficiency)
      protanopia: [
        [0.567, 0.433, 0.000],
        [0.558, 0.442, 0.000],
        [0.000, 0.242, 0.758]
      ],
      // 綠色盲 (M-cone deficiency)
      deuteranopia: [
        [0.625, 0.375, 0.000],
        [0.700, 0.300, 0.000],
        [0.000, 0.300, 0.700]
      ],
      // 藍色盲 (S-cone deficiency)
      tritanopia: [
        [0.950, 0.050, 0.000],
        [0.000, 0.433, 0.567],
        [0.000, 0.475, 0.525]
      ],
      // 全色盲 (Rod monochromacy)
      achromatopsia: [
        [0.299, 0.587, 0.114],
        [0.299, 0.587, 0.114],
        [0.299, 0.587, 0.114]
      ]
    };

    // 範例顏色
    this.sampleColors = [
      { name: '紅色', hex: '#FF0000' },
      { name: '綠色', hex: '#00FF00' },
      { name: '藍色', hex: '#0000FF' },
      { name: '黃色', hex: '#FFFF00' },
      { name: '紫色', hex: '#800080' },
      { name: '橙色', hex: '#FFA500' },
      { name: '粉紅', hex: '#FFC0CB' },
      { name: '青色', hex: '#00FFFF' }
    ];

    this.initElements();
    this.bindEvents();
    this.initColorComparison();
  }

  initElements() {
    // Upload elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Settings elements
    this.settingsSection = document.getElementById('settingsSection');
    this.cvdButtons = document.querySelectorAll('.cvd-btn');
    this.severitySlider = document.getElementById('severity');
    this.severityValue = document.getElementById('severityValue');

    // Preview elements
    this.previewSection = document.getElementById('previewSection');
    this.originalCanvas = document.getElementById('originalCanvas');
    this.simulatedCanvas = document.getElementById('simulatedCanvas');
    this.originalCtx = this.originalCanvas.getContext('2d');
    this.simulatedCtx = this.simulatedCanvas.getContext('2d');

    // Info elements
    this.imageSize = document.getElementById('imageSize');
    this.currentType = document.getElementById('currentType');
    this.currentSeverity = document.getElementById('currentSeverity');
    this.colorDiff = document.getElementById('colorDiff');

    // Buttons
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');

    // Color comparison
    this.colorGrid = document.getElementById('colorGrid');
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // CVD type buttons
    this.cvdButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.cvdButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCVDType = btn.dataset.type;
        this.currentType.textContent = btn.querySelector('span:last-child').textContent;
        this.applySimulation();
        this.updateColorComparison();
      });
    });

    // Severity slider
    this.severitySlider.addEventListener('input', (e) => {
      this.severity = parseInt(e.target.value);
      this.severityValue.textContent = `${this.severity}%`;
      this.currentSeverity.textContent = `${this.severity}%`;
      this.applySimulation();
      this.updateColorComparison();
    });

    // Download button
    this.downloadBtn.addEventListener('click', () => this.downloadImage());

    // Reset button
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  loadImage(file) {
    if (!file.type.startsWith('image/')) {
      this.showStatus('請上傳圖片檔案', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.setupCanvas(img);
        this.showStatus('圖片載入成功！', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setupCanvas(img) {
    // 計算適當的顯示尺寸
    const maxSize = 400;
    let width = img.width;
    let height = img.height;

    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // 設定畫布大小
    this.originalCanvas.width = width;
    this.originalCanvas.height = height;
    this.simulatedCanvas.width = width;
    this.simulatedCanvas.height = height;

    // 繪製原始圖片
    this.originalCtx.drawImage(img, 0, 0, width, height);

    // 更新 UI
    this.uploadZone.classList.add('has-file');
    this.settingsSection.classList.add('active');
    this.previewSection.classList.add('active');
    this.downloadBtn.disabled = false;

    // 更新資訊
    this.imageSize.textContent = `${img.width} × ${img.height}`;

    // 應用模擬
    this.applySimulation();
  }

  applySimulation() {
    if (!this.originalImage) return;

    const width = this.originalCanvas.width;
    const height = this.originalCanvas.height;

    // 獲取原始圖片數據
    const originalData = this.originalCtx.getImageData(0, 0, width, height);
    const simulatedData = this.simulatedCtx.createImageData(width, height);

    // 獲取模擬矩陣
    const matrix = this.cvdMatrices[this.currentCVDType];
    const severity = this.severity / 100;

    // 計算總色彩差異
    let totalDiff = 0;
    let pixelCount = 0;

    // 應用色盲模擬
    for (let i = 0; i < originalData.data.length; i += 4) {
      const r = originalData.data[i];
      const g = originalData.data[i + 1];
      const b = originalData.data[i + 2];
      const a = originalData.data[i + 3];

      // 轉換到線性空間
      const linearR = this.sRGBToLinear(r / 255);
      const linearG = this.sRGBToLinear(g / 255);
      const linearB = this.sRGBToLinear(b / 255);

      // 應用色盲矩陣
      let simR = matrix[0][0] * linearR + matrix[0][1] * linearG + matrix[0][2] * linearB;
      let simG = matrix[1][0] * linearR + matrix[1][1] * linearG + matrix[1][2] * linearB;
      let simB = matrix[2][0] * linearR + matrix[2][1] * linearG + matrix[2][2] * linearB;

      // 混合原始和模擬顏色 (根據嚴重程度)
      simR = linearR * (1 - severity) + simR * severity;
      simG = linearG * (1 - severity) + simG * severity;
      simB = linearB * (1 - severity) + simB * severity;

      // 轉回 sRGB 空間
      const finalR = Math.round(this.linearToSRGB(Math.max(0, Math.min(1, simR))) * 255);
      const finalG = Math.round(this.linearToSRGB(Math.max(0, Math.min(1, simG))) * 255);
      const finalB = Math.round(this.linearToSRGB(Math.max(0, Math.min(1, simB))) * 255);

      simulatedData.data[i] = finalR;
      simulatedData.data[i + 1] = finalG;
      simulatedData.data[i + 2] = finalB;
      simulatedData.data[i + 3] = a;

      // 計算色彩差異 (Delta E 簡化版)
      if (a > 0) {
        const diff = Math.sqrt(
          Math.pow(r - finalR, 2) +
          Math.pow(g - finalG, 2) +
          Math.pow(b - finalB, 2)
        );
        totalDiff += diff;
        pixelCount++;
      }
    }

    // 更新畫布
    this.simulatedCtx.putImageData(simulatedData, 0, 0);

    // 更新色彩差異顯示
    const avgDiff = pixelCount > 0 ? (totalDiff / pixelCount).toFixed(1) : 0;
    this.colorDiff.textContent = avgDiff;
  }

  // sRGB 到線性轉換
  sRGBToLinear(value) {
    if (value <= 0.04045) {
      return value / 12.92;
    }
    return Math.pow((value + 0.055) / 1.055, 2.4);
  }

  // 線性到 sRGB 轉換
  linearToSRGB(value) {
    if (value <= 0.0031308) {
      return value * 12.92;
    }
    return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  }

  // 初始化顏色對比區域
  initColorComparison() {
    this.colorGrid.innerHTML = '';

    this.sampleColors.forEach(color => {
      const item = document.createElement('div');
      item.className = 'color-item';

      const originalSwatch = document.createElement('div');
      originalSwatch.className = 'color-swatch original';
      originalSwatch.style.backgroundColor = color.hex;

      const simulatedSwatch = document.createElement('div');
      simulatedSwatch.className = 'color-swatch simulated';
      simulatedSwatch.dataset.originalColor = color.hex;

      const label = document.createElement('div');
      label.className = 'color-label';
      label.textContent = color.name;

      item.appendChild(originalSwatch);
      item.appendChild(simulatedSwatch);
      item.appendChild(label);
      this.colorGrid.appendChild(item);
    });

    this.updateColorComparison();
  }

  // 更新顏色對比
  updateColorComparison() {
    const simulatedSwatches = this.colorGrid.querySelectorAll('.simulated');
    const matrix = this.cvdMatrices[this.currentCVDType];
    const severity = this.severity / 100;

    simulatedSwatches.forEach(swatch => {
      const hex = swatch.dataset.originalColor;
      const rgb = this.hexToRgb(hex);

      // 轉換到線性空間
      const linearR = this.sRGBToLinear(rgb.r / 255);
      const linearG = this.sRGBToLinear(rgb.g / 255);
      const linearB = this.sRGBToLinear(rgb.b / 255);

      // 應用色盲矩陣
      let simR = matrix[0][0] * linearR + matrix[0][1] * linearG + matrix[0][2] * linearB;
      let simG = matrix[1][0] * linearR + matrix[1][1] * linearG + matrix[1][2] * linearB;
      let simB = matrix[2][0] * linearR + matrix[2][1] * linearG + matrix[2][2] * linearB;

      // 混合
      simR = linearR * (1 - severity) + simR * severity;
      simG = linearG * (1 - severity) + simG * severity;
      simB = linearB * (1 - severity) + simB * severity;

      // 轉回 sRGB
      const finalR = Math.round(this.linearToSRGB(Math.max(0, Math.min(1, simR))) * 255);
      const finalG = Math.round(this.linearToSRGB(Math.max(0, Math.min(1, simG))) * 255);
      const finalB = Math.round(this.linearToSRGB(Math.max(0, Math.min(1, simB))) * 255);

      swatch.style.backgroundColor = `rgb(${finalR}, ${finalG}, ${finalB})`;
    });
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  downloadImage() {
    if (!this.originalImage) return;

    // 創建全尺寸畫布
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = this.originalImage.width;
    fullCanvas.height = this.originalImage.height;
    const fullCtx = fullCanvas.getContext('2d');

    // 繪製原始圖片
    fullCtx.drawImage(this.originalImage, 0, 0);

    // 獲取圖片數據
    const imageData = fullCtx.getImageData(0, 0, fullCanvas.width, fullCanvas.height);
    const matrix = this.cvdMatrices[this.currentCVDType];
    const severity = this.severity / 100;

    // 應用色盲模擬
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];

      const linearR = this.sRGBToLinear(r / 255);
      const linearG = this.sRGBToLinear(g / 255);
      const linearB = this.sRGBToLinear(b / 255);

      let simR = matrix[0][0] * linearR + matrix[0][1] * linearG + matrix[0][2] * linearB;
      let simG = matrix[1][0] * linearR + matrix[1][1] * linearG + matrix[1][2] * linearB;
      let simB = matrix[2][0] * linearR + matrix[2][1] * linearG + matrix[2][2] * linearB;

      simR = linearR * (1 - severity) + simR * severity;
      simG = linearG * (1 - severity) + simG * severity;
      simB = linearB * (1 - severity) + simB * severity;

      imageData.data[i] = Math.round(this.linearToSRGB(Math.max(0, Math.min(1, simR))) * 255);
      imageData.data[i + 1] = Math.round(this.linearToSRGB(Math.max(0, Math.min(1, simG))) * 255);
      imageData.data[i + 2] = Math.round(this.linearToSRGB(Math.max(0, Math.min(1, simB))) * 255);
    }

    fullCtx.putImageData(imageData, 0, 0);

    // 下載
    const link = document.createElement('a');
    const cvdNames = {
      protanopia: 'protanopia',
      deuteranopia: 'deuteranopia',
      tritanopia: 'tritanopia',
      achromatopsia: 'achromatopsia'
    };
    link.download = `colorblind_${cvdNames[this.currentCVDType]}_${this.severity}pct.png`;
    link.href = fullCanvas.toDataURL('image/png');
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.originalImage = null;
    this.currentCVDType = 'protanopia';
    this.severity = 100;

    // 重置 UI
    this.uploadZone.classList.remove('has-file');
    this.settingsSection.classList.remove('active');
    this.previewSection.classList.remove('active');
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // 重置滑桿
    this.severitySlider.value = 100;
    this.severityValue.textContent = '100%';

    // 重置按鈕
    this.cvdButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === 'protanopia');
    });

    // 重置資訊
    this.imageSize.textContent = '-';
    this.currentType.textContent = '紅色盲';
    this.currentSeverity.textContent = '100%';
    this.colorDiff.textContent = '-';

    // 清除畫布
    this.originalCtx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
    this.simulatedCtx.clearRect(0, 0, this.simulatedCanvas.width, this.simulatedCanvas.height);

    // 更新顏色對比
    this.updateColorComparison();

    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new ColorBlindSimulator();
});
