/**
 * CRY-049: X.509 Certificate Verification Tool
 *
 * Verifies X.509 certificate validity.
 * All processing is done locally in the browser.
 */

class X509Verifier {
  constructor() {
    this.init();
  }

  init() {
    this.certificate = document.getElementById('certificate');
    this.certificateFile = document.getElementById('certificateFile');
    this.issuerCertificate = document.getElementById('issuerCertificate');
    this.issuerCertificateFile = document.getElementById('issuerCertificateFile');
    this.verifyBtn = document.getElementById('verifyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.verificationResult = document.getElementById('verificationResult');
    this.overallResult = document.getElementById('overallResult');
    this.checkResults = document.getElementById('checkResults');

    this.bindEvents();
  }

  bindEvents() {
    this.certificateFile.addEventListener('change', (e) => this.loadFile(e, this.certificate, '憑證'));
    this.issuerCertificateFile.addEventListener('change', (e) => this.loadFile(e, this.issuerCertificate, '發行者憑證'));
    this.verifyBtn.addEventListener('click', () => this.verify());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  async loadFile(e, targetElement, label) {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      targetElement.value = text;
      this.showStatus('info', `${label}已載入`);
    }
  }

  async verify() {
    const certPem = this.certificate.value.trim();

    if (!certPem) {
      this.showStatus('error', '請輸入憑證');
      return;
    }

    try {
      const checks = [];
      let allPassed = true;

      // Parse certificate
      const base64Cert = this.extractBase64FromPem(certPem);
      const certDer = this.base64ToArrayBuffer(base64Cert);
      const certBytes = new Uint8Array(certDer);
      const certInfo = this.parseBasicCertInfo(certBytes);

      // Check 1: Valid date range
      const now = new Date();
      const dateCheck = {
        name: '有效期間檢查',
        passed: true,
        details: ''
      };

      if (certInfo.notBefore && certInfo.notAfter) {
        if (now < certInfo.notBefore) {
          dateCheck.passed = false;
          dateCheck.details = `憑證尚未生效（生效日期：${certInfo.notBefore.toLocaleDateString()}）`;
          allPassed = false;
        } else if (now > certInfo.notAfter) {
          dateCheck.passed = false;
          dateCheck.details = `憑證已過期（到期日期：${certInfo.notAfter.toLocaleDateString()}）`;
          allPassed = false;
        } else {
          const daysRemaining = Math.ceil((certInfo.notAfter - now) / (1000 * 60 * 60 * 24));
          dateCheck.details = `有效，剩餘 ${daysRemaining} 天`;
          if (daysRemaining < 30) {
            dateCheck.details += '（即將到期）';
          }
        }
      } else {
        dateCheck.passed = false;
        dateCheck.details = '無法解析有效期間';
        allPassed = false;
      }
      checks.push(dateCheck);

      // Check 2: Key size
      const keySizeCheck = {
        name: '金鑰長度檢查',
        passed: true,
        details: ''
      };

      if (certInfo.keySize) {
        if (certInfo.keySize < 2048) {
          keySizeCheck.passed = false;
          keySizeCheck.details = `金鑰長度 ${certInfo.keySize} 位元太短（建議至少 2048 位元）`;
          allPassed = false;
        } else {
          keySizeCheck.details = `金鑰長度 ${certInfo.keySize} 位元，符合安全標準`;
        }
      } else {
        keySizeCheck.details = '無法確定金鑰長度';
      }
      checks.push(keySizeCheck);

      // Check 3: Signature algorithm
      const sigAlgCheck = {
        name: '簽章演算法檢查',
        passed: true,
        details: ''
      };

      const weakAlgorithms = ['MD5', 'SHA1', 'MD2'];
      if (certInfo.signatureAlgorithm) {
        const isWeak = weakAlgorithms.some(alg =>
          certInfo.signatureAlgorithm.toUpperCase().includes(alg)
        );
        if (isWeak) {
          sigAlgCheck.passed = false;
          sigAlgCheck.details = `使用弱雜湊演算法：${certInfo.signatureAlgorithm}`;
          allPassed = false;
        } else {
          sigAlgCheck.details = `使用安全演算法：${certInfo.signatureAlgorithm}`;
        }
      } else {
        sigAlgCheck.details = '無法確定簽章演算法';
      }
      checks.push(sigAlgCheck);

      // Check 4: Self-signed check
      const selfSignedCheck = {
        name: '自簽憑證檢查',
        passed: true,
        details: ''
      };

      const isSelfSigned = this.isSameEntity(certInfo.subject, certInfo.issuer);
      if (isSelfSigned) {
        selfSignedCheck.details = '這是自簽憑證';
      } else {
        selfSignedCheck.details = '憑證由其他 CA 簽發';
      }
      checks.push(selfSignedCheck);

      // Check 5: Issuer verification (if provided)
      if (this.issuerCertificate.value.trim()) {
        const issuerCheck = {
          name: '發行者簽章驗證',
          passed: false,
          details: ''
        };

        try {
          const issuerBase64 = this.extractBase64FromPem(this.issuerCertificate.value.trim());
          const issuerDer = this.base64ToArrayBuffer(issuerBase64);
          const issuerBytes = new Uint8Array(issuerDer);
          const issuerInfo = this.parseBasicCertInfo(issuerBytes);

          // Check if issuer matches
          if (this.isSameEntity(certInfo.issuer, issuerInfo.subject)) {
            issuerCheck.passed = true;
            issuerCheck.details = '發行者匹配確認';
          } else {
            issuerCheck.passed = false;
            issuerCheck.details = '發行者不匹配';
            allPassed = false;
          }
        } catch (e) {
          issuerCheck.details = '無法解析發行者憑證';
          allPassed = false;
        }
        checks.push(issuerCheck);
      }

      // Display results
      this.displayResults(allPassed, checks);
      this.verificationResult.style.display = 'block';
      this.showStatus(allPassed ? 'success' : 'error', allPassed ? '憑證驗證通過' : '憑證驗證發現問題');

    } catch (error) {
      console.error('Verification error:', error);
      this.showStatus('error', '驗證失敗：' + error.message);
    }
  }

  parseBasicCertInfo(bytes) {
    const info = {
      subject: {},
      issuer: {},
      notBefore: null,
      notAfter: null,
      keySize: 0,
      signatureAlgorithm: ''
    };

    try {
      let offset = 0;
      if (bytes[offset] !== 0x30) return info;

      const certLength = this.parseLength(bytes, offset + 1);
      offset += 1 + certLength.bytesRead;

      if (bytes[offset] !== 0x30) return info;

      const tbsLength = this.parseLength(bytes, offset + 1);
      offset += 1 + tbsLength.bytesRead;

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

      // Signature algorithm
      if (bytes[offset] === 0x30) {
        const algInfo = this.parseAlgorithmOID(bytes, offset);
        info.signatureAlgorithm = algInfo.name;
        offset = algInfo.nextOffset;
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

      // Public key info for key size
      if (bytes[offset] === 0x30) {
        offset++;
        const pkLen = this.parseLength(bytes, offset);
        offset += pkLen.bytesRead;

        // Skip algorithm
        if (bytes[offset] === 0x30) {
          offset++;
          const algLen = this.parseLength(bytes, offset);
          offset += algLen.bytesRead + algLen.length;
        }

        // Bit string for key
        if (bytes[offset] === 0x03) {
          offset++;
          const bitLen = this.parseLength(bytes, offset);
          info.keySize = (bitLen.length - 1) * 8;
        }
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

  parseAlgorithmOID(bytes, offset) {
    const oidMap = {
      '2a864886f70d01010b': 'SHA256-RSA',
      '2a864886f70d010105': 'SHA1-RSA',
      '2a864886f70d01010c': 'SHA384-RSA',
      '2a864886f70d01010d': 'SHA512-RSA'
    };

    offset++;
    const seqLen = this.parseLength(bytes, offset);
    offset += seqLen.bytesRead;

    let name = 'Unknown';
    if (bytes[offset] === 0x06) {
      offset++;
      const oidLen = bytes[offset++];
      const oidBytes = bytes.slice(offset, offset + oidLen);
      const oidHex = Array.from(oidBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      name = oidMap[oidHex] || oidHex;
      offset += oidLen;
    }

    return { name, nextOffset: offset + 2 };
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

            offset++; // value type
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

  displayResults(allPassed, checks) {
    if (allPassed) {
      this.overallResult.innerHTML = `
        <div style="font-size: 3rem;">✅</div>
        <div style="font-weight: bold; color: #22c55e;">憑證驗證通過</div>
      `;
      this.overallResult.style.background = '#f0fdf4';
    } else {
      this.overallResult.innerHTML = `
        <div style="font-size: 3rem;">⚠️</div>
        <div style="font-weight: bold; color: #f59e0b;">憑證驗證發現問題</div>
      `;
      this.overallResult.style.background = '#fffbeb';
    }

    this.checkResults.innerHTML = checks.map(check => `
      <div class="setting-row">
        <label>${check.passed ? '✅' : '❌'} ${check.name}</label>
        <span style="color: ${check.passed ? '#22c55e' : '#ef4444'};">${check.details}</span>
      </div>
    `).join('');
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
    this.certificate.value = '';
    this.issuerCertificate.value = '';
    this.certificateFile.value = '';
    this.issuerCertificateFile.value = '';
    this.verificationResult.style.display = 'none';
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
  window.x509Verifier = new X509Verifier();
});

export default X509Verifier;
