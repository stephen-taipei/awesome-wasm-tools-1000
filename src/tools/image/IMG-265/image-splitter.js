class ImageSplitterTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.settings = {
      cols: 3,
      rows: 3,
      showGrid: true,
      addNumbers: false
    };
    this.init();
  }

  init() {
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
      if (e.dataTransfer.files.length) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.cols = parseInt(btn.dataset.cols);
        this.settings.rows = parseInt(btn.dataset.rows);
        document.getElementById('cols').value = this.settings.cols;
        document.getElementById('rows').value = this.settings.rows;
        document.getElementById('colsValue').textContent = this.settings.cols;
        document.getElementById('rowsValue').textContent = this.settings.rows;
        this.updateInfo();
        this.render();
      });
    });

    // Column slider
    const colsSlider = document.getElementById('cols');
    colsSlider.addEventListener('input', (e) => {
      this.settings.cols = parseInt(e.target.value);
      document.getElementById('colsValue').textContent = this.settings.cols;
      this.updatePresetSelection();
      this.updateInfo();
      this.render();
    });

    // Row slider
    const rowsSlider = document.getElementById('rows');
    rowsSlider.addEventListener('input', (e) => {
      this.settings.rows = parseInt(e.target.value);
      document.getElementById('rowsValue').textContent = this.settings.rows;
      this.updatePresetSelection();
      this.updateInfo();
      this.render();
    });

    // Show grid checkbox
    const showGridCheckbox = document.getElementById('showGrid');
    showGridCheckbox.addEventListener('change', (e) => {
      this.settings.showGrid = e.target.checked;
      this.render();
    });

    // Add numbers checkbox
    const addNumbersCheckbox = document.getElementById('addNumbers');
    addNumbersCheckbox.addEventListener('change', (e) => {
      this.settings.addNumbers = e.target.checked;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.downloadAll());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updatePresetSelection() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const cols = parseInt(btn.dataset.cols);
      const rows = parseInt(btn.dataset.rows);
      if (cols === this.settings.cols && rows === this.settings.rows) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  updateInfo() {
    const total = this.settings.cols * this.settings.rows;
    document.getElementById('infoBox').textContent = `將產生 ${total} 個圖片檔案`;
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('editorSection').classList.add('active');
        this.updateInfo();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;

    const img = this.originalImage;
    this.canvas.width = img.width;
    this.canvas.height = img.height;

    // Draw original image
    this.ctx.drawImage(img, 0, 0);

    const cellWidth = img.width / this.settings.cols;
    const cellHeight = img.height / this.settings.rows;

    // Draw grid lines
    if (this.settings.showGrid) {
      this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
      this.ctx.lineWidth = 2;

      // Vertical lines
      for (let i = 1; i < this.settings.cols; i++) {
        const x = i * cellWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, img.height);
        this.ctx.stroke();
      }

      // Horizontal lines
      for (let i = 1; i < this.settings.rows; i++) {
        const y = i * cellHeight;
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(img.width, y);
        this.ctx.stroke();
      }
    }

    // Draw numbers
    if (this.settings.addNumbers) {
      const fontSize = Math.min(cellWidth, cellHeight) * 0.3;
      this.ctx.font = `bold ${fontSize}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      let num = 1;
      for (let row = 0; row < this.settings.rows; row++) {
        for (let col = 0; col < this.settings.cols; col++) {
          const x = col * cellWidth + cellWidth / 2;
          const y = row * cellHeight + cellHeight / 2;

          // Draw background circle
          this.ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
          this.ctx.beginPath();
          this.ctx.arc(x, y, fontSize * 0.8, 0, Math.PI * 2);
          this.ctx.fill();

          // Draw number
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillText(num.toString(), x, y);
          num++;
        }
      }
    }
  }

  async downloadAll() {
    if (!this.originalImage) return;

    const img = this.originalImage;
    const cellWidth = Math.floor(img.width / this.settings.cols);
    const cellHeight = Math.floor(img.height / this.settings.rows);

    // Create temporary canvas for splitting
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = cellWidth;
    tempCanvas.height = cellHeight;

    // Use JSZip if available, otherwise download individually
    if (typeof JSZip !== 'undefined') {
      const zip = new JSZip();

      let num = 1;
      for (let row = 0; row < this.settings.rows; row++) {
        for (let col = 0; col < this.settings.cols; col++) {
          tempCtx.clearRect(0, 0, cellWidth, cellHeight);
          tempCtx.drawImage(
            img,
            col * cellWidth, row * cellHeight, cellWidth, cellHeight,
            0, 0, cellWidth, cellHeight
          );

          const dataUrl = tempCanvas.toDataURL('image/png');
          const base64 = dataUrl.split(',')[1];
          zip.file(`part_${num.toString().padStart(2, '0')}.png`, base64, { base64: true });
          num++;
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = 'split-images.zip';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      // Download individually with delay
      let num = 1;
      for (let row = 0; row < this.settings.rows; row++) {
        for (let col = 0; col < this.settings.cols; col++) {
          tempCtx.clearRect(0, 0, cellWidth, cellHeight);
          tempCtx.drawImage(
            img,
            col * cellWidth, row * cellHeight, cellWidth, cellHeight,
            0, 0, cellWidth, cellHeight
          );

          const link = document.createElement('a');
          link.download = `part_${num.toString().padStart(2, '0')}.png`;
          link.href = tempCanvas.toDataURL('image/png');
          link.click();

          await new Promise(resolve => setTimeout(resolve, 100));
          num++;
        }
      }
    }
  }

  reset() {
    this.originalImage = null;
    this.settings = {
      cols: 3,
      rows: 3,
      showGrid: true,
      addNumbers: false
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('cols').value = 3;
    document.getElementById('rows').value = 3;
    document.getElementById('colsValue').textContent = '3';
    document.getElementById('rowsValue').textContent = '3';
    document.getElementById('showGrid').checked = true;
    document.getElementById('addNumbers').checked = false;
    document.getElementById('infoBox').textContent = '將產生 9 個圖片檔案';
    this.updatePresetSelection();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ImageSplitterTool();
});
