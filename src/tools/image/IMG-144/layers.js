/**
 * IMG-144 圖層合成工具
 * Layer Compositing Tool
 */

class LayerCompositor {
  constructor() {
    this.layers = [];
    this.selectedLayerId = null;
    this.canvasWidth = 800;
    this.canvasHeight = 600;
    this.nextLayerId = 1;

    // 混合模式
    this.blendModes = [
      { value: 'source-over', label: '正常' },
      { value: 'multiply', label: '正片疊底' },
      { value: 'screen', label: '濾色' },
      { value: 'overlay', label: '覆蓋' },
      { value: 'darken', label: '變暗' },
      { value: 'lighten', label: '變亮' },
      { value: 'color-dodge', label: '顏色減淡' },
      { value: 'color-burn', label: '顏色加深' },
      { value: 'hard-light', label: '強光' },
      { value: 'soft-light', label: '柔光' },
      { value: 'difference', label: '差異化' },
      { value: 'exclusion', label: '排除' },
      { value: 'hue', label: '色相' },
      { value: 'saturation', label: '飽和度' },
      { value: 'color', label: '顏色' },
      { value: 'luminosity', label: '明度' }
    ];

    this.initElements();
    this.bindEvents();
    this.initCanvas();
  }

  initElements() {
    // Upload elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.addLayerBtn = document.getElementById('addLayerBtn');

    // Layer list
    this.layerList = document.getElementById('layerList');

    // Canvas elements
    this.compositeCanvas = document.getElementById('compositeCanvas');
    this.compositeCtx = this.compositeCanvas.getContext('2d');
    this.canvasWrapper = document.getElementById('canvasWrapper');

    // Info elements
    this.canvasSizeEl = document.getElementById('canvasSize');
    this.layerCountEl = document.getElementById('layerCount');

    // Buttons
    this.fitCanvasBtn = document.getElementById('fitCanvasBtn');
    this.actualSizeBtn = document.getElementById('actualSizeBtn');
    this.flattenBtn = document.getElementById('flattenBtn');
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
    this.addLayerBtn.addEventListener('click', () => this.fileInput.click());

    // Canvas actions
    this.fitCanvasBtn.addEventListener('click', () => this.fitCanvas());
    this.actualSizeBtn.addEventListener('click', () => this.actualSize());

    // Buttons
    this.flattenBtn.addEventListener('click', () => this.flattenLayers());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  initCanvas() {
    this.compositeCanvas.width = this.canvasWidth;
    this.compositeCanvas.height = this.canvasHeight;
    this.updateCanvasInfo();
    this.renderComposite();
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
    e.target.value = '';
  }

  async addImages(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      this.showStatus('請選擇圖片檔案', 'error');
      return;
    }

    for (const file of imageFiles) {
      try {
        await this.addLayer(file);
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    }

    this.showStatus(`已新增 ${imageFiles.length} 個圖層`, 'success');
  }

  addLayer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 調整畫布大小（如果需要）
          if (this.layers.length === 0) {
            this.canvasWidth = img.width;
            this.canvasHeight = img.height;
            this.compositeCanvas.width = this.canvasWidth;
            this.compositeCanvas.height = this.canvasHeight;
          }

          const layer = {
            id: this.nextLayerId++,
            name: file.name.substring(0, 20),
            img: img,
            dataUrl: e.target.result,
            opacity: 100,
            blendMode: 'source-over',
            visible: true,
            width: img.width,
            height: img.height
          };

          // 新圖層加在最上方
          this.layers.unshift(layer);
          this.selectedLayerId = layer.id;

          this.updateLayerList();
          this.updateUI();
          this.renderComposite();

          resolve(layer);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  updateLayerList() {
    if (this.layers.length === 0) {
      this.layerList.innerHTML = `
        <div class="empty-state">
          <div class="icon">📑</div>
          <div>尚無圖層</div>
          <div style="font-size: 0.8rem; margin-top: 5px;">上傳圖片以新增圖層</div>
        </div>
      `;
      return;
    }

    this.layerList.innerHTML = '';

    this.layers.forEach((layer, index) => {
      const item = document.createElement('div');
      item.className = `layer-item ${layer.id === this.selectedLayerId ? 'selected' : ''}`;
      item.draggable = true;
      item.dataset.id = layer.id;

      item.innerHTML = `
        <div class="layer-header">
          <button class="layer-visibility ${layer.visible ? '' : 'hidden'}" data-id="${layer.id}">
            ${layer.visible ? '👁️' : '👁️‍🗨️'}
          </button>
          <div class="layer-thumb">
            <img src="${layer.dataUrl}" alt="${layer.name}">
          </div>
          <span class="layer-name">${layer.name}</span>
          <button class="layer-remove" data-id="${layer.id}">×</button>
        </div>
        <div class="layer-controls">
          <input type="range" class="layer-opacity" min="0" max="100" value="${layer.opacity}" data-id="${layer.id}">
          <span class="layer-opacity-value">${layer.opacity}%</span>
        </div>
        <select class="blend-select" data-id="${layer.id}">
          ${this.blendModes.map(mode =>
            `<option value="${mode.value}" ${layer.blendMode === mode.value ? 'selected' : ''}>${mode.label}</option>`
          ).join('')}
        </select>
      `;

      // 選擇圖層
      item.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
          this.selectLayer(layer.id);
        }
      });

      // 可見性切換
      item.querySelector('.layer-visibility').addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleVisibility(layer.id);
      });

      // 移除圖層
      item.querySelector('.layer-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeLayer(layer.id);
      });

      // 透明度調整
      const opacitySlider = item.querySelector('.layer-opacity');
      const opacityValue = item.querySelector('.layer-opacity-value');
      opacitySlider.addEventListener('input', (e) => {
        e.stopPropagation();
        const opacity = parseInt(e.target.value);
        layer.opacity = opacity;
        opacityValue.textContent = `${opacity}%`;
        this.renderComposite();
      });

      // 混合模式
      item.querySelector('.blend-select').addEventListener('change', (e) => {
        e.stopPropagation();
        layer.blendMode = e.target.value;
        this.renderComposite();
      });

      // 拖曳排序
      item.addEventListener('dragstart', (e) => this.handleLayerDragStart(e, index));
      item.addEventListener('dragover', (e) => this.handleLayerDragOver(e));
      item.addEventListener('drop', (e) => this.handleLayerDrop(e, index));
      item.addEventListener('dragend', () => this.handleLayerDragEnd());

      this.layerList.appendChild(item);
    });
  }

  handleLayerDragStart(e, index) {
    e.dataTransfer.setData('text/plain', index);
    e.target.classList.add('dragging');
  }

  handleLayerDragOver(e) {
    e.preventDefault();
  }

  handleLayerDrop(e, targetIndex) {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (sourceIndex !== targetIndex) {
      const [removed] = this.layers.splice(sourceIndex, 1);
      this.layers.splice(targetIndex, 0, removed);
      this.updateLayerList();
      this.renderComposite();
    }
  }

  handleLayerDragEnd() {
    document.querySelectorAll('.layer-item').forEach(item => {
      item.classList.remove('dragging');
    });
  }

  selectLayer(id) {
    this.selectedLayerId = id;
    this.updateLayerList();
  }

  toggleVisibility(id) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = !layer.visible;
      this.updateLayerList();
      this.renderComposite();
    }
  }

  removeLayer(id) {
    const index = this.layers.findIndex(l => l.id === id);
    if (index !== -1) {
      this.layers.splice(index, 1);

      if (this.selectedLayerId === id) {
        this.selectedLayerId = this.layers.length > 0 ? this.layers[0].id : null;
      }

      this.updateLayerList();
      this.updateUI();
      this.renderComposite();
      this.showStatus('圖層已移除', 'success');
    }
  }

  renderComposite() {
    // 清除畫布
    this.compositeCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 繪製透明背景格
    this.drawTransparentBackground();

    // 從底層到頂層繪製（反向遍歷 layers）
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];

      if (!layer.visible) continue;

      this.compositeCtx.save();
      this.compositeCtx.globalAlpha = layer.opacity / 100;
      this.compositeCtx.globalCompositeOperation = layer.blendMode;

      // 置中繪製
      const x = (this.canvasWidth - layer.width) / 2;
      const y = (this.canvasHeight - layer.height) / 2;

      this.compositeCtx.drawImage(layer.img, x, y);
      this.compositeCtx.restore();
    }

    this.updateCanvasInfo();
  }

  drawTransparentBackground() {
    const size = 16;
    const colors = ['#2a2a3a', '#353545'];

    for (let y = 0; y < this.canvasHeight; y += size) {
      for (let x = 0; x < this.canvasWidth; x += size) {
        const colorIndex = ((x / size) + (y / size)) % 2;
        this.compositeCtx.fillStyle = colors[colorIndex];
        this.compositeCtx.fillRect(x, y, size, size);
      }
    }
  }

  updateUI() {
    const hasLayers = this.layers.length > 0;
    this.flattenBtn.disabled = this.layers.length < 2;
    this.downloadBtn.disabled = !hasLayers;
    this.updateCanvasInfo();
  }

  updateCanvasInfo() {
    this.canvasSizeEl.textContent = `畫布: ${this.canvasWidth} × ${this.canvasHeight}`;
    this.layerCountEl.textContent = `圖層: ${this.layers.length}`;
  }

  fitCanvas() {
    const maxWidth = this.canvasWrapper.clientWidth - 30;
    const maxHeight = 400;

    const scaleX = maxWidth / this.canvasWidth;
    const scaleY = maxHeight / this.canvasHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    this.compositeCanvas.style.width = `${this.canvasWidth * scale}px`;
    this.compositeCanvas.style.height = `${this.canvasHeight * scale}px`;
  }

  actualSize() {
    this.compositeCanvas.style.width = `${this.canvasWidth}px`;
    this.compositeCanvas.style.height = `${this.canvasHeight}px`;
  }

  flattenLayers() {
    if (this.layers.length < 2) return;

    // 創建合併後的圖層
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvasWidth;
    tempCanvas.height = this.canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // 繪製所有可見圖層
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible) continue;

      tempCtx.save();
      tempCtx.globalAlpha = layer.opacity / 100;
      tempCtx.globalCompositeOperation = layer.blendMode;

      const x = (this.canvasWidth - layer.width) / 2;
      const y = (this.canvasHeight - layer.height) / 2;

      tempCtx.drawImage(layer.img, x, y);
      tempCtx.restore();
    }

    // 創建合併圖層
    const img = new Image();
    img.onload = () => {
      this.layers = [{
        id: this.nextLayerId++,
        name: '合併的圖層',
        img: img,
        dataUrl: tempCanvas.toDataURL('image/png'),
        opacity: 100,
        blendMode: 'source-over',
        visible: true,
        width: this.canvasWidth,
        height: this.canvasHeight
      }];

      this.selectedLayerId = this.layers[0].id;
      this.updateLayerList();
      this.updateUI();
      this.renderComposite();
      this.showStatus('圖層已合併', 'success');
    };
    img.src = tempCanvas.toDataURL('image/png');
  }

  downloadImage() {
    // 創建乾淨的輸出畫布（不含透明格背景）
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = this.canvasWidth;
    outputCanvas.height = this.canvasHeight;
    const outputCtx = outputCanvas.getContext('2d');

    // 繪製所有可見圖層
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible) continue;

      outputCtx.save();
      outputCtx.globalAlpha = layer.opacity / 100;
      outputCtx.globalCompositeOperation = layer.blendMode;

      const x = (this.canvasWidth - layer.width) / 2;
      const y = (this.canvasHeight - layer.height) / 2;

      outputCtx.drawImage(layer.img, x, y);
      outputCtx.restore();
    }

    const link = document.createElement('a');
    link.download = `composite_${this.layers.length}layers_${Date.now()}.png`;
    link.href = outputCanvas.toDataURL('image/png');
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.layers = [];
    this.selectedLayerId = null;
    this.canvasWidth = 800;
    this.canvasHeight = 600;
    this.nextLayerId = 1;

    this.compositeCanvas.width = this.canvasWidth;
    this.compositeCanvas.height = this.canvasHeight;

    this.updateLayerList();
    this.updateUI();
    this.renderComposite();

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
  new LayerCompositor();
});
