/**
 * IMG-141 HDR 合成工具
 * HDR Image Composition Tool
 */

class HDRComposer {
  constructor() {
    this.images = [];
    this.imageData = [];
    this.maxImages = 5;
    this.resultImageData = null;

    this.settings = {
      method: 'exposure',
      contrast: 1.0,
      saturation: 1.0,
      exposure: 0,
      tonemap: 'auto',
      gamma: 2.2,
      highlight: 50
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Image list elements
    this.imageListSection = document.getElementById('imageListSection');
    this.imageList = document.getElementById('imageList');
    this.imageCount = document.getElementById('imageCount');

    // Settings elements
    this.settingsSection = document.getElementById('settingsSection');
    this.methodButtons = document.querySelectorAll('.method-btn');
    this.contrastSlider = document.getElementById('contrast');
    this.saturationSlider = document.getElementById('saturation');
    this.exposureSlider = document.getElementById('exposure');
    this.tonemapSelect = document.getElementById('tonemap');
    this.gammaSlider = document.getElementById('gamma');
    this.highlightSlider = document.getElementById('highlight');

    // Value displays
    this.contrastValue = document.getElementById('contrastValue');
    this.saturationValue = document.getElementById('saturationValue');
    this.exposureValue = document.getElementById('exposureValue');
    this.tonemapValue = document.getElementById('tonemapValue');
    this.gammaValue = document.getElementById('gammaValue');
    this.highlightValue = document.getElementById('highlightValue');

    // Progress elements
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');

    // Preview elements
    this.previewSection = document.getElementById('previewSection');
    this.previewTabs = document.querySelectorAll('.preview-tab');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');

    // Info elements
    this.outputSize = document.getElementById('outputSize');
    this.methodUsed = document.getElementById('methodUsed');
    this.inputCount = document.getElementById('inputCount');
    this.dynamicRange = document.getElementById('dynamicRange');

    // Buttons
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Method buttons
    this.methodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.methodButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.method = btn.dataset.method;
        this.updateMethodDisplay();
      });
    });

    // Setting sliders
    this.contrastSlider.addEventListener('input', (e) => {
      this.settings.contrast = parseFloat(e.target.value);
      this.contrastValue.textContent = this.settings.contrast.toFixed(1);
    });

    this.saturationSlider.addEventListener('input', (e) => {
      this.settings.saturation = parseFloat(e.target.value);
      this.saturationValue.textContent = this.settings.saturation.toFixed(1);
    });

    this.exposureSlider.addEventListener('input', (e) => {
      this.settings.exposure = parseFloat(e.target.value);
      this.exposureValue.textContent = this.settings.exposure > 0 ? `+${this.settings.exposure}` : this.settings.exposure;
    });

    this.tonemapSelect.addEventListener('change', (e) => {
      this.settings.tonemap = e.target.value;
      const labels = { auto: '自動', reinhard: 'Reinhard', drago: 'Drago', mantiuk: 'Mantiuk' };
      this.tonemapValue.textContent = labels[this.settings.tonemap];
    });

    this.gammaSlider.addEventListener('input', (e) => {
      this.settings.gamma = parseFloat(e.target.value);
      this.gammaValue.textContent = this.settings.gamma.toFixed(1);
    });

    this.highlightSlider.addEventListener('input', (e) => {
      this.settings.highlight = parseInt(e.target.value);
      this.highlightValue.textContent = `${this.settings.highlight}%`;
    });

    // Preview tabs
    this.previewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.previewTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.showPreview(tab.dataset.view);
      });
    });

    // Buttons
    this.processBtn.addEventListener('click', () => this.processHDR());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
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

    const files = Array.from(e.dataTransfer.files);
    this.addImages(files);
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.addImages(files);
  }

  async addImages(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const availableSlots = this.maxImages - this.images.length;

    if (imageFiles.length === 0) {
      this.showStatus('請選擇圖片檔案', 'error');
      return;
    }

    if (availableSlots <= 0) {
      this.showStatus('最多只能上傳 5 張圖片', 'error');
      return;
    }

    const filesToAdd = imageFiles.slice(0, availableSlots);

    for (const file of filesToAdd) {
      try {
        const imageInfo = await this.loadImage(file);
        this.images.push(imageInfo);
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    }

    this.updateImageList();
    this.updateUI();

    if (imageFiles.length > availableSlots) {
      this.showStatus(`已載入 ${filesToAdd.length} 張圖片（已達上限）`, 'info');
    } else {
      this.showStatus(`已載入 ${filesToAdd.length} 張圖片`, 'success');
    }
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 估算曝光值（基於亮度）
          const exposure = this.estimateExposure(img);
          resolve({
            file,
            img,
            name: file.name,
            dataUrl: e.target.result,
            exposure
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  estimateExposure(img) {
    // 取樣圖片計算平均亮度
    const canvas = document.createElement('canvas');
    const size = 100; // 取樣尺寸
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    let totalLuminance = 0;

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      // 計算感知亮度
      totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const avgLuminance = totalLuminance / (size * size);
    // 將亮度映射到曝光值
    if (avgLuminance > 200) return '+2';
    if (avgLuminance > 160) return '+1';
    if (avgLuminance > 120) return '0';
    if (avgLuminance > 80) return '-1';
    return '-2';
  }

  updateImageList() {
    this.imageList.innerHTML = '';
    this.imageCount.textContent = this.images.length;

    this.images.forEach((imageInfo, index) => {
      const item = document.createElement('div');
      item.className = 'image-item';

      const img = document.createElement('img');
      img.src = imageInfo.dataUrl;

      const info = document.createElement('div');
      info.className = 'image-info';

      const name = document.createElement('div');
      name.className = 'image-name';
      name.textContent = imageInfo.name;

      const exposure = document.createElement('div');
      exposure.className = 'image-exposure';
      exposure.textContent = `曝光: ${imageInfo.exposure} EV`;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'image-remove';
      removeBtn.innerHTML = '×';
      removeBtn.addEventListener('click', () => this.removeImage(index));

      info.appendChild(name);
      info.appendChild(exposure);

      item.appendChild(img);
      item.appendChild(info);
      item.appendChild(removeBtn);

      this.imageList.appendChild(item);
    });
  }

  removeImage(index) {
    this.images.splice(index, 1);
    this.updateImageList();
    this.updateUI();
    this.showStatus('圖片已移除', 'success');
  }

  updateUI() {
    const hasImages = this.images.length > 0;
    const canProcess = this.images.length >= 2;

    this.uploadZone.classList.toggle('has-files', hasImages);
    this.imageListSection.classList.toggle('active', hasImages);
    this.settingsSection.classList.toggle('active', canProcess);
    this.processBtn.disabled = !canProcess;

    if (!canProcess) {
      this.previewSection.classList.remove('active');
      this.downloadBtn.disabled = true;
    }
  }

  updateMethodDisplay() {
    const labels = {
      exposure: '曝光融合',
      mertens: 'Mertens 融合',
      debevec: 'Debevec 法'
    };
    this.methodUsed.textContent = labels[this.settings.method];
  }

  async processHDR() {
    if (this.images.length < 2) {
      this.showStatus('需要至少 2 張圖片', 'error');
      return;
    }

    this.progressSection.classList.add('active');
    this.processBtn.disabled = true;
    this.updateProgress(0, '準備處理...');

    try {
      // 取得所有圖片數據
      await this.loadAllImageData();
      this.updateProgress(20, '載入圖片數據...');

      // 執行 HDR 合成
      await this.composeHDR();
      this.updateProgress(80, '應用色調映射...');

      // 應用後處理
      await this.applyPostProcessing();
      this.updateProgress(100, '完成！');

      // 顯示結果
      this.showResult();

      setTimeout(() => {
        this.progressSection.classList.remove('active');
      }, 500);

      this.showStatus('HDR 合成完成！', 'success');
    } catch (error) {
      console.error('HDR processing error:', error);
      this.showStatus('處理過程中發生錯誤', 'error');
      this.progressSection.classList.remove('active');
    }

    this.processBtn.disabled = false;
  }

  async loadAllImageData() {
    this.imageData = [];

    // 找出最小的圖片尺寸
    let minWidth = Infinity;
    let minHeight = Infinity;

    this.images.forEach(info => {
      minWidth = Math.min(minWidth, info.img.width);
      minHeight = Math.min(minHeight, info.img.height);
    });

    // 統一尺寸並載入數據
    const canvas = document.createElement('canvas');
    canvas.width = minWidth;
    canvas.height = minHeight;
    const ctx = canvas.getContext('2d');

    for (const info of this.images) {
      ctx.clearRect(0, 0, minWidth, minHeight);
      ctx.drawImage(info.img, 0, 0, minWidth, minHeight);
      const data = ctx.getImageData(0, 0, minWidth, minHeight);
      this.imageData.push({
        data: data,
        exposure: parseFloat(info.exposure) || 0
      });
    }

    // 設定輸出畫布
    this.resultCanvas.width = minWidth;
    this.resultCanvas.height = minHeight;
    this.outputSize.textContent = `${minWidth} × ${minHeight}`;
    this.inputCount.textContent = `${this.images.length} 張`;
  }

  async composeHDR() {
    const width = this.resultCanvas.width;
    const height = this.resultCanvas.height;
    const resultData = this.resultCtx.createImageData(width, height);

    switch (this.settings.method) {
      case 'exposure':
        this.exposureFusion(resultData);
        break;
      case 'mertens':
        this.mertensFusion(resultData);
        break;
      case 'debevec':
        this.debevecFusion(resultData);
        break;
    }

    this.resultImageData = resultData;
  }

  // 曝光融合算法
  exposureFusion(resultData) {
    const width = resultData.width;
    const height = resultData.height;
    const numImages = this.imageData.length;

    for (let i = 0; i < resultData.data.length; i += 4) {
      let weightSum = 0;
      let rSum = 0, gSum = 0, bSum = 0;

      for (let j = 0; j < numImages; j++) {
        const r = this.imageData[j].data.data[i];
        const g = this.imageData[j].data.data[i + 1];
        const b = this.imageData[j].data.data[i + 2];

        // 計算權重（基於對比度、飽和度、曝光）
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const contrast = this.calcLocalContrast(this.imageData[j].data.data, i, width);
        const saturation = this.calcSaturation(r, g, b);
        const exposureWeight = this.calcExposureWeight(luminance);

        const weight = contrast * saturation * exposureWeight + 0.001;

        rSum += r * weight;
        gSum += g * weight;
        bSum += b * weight;
        weightSum += weight;
      }

      resultData.data[i] = Math.min(255, rSum / weightSum);
      resultData.data[i + 1] = Math.min(255, gSum / weightSum);
      resultData.data[i + 2] = Math.min(255, bSum / weightSum);
      resultData.data[i + 3] = 255;
    }
  }

  // Mertens 融合算法
  mertensFusion(resultData) {
    const numImages = this.imageData.length;
    const width = resultData.width;

    for (let i = 0; i < resultData.data.length; i += 4) {
      let weightSum = 0;
      let rSum = 0, gSum = 0, bSum = 0;

      for (let j = 0; j < numImages; j++) {
        const r = this.imageData[j].data.data[i];
        const g = this.imageData[j].data.data[i + 1];
        const b = this.imageData[j].data.data[i + 2];

        // Mertens 權重計算
        const contrast = this.calcLaplacianContrast(this.imageData[j].data.data, i, width);
        const saturation = this.calcSaturation(r, g, b);
        const wellExposed = this.calcWellExposed(r, g, b);

        const weight = Math.pow(contrast, 1) * Math.pow(saturation, 1) * Math.pow(wellExposed, 1) + 0.001;

        rSum += r * weight;
        gSum += g * weight;
        bSum += b * weight;
        weightSum += weight;
      }

      resultData.data[i] = Math.min(255, rSum / weightSum);
      resultData.data[i + 1] = Math.min(255, gSum / weightSum);
      resultData.data[i + 2] = Math.min(255, bSum / weightSum);
      resultData.data[i + 3] = 255;
    }
  }

  // Debevec 風格融合
  debevecFusion(resultData) {
    const numImages = this.imageData.length;

    // 建立 HDR 輻照圖
    const hdrR = new Float32Array(resultData.width * resultData.height);
    const hdrG = new Float32Array(resultData.width * resultData.height);
    const hdrB = new Float32Array(resultData.width * resultData.height);

    for (let i = 0, p = 0; i < resultData.data.length; i += 4, p++) {
      let weightSum = 0;

      for (let j = 0; j < numImages; j++) {
        const r = this.imageData[j].data.data[i];
        const g = this.imageData[j].data.data[i + 1];
        const b = this.imageData[j].data.data[i + 2];

        // 權重函數（帽子函數）
        const luminance = (r + g + b) / 3;
        const weight = this.hatFunction(luminance);

        // 曝光補償
        const exposure = Math.pow(2, this.imageData[j].exposure);

        hdrR[p] += (r / 255) * weight / exposure;
        hdrG[p] += (g / 255) * weight / exposure;
        hdrB[p] += (b / 255) * weight / exposure;
        weightSum += weight;
      }

      if (weightSum > 0) {
        hdrR[p] /= weightSum;
        hdrG[p] /= weightSum;
        hdrB[p] /= weightSum;
      }
    }

    // 色調映射
    this.toneMap(hdrR, hdrG, hdrB, resultData);
  }

  // 帽子函數
  hatFunction(z) {
    if (z <= 128) {
      return z / 128;
    }
    return (256 - z) / 128;
  }

  // 色調映射
  toneMap(hdrR, hdrG, hdrB, resultData) {
    const method = this.settings.tonemap;

    for (let i = 0, p = 0; i < resultData.data.length; i += 4, p++) {
      let r = hdrR[p];
      let g = hdrG[p];
      let b = hdrB[p];

      switch (method) {
        case 'reinhard':
          r = r / (1 + r);
          g = g / (1 + g);
          b = b / (1 + b);
          break;
        case 'drago':
          const Lmax = Math.max(r, g, b, 0.001);
          const bias = Math.log(0.5) / Math.log(0.5);
          r = Math.log(1 + r) / (Math.log(1 + Lmax) * Math.log(2 + 8 * Math.pow(r / Lmax, bias)));
          g = Math.log(1 + g) / (Math.log(1 + Lmax) * Math.log(2 + 8 * Math.pow(g / Lmax, bias)));
          b = Math.log(1 + b) / (Math.log(1 + Lmax) * Math.log(2 + 8 * Math.pow(b / Lmax, bias)));
          break;
        case 'mantiuk':
          r = Math.sqrt(r);
          g = Math.sqrt(g);
          b = Math.sqrt(b);
          break;
        default: // auto
          r = r / (1 + r);
          g = g / (1 + g);
          b = b / (1 + b);
      }

      // Gamma 校正
      const gamma = 1 / this.settings.gamma;
      r = Math.pow(Math.max(0, r), gamma);
      g = Math.pow(Math.max(0, g), gamma);
      b = Math.pow(Math.max(0, b), gamma);

      resultData.data[i] = Math.min(255, Math.max(0, r * 255));
      resultData.data[i + 1] = Math.min(255, Math.max(0, g * 255));
      resultData.data[i + 2] = Math.min(255, Math.max(0, b * 255));
      resultData.data[i + 3] = 255;
    }
  }

  // 局部對比度計算
  calcLocalContrast(data, i, width) {
    const idx = Math.floor(i / 4);
    const x = idx % width;
    const y = Math.floor(idx / width);

    if (x < 1 || x >= width - 1 || y < 1) return 0.5;

    const center = data[i];
    const left = data[i - 4] || center;
    const right = data[i + 4] || center;
    const top = data[i - width * 4] || center;
    const bottom = data[i + width * 4] || center;

    const dx = Math.abs(left - right);
    const dy = Math.abs(top - bottom);

    return Math.min(1, Math.sqrt(dx * dx + dy * dy) / 255);
  }

  // Laplacian 對比度
  calcLaplacianContrast(data, i, width) {
    const idx = Math.floor(i / 4);
    const x = idx % width;
    const y = Math.floor(idx / width);

    if (x < 1 || x >= width - 1 || y < 1) return 0.5;

    const center = data[i];
    const left = data[i - 4] || center;
    const right = data[i + 4] || center;
    const top = data[i - width * 4] || center;
    const bottom = data[i + width * 4] || center;

    const laplacian = Math.abs(4 * center - left - right - top - bottom);
    return Math.min(1, laplacian / 255);
  }

  // 飽和度計算
  calcSaturation(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) return 0;
    return (max - min) / max;
  }

  // 曝光權重
  calcExposureWeight(luminance) {
    const sigma = 0.2 * 255;
    const diff = luminance - 128;
    return Math.exp(-diff * diff / (2 * sigma * sigma));
  }

  // 良好曝光度量
  calcWellExposed(r, g, b) {
    const sigma = 0.2;
    const wr = Math.exp(-Math.pow(r / 255 - 0.5, 2) / (2 * sigma * sigma));
    const wg = Math.exp(-Math.pow(g / 255 - 0.5, 2) / (2 * sigma * sigma));
    const wb = Math.exp(-Math.pow(b / 255 - 0.5, 2) / (2 * sigma * sigma));
    return wr * wg * wb;
  }

  async applyPostProcessing() {
    if (!this.resultImageData) return;

    const data = this.resultImageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 曝光調整
      if (this.settings.exposure !== 0) {
        const factor = Math.pow(2, this.settings.exposure);
        r = Math.min(255, r * factor);
        g = Math.min(255, g * factor);
        b = Math.min(255, b * factor);
      }

      // 對比度調整
      if (this.settings.contrast !== 1) {
        r = ((r / 255 - 0.5) * this.settings.contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * this.settings.contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * this.settings.contrast + 0.5) * 255;
      }

      // 飽和度調整
      if (this.settings.saturation !== 1) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * this.settings.saturation;
        g = gray + (g - gray) * this.settings.saturation;
        b = gray + (b - gray) * this.settings.saturation;
      }

      // 高光壓縮
      if (this.settings.highlight < 100) {
        const factor = this.settings.highlight / 100;
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance > 200) {
          const compress = 1 - (1 - factor) * (luminance - 200) / 55;
          r *= compress;
          g *= compress;
          b *= compress;
        }
      }

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
  }

  showResult() {
    this.resultCtx.putImageData(this.resultImageData, 0, 0);
    this.previewSection.classList.add('active');
    this.downloadBtn.disabled = false;

    // 計算動態範圍
    const dr = this.calculateDynamicRange();
    this.dynamicRange.textContent = `${dr.toFixed(1)} EV`;
  }

  calculateDynamicRange() {
    if (this.imageData.length < 2) return 0;

    const exposures = this.imageData.map(d => parseFloat(d.exposure) || 0);
    return Math.max(...exposures) - Math.min(...exposures) + 3; // 基礎動態範圍 + 實際範圍
  }

  showPreview(view) {
    if (view === 'original' && this.images.length > 0) {
      // 顯示中間曝光的原始圖片
      const midIdx = Math.floor(this.images.length / 2);
      const img = this.images[midIdx].img;
      this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
      this.resultCtx.drawImage(img, 0, 0, this.resultCanvas.width, this.resultCanvas.height);
    } else if (view === 'result' && this.resultImageData) {
      this.resultCtx.putImageData(this.resultImageData, 0, 0);
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  downloadImage() {
    if (!this.resultImageData) return;

    const link = document.createElement('a');
    link.download = `hdr_${this.settings.method}_${Date.now()}.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.images = [];
    this.imageData = [];
    this.resultImageData = null;

    // 重置設定
    this.settings = {
      method: 'exposure',
      contrast: 1.0,
      saturation: 1.0,
      exposure: 0,
      tonemap: 'auto',
      gamma: 2.2,
      highlight: 50
    };

    // 重置 UI
    this.uploadZone.classList.remove('has-files');
    this.imageListSection.classList.remove('active');
    this.settingsSection.classList.remove('active');
    this.previewSection.classList.remove('active');
    this.progressSection.classList.remove('active');
    this.processBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // 重置滑桿
    this.contrastSlider.value = 1.0;
    this.saturationSlider.value = 1.0;
    this.exposureSlider.value = 0;
    this.gammaSlider.value = 2.2;
    this.highlightSlider.value = 50;
    this.tonemapSelect.value = 'auto';

    // 重置顯示值
    this.contrastValue.textContent = '1.0';
    this.saturationValue.textContent = '1.0';
    this.exposureValue.textContent = '0';
    this.gammaValue.textContent = '2.2';
    this.highlightValue.textContent = '50%';
    this.tonemapValue.textContent = '自動';

    // 重置方法按鈕
    this.methodButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.method === 'exposure');
    });

    // 清空列表
    this.imageList.innerHTML = '';
    this.imageCount.textContent = '0';

    // 清空畫布
    this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new HDRComposer();
});
