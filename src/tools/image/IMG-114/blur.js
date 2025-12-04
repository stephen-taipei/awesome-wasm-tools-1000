/**
 * IMG-114 人臉模糊/馬賽克
 * 自動偵測並模糊圖片中的人臉
 */

class FaceBlur {
  constructor() {
    this.canvas = document.getElementById('resultCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sourceImage = null;
    this.fileName = '';
    this.faces = [];
    this.blurMode = 'blur';
    this.intensity = 20;
    this.processedCanvas = null;

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

    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.blurMode = btn.dataset.mode;
        if (this.faces.length > 0) {
          this.applyBlur();
        }
      });
    });

    // Intensity slider
    const slider = document.getElementById('intensitySlider');
    slider.addEventListener('input', (e) => {
      this.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.intensity;
      if (this.faces.length > 0) {
        this.applyBlur();
      }
    });

    // Buttons
    document.getElementById('processBtn').addEventListener('click', () => this.process());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
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
        document.getElementById('processBtn').disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async process() {
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

    await this.delay(200);
    this.updateProgress(20, '正在偵測人臉...');

    // Detect faces
    const imageData = this.ctx.getImageData(0, 0, width, height);
    this.faces = await this.detectFaces(imageData.data, width, height);

    this.updateProgress(60, '正在套用模糊效果...');
    await this.delay(200);

    // Apply blur to detected faces
    this.applyBlur();

    this.updateProgress(100, '處理完成！');
    await this.delay(200);

    // Update UI
    document.getElementById('faceCount').textContent = this.faces.length;
    this.renderFaceToggles();
    document.getElementById('settingsSection').classList.add('active');
    document.getElementById('previewInfo').textContent = `${width} × ${height} 像素`;
    document.getElementById('downloadBtn').disabled = false;

    this.showProgress(false);

    if (this.faces.length > 0) {
      this.showStatus('success', `已偵測並模糊 ${this.faces.length} 個人臉！`);
    } else {
      this.showStatus('warning', '未偵測到人臉。您可以手動調整設定或嘗試其他照片。');
    }
  }

  async detectFaces(data, width, height) {
    const faces = [];
    const skinMask = new Uint8Array(width * height);

    // Create skin color mask
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (this.isSkinColor(r, g, b)) {
          skinMask[y * width + x] = 1;
        }
      }
    }

    // Find connected regions
    const blobs = this.findBlobs(skinMask, width, height);

    // Filter and validate face candidates
    for (const blob of blobs) {
      const blobWidth = blob.maxX - blob.minX;
      const blobHeight = blob.maxY - blob.minY;
      const area = blobWidth * blobHeight;
      const aspectRatio = blobWidth / blobHeight;

      const minArea = (width * height) * 0.01;
      const maxArea = (width * height) * 0.5;

      if (area >= minArea && area <= maxArea &&
          aspectRatio >= 0.5 && aspectRatio <= 1.8 &&
          blobWidth >= 30 && blobHeight >= 30) {

        const padding = Math.min(blobWidth, blobHeight) * 0.3;
        const faceX = Math.max(0, blob.minX - padding);
        const faceY = Math.max(0, blob.minY - padding);
        const faceW = Math.min(width - faceX, blobWidth + padding * 2);
        const faceH = Math.min(height - faceY, blobHeight + padding * 2);

        const skinRatio = blob.pixelCount / area;
        if (skinRatio >= 0.2) {
          faces.push({
            id: faces.length + 1,
            x: Math.round(faceX),
            y: Math.round(faceY),
            width: Math.round(faceW),
            height: Math.round(faceH),
            enabled: true
          });
        }
      }
    }

    faces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    return faces.slice(0, 10);
  }

  isSkinColor(r, g, b) {
    const rule1 = r > 95 && g > 40 && b > 20 &&
                  r > g && r > b &&
                  Math.abs(r - g) > 15;

    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const rule2 = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    if (max - min > 0) {
      if (max === r) h = 60 * ((g - b) / (max - min) % 6);
      else if (max === g) h = 60 * ((b - r) / (max - min) + 2);
      else h = 60 * ((r - g) / (max - min) + 4);
    }
    if (h < 0) h += 360;
    const rule3 = h >= 0 && h <= 50;

    return (rule1 || rule2) && rule3;
  }

  findBlobs(mask, width, height) {
    const visited = new Uint8Array(width * height);
    const blobs = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        if (mask[idx] === 1 && visited[idx] === 0) {
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

          if (blob.pixelCount > 100) {
            blobs.push(blob);
          }
        }
      }
    }

    return blobs;
  }

  renderFaceToggles() {
    const container = document.getElementById('faceToggles');

    if (this.faces.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.faces.map(face => `
      <div class="face-toggle">
        <input type="checkbox" id="face${face.id}" ${face.enabled ? 'checked' : ''} data-id="${face.id}">
        <label for="face${face.id}">人臉 #${face.id}</label>
      </div>
    `).join('');

    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        const face = this.faces.find(f => f.id === id);
        if (face) {
          face.enabled = e.target.checked;
          this.applyBlur();
        }
      });
    });
  }

  applyBlur() {
    // Redraw original image
    this.ctx.drawImage(this.sourceImage, 0, 0, this.canvas.width, this.canvas.height);

    // Create a copy for processing
    this.processedCanvas = document.createElement('canvas');
    this.processedCanvas.width = this.canvas.width;
    this.processedCanvas.height = this.canvas.height;
    const processedCtx = this.processedCanvas.getContext('2d');
    processedCtx.drawImage(this.canvas, 0, 0);

    // Apply blur to each enabled face
    for (const face of this.faces) {
      if (!face.enabled) continue;

      switch (this.blurMode) {
        case 'blur':
          this.applyGaussianBlur(face);
          break;
        case 'mosaic':
          this.applyMosaic(face);
          break;
        case 'pixelate':
          this.applyPixelate(face);
          break;
      }
    }
  }

  applyGaussianBlur(face) {
    // Use CSS filter for blur effect
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = face.width;
    tempCanvas.height = face.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Extract face region
    tempCtx.drawImage(
      this.canvas,
      face.x, face.y, face.width, face.height,
      0, 0, face.width, face.height
    );

    // Apply blur using stackBlur algorithm
    const imageData = tempCtx.getImageData(0, 0, face.width, face.height);
    this.stackBlur(imageData.data, face.width, face.height, this.intensity);
    tempCtx.putImageData(imageData, 0, 0);

    // Draw blurred region back
    this.ctx.drawImage(tempCanvas, face.x, face.y);
  }

  stackBlur(data, width, height, radius) {
    const div = 2 * radius + 1;

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = -radius; i <= radius; i++) {
          const nx = Math.min(Math.max(x + i, 0), width - 1);
          const idx = (y * width + nx) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.round(r / count);
        data[idx + 1] = Math.round(g / count);
        data[idx + 2] = Math.round(b / count);
      }
    }

    // Vertical pass
    const tempData = new Uint8ClampedArray(data);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = -radius; i <= radius; i++) {
          const ny = Math.min(Math.max(y + i, 0), height - 1);
          const idx = (ny * width + x) * 4;
          r += tempData[idx];
          g += tempData[idx + 1];
          b += tempData[idx + 2];
          count++;
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.round(r / count);
        data[idx + 1] = Math.round(g / count);
        data[idx + 2] = Math.round(b / count);
      }
    }
  }

  applyMosaic(face) {
    const blockSize = Math.max(5, Math.round(this.intensity / 2));

    const imageData = this.ctx.getImageData(face.x, face.y, face.width, face.height);
    const data = imageData.data;

    for (let y = 0; y < face.height; y += blockSize) {
      for (let x = 0; x < face.width; x += blockSize) {
        // Calculate average color for this block
        let r = 0, g = 0, b = 0, count = 0;

        for (let dy = 0; dy < blockSize && y + dy < face.height; dy++) {
          for (let dx = 0; dx < blockSize && x + dx < face.width; dx++) {
            const idx = ((y + dy) * face.width + (x + dx)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Fill block with average color
        for (let dy = 0; dy < blockSize && y + dy < face.height; dy++) {
          for (let dx = 0; dx < blockSize && x + dx < face.width; dx++) {
            const idx = ((y + dy) * face.width + (x + dx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }

    this.ctx.putImageData(imageData, face.x, face.y);
  }

  applyPixelate(face) {
    const pixelSize = Math.max(3, Math.round(this.intensity / 3));

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Scale down
    const smallWidth = Math.ceil(face.width / pixelSize);
    const smallHeight = Math.ceil(face.height / pixelSize);

    tempCanvas.width = smallWidth;
    tempCanvas.height = smallHeight;

    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(
      this.canvas,
      face.x, face.y, face.width, face.height,
      0, 0, smallWidth, smallHeight
    );

    // Scale back up
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      tempCanvas,
      0, 0, smallWidth, smallHeight,
      face.x, face.y, face.width, face.height
    );
    this.ctx.imageSmoothingEnabled = true;
  }

  download() {
    const link = document.createElement('a');
    link.download = `${this.fileName}_blurred.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.sourceImage = null;
    this.fileName = '';
    this.faces = [];
    this.processedCanvas = null;

    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('fileInput').value = '';
    document.getElementById('processBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('settingsSection').classList.remove('active');
    document.getElementById('statusMessage').className = 'status-message';
    document.getElementById('faceCount').textContent = '0';
    document.getElementById('faceToggles').innerHTML = '';

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
  new FaceBlur();
});
