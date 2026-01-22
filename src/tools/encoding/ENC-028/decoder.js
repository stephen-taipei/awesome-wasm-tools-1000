/**
 * ENC-028: JWT Decoder
 */
class JwtDecoder {
  constructor() { this.init(); }
  init() {
    this.inputText = document.getElementById('inputText');
    this.headerOutput = document.getElementById('headerOutput');
    this.payloadOutput = document.getElementById('payloadOutput');
    this.signatureOutput = document.getElementById('signatureOutput');
    this.expiryInfo = document.getElementById('expiryInfo');
    this.decodeBtn = document.getElementById('decodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.inputText.addEventListener('input', () => this.decode());
    this.decodeBtn.addEventListener('click', () => this.decode());
    this.clearBtn.addEventListener('click', () => this.clear());
  }
  decode() {
    const jwt = this.inputText.value.trim();
    if (!jwt) { this.resultArea.style.display = 'none'; return; }
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');
      const header = JSON.parse(this.base64UrlDecode(parts[0]));
      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      this.headerOutput.textContent = JSON.stringify(header, null, 2);
      this.payloadOutput.textContent = JSON.stringify(payload, null, 2);
      this.signatureOutput.textContent = parts[2];
      // Check expiry
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        const isExpired = expDate < now;
        this.expiryInfo.innerHTML = `<strong>過期時間:</strong> ${expDate.toLocaleString()}<br>` +
          `<strong>狀態:</strong> <span style="color: ${isExpired ? 'red' : 'green'}">${isExpired ? '已過期' : '有效'}</span>`;
      } else {
        this.expiryInfo.innerHTML = '<strong>過期時間:</strong> 未設定';
      }
      this.resultArea.style.display = 'block';
      this.showStatus('success', '解碼完成！');
    } catch (error) {
      this.showStatus('error', '解碼失敗：無效的 JWT 格式');
      this.resultArea.style.display = 'none';
    }
  }
  base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  }
  clear() {
    this.inputText.value = '';
    this.headerOutput.textContent = '';
    this.payloadOutput.textContent = '';
    this.signatureOutput.textContent = '';
    this.expiryInfo.innerHTML = '';
    this.resultArea.style.display = 'none';
  }
  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}
document.addEventListener('DOMContentLoaded', () => { window.jwtDecoder = new JwtDecoder(); });
export default JwtDecoder;
