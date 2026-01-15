/**
 * CRY-068: SSL/TLS Certificate Check Tool
 *
 * Checks SSL/TLS certificate information.
 * All processing is done locally in the browser.
 */

class SSLChecker {
  constructor() {
    this.init();
  }

  init() {
    this.hostname = document.getElementById('hostname');
    this.port = document.getElementById('port');
    this.checkBtn = document.getElementById('checkBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.certificatePaste = document.getElementById('certificatePaste');
    this.parseCertBtn = document.getElementById('parseCertBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.checkResult = document.getElementById('checkResult');
    this.sslStatus = document.getElementById('sslStatus');
    this.resultHostname = document.getElementById('resultHostname');
    this.commonName = document.getElementById('commonName');
    this.issuer = document.getElementById('issuer');
    this.validFrom = document.getElementById('validFrom');
    this.validTo = document.getElementById('validTo');
    this.daysRemaining = document.getElementById('daysRemaining');
    this.protocol = document.getElementById('protocol');
    this.san = document.getElementById('san');

    this.bindEvents();
  }

  bindEvents() {
    this.checkBtn.addEventListener('click', () => this.check());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.parseCertBtn.addEventListener('click', () => this.parseCertificate());
  }

  check() {
    const hostnameValue = this.hostname.value.trim();
    const portValue = parseInt(this.port.value);

    if (!hostnameValue) {
      this.showStatus('error', '請輸入主機名稱');
      return;
    }

    // Show the result panel with instructions
    this.resultHostname.textContent = `${hostnameValue}:${portValue}`;
    this.sslStatus.innerHTML = `
      <div style="font-size: 2rem;">ℹ️</div>
      <div>請貼上憑證內容進行解析</div>
    `;
    this.sslStatus.style.background = '#e0f2fe';

    this.commonName.textContent = '-';
    this.issuer.textContent = '-';
    this.validFrom.textContent = '-';
    this.validTo.textContent = '-';
    this.daysRemaining.textContent = '-';
    this.protocol.textContent = '-';
    this.san.textContent = '-';

    this.checkResult.style.display = 'block';

    this.showStatus('info', `請使用 openssl 命令獲取 ${hostnameValue} 的憑證，然後貼上進行解析`);
  }

  parseCertificate() {
    const certPem = this.certificatePaste.value.trim();

    if (!certPem) {
      this.showStatus('error', '請貼上憑證');
      return;
    }

    try {
      const base64 = this.extractBase64FromPem(certPem);
      const derData = this.base64ToArrayBuffer(base64);
      const certInfo = this.parseCertificateInfo(new Uint8Array(derData));

      // Display results
      this.commonName.textContent = certInfo.subject.CN || '-';
      this.issuer.textContent = certInfo.issuer.CN || certInfo.issuer.O || '-';
      this.validFrom.textContent = certInfo.notBefore ? certInfo.notBefore.toLocaleString() : '-';
      this.validTo.textContent = certInfo.notAfter ? certInfo.notAfter.toLocaleString() : '-';

      // Calculate days remaining
      const now = new Date();
      if (certInfo.notAfter) {
        const daysLeft = Math.ceil((certInfo.notAfter - now) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) {
          this.daysRemaining.innerHTML = `<span style="color: #ef4444;">${Math.abs(daysLeft)} 天前已過期</span>`;
        } else if (daysLeft < 30) {
          this.daysRemaining.innerHTML = `<span style="color: #f59e0b;">${daysLeft} 天（即將到期）</span>`;
        } else {
          this.daysRemaining.innerHTML = `<span style="color: #22c55e;">${daysLeft} 天</span>`;
        }

        // Update status
        if (daysLeft < 0) {
          this.sslStatus.innerHTML = `
            <div style="font-size: 3rem;">❌</div>
            <div style="font-weight: bold; color: #ef4444;">憑證已過期</div>
          `;
          this.sslStatus.style.background = '#fef2f2';
        } else if (daysLeft < 30) {
          this.sslStatus.innerHTML = `
            <div style="font-size: 3rem;">⚠️</div>
            <div style="font-weight: bold; color: #f59e0b;">憑證即將到期</div>
          `;
          this.sslStatus.style.background = '#fffbeb';
        } else {
          this.sslStatus.innerHTML = `
            <div style="font-size: 3rem;">✅</div>
            <div style="font-weight: bold; color: #22c55e;">憑證有效</div>
          `;
          this.sslStatus.style.background = '#f0fdf4';
        }
      }

      this.protocol.textContent = 'TLS (從憑證解析)';
      this.san.textContent = certInfo.san || '-';

      this.showStatus('success', '憑證解析完成');
    } catch (error) {
      console.error('Certificate parse error:', error);
      this.showStatus('error', '憑證解析失敗：' + error.message);
    }
  }

  parseCertificateInfo(bytes) {
    const info = {
      subject: {},
      issuer: {},
      notBefore: null,
      notAfter: null,
      san: ''
    };

    try {
      let offset = 0;
      if (bytes[offset] !== 0x30) return info;

      const certLen = this.parseLength(bytes, offset + 1);
      offset += 1 + certLen.bytesRead;

      if (bytes[offset] !== 0x30) return info;
      const tbsLen = this.parseLength(bytes, offset + 1);
      offset += 1 + tbsLen.bytesRead;

      // Skip version
      if (bytes[offset] === 0xA0) {
        offset++;
        const vLen = this.parseLength(bytes, offset);
        offset += vLen.bytesRead + vLen.length;
      }

      // Skip serial
      if (bytes[offset] === 0x02) {
        offset++;
        const sLen = bytes[offset++];
        offset += sLen;
      }

      // Skip signature algorithm
      if (bytes[offset] === 0x30) {
        offset++;
        const algLen = this.parseLength(bytes, offset);
        offset += algLen.bytesRead + algLen.length;
      }

      // Issuer
      if (bytes[offset] === 0x30) {
        const issuerResult = this.parseDistinguishedName(bytes, offset);
        info.issuer = issuerResult.name;
        offset = issuerResult.nextOffset;
      }

      // Validity
      if (bytes[offset] === 0x30) {
        offset++;
        const valLen = this.parseLength(bytes, offset);
        offset += valLen.bytesRead;

        const nbResult = this.parseTime(bytes, offset);
        info.notBefore = nbResult.time;
        offset = nbResult.nextOffset;

        const naResult = this.parseTime(bytes, offset);
        info.notAfter = naResult.time;
        offset = naResult.nextOffset;
      }

      // Subject
      if (bytes[offset] === 0x30) {
        const subjectResult = this.parseDistinguishedName(bytes, offset);
        info.subject = subjectResult.name;
      }

    } catch (e) {
      console.error('Parse error:', e);
    }

    return info;
  }

  parseLength(bytes, offset) {
    if (bytes[offset] < 0x80) {
      return { length: bytes[offset], bytesRead: 1 };
    }
    const numBytes = bytes[offset] & 0x7F;
    let length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | bytes[offset + 1 + i];
    }
    return { length, bytesRead: 1 + numBytes };
  }

  parseDistinguishedName(bytes, offset) {
    const name = {};
    const oidMap = {
      '550403': 'CN',
      '550406': 'C',
      '550408': 'ST',
      '550407': 'L',
      '55040a': 'O',
      '55040b': 'OU'
    };

    offset++;
    const seqLen = this.parseLength(bytes, offset);
    const endOffset = offset + seqLen.bytesRead + seqLen.length;
    offset += seqLen.bytesRead;

    while (offset < endOffset - 2) {
      if (bytes[offset] === 0x31) {
        offset++;
        const setLen = this.parseLength(bytes, offset);
        offset += setLen.bytesRead;

        if (bytes[offset] === 0x30) {
          offset++;
          const attrLen = this.parseLength(bytes, offset);
          offset += attrLen.bytesRead;

          if (bytes[offset] === 0x06) {
            offset++;
            const oidLen = bytes[offset++];
            const oidBytes = bytes.slice(offset, offset + oidLen);
            const oidHex = Array.from(oidBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            offset += oidLen;

            offset++;
            const valueLen = bytes[offset++];
            const valueBytes = bytes.slice(offset, offset + valueLen);
            const value = new TextDecoder().decode(valueBytes);
            offset += valueLen;

            const attrName = oidMap[oidHex] || oidHex;
            name[attrName] = value;
          }
        }
      } else {
        offset++;
      }
    }

    return { name, nextOffset: endOffset };
  }

  parseTime(bytes, offset) {
    const tag = bytes[offset++];
    const len = bytes[offset++];
    const timeStr = new TextDecoder().decode(bytes.slice(offset, offset + len));

    let time;
    if (tag === 0x17) {
      const year = parseInt(timeStr.substr(0, 2));
      const fullYear = year >= 50 ? 1900 + year : 2000 + year;
      time = new Date(fullYear, parseInt(timeStr.substr(2, 2)) - 1, parseInt(timeStr.substr(4, 2)));
    } else {
      time = new Date(parseInt(timeStr.substr(0, 4)), parseInt(timeStr.substr(4, 2)) - 1, parseInt(timeStr.substr(6, 2)));
    }

    return { time, nextOffset: offset + len };
  }

  extractBase64FromPem(pem) {
    const lines = pem.split('\n');
    let base64 = '';
    let inBlock = false;

    for (const line of lines) {
      if (line.includes('-----BEGIN')) {
        inBlock = true;
        continue;
      }
      if (line.includes('-----END')) break;
      if (inBlock && line.trim()) {
        base64 += line.trim();
      }
    }

    return base64;
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  clear() {
    this.hostname.value = '';
    this.port.value = '443';
    this.certificatePaste.value = '';
    this.checkResult.style.display = 'none';
    this.statusMessage.classList.remove('active');
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success' || type === 'info') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.sslChecker = new SSLChecker();
});

export default SSLChecker;
