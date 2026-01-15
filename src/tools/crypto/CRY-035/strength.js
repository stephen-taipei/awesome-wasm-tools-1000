/**
 * CRY-035: Password Strength Checker
 * Analyzes password strength and provides security recommendations.
 */

class PasswordStrength {
  constructor() { this.init(); }

  init() {
    this.password = document.getElementById('password');
    this.checkBtn = document.getElementById('checkBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.resultPanel = document.getElementById('resultPanel');
    this.strengthBar = document.getElementById('strengthBar');
    this.strengthLabel = document.getElementById('strengthLabel');
    this.pwdLength = document.getElementById('pwdLength');
    this.entropyBits = document.getElementById('entropyBits');
    this.crackTime = document.getElementById('crackTime');
    this.hasLower = document.getElementById('hasLower');
    this.hasUpper = document.getElementById('hasUpper');
    this.hasDigit = document.getElementById('hasDigit');
    this.hasSpecial = document.getElementById('hasSpecial');
    this.suggestions = document.getElementById('suggestions');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }

  bindEvents() {
    this.checkBtn.addEventListener('click', () => this.check());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.togglePassword.addEventListener('click', () => {
      this.password.type = this.password.type === 'password' ? 'text' : 'password';
      this.togglePassword.textContent = this.password.type === 'password' ? '顯示' : '隱藏';
    });
    this.password.addEventListener('input', () => this.check());
  }

  check() {
    const pwd = this.password.value;
    if (!pwd) { this.resultPanel.style.display = 'none'; return; }

    const analysis = this.analyze(pwd);
    this.displayResults(analysis);
    this.resultPanel.style.display = 'block';
  }

  analyze(pwd) {
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasDigit = /[0-9]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    let charsetSize = 0;
    if (hasLower) charsetSize += 26;
    if (hasUpper) charsetSize += 26;
    if (hasDigit) charsetSize += 10;
    if (hasSpecial) charsetSize += 32;

    const entropy = pwd.length * Math.log2(charsetSize || 1);
    const guessesPerSecond = 1e10; // 10 billion guesses/sec
    const totalGuesses = Math.pow(2, entropy);
    const secondsToCrack = totalGuesses / guessesPerSecond;

    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    if (hasLower && hasUpper) score += 1;
    if (hasDigit) score += 1;
    if (hasSpecial) score += 1;
    if (entropy >= 60) score += 1;
    if (entropy >= 80) score += 1;

    // Check for common patterns
    const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(pwd);
    const hasRepeating = /(.)\1{2,}/.test(pwd);
    const isCommon = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome'].some(c => pwd.toLowerCase().includes(c));

    if (hasSequential) score -= 1;
    if (hasRepeating) score -= 1;
    if (isCommon) score -= 2;

    score = Math.max(0, Math.min(8, score));

    return {
      length: pwd.length,
      hasLower, hasUpper, hasDigit, hasSpecial,
      entropy, secondsToCrack, score,
      hasSequential, hasRepeating, isCommon
    };
  }

  displayResults(a) {
    this.pwdLength.textContent = `${a.length} 字元`;
    this.entropyBits.textContent = `${a.entropy.toFixed(1)} bits`;
    this.crackTime.textContent = this.formatTime(a.secondsToCrack);

    this.hasLower.textContent = a.hasLower ? '✓ 有' : '✗ 無';
    this.hasLower.style.color = a.hasLower ? '#22c55e' : '#ef4444';
    this.hasUpper.textContent = a.hasUpper ? '✓ 有' : '✗ 無';
    this.hasUpper.style.color = a.hasUpper ? '#22c55e' : '#ef4444';
    this.hasDigit.textContent = a.hasDigit ? '✓ 有' : '✗ 無';
    this.hasDigit.style.color = a.hasDigit ? '#22c55e' : '#ef4444';
    this.hasSpecial.textContent = a.hasSpecial ? '✓ 有' : '✗ 無';
    this.hasSpecial.style.color = a.hasSpecial ? '#22c55e' : '#ef4444';

    const levels = [
      { label: '極弱', color: '#ef4444', width: '12.5%' },
      { label: '很弱', color: '#f97316', width: '25%' },
      { label: '弱', color: '#fb923c', width: '37.5%' },
      { label: '一般', color: '#facc15', width: '50%' },
      { label: '中等', color: '#a3e635', width: '62.5%' },
      { label: '良好', color: '#4ade80', width: '75%' },
      { label: '強', color: '#22c55e', width: '87.5%' },
      { label: '極強', color: '#16a34a', width: '100%' }
    ];

    const level = levels[Math.min(a.score, 7)];
    this.strengthBar.style.width = level.width;
    this.strengthBar.style.backgroundColor = level.color;
    this.strengthLabel.textContent = level.label;
    this.strengthLabel.style.color = level.color;

    // Suggestions
    const suggestions = [];
    if (a.length < 12) suggestions.push('建議使用至少 12 個字元');
    if (!a.hasLower) suggestions.push('加入小寫字母 (a-z)');
    if (!a.hasUpper) suggestions.push('加入大寫字母 (A-Z)');
    if (!a.hasDigit) suggestions.push('加入數字 (0-9)');
    if (!a.hasSpecial) suggestions.push('加入特殊符號 (!@#$%^&*)');
    if (a.hasSequential) suggestions.push('避免連續字元 (如 abc, 123)');
    if (a.hasRepeating) suggestions.push('避免重複字元 (如 aaa)');
    if (a.isCommon) suggestions.push('避免使用常見密碼');
    if (suggestions.length === 0) suggestions.push('密碼強度良好！');

    this.suggestions.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
  }

  formatTime(seconds) {
    if (seconds < 1) return '瞬間';
    if (seconds < 60) return `${seconds.toFixed(0)} 秒`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(0)} 分鐘`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(0)} 小時`;
    if (seconds < 31536000) return `${(seconds / 86400).toFixed(0)} 天`;
    if (seconds < 3153600000) return `${(seconds / 31536000).toFixed(0)} 年`;
    if (seconds < 3153600000000) return `${(seconds / 31536000000).toFixed(0)} 千年`;
    return '數十億年以上';
  }

  clear() { this.password.value = ''; this.resultPanel.style.display = 'none'; }
  showStatus(type, message) { this.statusMessage.className = `status-message active ${type}`; this.statusMessage.textContent = message; if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000); }
}

document.addEventListener('DOMContentLoaded', () => { window.passwordStrength = new PasswordStrength(); });
export default PasswordStrength;
