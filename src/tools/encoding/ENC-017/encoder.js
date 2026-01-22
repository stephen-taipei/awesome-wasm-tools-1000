/**
 * ENC-017: Punycode Encoder
 * Encodes internationalized domain names to Punycode.
 */

class PunycodeEncoder {
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
    this.encodeBtn = document.getElementById('encodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.encode());
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  encode() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      const lines = input.split('\n');
      const results = lines.map(line => this.encodeDomain(line.trim()));

      this.outputText.value = results.join('\n');
      this.resultArea.style.display = 'block';
      this.showStatus('success', '編碼完成！');
    } catch (error) {
      this.showStatus('error', '編碼失敗：' + error.message);
    }
  }

  encodeDomain(domain) {
    if (!domain) return '';

    const parts = domain.split('.');
    const encoded = parts.map(part => {
      // Check if part needs encoding
      if (/[^\x00-\x7F]/.test(part)) {
        return 'xn--' + this.punycodeEncode(part);
      }
      return part;
    });

    return encoded.join('.');
  }

  punycodeEncode(input) {
    const output = [];
    let n = this.initialN;
    let delta = 0;
    let bias = this.initialBias;

    // Handle basic characters
    const basic = [];
    const nonBasic = [];

    for (const char of input) {
      const code = char.codePointAt(0);
      if (code < 128) {
        basic.push(char);
      } else {
        nonBasic.push(code);
      }
    }

    output.push(...basic);
    let h = basic.length;
    let b = basic.length;

    if (b > 0) {
      output.push(this.delimiter);
    }

    // Get all unique code points sorted
    const codePoints = [...new Set([...input].map(c => c.codePointAt(0)).filter(c => c >= 128))].sort((a, b) => a - b);

    for (const m of codePoints) {
      delta += (m - n) * (h + 1);
      n = m;

      for (const char of input) {
        const c = char.codePointAt(0);
        if (c < n) {
          delta++;
        } else if (c === n) {
          let q = delta;
          for (let k = this.base; ; k += this.base) {
            const t = k <= bias ? this.tmin : (k >= bias + this.tmax ? this.tmax : k - bias);
            if (q < t) break;
            output.push(this.digitToBasic(t + (q - t) % (this.base - t)));
            q = Math.floor((q - t) / (this.base - t));
          }
          output.push(this.digitToBasic(q));
          bias = this.adapt(delta, h + 1, h === b);
          delta = 0;
          h++;
        }
      }
      delta++;
      n++;
    }

    return output.join('');
  }

  digitToBasic(digit) {
    return String.fromCharCode(digit + (digit < 26 ? 97 : 22));
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
  window.punycodeEncoder = new PunycodeEncoder();
});

export default PunycodeEncoder;
