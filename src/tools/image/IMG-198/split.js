/**
 * IMG-198 圖片分割工具
 */
class SplitTool {
  constructor() {
    this.originalImage = null;
    this.settings = { cols: 3, rows: 3 };
    this.chunks = [];
    this.init();
  }

  init() { this.bindEvents(); }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.cols = parseInt(btn.dataset.cols);
        this.settings.rows = parseInt(btn.dataset.rows);
        document.getElementById('cols').value = this.settings.cols;
        document.getElementById('colsValue').textContent = this.settings.cols;
        document.getElementById('rows').value = this.settings.rows;
        document.getElementById('rowsValue').textContent = this.settings.rows;
        this.updateInfo();
        this.render();
      });
    });

    document.getElementById('cols').addEventListener('input', (e) => {
      this.settings.cols = parseInt(e.target.value);
      document.getElementById('colsValue').textContent = this.settings.cols;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.updateInfo();
      this.render();
    });

    document.getElementById('rows').addEventListener('input', (e) => {
      this.settings.rows = parseInt(e.target.value);
      document.getElementById('rowsValue').textContent = this.settings.rows;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.updateInfo();
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.downloadAll());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateInfo() {
    const total = this.settings.cols * this.settings.rows;
    document.getElementById('infoText').textContent = `將產生 ${total} 個區塊`;
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.settings = { cols: 3, rows: 3 };
        document.getElementById('cols').value = 3;
        document.getElementById('colsValue').textContent = '3';
        document.getElementById('rows').value = 3;
        document.getElementById('rowsValue').textContent = '3';
        this.updateInfo();
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;
    const { cols, rows } = this.settings;
    const img = this.originalImage;
    const chunkW = Math.floor(img.width / cols);
    const chunkH = Math.floor(img.height / rows);

    this.chunks = [];
    const grid = document.getElementById('previewGrid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${cols}, ${Math.min(150, 400 / cols)}px)`;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const canvas = document.createElement('canvas');
        canvas.width = chunkW;
        canvas.height = chunkH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, col * chunkW, row * chunkH, chunkW, chunkH, 0, 0, chunkW, chunkH);

        this.chunks.push({
          dataUrl: canvas.toDataURL('image/png'),
          name: `chunk_${row + 1}_${col + 1}.png`
        });

        const cell = document.createElement('div');
        cell.className = 'preview-cell';
        cell.style.aspectRatio = `${chunkW} / ${chunkH}`;

        const imgEl = document.createElement('img');
        imgEl.src = canvas.toDataURL('image/png');
        imgEl.onclick = () => this.downloadSingle(this.chunks.length - 1);
        imgEl.style.cursor = 'pointer';
        imgEl.title = '點擊下載此區塊';

        cell.appendChild(imgEl);
        grid.appendChild(cell);
      }
    }
  }

  downloadSingle(index) {
    const chunk = this.chunks[index];
    const link = document.createElement('a');
    link.download = chunk.name;
    link.href = chunk.dataUrl;
    link.click();
  }

  downloadAll() {
    if (!this.chunks.length) return;

    // Download each chunk with a small delay
    this.chunks.forEach((chunk, i) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = chunk.name;
        link.href = chunk.dataUrl;
        link.click();
      }, i * 200);
    });
  }

  reset() {
    this.originalImage = null;
    this.chunks = [];
    this.settings = { cols: 3, rows: 3 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('previewGrid').innerHTML = '';
    document.getElementById('cols').value = 3;
    document.getElementById('colsValue').textContent = '3';
    document.getElementById('rows').value = 3;
    document.getElementById('rowsValue').textContent = '3';
    document.getElementById('infoText').textContent = '將產生 9 個區塊';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-cols="3"][data-rows="3"]').classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => new SplitTool());
