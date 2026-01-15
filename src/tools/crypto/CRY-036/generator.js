/**
 * CRY-036: Random Password Generator
 * Uses CSPRNG to generate secure random passwords.
 */

class PasswordGenerator {
  constructor() { this.init(); }

  init() {
    this.pwdLength = document.getElementById('pwdLength');
    this.lengthDisplay = document.getElementById('lengthDisplay');
    this.includeLower = document.getElementById('includeLower');
    this.includeUpper = document.getElementById('includeUpper');
    this.includeDigits = document.getElementById('includeDigits');
    this.includeSpecial = document.getElementById('includeSpecial');
    this.excludeAmbiguous = document.getElementById('excludeAmbiguous');
    this.customChars = document.getElementById('customChars');
    this.generateBtn = document.getElementById('generateBtn');
    this.generateMultiBtn = document.getElementById('generateMultiBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.passwordResult = document.getElementById('passwordResult');
    this.strengthInfo = document.getElementById('strengthInfo');
    this.entropyBits = document.getElementById('entropyBits');
    this.charsetSize = document.getElementById('charsetSize');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
    this.generate();
  }

  bindEvents() {
    this.pwdLength.addEventListener('input', () => {
      this.lengthDisplay.textContent = this.pwdLength.value;
      this.generate();
    });
    this.generateBtn.addEventListener('click', () => this.generate());
    this.generateMultiBtn.addEventListener('click', () => this.generateMultiple(5));
    this.copyBtn.addEventListener('click', () => this.copyResult());
    [this.includeLower, this.includeUpper, this.includeDigits, this.includeSpecial, this.excludeAmbiguous].forEach(el => {
      el.addEventListener('change', () => this.generate());
    });
    this.customChars.addEventListener('input', () => this.generate());
  }

  getCharset() {
    let charset = '';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const ambiguous = '0O1lI';

    if (this.includeLower.checked) charset += lower;
    if (this.includeUpper.checked) charset += upper;
    if (this.includeDigits.checked) charset += digits;
    if (this.includeSpecial.checked) charset += special;

    if (this.excludeAmbiguous.checked) {
      charset = charset.split('').filter(c => !ambiguous.includes(c)).join('');
    }

    if (this.customChars.value) {
      const custom = this.customChars.value.split('').filter(c => !charset.includes(c)).join('');
      charset += custom;
    }

    return charset;
  }

  generatePassword(length, charset) {
    if (!charset) return '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    return Array.from(array).map(n => charset[n % charset.length]).join('');
  }

  generate() {
    const charset = this.getCharset();
    if (!charset) {
      this.showStatus('error', '請至少選擇一種字元類型');
      return;
    }

    const length = parseInt(this.pwdLength.value);
    const password = this.generatePassword(length, charset);
    this.passwordResult.value = password;

    const entropy = length * Math.log2(charset.length);
    this.entropyBits.textContent = `${entropy.toFixed(1)} bits`;
    this.charsetSize.textContent = `${charset.length} 字元`;
    this.strengthInfo.style.display = 'block';
  }

  generateMultiple(count) {
    const charset = this.getCharset();
    if (!charset) {
      this.showStatus('error', '請至少選擇一種字元類型');
      return;
    }

    const length = parseInt(this.pwdLength.value);
    const passwords = [];
    for (let i = 0; i < count; i++) {
      passwords.push(this.generatePassword(length, charset));
    }
    this.passwordResult.value = passwords.join('\n');

    const entropy = length * Math.log2(charset.length);
    this.entropyBits.textContent = `${entropy.toFixed(1)} bits (每組)`;
    this.charsetSize.textContent = `${charset.length} 字元`;
    this.strengthInfo.style.display = 'block';
    this.showStatus('success', `已生成 ${count} 組密碼`);
  }

  copyResult() {
    if (this.passwordResult.value) {
      navigator.clipboard.writeText(this.passwordResult.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => { window.passwordGenerator = new PasswordGenerator(); });
export default PasswordGenerator;
