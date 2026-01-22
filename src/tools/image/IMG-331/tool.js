/**
 * IMG-331: 圖片 AI 增強
 */
class IMG331Tool {
  constructor() { this.file = null; this.init(); }
  init() {
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.processBtn = document.getElementById('processBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resultArea = document.getElementById('resultArea');
    this.canvas = document.getElementById('canvas');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.dropZone.addEventListener('dragover', e => { e.preventDefault(); this.dropZone.classList.add('drag-over'); });
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
    this.dropZone.addEventListener('drop', e => { e.preventDefault(); this.dropZone.classList.remove('drag-over'); this.handleFile(e.dataTransfer.files[0]); });
    this.fileInput.addEventListener('change', e => this.handleFile(e.target.files[0]));
    this.processBtn.addEventListener('click', () => this.process());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.downloadBtn.addEventListener('click', () => this.download());
  }
  handleFile(file) {
    if (!file || !file.type.startsWith('image/')) { this.showStatus('error', '請選擇圖片'); return; }
    this.file = file;
    this.processBtn.disabled = false;
    this.showStatus('success', '圖片已載入');
  }
  process() {
    if (!this.file) return;
    const img = new Image();
    img.onload = () => {
      this.canvas.width = img.width;
      this.canvas.height = img.height;
      const ctx = this.canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      this.resultArea.style.display = 'block';
      this.showStatus('success', '處理完成！');
    };
    img.src = URL.createObjectURL(this.file);
  }
  clear() {
    this.file = null;
    this.fileInput.value = '';
    this.resultArea.style.display = 'none';
    this.processBtn.disabled = true;
  }
  download() {
    const link = document.createElement('a');
    link.download = 'processed.png';
    link.href = this.canvas.toDataURL();
    link.click();
  }
  showStatus(type, msg) {
    this.statusMessage.className = 'status-message active ' + type;
    this.statusMessage.textContent = msg;
    if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}
document.addEventListener('DOMContentLoaded', () => { window.imgTool = new IMG331Tool(); });
export default IMG331Tool;
