/**
 * IMG-113 人臉偵測
 * 偵測圖片中的人臉位置
 */

class FaceDetector {
  constructor() {
    this.canvas = document.getElementById('resultCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sourceImage = null;
    this.fileName = '';
    this.faces = [];

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // Drag and drop
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
    document.getElementById('detectBtn').addEventListener('click', () => this.detect());
    document.getElementById('downloadImageBtn').addEventListener('click', () => this.downloadImage());
    document.getElementById('downloadJsonBtn').addEventListener('click', () => this.downloadJson());
    document.getElementById('copyJsonBtn').addEventListener('click', () => this.copyJson());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    this.fileName = file.name.replace(/\.[^.]+$/, '');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        document.getElementById('uploadZone').classList.add('has-file');
        document.getElementById('detectBtn').disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async detect() {
    if (!this.sourceImage) return;

    this.showProgress(true);
    this.updateProgress(0, '正在載入圖片...');

    // Setup canvas
    const maxWidth = 800;
    const maxHeight = 600;
    let width = this.sourceImage.width;
    let height = this.sourceImage.height;

    if (width > maxWidth) {
      height = (maxWidth / width) * height;
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = (maxHeight / height) * width;
      height = maxHeight;
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(this.sourceImage, 0, 0, width, height);

    await this.delay(300);
    this.updateProgress(20, '正在分析圖片...');

    // Get image data for analysis
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    await this.delay(300);
    this.updateProgress(40, '正在偵測人臉...');

    // Simulate face detection using skin color detection and pattern analysis
    this.faces = await this.detectFaces(data, width, height);

    this.updateProgress(80, '正在標記人臉位置...');
    await this.delay(200);

    // Draw detection results
    this.drawResults();

    this.updateProgress(100, '偵測完成！');
    await this.delay(200);

    // Update UI
    document.getElementById('faceCount').textContent = this.faces.length;
    this.renderFaceList();
    document.getElementById('resultSection').classList.add('active');

    this.showProgress(false);

    if (this.faces.length > 0) {
      this.showStatus('success', `成功偵測到 ${this.faces.length} 個人臉！`);
    } else {
      this.showStatus('warning', '未偵測到人臉，請嘗試使用更清晰的照片。');
    }
  }

  async detectFaces(data, width, height) {
    const faces = [];
    const skinMask = new Uint8Array(width * height);

    // Step 1: Create skin color mask
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Skin color detection using RGB rules
        if (this.isSkinColor(r, g, b)) {
          skinMask[y * width + x] = 1;
        }
      }
    }

    this.updateProgress(50, '正在識別臉部區域...');
    await this.delay(200);

    // Step 2: Find connected regions (blobs)
    const blobs = this.findBlobs(skinMask, width, height);

    this.updateProgress(70, '正在驗證人臉...');
    await this.delay(200);

    // Step 3: Filter and validate face candidates
    for (const blob of blobs) {
      // Filter by size (face should be reasonable size)
      const blobWidth = blob.maxX - blob.minX;
      const blobHeight = blob.maxY - blob.minY;
      const area = blobWidth * blobHeight;

      // Face aspect ratio check (roughly 0.7-1.5)
      const aspectRatio = blobWidth / blobHeight;

      // Filter criteria
      const minArea = (width * height) * 0.01; // At least 1% of image
      const maxArea = (width * height) * 0.5;  // At most 50% of image

      if (area >= minArea && area <= maxArea &&
          aspectRatio >= 0.5 && aspectRatio <= 1.8 &&
          blobWidth >= 30 && blobHeight >= 30) {

        // Add padding
        const padding = Math.min(blobWidth, blobHeight) * 0.2;
        const faceX = Math.max(0, blob.minX - padding);
        const faceY = Math.max(0, blob.minY - padding);
        const faceW = Math.min(width - faceX, blobWidth + padding * 2);
        const faceH = Math.min(height - faceY, blobHeight + padding * 2);

        // Calculate confidence based on various factors
        const skinRatio = blob.pixelCount / area;
        const sizeScore = Math.min(area / minArea, 10) / 10;
        const aspectScore = 1 - Math.abs(aspectRatio - 1) * 0.5;
        const confidence = Math.min(0.95, (skinRatio * 0.4 + sizeScore * 0.3 + aspectScore * 0.3));

        if (confidence >= 0.3) {
          faces.push({
            id: faces.length + 1,
            x: Math.round(faceX),
            y: Math.round(faceY),
            width: Math.round(faceW),
            height: Math.round(faceH),
            confidence: Math.round(confidence * 100) / 100
          });
        }
      }
    }

    // Sort by size (larger first)
    faces.sort((a, b) => (b.width * b.height) - (a.width * a.height));

    // Limit to reasonable number
    return faces.slice(0, 10);
  }

  isSkinColor(r, g, b) {
    // Multiple skin color detection rules
    // Rule 1: Basic RGB rules
    const rule1 = r > 95 && g > 40 && b > 20 &&
                  r > g && r > b &&
                  Math.abs(r - g) > 15 &&
                  r - g > 15;

    // Rule 2: YCbCr space approximation
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    const rule2 = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;

    // Rule 3: HSV-like rules
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    if (diff > 0) {
      if (max === r) h = 60 * ((g - b) / diff % 6);
      else if (max === g) h = 60 * ((b - r) / diff + 2);
      else h = 60 * ((r - g) / diff + 4);
    }
    if (h < 0) h += 360;

    const rule3 = h >= 0 && h <= 50 && diff > 20;

    return (rule1 || rule2) && rule3;
  }

  findBlobs(mask, width, height) {
    const visited = new Uint8Array(width * height);
    const blobs = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        if (mask[idx] === 1 && visited[idx] === 0) {
          // BFS to find connected component
          const blob = {
            minX: x, maxX: x,
            minY: y, maxY: y,
            pixelCount: 0
          };

          const queue = [[x, y]];
          visited[idx] = 1;

          while (queue.length > 0) {
            const [cx, cy] = queue.shift();
            blob.pixelCount++;
            blob.minX = Math.min(blob.minX, cx);
            blob.maxX = Math.max(blob.maxX, cx);
            blob.minY = Math.min(blob.minY, cy);
            blob.maxY = Math.max(blob.maxY, cy);

            // Check 4-neighbors
            const neighbors = [
              [cx - 1, cy], [cx + 1, cy],
              [cx, cy - 1], [cx, cy + 1]
            ];

            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (mask[nIdx] === 1 && visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  queue.push([nx, ny]);
                }
              }
            }
          }

          if (blob.pixelCount > 100) { // Minimum blob size
            blobs.push(blob);
          }
        }
      }
    }

    return blobs;
  }

  drawResults() {
    // Redraw original image
    this.ctx.drawImage(this.sourceImage, 0, 0, this.canvas.width, this.canvas.height);

    // Draw face boxes
    for (const face of this.faces) {
      // Draw box
      this.ctx.strokeStyle = '#22c55e';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(face.x, face.y, face.width, face.height);

      // Draw label background
      const label = `人臉 ${face.id} (${Math.round(face.confidence * 100)}%)`;
      this.ctx.font = 'bold 14px sans-serif';
      const textWidth = this.ctx.measureText(label).width;

      this.ctx.fillStyle = '#22c55e';
      this.ctx.fillRect(face.x, face.y - 25, textWidth + 10, 22);

      // Draw label text
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(label, face.x + 5, face.y - 8);

      // Draw corner accents
      const cornerSize = 15;
      this.ctx.strokeStyle = '#22c55e';
      this.ctx.lineWidth = 4;

      // Top-left
      this.ctx.beginPath();
      this.ctx.moveTo(face.x, face.y + cornerSize);
      this.ctx.lineTo(face.x, face.y);
      this.ctx.lineTo(face.x + cornerSize, face.y);
      this.ctx.stroke();

      // Top-right
      this.ctx.beginPath();
      this.ctx.moveTo(face.x + face.width - cornerSize, face.y);
      this.ctx.lineTo(face.x + face.width, face.y);
      this.ctx.lineTo(face.x + face.width, face.y + cornerSize);
      this.ctx.stroke();

      // Bottom-left
      this.ctx.beginPath();
      this.ctx.moveTo(face.x, face.y + face.height - cornerSize);
      this.ctx.lineTo(face.x, face.y + face.height);
      this.ctx.lineTo(face.x + cornerSize, face.y + face.height);
      this.ctx.stroke();

      // Bottom-right
      this.ctx.beginPath();
      this.ctx.moveTo(face.x + face.width - cornerSize, face.y + face.height);
      this.ctx.lineTo(face.x + face.width, face.y + face.height);
      this.ctx.lineTo(face.x + face.width, face.y + face.height - cornerSize);
      this.ctx.stroke();
    }
  }

  renderFaceList() {
    const container = document.getElementById('faceList');

    if (this.faces.length === 0) {
      container.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">未偵測到人臉</div>';
      return;
    }

    container.innerHTML = this.faces.map(face => `
      <div class="face-item" data-id="${face.id}">
        <div class="face-thumb">
          <canvas id="faceThumb${face.id}" width="50" height="50"></canvas>
        </div>
        <div class="face-info">
          <div class="face-id">人臉 #${face.id}</div>
          <div class="face-coords">位置: (${face.x}, ${face.y}) | 大小: ${face.width}×${face.height}</div>
        </div>
        <div class="face-confidence">
          <div class="confidence-value">${Math.round(face.confidence * 100)}%</div>
          <div class="confidence-label">信心度</div>
        </div>
      </div>
    `).join('');

    // Draw face thumbnails
    this.faces.forEach(face => {
      const thumbCanvas = document.getElementById(`faceThumb${face.id}`);
      if (thumbCanvas) {
        const thumbCtx = thumbCanvas.getContext('2d');
        thumbCtx.drawImage(
          this.canvas,
          face.x, face.y, face.width, face.height,
          0, 0, 50, 50
        );
      }
    });

    // Add click handlers
    container.querySelectorAll('.face-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        this.highlightFace(id);
      });
    });
  }

  highlightFace(id) {
    // Update active state
    document.querySelectorAll('.face-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.id) === id);
    });

    // Redraw with highlighted face
    this.drawResults();

    const face = this.faces.find(f => f.id === id);
    if (face) {
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 4;
      this.ctx.strokeRect(face.x - 2, face.y - 2, face.width + 4, face.height + 4);
    }
  }

  downloadImage() {
    const link = document.createElement('a');
    link.download = `${this.fileName}_faces_detected.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    this.showStatus('success', '圖片已下載');
  }

  downloadJson() {
    const jsonData = {
      fileName: this.fileName,
      imageWidth: this.canvas.width,
      imageHeight: this.canvas.height,
      facesDetected: this.faces.length,
      faces: this.faces
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${this.fileName}_faces.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'JSON 已下載');
  }

  async copyJson() {
    const jsonData = {
      faces: this.faces.map(f => ({
        id: f.id,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        confidence: f.confidence
      }))
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      this.showStatus('success', '座標已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  reset() {
    this.sourceImage = null;
    this.fileName = '';
    this.faces = [];

    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('fileInput').value = '';
    document.getElementById('detectBtn').disabled = true;
    document.getElementById('resultSection').classList.remove('active');
    document.getElementById('statusMessage').className = 'status-message';

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
  new FaceDetector();
});
