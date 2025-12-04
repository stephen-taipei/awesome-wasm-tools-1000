/**
 * IMG-121 圖片浮水印偵測
 * 分析圖片中可能存在的浮水印
 */

class WatermarkDetector {
  constructor() {
    this.image = null;
    this.detections = [];
    this.confidence = 0;

    this.init();
  }

  init() {
    this.canvas = document.getElementById('resultCanvas');
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

    document.getElementById('detectBtn').addEventListener('click', () => this.detect());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportReport());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        document.getElementById('originalImage').src = e.target.result;
        document.getElementById('uploadZone').classList.add('has-file');
        document.getElementById('detectBtn').disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async detect() {
    if (!this.image) return;

    this.showProgress(true);
    this.detections = [];
    this.updateProgress(0, '正在準備分析...');

    // Setup canvas
    this.canvas.width = this.image.width;
    this.canvas.height = this.image.height;
    this.ctx.drawImage(this.image, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    await this.delay(200);
    this.updateProgress(15, '正在分析透明度異常...');

    // Detect semi-transparent regions
    const alphaRegions = this.detectAlphaAnomalies(imageData);

    await this.delay(200);
    this.updateProgress(30, '正在分析重複圖案...');

    // Detect repeating patterns
    const patternRegions = this.detectRepeatingPatterns(imageData);

    await this.delay(200);
    this.updateProgress(45, '正在分析文字區域...');

    // Detect text-like regions
    const textRegions = this.detectTextRegions(imageData);

    await this.delay(200);
    this.updateProgress(60, '正在分析邊緣異常...');

    // Detect edge anomalies
    const edgeRegions = this.detectEdgeAnomalies(imageData);

    await this.delay(200);
    this.updateProgress(75, '正在分析色彩異常...');

    // Detect color anomalies (typical watermark colors)
    const colorRegions = this.detectColorAnomalies(imageData);

    await this.delay(200);
    this.updateProgress(90, '正在整合結果...');

    // Combine all detections
    this.detections = [
      ...alphaRegions.map(r => ({ ...r, type: 'alpha', typeName: '透明度異常' })),
      ...patternRegions.map(r => ({ ...r, type: 'pattern', typeName: '重複圖案' })),
      ...textRegions.map(r => ({ ...r, type: 'text', typeName: '文字區域' })),
      ...edgeRegions.map(r => ({ ...r, type: 'edge', typeName: '邊緣異常' })),
      ...colorRegions.map(r => ({ ...r, type: 'color', typeName: '色彩異常' }))
    ];

    // Calculate overall confidence
    this.confidence = this.calculateConfidence();

    this.updateProgress(100, '分析完成！');

    // Draw results
    this.drawResults();
    this.displayResults();

    document.getElementById('resultSection').classList.add('active');
    document.getElementById('exportBtn').disabled = false;

    await this.delay(200);
    this.showProgress(false);
    this.showStatus('success', '浮水印偵測完成！');
  }

  detectAlphaAnomalies(imageData) {
    const regions = [];
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Look for regions with consistent semi-transparency
    const blockSize = 32;
    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        let semiTransparentCount = 0;
        let totalPixels = 0;

        for (let y = by; y < Math.min(by + blockSize, height); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
            const idx = (y * width + x) * 4;
            const alpha = data[idx + 3];

            if (alpha > 20 && alpha < 230) {
              semiTransparentCount++;
            }
            totalPixels++;
          }
        }

        const ratio = semiTransparentCount / totalPixels;
        if (ratio > 0.3) {
          regions.push({
            x: bx,
            y: by,
            width: Math.min(blockSize, width - bx),
            height: Math.min(blockSize, height - by),
            confidence: Math.round(ratio * 100)
          });
        }
      }
    }

    return this.mergeRegions(regions);
  }

  detectRepeatingPatterns(imageData) {
    const regions = [];
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Sample and compare blocks for repetition
    const blockSize = 64;
    const blocks = [];

    for (let by = 0; by < height - blockSize; by += blockSize) {
      for (let bx = 0; bx < width - blockSize; bx += blockSize) {
        const signature = this.getBlockSignature(data, width, bx, by, blockSize);
        blocks.push({ x: bx, y: by, signature });
      }
    }

    // Find similar blocks
    for (let i = 0; i < blocks.length; i++) {
      let matchCount = 0;
      for (let j = i + 1; j < blocks.length; j++) {
        const similarity = this.compareSignatures(blocks[i].signature, blocks[j].signature);
        if (similarity > 0.85) {
          matchCount++;
        }
      }

      if (matchCount >= 2) {
        regions.push({
          x: blocks[i].x,
          y: blocks[i].y,
          width: blockSize,
          height: blockSize,
          confidence: Math.min(100, matchCount * 30)
        });
      }
    }

    return regions;
  }

  getBlockSignature(data, width, bx, by, blockSize) {
    const signature = [];
    const step = 8;

    for (let y = by; y < by + blockSize; y += step) {
      for (let x = bx; x < bx + blockSize; x += step) {
        const idx = (y * width + x) * 4;
        const gray = Math.round((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
        signature.push(gray > 128 ? 1 : 0);
      }
    }

    return signature;
  }

  compareSignatures(sig1, sig2) {
    let matches = 0;
    for (let i = 0; i < sig1.length; i++) {
      if (sig1[i] === sig2[i]) matches++;
    }
    return matches / sig1.length;
  }

  detectTextRegions(imageData) {
    const regions = [];
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert to grayscale and detect edges
    const gray = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    // Look for high edge density regions (typical of text)
    const blockSize = 48;
    for (let by = 1; by < height - blockSize - 1; by += blockSize / 2) {
      for (let bx = 1; bx < width - blockSize - 1; bx += blockSize / 2) {
        let edgeCount = 0;
        let totalPixels = 0;

        for (let y = by; y < Math.min(by + blockSize, height - 1); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, width - 1); x++) {
            const idx = y * width + x;

            // Sobel edge detection
            const gx = gray[idx - width - 1] - gray[idx - width + 1] +
                      2 * gray[idx - 1] - 2 * gray[idx + 1] +
                      gray[idx + width - 1] - gray[idx + width + 1];

            const gy = gray[idx - width - 1] + 2 * gray[idx - width] + gray[idx - width + 1] -
                      gray[idx + width - 1] - 2 * gray[idx + width] - gray[idx + width + 1];

            const edge = Math.sqrt(gx * gx + gy * gy);
            if (edge > 50) edgeCount++;
            totalPixels++;
          }
        }

        const edgeDensity = edgeCount / totalPixels;
        if (edgeDensity > 0.15 && edgeDensity < 0.5) {
          regions.push({
            x: bx,
            y: by,
            width: blockSize,
            height: blockSize,
            confidence: Math.round(edgeDensity * 200)
          });
        }
      }
    }

    return this.mergeRegions(regions);
  }

  detectEdgeAnomalies(imageData) {
    const regions = [];
    const width = imageData.width;
    const height = imageData.height;

    // Check corners and edges for watermarks (common placement)
    const cornerSize = Math.min(150, Math.min(width, height) / 4);

    const corners = [
      { x: 0, y: 0, name: '左上角' },
      { x: width - cornerSize, y: 0, name: '右上角' },
      { x: 0, y: height - cornerSize, name: '左下角' },
      { x: width - cornerSize, y: height - cornerSize, name: '右下角' }
    ];

    for (const corner of corners) {
      const variance = this.calculateRegionVariance(
        imageData,
        corner.x,
        corner.y,
        cornerSize,
        cornerSize
      );

      // Higher variance in corners might indicate watermark
      if (variance > 500 && variance < 3000) {
        regions.push({
          x: corner.x,
          y: corner.y,
          width: cornerSize,
          height: cornerSize,
          confidence: Math.min(100, Math.round(variance / 30)),
          name: corner.name
        });
      }
    }

    return regions;
  }

  calculateRegionVariance(imageData, rx, ry, rw, rh) {
    const data = imageData.data;
    const width = imageData.width;

    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = ry; y < ry + rh && y < imageData.height; y++) {
      for (let x = rx; x < rx + rw && x < width; x++) {
        const idx = (y * width + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        sum += gray;
        sumSq += gray * gray;
        count++;
      }
    }

    const mean = sum / count;
    return sumSq / count - mean * mean;
  }

  detectColorAnomalies(imageData) {
    const regions = [];
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Look for typical watermark colors (gray, light, semi-transparent patterns)
    const blockSize = 40;
    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        let grayCount = 0;
        let whiteCount = 0;
        let totalPixels = 0;

        for (let y = by; y < Math.min(by + blockSize, height); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Check for grayish colors
            const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
            if (maxDiff < 20) {
              grayCount++;
              if (r > 200) whiteCount++;
            }
            totalPixels++;
          }
        }

        const grayRatio = grayCount / totalPixels;
        const whiteRatio = whiteCount / totalPixels;

        if (grayRatio > 0.4 && whiteRatio > 0.2 && whiteRatio < 0.8) {
          regions.push({
            x: bx,
            y: by,
            width: Math.min(blockSize, width - bx),
            height: Math.min(blockSize, height - by),
            confidence: Math.round((grayRatio + whiteRatio) * 50)
          });
        }
      }
    }

    return this.mergeRegions(regions);
  }

  mergeRegions(regions) {
    if (regions.length === 0) return [];

    // Simple merge of overlapping regions
    const merged = [];
    const used = new Set();

    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;

      let r = { ...regions[i] };
      used.add(i);

      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue;

        if (this.regionsOverlap(r, regions[j])) {
          r = this.combineRegions(r, regions[j]);
          used.add(j);
        }
      }

      merged.push(r);
    }

    return merged;
  }

  regionsOverlap(r1, r2) {
    return !(r1.x + r1.width < r2.x ||
             r2.x + r2.width < r1.x ||
             r1.y + r1.height < r2.y ||
             r2.y + r2.height < r1.y);
  }

  combineRegions(r1, r2) {
    const x = Math.min(r1.x, r2.x);
    const y = Math.min(r1.y, r2.y);
    const x2 = Math.max(r1.x + r1.width, r2.x + r2.width);
    const y2 = Math.max(r1.y + r1.height, r2.y + r2.height);

    return {
      x,
      y,
      width: x2 - x,
      height: y2 - y,
      confidence: Math.max(r1.confidence, r2.confidence)
    };
  }

  calculateConfidence() {
    if (this.detections.length === 0) return 0;

    const maxConfidence = Math.max(...this.detections.map(d => d.confidence));
    const avgConfidence = this.detections.reduce((sum, d) => sum + d.confidence, 0) / this.detections.length;

    return Math.round((maxConfidence * 0.6 + avgConfidence * 0.4));
  }

  drawResults() {
    // Draw original image
    this.ctx.drawImage(this.image, 0, 0);

    // Draw detection boxes
    this.detections.forEach((detection, index) => {
      const colors = {
        alpha: 'rgba(239, 68, 68, 0.6)',
        pattern: 'rgba(234, 179, 8, 0.6)',
        text: 'rgba(59, 130, 246, 0.6)',
        edge: 'rgba(168, 85, 247, 0.6)',
        color: 'rgba(34, 197, 94, 0.6)'
      };

      this.ctx.strokeStyle = colors[detection.type] || 'rgba(255, 255, 255, 0.6)';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);

      // Draw label
      this.ctx.setLineDash([]);
      this.ctx.fillStyle = colors[detection.type] || 'rgba(255, 255, 255, 0.8)';
      this.ctx.fillRect(detection.x, detection.y - 20, 80, 20);
      this.ctx.fillStyle = '#000';
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText(`${detection.confidence}%`, detection.x + 5, detection.y - 6);
    });
  }

  displayResults() {
    // Status
    const statusEl = document.getElementById('statusValue');
    if (this.detections.length === 0) {
      statusEl.textContent = '未偵測到';
      statusEl.className = 'summary-value clean';
    } else if (this.confidence > 60) {
      statusEl.textContent = '可能有浮水印';
      statusEl.className = 'summary-value detected';
    } else {
      statusEl.textContent = '可疑區域';
      statusEl.className = 'summary-value warning';
    }

    // Count
    document.getElementById('regionCount').textContent = this.detections.length;

    // Confidence
    const confEl = document.getElementById('confidenceValue');
    confEl.textContent = `${this.confidence}%`;
    confEl.className = `summary-value ${this.confidence > 60 ? 'detected' : this.confidence > 30 ? 'warning' : 'clean'}`;

    // Detection list
    const listEl = document.getElementById('detectionList');
    if (this.detections.length === 0) {
      listEl.innerHTML = '<div class="detection-item"><span class="type-icon">✅</span><span class="type-info"><span class="type-name">未發現可疑浮水印區域</span></span></div>';
    } else {
      listEl.innerHTML = this.detections.map((d, i) => {
        const icons = {
          alpha: '🔲',
          pattern: '🔄',
          text: '📝',
          edge: '📐',
          color: '🎨'
        };
        return `
          <div class="detection-item">
            <span class="type-icon">${icons[d.type] || '❓'}</span>
            <span class="type-info">
              <span class="type-name">${d.typeName}</span>
              <span class="type-detail">位置: (${d.x}, ${d.y}) 大小: ${d.width}×${d.height}</span>
            </span>
            <span class="confidence">${d.confidence}%</span>
          </div>
        `;
      }).join('');
    }
  }

  exportReport() {
    const report = `圖片浮水印偵測報告
====================

分析時間: ${new Date().toLocaleString('zh-TW')}

圖片資訊
--------
尺寸: ${this.image.width} × ${this.image.height}

偵測結果
--------
浮水印狀態: ${this.confidence > 60 ? '可能有浮水印' : this.confidence > 30 ? '可疑區域' : '未偵測到'}
可疑區域數: ${this.detections.length}
整體信心度: ${this.confidence}%

詳細區域
--------
${this.detections.length === 0 ? '未發現可疑區域' : this.detections.map((d, i) => `
${i + 1}. ${d.typeName}
   位置: (${d.x}, ${d.y})
   大小: ${d.width} × ${d.height}
   信心度: ${d.confidence}%
`).join('')}

---
由 WASM Tools IMG-121 生成
`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watermark_detection_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    this.showStatus('success', '報告已下載！');
  }

  reset() {
    this.image = null;
    this.detections = [];
    this.confidence = 0;

    document.getElementById('fileInput').value = '';
    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('detectBtn').disabled = true;
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
  new WatermarkDetector();
});
