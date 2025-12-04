/**
 * IMG-120 圖片品質評分
 * 分析圖片品質並給予綜合評分
 */

class ImageQualityAnalyzer {
  constructor() {
    this.image = null;
    this.imageData = null;
    this.fileSize = 0;
    this.results = null;

    this.init();
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.bindEvents();
  }

  bindEvents() {
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
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleFile(file);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });

    // Buttons
    document.getElementById('analyzeBtn').addEventListener('click', () => this.analyze());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportReport());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    this.fileSize = file.size;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;

        // Update preview
        document.getElementById('previewImage').src = e.target.result;
        document.getElementById('uploadZone').classList.add('has-file');
        document.getElementById('analyzeBtn').disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async analyze() {
    if (!this.image) return;

    this.showProgress(true);
    this.updateProgress(0, '正在載入圖片...');

    // Setup canvas
    this.canvas.width = this.image.width;
    this.canvas.height = this.image.height;
    this.ctx.drawImage(this.image, 0, 0);
    this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    await this.delay(200);
    this.updateProgress(10, '正在分析清晰度...');

    // Analyze sharpness
    const sharpness = this.analyzeSharpness();

    await this.delay(200);
    this.updateProgress(25, '正在分析曝光...');

    // Analyze exposure
    const exposure = this.analyzeExposure();

    await this.delay(200);
    this.updateProgress(40, '正在分析色彩...');

    // Analyze color
    const color = this.analyzeColor();

    await this.delay(200);
    this.updateProgress(55, '正在分析對比度...');

    // Analyze contrast
    const contrast = this.analyzeContrast();

    await this.delay(200);
    this.updateProgress(70, '正在分析噪點...');

    // Analyze noise
    const noise = this.analyzeNoise();

    await this.delay(200);
    this.updateProgress(85, '正在計算解析度分數...');

    // Resolution score
    const resolution = this.analyzeResolution();

    await this.delay(200);
    this.updateProgress(95, '正在計算總分...');

    // Calculate overall score
    // Noise is inverted (high noise = low score)
    const noiseScore = 100 - noise.score;
    const overall = Math.round(
      sharpness.score * 0.25 +
      exposure.score * 0.15 +
      color.score * 0.15 +
      contrast.score * 0.15 +
      noiseScore * 0.15 +
      resolution.score * 0.15
    );

    this.results = {
      overall,
      sharpness: sharpness.score,
      exposure: exposure.score,
      color: color.score,
      contrast: contrast.score,
      noise: noise.score,
      resolution: resolution.score,
      details: {
        width: this.image.width,
        height: this.image.height,
        pixels: this.image.width * this.image.height,
        fileSize: this.fileSize,
        brightness: exposure.avgBrightness,
        dominant: color.dominant,
        ratio: this.getAspectRatio()
      }
    };

    this.updateProgress(100, '分析完成！');

    this.displayResults();

    document.getElementById('resultSection').classList.add('active');
    document.getElementById('exportBtn').disabled = false;

    await this.delay(200);
    this.showProgress(false);
    this.showStatus('success', '品質分析完成！');
  }

  analyzeSharpness() {
    const data = this.imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Convert to grayscale and calculate Laplacian variance
    const gray = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    // Apply Laplacian kernel
    let laplacianSum = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        const laplacian =
          gray[idx - width] +
          gray[idx - 1] +
          gray[idx + 1] +
          gray[idx + width] -
          4 * gray[idx];

        laplacianSum += laplacian * laplacian;
        count++;
      }
    }

    const variance = laplacianSum / count;

    // Normalize to 0-100 score (adjust thresholds based on typical values)
    let score = Math.min(100, (variance / 500) * 100);

    return { score: Math.round(score), variance };
  }

  analyzeExposure() {
    const data = this.imageData.data;
    const histogram = new Array(256).fill(0);
    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      histogram[brightness]++;
      totalBrightness += brightness;
    }

    const avgBrightness = totalBrightness / pixelCount;

    // Check for over/underexposure
    let overexposed = 0;
    let underexposed = 0;

    for (let i = 0; i < 10; i++) {
      underexposed += histogram[i];
    }
    for (let i = 245; i < 256; i++) {
      overexposed += histogram[i];
    }

    const overexposedRatio = overexposed / pixelCount;
    const underexposedRatio = underexposed / pixelCount;

    // Calculate exposure score
    // Ideal brightness is around 128
    const brightnessDiff = Math.abs(avgBrightness - 128) / 128;
    let score = 100 - brightnessDiff * 50;

    // Penalize for over/underexposure
    score -= overexposedRatio * 100;
    score -= underexposedRatio * 100;

    score = Math.max(0, Math.min(100, score));

    return {
      score: Math.round(score),
      avgBrightness: Math.round(avgBrightness),
      overexposed: overexposedRatio,
      underexposed: underexposedRatio
    };
  }

  analyzeColor() {
    const data = this.imageData.data;
    const pixelCount = data.length / 4;

    let totalSaturation = 0;
    const colorBuckets = {};

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      totalSaturation += saturation;

      // Color bucket for dominant color
      const bucketR = Math.floor(r / 64);
      const bucketG = Math.floor(g / 64);
      const bucketB = Math.floor(b / 64);
      const key = `${bucketR},${bucketG},${bucketB}`;
      colorBuckets[key] = (colorBuckets[key] || 0) + 1;
    }

    const avgSaturation = totalSaturation / pixelCount;

    // Find dominant color
    let maxCount = 0;
    let dominantBucket = '0,0,0';
    for (const [key, count] of Object.entries(colorBuckets)) {
      if (count > maxCount) {
        maxCount = count;
        dominantBucket = key;
      }
    }

    // Calculate unique colors (approximate)
    const uniqueColors = Object.keys(colorBuckets).length;

    // Color score based on saturation and variety
    let score = avgSaturation * 100 * 0.7 + Math.min(1, uniqueColors / 64) * 100 * 0.3;
    score = Math.min(100, score);

    // Convert dominant bucket to color name
    const [br, bg, bb] = dominantBucket.split(',').map(Number);
    const dominant = this.getColorName(br * 64 + 32, bg * 64 + 32, bb * 64 + 32);

    return {
      score: Math.round(score),
      saturation: avgSaturation,
      uniqueColors,
      dominant
    };
  }

  getColorName(r, g, b) {
    // Simple color naming
    const colors = [
      { name: '紅色', r: 255, g: 0, b: 0 },
      { name: '橙色', r: 255, g: 165, b: 0 },
      { name: '黃色', r: 255, g: 255, b: 0 },
      { name: '綠色', r: 0, g: 255, b: 0 },
      { name: '青色', r: 0, g: 255, b: 255 },
      { name: '藍色', r: 0, g: 0, b: 255 },
      { name: '紫色', r: 128, g: 0, b: 128 },
      { name: '粉色', r: 255, g: 192, b: 203 },
      { name: '棕色', r: 139, g: 69, b: 19 },
      { name: '白色', r: 255, g: 255, b: 255 },
      { name: '灰色', r: 128, g: 128, b: 128 },
      { name: '黑色', r: 0, g: 0, b: 0 }
    ];

    let closestColor = colors[0];
    let minDist = Infinity;

    for (const color of colors) {
      const dist = Math.sqrt(
        Math.pow(r - color.r, 2) +
        Math.pow(g - color.g, 2) +
        Math.pow(b - color.b, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closestColor = color;
      }
    }

    return closestColor.name;
  }

  analyzeContrast() {
    const data = this.imageData.data;
    const pixelCount = data.length / 4;

    let minLum = 255;
    let maxLum = 0;
    let totalLum = 0;

    const luminances = [];

    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      luminances.push(lum);
      totalLum += lum;
      minLum = Math.min(minLum, lum);
      maxLum = Math.max(maxLum, lum);
    }

    const avgLum = totalLum / pixelCount;

    // Calculate standard deviation
    let variance = 0;
    for (const lum of luminances) {
      variance += Math.pow(lum - avgLum, 2);
    }
    variance /= pixelCount;
    const stdDev = Math.sqrt(variance);

    // Contrast score based on dynamic range and standard deviation
    const dynamicRange = maxLum - minLum;
    let score = (dynamicRange / 255) * 50 + (stdDev / 128) * 50;
    score = Math.min(100, score);

    return {
      score: Math.round(score),
      dynamicRange,
      stdDev
    };
  }

  analyzeNoise() {
    const data = this.imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Sample a subset for efficiency
    const sampleSize = Math.min(10000, width * height);
    const step = Math.floor((width * height) / sampleSize);

    let noiseSum = 0;
    let count = 0;

    for (let i = 0; i < width * height; i += step) {
      const x = i % width;
      const y = Math.floor(i / width);

      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) continue;

      const idx = i * 4;

      // Compare with neighbors
      const neighborIndices = [
        ((y - 1) * width + x) * 4,
        ((y + 1) * width + x) * 4,
        (y * width + x - 1) * 4,
        (y * width + x + 1) * 4
      ];

      let localVariance = 0;
      for (const ni of neighborIndices) {
        const dr = data[idx] - data[ni];
        const dg = data[idx + 1] - data[ni + 1];
        const db = data[idx + 2] - data[ni + 2];
        localVariance += dr * dr + dg * dg + db * db;
      }
      localVariance /= 4;

      noiseSum += localVariance;
      count++;
    }

    const avgNoise = noiseSum / count;

    // Normalize noise score (higher value = more noise)
    let score = Math.min(100, avgNoise / 100);

    return {
      score: Math.round(score),
      avgNoise
    };
  }

  analyzeResolution() {
    const pixels = this.image.width * this.image.height;

    // Score based on megapixels
    // 12MP+ = 100, 1MP = 50, 0.1MP = 10
    let score;
    if (pixels >= 12000000) {
      score = 100;
    } else if (pixels >= 8000000) {
      score = 90;
    } else if (pixels >= 4000000) {
      score = 80;
    } else if (pixels >= 2000000) {
      score = 70;
    } else if (pixels >= 1000000) {
      score = 60;
    } else if (pixels >= 500000) {
      score = 50;
    } else if (pixels >= 100000) {
      score = 30;
    } else {
      score = 10;
    }

    return { score, pixels };
  }

  getAspectRatio() {
    const w = this.image.width;
    const h = this.image.height;

    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(w, h);

    return `${w / divisor}:${h / divisor}`;
  }

  displayResults() {
    const { overall, sharpness, exposure, color, contrast, noise, resolution, details } = this.results;

    // Overall score
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreColor = this.getScoreColor(overall);
    scoreCircle.style.setProperty('--percent', `${overall}%`);
    scoreCircle.style.setProperty('--color', scoreColor);

    document.getElementById('scoreValue').textContent = overall;
    document.getElementById('scoreValue').style.color = scoreColor;

    // Grade
    const gradeEl = document.getElementById('scoreGrade');
    const grade = this.getGrade(overall);
    gradeEl.textContent = grade.text;
    gradeEl.className = `score-grade ${grade.class}`;

    // Individual metrics
    this.updateMetric('sharpness', sharpness);
    this.updateMetric('exposure', exposure);
    this.updateMetric('color', color);
    this.updateMetric('contrast', contrast);
    this.updateMetric('noise', noise);
    this.updateMetric('resolution', resolution);

    // Details
    document.getElementById('detailSize').textContent = `${details.width} × ${details.height}`;
    document.getElementById('detailPixels').textContent = this.formatNumber(details.pixels);
    document.getElementById('detailFileSize').textContent = this.formatFileSize(details.fileSize);
    document.getElementById('detailBrightness').textContent = details.brightness;
    document.getElementById('detailDominant').textContent = details.dominant;
    document.getElementById('detailRatio').textContent = details.ratio;
  }

  updateMetric(name, value) {
    document.getElementById(`${name}Value`).textContent = value;

    const bar = document.getElementById(`${name}Bar`);
    bar.style.width = `${value}%`;

    // For noise, invert the color logic
    if (name === 'noise') {
      bar.className = `metric-bar-fill ${value < 30 ? 'high' : value < 60 ? 'medium' : 'low'}`;
    } else {
      bar.className = `metric-bar-fill ${value >= 70 ? 'high' : value >= 40 ? 'medium' : 'low'}`;
    }
  }

  getScoreColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#eab308';
    return '#ef4444';
  }

  getGrade(score) {
    if (score >= 90) return { text: '優秀', class: 'excellent' };
    if (score >= 70) return { text: '良好', class: 'good' };
    if (score >= 50) return { text: '一般', class: 'average' };
    return { text: '需改善', class: 'poor' };
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + ' MP';
    }
    return num.toLocaleString();
  }

  formatFileSize(bytes) {
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  exportReport() {
    if (!this.results) return;

    const { overall, details } = this.results;
    const grade = this.getGrade(overall);

    const report = `圖片品質分析報告
==================

生成時間: ${new Date().toLocaleString('zh-TW')}

整體評分
--------
分數: ${overall}/100
等級: ${grade.text}

詳細指標
--------
清晰度: ${this.results.sharpness}/100
曝光度: ${this.results.exposure}/100
色彩度: ${this.results.color}/100
對比度: ${this.results.contrast}/100
噪點度: ${this.results.noise}/100 (越低越好)
解析度: ${this.results.resolution}/100

圖片資訊
--------
尺寸: ${details.width} × ${details.height}
總像素: ${this.formatNumber(details.pixels)}
檔案大小: ${this.formatFileSize(details.fileSize)}
平均亮度: ${details.brightness}
主要色調: ${details.dominant}
寬高比: ${details.ratio}

---
由 WASM Tools IMG-120 生成
`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality_report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    this.showStatus('success', '報告已下載！');
  }

  reset() {
    this.image = null;
    this.imageData = null;
    this.fileSize = 0;
    this.results = null;

    document.getElementById('fileInput').value = '';
    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('exportBtn').disabled = true;
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
  new ImageQualityAnalyzer();
});
