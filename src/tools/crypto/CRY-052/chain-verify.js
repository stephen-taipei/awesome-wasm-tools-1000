/**
 * CRY-052: Certificate Chain Verification Tool
 *
 * Verifies X.509 certificate chain integrity.
 * All processing is done locally in the browser.
 */

class CertChainVerifier {
  constructor() {
    this.init();
  }

  init() {
    this.certChain = document.getElementById('certChain');
    this.certChainFile = document.getElementById('certChainFile');
    this.verifyBtn = document.getElementById('verifyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.chainResult = document.getElementById('chainResult');
    this.overallStatus = document.getElementById('overallStatus');
    this.chainDetails = document.getElementById('chainDetails');

    this.bindEvents();
  }

  bindEvents() {
    this.certChainFile.addEventListener('change', (e) => this.loadFile(e));
    this.verifyBtn.addEventListener('click', () => this.verify());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  async loadFile(e) {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      this.certChain.value = text;
      this.showStatus('info', '憑證鏈已載入');
    }
  }

  async verify() {
    const chainText = this.certChain.value.trim();

    if (!chainText) {
      this.showStatus('error', '請輸入憑證鏈');
      return;
    }

    try {
      // Extract all certificates
      const certs = this.extractCertificates(chainText);

      if (certs.length === 0) {
        this.showStatus('error', '未找到有效的憑證');
        return;
      }

      // Parse each certificate
      const parsedCerts = certs.map((cert, index) => {
        const derData = this.base64ToArrayBuffer(cert);
        const info = this.parseCertificate(new Uint8Array(derData));
        info.index = index;
        info.derData = derData;
        return info;
      });

      // Verify chain
      const chainVerification = this.verifyChain(parsedCerts);

      // Display results
      this.displayResults(chainVerification, parsedCerts);
      this.chainResult.style.display = 'block';

      this.showStatus(
        chainVerification.valid ? 'success' : 'error',
        chainVerification.valid ? '憑證鏈驗證通過' : '憑證鏈驗證失敗'
      );
    } catch (error) {
      console.error('Verification error:', error);
      this.showStatus('error', '驗證失敗：' + error.message);
    }
  }

  extractCertificates(text) {
    const certs = [];
    const regex = /-----BEGIN CERTIFICATE-----\s*([\s\S]*?)\s*-----END CERTIFICATE-----/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      certs.push(match[1].replace(/\s/g, ''));
    }

    return certs;
  }

  parseCertificate(bytes) {
    const info = {
      subject: {},
      issuer: {},
      notBefore: null,
      notAfter: null,
      isSelfSigned: false,
      isCA: false
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
        offset = subjectResult.nextOffset;
      }

      // Check if self-signed
      info.isSelfSigned = this.isSameEntity(info.subject, info.issuer);

    } catch (e) {
      console.error('Parse error:', e);
    }

    return info;
  }

  verifyChain(certs) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      links: []
    };

    const now = new Date();

    for (let i = 0; i < certs.length; i++) {
      const cert = certs[i];
      const link = {
        index: i,
        subject: cert.subject.CN || 'Unknown',
        issuer: cert.issuer.CN || 'Unknown',
        valid: true,
        checks: []
      };

      // Check validity period
      if (cert.notBefore && cert.notAfter) {
        if (now < cert.notBefore) {
          link.checks.push({ name: '有效期', status: 'error', message: '尚未生效' });
          link.valid = false;
        } else if (now > cert.notAfter) {
          link.checks.push({ name: '有效期', status: 'error', message: '已過期' });
          link.valid = false;
        } else {
          const daysRemaining = Math.ceil((cert.notAfter - now) / (1000 * 60 * 60 * 24));
          link.checks.push({ name: '有效期', status: 'success', message: `有效，剩餘 ${daysRemaining} 天` });
        }
      }

      // Check chain link
      if (i < certs.length - 1) {
        const nextCert = certs[i + 1];
        if (this.isSameEntity(cert.issuer, nextCert.subject)) {
          link.checks.push({ name: '鏈接', status: 'success', message: '發行者匹配' });
        } else {
          link.checks.push({ name: '鏈接', status: 'error', message: '發行者不匹配' });
          link.valid = false;
        }
      } else {
        // Last certificate should be self-signed (root)
        if (cert.isSelfSigned) {
          link.checks.push({ name: '根憑證', status: 'success', message: '自簽憑證' });
        } else {
          link.checks.push({ name: '根憑證', status: 'warning', message: '不是自簽憑證' });
          result.warnings.push('最後一個憑證不是自簽憑證，鏈可能不完整');
        }
      }

      if (!link.valid) {
        result.valid = false;
      }

      result.links.push(link);
    }

    return result;
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

  isSameEntity(entity1, entity2) {
    const keys = ['CN', 'O', 'OU', 'C'];
    for (const key of keys) {
      if (entity1[key] !== entity2[key]) return false;
    }
    return true;
  }

  displayResults(verification, certs) {
    if (verification.valid) {
      this.overallStatus.innerHTML = `
        <div style="font-size: 3rem;">✅</div>
        <div style="font-weight: bold; color: #22c55e;">憑證鏈驗證通過</div>
        <div>共 ${certs.length} 個憑證</div>
      `;
      this.overallStatus.style.background = '#f0fdf4';
    } else {
      this.overallStatus.innerHTML = `
        <div style="font-size: 3rem;">❌</div>
        <div style="font-weight: bold; color: #ef4444;">憑證鏈驗證失敗</div>
      `;
      this.overallStatus.style.background = '#fef2f2';
    }

    let detailsHtml = '';
    verification.links.forEach((link, index) => {
      const icon = link.valid ? '✅' : '❌';
      const borderColor = link.valid ? '#22c55e' : '#ef4444';

      detailsHtml += `
        <div style="border-left: 4px solid ${borderColor}; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;">
          <h5>${icon} 憑證 ${index + 1}: ${link.subject}</h5>
          <p style="color: #666; font-size: 0.875rem;">發行者: ${link.issuer}</p>
          ${link.checks.map(check => {
            const statusColor = check.status === 'success' ? '#22c55e' : check.status === 'error' ? '#ef4444' : '#f59e0b';
            return `<div style="margin-top: 0.5rem; color: ${statusColor};">${check.name}: ${check.message}</div>`;
          }).join('')}
        </div>
        ${index < verification.links.length - 1 ? '<div style="text-align: center; margin: 0.5rem 0;">↓</div>' : ''}
      `;
    });

    if (verification.warnings.length > 0) {
      detailsHtml += `
        <div style="margin-top: 1rem; padding: 1rem; background: #fffbeb; border-radius: 0.5rem;">
          <strong style="color: #f59e0b;">警告:</strong>
          <ul style="margin: 0.5rem 0 0 1.5rem;">
            ${verification.warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    this.chainDetails.innerHTML = detailsHtml;
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
    this.certChain.value = '';
    this.certChainFile.value = '';
    this.chainResult.style.display = 'none';
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
  window.certChainVerifier = new CertChainVerifier();
});

export default CertChainVerifier;
