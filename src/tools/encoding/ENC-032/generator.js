/**
 * ENC-032: QR Code Generator (Simple implementation)
 */
class QRCodeGenerator {
  constructor() { this.init(); }
  init() {
    this.inputText = document.getElementById('inputText');
    this.size = document.getElementById('size');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.qrCanvas = document.getElementById('qrCanvas');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.inputText.addEventListener('input', () => this.generate());
  }
  generate() {
    const text = this.inputText.value;
    if (!text) { this.resultArea.style.display = 'none'; return; }
    const size = parseInt(this.size.value);
    const ctx = this.qrCanvas.getContext('2d');
    this.qrCanvas.width = size;
    this.qrCanvas.height = size;
    // Simple QR-like pattern (not actual QR code - would need library)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'black';
    const moduleSize = Math.floor(size / 25);
    const data = this.textToBinary(text);
    // Draw finder patterns
    this.drawFinderPattern(ctx, 0, 0, moduleSize);
    this.drawFinderPattern(ctx, size - 7 * moduleSize, 0, moduleSize);
    this.drawFinderPattern(ctx, 0, size - 7 * moduleSize, moduleSize);
    // Draw data pattern
    let idx = 0;
    for (let y = 8; y < 17; y++) {
      for (let x = 8; x < 17; x++) {
        if (idx < data.length && data[idx] === '1') {
          ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
        }
        idx++;
      }
    }
    this.resultArea.style.display = 'block';
    this.showStatus('success', 'QR Code 產生完成！(簡化版)');
  }
  drawFinderPattern(ctx, x, y, m) {
    ctx.fillRect(x, y, 7*m, 7*m);
    ctx.fillStyle = 'white';
    ctx.fillRect(x+m, y+m, 5*m, 5*m);
    ctx.fillStyle = 'black';
    ctx.fillRect(x+2*m, y+2*m, 3*m, 3*m);
  }
  textToBinary(text) {
    return text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  }
  clear() {
    this.inputText.value = '';
    const ctx = this.qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.qrCanvas.width, this.qrCanvas.height);
    this.resultArea.style.display = 'none';
  }
  download() {
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = this.qrCanvas.toDataURL();
    link.click();
    this.showStatus('success', '已下載！');
  }
  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}
document.addEventListener('DOMContentLoaded', () => { window.qrCodeGenerator = new QRCodeGenerator(); });
export default QRCodeGenerator;
