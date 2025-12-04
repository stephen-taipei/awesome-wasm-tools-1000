/**
 * IMG-117 圖片相似度比對
 * 比較兩張圖片的相似程度
 */

class ImageComparator {
  constructor() {
    this.images = [null, null];
    this.imageData = [null, null];

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Setup both upload zones
    [1, 2].forEach(index => {
      const uploadZone = document.getElementById(`uploadZone${index}`);
      const fileInput = document.getElementById(`fileInput${index}`);

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
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          this.handleFile(file, index - 1);
        }
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.handleFile(file, index - 1);
      });
    });

    // Buttons
    document.getElementById('compareBtn').addEventListener('click', () => this.compare());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFile(file, index) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.images[index] = img;

        // Update upload zone
        const uploadZone = document.getElementById(`uploadZone${index + 1}`);
        uploadZone.classList.add('has-file');
        uploadZone.innerHTML = `<img src="${e.target.result}" alt="Image ${index + 1}">`;

        // Enable compare button if both images are loaded
        this.checkReady();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  checkReady() {
    const ready = this.images[0] !== null && this.images[1] !== null;
    document.getElementById('compareBtn').disabled = !ready;
  }

  async compare() {
    if (!this.images[0] || !this.images[1]) return;

    this.showProgress(true);
    this.updateProgress(0, '正在載入圖片...');

    // Get image data
    this.imageData[0] = this.getImageData(this.images[0]);
    this.imageData[1] = this.getImageData(this.images[1]);

    await this.delay(300);
    this.updateProgress(20, '正在計算色彩相似度...');

    // Calculate color similarity
    const colorSimilarity = this.calculateColorSimilarity();

    await this.delay(300);
    this.updateProgress(40, '正在計算結構相似度...');

    // Calculate structural similarity
    const structureSimilarity = this.calculateStructuralSimilarity();

    await this.delay(300);
    this.updateProgress(60, '正在計算感知雜湊...');

    // Calculate perceptual hash similarity
    const hashSimilarity = this.calculatePerceptualHash();

    await this.delay(300);
    this.updateProgress(80, '正在計算直方圖相似度...');

    // Calculate histogram similarity
    const histogramSimilarity = this.calculateHistogramSimilarity();

    await this.delay(200);
    this.updateProgress(100, '比對完成！');

    // Calculate overall similarity
    const overallSimilarity = (
      colorSimilarity * 0.25 +
      structureSimilarity * 0.25 +
      hashSimilarity * 0.3 +
      histogramSimilarity * 0.2
    );

    // Update display
    this.displayResults({
      overall: overallSimilarity,
      color: colorSimilarity,
      structure: structureSimilarity,
      hash: hashSimilarity,
      histogram: histogramSimilarity
    });

    document.getElementById('resultSection').classList.add('active');

    await this.delay(200);
    this.showProgress(false);
    this.showStatus('success', '比對完成！');
  }

  getImageData(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Normalize to same size for comparison
    const size = 64;
    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(img, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size);
  }

  calculateColorSimilarity() {
    const data1 = this.imageData[0].data;
    const data2 = this.imageData[1].data;

    let totalDiff = 0;
    const pixelCount = data1.length / 4;

    for (let i = 0; i < data1.length; i += 4) {
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];

      // Calculate color difference (Euclidean distance in RGB space)
      const diff = Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
      );

      totalDiff += diff;
    }

    // Normalize (max possible diff is sqrt(255^2 * 3) ≈ 441.67)
    const avgDiff = totalDiff / pixelCount;
    const similarity = 1 - (avgDiff / 441.67);

    return Math.max(0, Math.min(1, similarity));
  }

  calculateStructuralSimilarity() {
    const data1 = this.imageData[0].data;
    const data2 = this.imageData[1].data;
    const size = 64;

    // Convert to grayscale and calculate SSIM-like metric
    const gray1 = this.toGrayscale(data1);
    const gray2 = this.toGrayscale(data2);

    // Calculate means
    let mean1 = 0, mean2 = 0;
    for (let i = 0; i < gray1.length; i++) {
      mean1 += gray1[i];
      mean2 += gray2[i];
    }
    mean1 /= gray1.length;
    mean2 /= gray2.length;

    // Calculate variances and covariance
    let var1 = 0, var2 = 0, covar = 0;
    for (let i = 0; i < gray1.length; i++) {
      const d1 = gray1[i] - mean1;
      const d2 = gray2[i] - mean2;
      var1 += d1 * d1;
      var2 += d2 * d2;
      covar += d1 * d2;
    }
    var1 /= gray1.length;
    var2 /= gray2.length;
    covar /= gray1.length;

    // SSIM formula constants
    const C1 = 6.5025; // (0.01 * 255)^2
    const C2 = 58.5225; // (0.03 * 255)^2

    const ssim = (
      (2 * mean1 * mean2 + C1) * (2 * covar + C2)
    ) / (
      (mean1 * mean1 + mean2 * mean2 + C1) * (var1 + var2 + C2)
    );

    return Math.max(0, Math.min(1, (ssim + 1) / 2));
  }

  calculatePerceptualHash() {
    // Simple pHash implementation
    const hash1 = this.computePHash(this.imageData[0].data);
    const hash2 = this.computePHash(this.imageData[1].data);

    // Calculate Hamming distance
    let hammingDistance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        hammingDistance++;
      }
    }

    // Convert to similarity (64 bits total)
    const similarity = 1 - (hammingDistance / 64);
    return Math.max(0, Math.min(1, similarity));
  }

  computePHash(data) {
    // Convert to grayscale
    const gray = this.toGrayscale(data);

    // Calculate mean
    let mean = 0;
    for (let i = 0; i < gray.length; i++) {
      mean += gray[i];
    }
    mean /= gray.length;

    // Generate hash (1 if above mean, 0 if below)
    const hash = [];
    for (let i = 0; i < 64; i++) {
      hash.push(gray[i] > mean ? 1 : 0);
    }

    return hash;
  }

  calculateHistogramSimilarity() {
    const hist1 = this.computeHistogram(this.imageData[0].data);
    const hist2 = this.computeHistogram(this.imageData[1].data);

    // Calculate correlation coefficient
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < 256; i++) {
      sum1 += hist1[i];
      sum2 += hist2[i];
    }
    const mean1 = sum1 / 256;
    const mean2 = sum2 / 256;

    let numerator = 0;
    let denom1 = 0, denom2 = 0;
    for (let i = 0; i < 256; i++) {
      const d1 = hist1[i] - mean1;
      const d2 = hist2[i] - mean2;
      numerator += d1 * d2;
      denom1 += d1 * d1;
      denom2 += d2 * d2;
    }

    const correlation = numerator / (Math.sqrt(denom1) * Math.sqrt(denom2) + 0.0001);
    return Math.max(0, Math.min(1, (correlation + 1) / 2));
  }

  computeHistogram(data) {
    const histogram = new Array(256).fill(0);
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      // Use luminance
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      histogram[gray]++;
    }

    // Normalize
    for (let i = 0; i < 256; i++) {
      histogram[i] /= pixelCount;
    }

    return histogram;
  }

  toGrayscale(data) {
    const gray = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }
    return gray;
  }

  displayResults(results) {
    const overall = Math.round(results.overall * 100);

    // Update similarity circle
    const circle = document.getElementById('similarityCircle');
    let color;
    if (overall >= 80) color = '#22c55e';
    else if (overall >= 50) color = '#eab308';
    else color = '#ef4444';

    circle.style.setProperty('--percent', `${overall}%`);
    circle.style.setProperty('--color', color);

    // Update value
    document.getElementById('similarityValue').textContent = `${overall}%`;
    document.getElementById('similarityValue').style.color = color;

    // Update verdict
    const verdict = document.getElementById('similarityVerdict');
    if (overall >= 90) {
      verdict.textContent = '幾乎相同';
      verdict.className = 'similarity-verdict high';
    } else if (overall >= 70) {
      verdict.textContent = '非常相似';
      verdict.className = 'similarity-verdict high';
    } else if (overall >= 50) {
      verdict.textContent = '中等相似';
      verdict.className = 'similarity-verdict medium';
    } else if (overall >= 30) {
      verdict.textContent = '略有相似';
      verdict.className = 'similarity-verdict medium';
    } else {
      verdict.textContent = '差異較大';
      verdict.className = 'similarity-verdict low';
    }

    // Update metrics
    document.getElementById('colorMetric').textContent = `${Math.round(results.color * 100)}%`;
    document.getElementById('structureMetric').textContent = `${Math.round(results.structure * 100)}%`;
    document.getElementById('hashMetric').textContent = `${Math.round(results.hash * 100)}%`;
    document.getElementById('histogramMetric').textContent = `${Math.round(results.histogram * 100)}%`;
  }

  reset() {
    this.images = [null, null];
    this.imageData = [null, null];

    [1, 2].forEach(index => {
      const uploadZone = document.getElementById(`uploadZone${index}`);
      uploadZone.classList.remove('has-file');
      uploadZone.innerHTML = `
        <div class="upload-icon">🖼️</div>
        <div class="upload-text">點擊或拖曳${index === 1 ? '第一' : '第二'}張圖片</div>
        <div class="upload-hint">PNG、JPG、WebP</div>
      `;
      document.getElementById(`fileInput${index}`).value = '';
    });

    document.getElementById('compareBtn').disabled = true;
    document.getElementById('resultSection').classList.remove('active');
    document.getElementById('statusMessage').className = 'status-message';
  }

  showProgress(show) {
    document.getElementById('progressSection').classList.toggle('active', show);
  }

  updateProgress(percent, text) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = text;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showStatus(type, message) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.className = `status-message ${type}`;
    statusEl.textContent = message;

    if (type === 'success') {
      setTimeout(() => {
        statusEl.className = 'status-message';
      }, 3000);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageComparator();
});
