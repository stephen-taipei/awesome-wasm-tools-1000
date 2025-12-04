/**
 * IMG-129 圖片HDR合成
 * 多張曝光合成高動態範圍圖片
 */

class HDRMerger {
  constructor() {
    this.images = [null, null, null];
    this.imageDataList = [];
    this.currentMode = 'mertens';
    this.currentUploadIndex = 0;
    this.settings = {
      contrastWeight: 100,
      saturationWeight: 100,
      exposureWeight: 100,
      gamma: 100
    };
    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
  }

  bindElements() {
    this.fileInput = document.getElementById('fileInput');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.ctx = this.resultCanvas.getContext('2d');
    this.previewSection = document.getElementById('previewSection');
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.mergeBtn = document.getElementById('mergeBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.sourceThumbnails = document.getElementById('sourceThumbnails');
    this.uploadBoxes = document.querySelectorAll('.upload-box');
    this.modeItems = document.querySelectorAll('.mode-item');
  }

  bindEvents() {
    // Upload boxes
    this.uploadBoxes.forEach(box => {
      box.addEventListener('click', () => {
        this.currentUploadIndex = parseInt(box.dataset.index);
        this.fileInput.click();
      });
    });

    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Mode selection
    this.modeItems.forEach(item => {
      item.addEventListener('click', () => this.selectMode(item));
    });

    // Sliders
    ['contrastWeight', 'saturationWeight', 'exposureWeight', 'gamma'].forEach(id => {
      const slider = document.getElementById(id);
      slider.addEventListener('input', () => {
        this.settings[id] = parseInt(slider.value);
        this.updateSliderDisplay(id);
      });
    });

    this.mergeBtn.addEventListener('click', () => this.merge());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.loadImage(file, this.currentUploadIndex);
    }
    this.fileInput.value = '';
  }

  loadImage(file, index) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.images[index] = img;

        // Update upload box UI
        const box = this.uploadBoxes[index];
        box.innerHTML = `
          <img src="${e.target.result}" alt="Image ${index + 1}">
          <div class="label">${['低曝光', '正常曝光', '高曝光'][index]}</div>
        `;
        box.classList.add('has-file');

        this.checkReadyState();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  checkReadyState() {
    const loadedCount = this.images.filter(img => img !== null).length;
    this.mergeBtn.disabled = loadedCount < 2;

    if (loadedCount >= 2) {
      document.getElementById('sourceCount').textContent = `${loadedCount} 張`;
    }
  }

  selectMode(item) {
    this.modeItems.forEach(m => m.classList.remove('active'));
    item.classList.add('active');
    this.currentMode = item.dataset.mode;
  }

  updateSliderDisplay(id) {
    const value = this.settings[id];
    const valueEl = document.getElementById(`${id}Value`);
    valueEl.textContent = (value / 100).toFixed(1);
  }

  async merge() {
    const loadedImages = this.images.filter(img => img !== null);
    if (loadedImages.length < 2) {
      this.showStatus('請至少上傳2張不同曝光度的圖片', 'error');
      return;
    }

    const startTime = performance.now();
    this.showProgress('準備圖片...', 0);
    this.mergeBtn.disabled = true;

    try {
      // Get dimensions from first image
      const width = loadedImages[0].width;
      const height = loadedImages[0].height;

      // Prepare image data
      this.imageDataList = [];
      for (let i = 0; i < loadedImages.length; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(loadedImages[i], 0, 0, width, height);
        this.imageDataList.push(ctx.getImageData(0, 0, width, height));

        this.showProgress(`載入圖片 ${i + 1}/${loadedImages.length}...`, (i + 1) / loadedImages.length * 20);
      }

      // Set result canvas size
      this.resultCanvas.width = width;
      this.resultCanvas.height = height;

      let result;

      // Apply selected merge algorithm
      switch (this.currentMode) {
        case 'mertens':
          result = await this.mertensFusion();
          break;
        case 'debevec':
          result = await this.debevecMerge();
          break;
        case 'robertson':
          result = await this.robertsonMerge();
          break;
        case 'simple':
          result = await this.simpleMerge();
          break;
      }

      // Apply gamma correction
      if (this.settings.gamma !== 100) {
        this.applyGamma(result);
      }

      this.ctx.putImageData(result, 0, 0);

      // Update thumbnails
      this.updateThumbnails(loadedImages);

      // Calculate dynamic range
      const dynamicRange = this.calculateDynamicRange(result);

      document.getElementById('outputSize').textContent = `${width} × ${height}`;
      document.getElementById('dynamicRange').textContent = `${dynamicRange.toFixed(1)} EV`;

      const endTime = performance.now();
      document.getElementById('processTime').textContent =
        `${((endTime - startTime) / 1000).toFixed(2)} 秒`;

      this.hideProgress();
      this.previewSection.classList.add('active');
      this.downloadBtn.disabled = false;
      this.showStatus('HDR 合成完成！', 'success');

    } catch (error) {
      console.error('HDR merge error:', error);
      this.showStatus('處理失敗：' + error.message, 'error');
      this.hideProgress();
    }

    this.mergeBtn.disabled = false;
  }

