/**
 * ENC-018: Punycode Decoder
 * Decodes Punycode to internationalized domain names.
 */

class PunycodeDecoder {
  constructor() {
    this.base = 36;
    this.tmin = 1;
    this.tmax = 26;
    this.skew = 38;
    this.damp = 700;
    this.initialBias = 72;
    this.initialN = 128;
    this.delimiter = '-';
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.decodeBtn = document.getElementById('decodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.decode());
    this.decodeBtn.addEventListener('click', () => this.decode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  decode() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      const lines = input.split('\n');
      const results = lines.map(line => this.decodeDomain(line.trim()));

      this.outputText.value = results.join('\n');
      this.resultArea.style.display = 'block';
      this.showStatus('success', '解碼完成！');
    } catch (error) {
      this.showStatus('error', '解碼失敗：' + error.message);
    }
  }

  decodeDomain(domain) {
    if (!domain) return '';

    const parts = domain.split('.');
    const decoded = parts.map(part => {
      if (part.toLowerCase().startsWith('xn--')) {
        return this.punycodeDecode(part.slice(4));
      }
      return part;
    });

    return decoded.join('.');
  }

  punycodeDecode(input) {
    const output = [];
    let n = this.initialN;
    let bias = this.initialBias;
    let i = 0;

    // Find the last delimiter
    let basic = 0;
    for (let j = 0; j < input.length; j++) {
      if (input[j] === this.delimiter) {
        basic = j;
      }
    }

    // Copy basic characters
    for (let j = 0; j < basic; j++) {
      output.push(input.charCodeAt(j));
    }

    // Decode non-basic characters
    let index = basic > 0 ? basic + 1 : 0;

    while (index < input.length) {
      const oldi = i;
      let w = 1;

      for (let k = this.base; ; k += this.base) {
        if (index >= input.length) throw new Error('Invalid input');

        const digit = this.basicToDigit(input.charCodeAt(index++));
        if (digit >= this.base) throw new Error('Invalid input');

        i += digit * w;

        const t = k <= bias ? this.tmin : (k >= bias + this.tmax ? this.tmax : k - bias);
        if (digit < t) break;

        w *= this.base - t;
      }

      const out = output.length + 1;
      bias = this.adapt(i - oldi, out, oldi === 0);
      n += Math.floor(i / out);
      i %= out;

      output.splice(i, 0, n);
      i++;
    }

    return String.fromCodePoint(...output);
  }

  basicToDigit(code) {
    if (code >= 48 && code <= 57) return code - 22; // 0-9
    if (code >= 65 && code <= 90) return code - 65; // A-Z
    if (code >= 97 && code <= 122) return code - 97; // a-z
    return this.base;
  }

  adapt(delta, numPoints, firstTime) {
    delta = firstTime ? Math.floor(delta / this.damp) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    let k = 0;
    while (delta > ((this.base - this.tmin) * this.tmax) >> 1) {
      delta = Math.floor(delta / (this.base - this.tmin));
      k += this.base;
    }
    return Math.floor(k + (this.base - this.tmin + 1) * delta / (delta + this.skew));
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.value);
      this.showStatus('success', '已複製到剪貼簿！');
    } catch (error) {
      this.showStatus('error', '複製失敗');
    }
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.punycodeDecoder = new PunycodeDecoder();
});

export default PunycodeDecoder;