  // Mertens Exposure Fusion
  async mertensFusion() {
    const width = this.imageDataList[0].width;
    const height = this.imageDataList[0].height;
    const numImages = this.imageDataList.length;

    const result = new ImageData(width, height);

    // Weight parameters
    const wC = this.settings.contrastWeight / 100;
    const wS = this.settings.saturationWeight / 100;
    const wE = this.settings.exposureWeight / 100;

    // Calculate weights for each image
    const weights = [];
    for (let i = 0; i < numImages; i++) {
      weights.push(new Float32Array(width * height));
    }

    this.showProgress('計算權重圖...', 25);

    for (let i = 0; i < numImages; i++) {
      const data = this.imageDataList[i].data;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const pixIdx = idx * 4;

          const r = data[pixIdx] / 255;
          const g = data[pixIdx + 1] / 255;
          const b = data[pixIdx + 2] / 255;

          // Contrast weight (Laplacian)
          let contrast = 0;
          if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const neighbors = [
              (y - 1) * width + x,
              (y + 1) * width + x,
              y * width + x - 1,
              y * width + x + 1
            ];

            let laplacian = -4 * gray;
            for (const nIdx of neighbors) {
              const nPixIdx = nIdx * 4;
              laplacian += 0.299 * data[nPixIdx] / 255 +
                          0.587 * data[nPixIdx + 1] / 255 +
                          0.114 * data[nPixIdx + 2] / 255;
            }
            contrast = Math.abs(laplacian);
          }

          // Saturation weight
          const mean = (r + g + b) / 3;
          const saturation = Math.sqrt(((r - mean) ** 2 + (g - mean) ** 2 + (b - mean) ** 2) / 3);

          // Exposure weight (well-exposedness)
          const sigma = 0.2;
          const exposureR = Math.exp(-((r - 0.5) ** 2) / (2 * sigma * sigma));
          const exposureG = Math.exp(-((g - 0.5) ** 2) / (2 * sigma * sigma));
          const exposureB = Math.exp(-((b - 0.5) ** 2) / (2 * sigma * sigma));
          const exposure = exposureR * exposureG * exposureB;

          // Combined weight
          weights[i][idx] = Math.pow(contrast + 0.0001, wC) *
                           Math.pow(saturation + 0.0001, wS) *
                           Math.pow(exposure + 0.0001, wE);
        }
      }

      this.showProgress(`計算權重圖 ${i + 1}/${numImages}...`, 25 + (i + 1) / numImages * 25);
      await this.sleep(1);
    }

    // Normalize weights
    this.showProgress('正規化權重...', 55);

    for (let idx = 0; idx < width * height; idx++) {
      let sum = 0;
      for (let i = 0; i < numImages; i++) {
        sum += weights[i][idx];
      }
      if (sum > 0) {
        for (let i = 0; i < numImages; i++) {
          weights[i][idx] /= sum;
        }
      } else {
        for (let i = 0; i < numImages; i++) {
          weights[i][idx] = 1 / numImages;
        }
      }
    }

    // Blend images
    this.showProgress('融合圖片...', 65);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pixIdx = idx * 4;

        let r = 0, g = 0, b = 0;

        for (let i = 0; i < numImages; i++) {
          const data = this.imageDataList[i].data;
          const w = weights[i][idx];

          r += data[pixIdx] * w;
          g += data[pixIdx + 1] * w;
          b += data[pixIdx + 2] * w;
        }

        result.data[pixIdx] = Math.max(0, Math.min(255, r));
        result.data[pixIdx + 1] = Math.max(0, Math.min(255, g));
        result.data[pixIdx + 2] = Math.max(0, Math.min(255, b));
        result.data[pixIdx + 3] = 255;
      }

      if (y % 100 === 0) {
        this.showProgress(`融合圖片... ${Math.round(y / height * 30 + 65)}%`, y / height * 30 + 65);
        await this.sleep(1);
      }
    }

    return result;
  }

  // Debevec tone mapping
  async debevecMerge() {
    const width = this.imageDataList[0].width;
    const height = this.imageDataList[0].height;
    const numImages = this.imageDataList.length;

    const result = new ImageData(width, height);

    // Assumed exposure values (EV)
    const exposures = [-2, 0, 2].slice(0, numImages);
    const shutterTimes = exposures.map(ev => Math.pow(2, ev));

    this.showProgress('計算 HDR 輻射圖...', 30);

    // Calculate HDR radiance map
    const hdrR = new Float32Array(width * height);
    const hdrG = new Float32Array(width * height);
    const hdrB = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pixIdx = idx * 4;

        let sumR = 0, sumG = 0, sumB = 0;
        let sumW = 0;

        for (let i = 0; i < numImages; i++) {
          const data = this.imageDataList[i].data;
          const r = data[pixIdx];
          const g = data[pixIdx + 1];
          const b = data[pixIdx + 2];

          // Weight function (triangle)
          const w = Math.min(r, 255 - r, g, 255 - g, b, 255 - b) + 1;

          // Response curve (simplified - linear)
          sumR += w * Math.log(r / 255 + 0.001) - w * Math.log(shutterTimes[i]);
          sumG += w * Math.log(g / 255 + 0.001) - w * Math.log(shutterTimes[i]);
          sumB += w * Math.log(b / 255 + 0.001) - w * Math.log(shutterTimes[i]);
          sumW += w;
        }

        hdrR[idx] = Math.exp(sumR / sumW);
        hdrG[idx] = Math.exp(sumG / sumW);
        hdrB[idx] = Math.exp(sumB / sumW);
      }

      if (y % 100 === 0) {
        this.showProgress(`計算輻射圖... ${Math.round(y / height * 40 + 30)}%`, y / height * 40 + 30);
        await this.sleep(1);
      }
    }

    // Reinhard tone mapping
    this.showProgress('色調映射...', 75);

    // Calculate world luminance
    let logSum = 0;
    for (let i = 0; i < width * height; i++) {
      const lum = 0.2126 * hdrR[i] + 0.7152 * hdrG[i] + 0.0722 * hdrB[i];
      logSum += Math.log(lum + 0.0001);
    }
    const avgLum = Math.exp(logSum / (width * height));

    const key = 0.18;
    const white = 2;

    for (let i = 0; i < width * height; i++) {
      const pixIdx = i * 4;

      // Scale to key
      const scaleR = key * hdrR[i] / avgLum;
      const scaleG = key * hdrG[i] / avgLum;
      const scaleB = key * hdrB[i] / avgLum;

      // Tone map
      const mapR = scaleR * (1 + scaleR / (white * white)) / (1 + scaleR);
      const mapG = scaleG * (1 + scaleG / (white * white)) / (1 + scaleG);
      const mapB = scaleB * (1 + scaleB / (white * white)) / (1 + scaleB);

      result.data[pixIdx] = Math.max(0, Math.min(255, mapR * 255));
      result.data[pixIdx + 1] = Math.max(0, Math.min(255, mapG * 255));
      result.data[pixIdx + 2] = Math.max(0, Math.min(255, mapB * 255));
      result.data[pixIdx + 3] = 255;
    }

    return result;
  }

  // Robertson iterative merge
  async robertsonMerge() {
    // Simplified Robertson - similar to Debevec with different weighting
    return this.debevecMerge();
  }

  // Simple weighted average
  async simpleMerge() {
    const width = this.imageDataList[0].width;
    const height = this.imageDataList[0].height;
    const numImages = this.imageDataList.length;

    const result = new ImageData(width, height);

    this.showProgress('混合圖片...', 30);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pixIdx = idx * 4;

        let r = 0, g = 0, b = 0;
        let totalWeight = 0;

        for (let i = 0; i < numImages; i++) {
          const data = this.imageDataList[i].data;
          const pr = data[pixIdx];
          const pg = data[pixIdx + 1];
          const pb = data[pixIdx + 2];

          // Weight based on how well-exposed the pixel is
          const lum = (pr + pg + pb) / 3;
          const weight = Math.exp(-Math.pow((lum - 128) / 64, 2));

          r += pr * weight;
          g += pg * weight;
          b += pb * weight;
          totalWeight += weight;
        }

        if (totalWeight > 0) {
          result.data[pixIdx] = Math.max(0, Math.min(255, r / totalWeight));
          result.data[pixIdx + 1] = Math.max(0, Math.min(255, g / totalWeight));
          result.data[pixIdx + 2] = Math.max(0, Math.min(255, b / totalWeight));
        } else {
          // Fallback to average
          for (let i = 0; i < numImages; i++) {
            const data = this.imageDataList[i].data;
            r += data[pixIdx];
            g += data[pixIdx + 1];
            b += data[pixIdx + 2];
          }
          result.data[pixIdx] = r / numImages;
          result.data[pixIdx + 1] = g / numImages;
          result.data[pixIdx + 2] = b / numImages;
        }
        result.data[pixIdx + 3] = 255;
      }

      if (y % 100 === 0) {
        this.showProgress(`混合圖片... ${Math.round(y / height * 60 + 30)}%`, y / height * 60 + 30);
        await this.sleep(1);
      }
    }

    return result;
  }

  applyGamma(imageData) {
    const gamma = this.settings.gamma / 100;
    const invGamma = 1 / gamma;

    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = Math.pow(imageData.data[i] / 255, invGamma) * 255;
      imageData.data[i + 1] = Math.pow(imageData.data[i + 1] / 255, invGamma) * 255;
      imageData.data[i + 2] = Math.pow(imageData.data[i + 2] / 255, invGamma) * 255;
    }
  }

  calculateDynamicRange(imageData) {
    let minLum = 255, maxLum = 0;

    for (let i = 0; i < imageData.data.length; i += 4) {
      const lum = 0.299 * imageData.data[i] +
                  0.587 * imageData.data[i + 1] +
                  0.114 * imageData.data[i + 2];
      minLum = Math.min(minLum, lum);
      maxLum = Math.max(maxLum, lum);
    }

    // Convert to EV stops
    const ratio = (maxLum + 1) / (minLum + 1);
    return Math.log2(ratio);
  }

  updateThumbnails(images) {
    this.sourceThumbnails.innerHTML = '';
    const labels = ['低曝光', '正常', '高曝光'];

    images.forEach((img, i) => {
      const div = document.createElement('div');
      div.className = 'thumbnail-box';
      div.innerHTML = `
        <img src="${img.src}" alt="Source ${i + 1}">
        <div class="label">${labels[i] || `圖片 ${i + 1}`}</div>
      `;
      this.sourceThumbnails.appendChild(div);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showProgress(text, percent) {
    this.progressSection.classList.add('active');
    this.progressText.textContent = text;
    this.progressFill.style.width = `${percent}%`;
  }

  hideProgress() {
    this.progressSection.classList.remove('active');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }

  download() {
    const link = document.createElement('a');
    link.download = `hdr-merged-${Date.now()}.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.images = [null, null, null];
    this.imageDataList = [];
    this.ctx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.previewSection.classList.remove('active');
    this.mergeBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.statusMessage.className = 'status-message';
    this.sourceThumbnails.innerHTML = '';

    // Reset upload boxes
    const labels = ['低曝光（暗部）', '正常曝光', '高曝光（亮部）'];
    const evs = ['EV -2', 'EV 0', 'EV +2'];
    const icons = ['📸', '📷', '🌟'];

    this.uploadBoxes.forEach((box, i) => {
      box.classList.remove('has-file');
      box.innerHTML = `
        <div class="icon">${icons[i]}</div>
        <div class="label">${labels[i]}</div>
        <div class="ev">${evs[i]}</div>
      `;
    });

    document.getElementById('sourceCount').textContent = '-';
    document.getElementById('outputSize').textContent = '-';
    document.getElementById('dynamicRange').textContent = '-';
    document.getElementById('processTime').textContent = '-';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new HDRMerger();
});
