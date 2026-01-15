/**
 * CRY-048: X.509 Certificate Viewer Tool
 *
 * Parses and displays X.509 certificate information.
 * All processing is done locally in the browser.
 */

class X509Viewer {
  constructor() {
    this.init();
  }

  init() {
    this.certificate = document.getElementById('certificate');
    this.certificateFile = document.getElementById('certificateFile');
    this.parseBtn = document.getElementById('parseBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.certificateInfo = document.getElementById('certificateInfo');

    this.bindEvents();
  }

  bindEvents() {
    this.certificateFile.addEventListener('change', (e) => this.loadCertificateFile(e));
    this.parseBtn.addEventListener('click', () => this.parse());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  async loadCertificateFile(e) {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      this.certificate.value = text;
      this.showStatus('info', '憑證已載入');
    }
  }

  async parse() {
    const certPem = this.certificate.value.trim();

    if (!certPem) {
      this.showStatus('error', '請輸入憑證');
      return;
    }

    try {
      // Extract base64 from PEM
      const base64Cert = this.extractBase64FromPem(certPem);
      const certDer = this.base64ToArrayBuffer(base64Cert);
      const certBytes = new Uint8Array(certDer);

      // Parse ASN.1 structure
      const certInfo = this.parseASN1Certificate(certBytes);

      // Calculate fingerprints
      const sha256Fingerprint = await this.calculateFingerprint(certDer, 'SHA-256');
      const sha1Fingerprint = await this.calculateFingerprint(certDer, 'SHA-1');

      // Display information
      this.displayCertificateInfo(certInfo, sha256Fingerprint, sha1Fingerprint);

      this.certificateInfo.style.display = 'block';
      this.showStatus('success', '憑證解析完成！');
    } catch (error) {
      console.error('Parse error:', error);
      this.showStatus('error', '憑證解析失敗：' + error.message);
    }
  }

  parseASN1Certificate(bytes) {
    // Simplified ASN.1 parser for X.509 certificates
    const info = {
      version: 3,
      serialNumber: '',
      subject: {},
      issuer: {},
      notBefore: null,
      notAfter: null,
      publicKeyAlgorithm: '',
      keySize: 0,
      signatureAlgorithm: '',
      extensions: []
    };

    try {
      // Parse outer SEQUENCE
      let offset = 0;
      if (bytes[offset] !== 0x30) throw new Error('Invalid certificate format');

      const certLength = this.parseLength(bytes, offset + 1);
      offset += 1 + certLength.bytesRead;

      // Parse TBSCertificate
      if (bytes[offset] !== 0x30) throw new Error('Invalid TBSCertificate');

      const tbsLength = this.parseLength(bytes, offset + 1);
      offset += 1 + tbsLength.bytesRead;

      // Version (optional, context-specific tag [0])
      if (bytes[offset] === 0xA0) {
        offset++; // Skip tag
        const versionLen = this.parseLength(bytes, offset);
        offset += versionLen.bytesRead;
        if (bytes[offset] === 0x02) { // INTEGER
          offset++;
          const intLen = bytes[offset++];
          info.version = bytes[offset] + 1;
          offset += intLen;
        }
      }

      // Serial Number
      if (bytes[offset] === 0x02) {
        offset++;
        const serialLen = bytes[offset++];
        const serialBytes = bytes.slice(offset, offset + serialLen);
        info.serialNumber = Array.from(serialBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(':');
        offset += serialLen;
      }

      // Signature Algorithm
      if (bytes[offset] === 0x30) {
        const sigAlgInfo = this.parseAlgorithmIdentifier(bytes, offset);
        info.signatureAlgorithm = sigAlgInfo.algorithm;
        offset = sigAlgInfo.nextOffset;
      }

      // Issuer
      if (bytes[offset] === 0x30) {
        const issuerInfo = this.parseName(bytes, offset);
        info.issuer = issuerInfo.name;
        offset = issuerInfo.nextOffset;
      }

      // Validity
      if (bytes[offset] === 0x30) {
        offset++;
        const validityLen = this.parseLength(bytes, offset);
        offset += validityLen.bytesRead;

        // notBefore
        const notBeforeInfo = this.parseTime(bytes, offset);
        info.notBefore = notBeforeInfo.time;
        offset = notBeforeInfo.nextOffset;

        // notAfter
        const notAfterInfo = this.parseTime(bytes, offset);
        info.notAfter = notAfterInfo.time;
        offset = notAfterInfo.nextOffset;
      }

      // Subject
      if (bytes[offset] === 0x30) {
        const subjectInfo = this.parseName(bytes, offset);
        info.subject = subjectInfo.name;
        offset = subjectInfo.nextOffset;
      }

      // SubjectPublicKeyInfo
      if (bytes[offset] === 0x30) {
        const pkInfo = this.parsePublicKeyInfo(bytes, offset);
        info.publicKeyAlgorithm = pkInfo.algorithm;
        info.keySize = pkInfo.keySize;
      }

    } catch (e) {
      console.error('ASN.1 parsing error:', e);
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

  parseAlgorithmIdentifier(bytes, offset) {
    const algOidMap = {
      '2a864886f70d01010b': 'SHA256withRSA',
      '2a864886f70d010101': 'RSA',
      '2a8648ce3d0201': 'EC',
      '2a864886f70d01010c': 'SHA384withRSA',
      '2a864886f70d01010d': 'SHA512withRSA',
      '2a864886f70d010105': 'SHA1withRSA'
    };

    offset++; // Skip SEQUENCE tag
    const seqLen = this.parseLength(bytes, offset);
    offset += seqLen.bytesRead;

    let algorithm = 'Unknown';
    if (bytes[offset] === 0x06) { // OID
      offset++;
      const oidLen = bytes[offset++];
      const oidBytes = bytes.slice(offset, offset + oidLen);
      const oidHex = Array.from(oidBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      algorithm = algOidMap[oidHex] || `OID: ${oidHex}`;
      offset += oidLen;
    }

    // Skip to end of sequence
    const nextOffset = offset + (seqLen.length - (offset - seqLen.bytesRead));

    return { algorithm, nextOffset: offset + 2 }; // Approximate
  }

  parseName(bytes, offset) {
    const name = {};
    const attrOidMap = {
      '550403': 'CN',
      '550406': 'C',
      '550408': 'ST',
      '550407': 'L',
      '55040a': 'O',
      '55040b': 'OU'
    };

    offset++; // Skip SEQUENCE tag
    const seqLen = this.parseLength(bytes, offset);
    const endOffset = offset + seqLen.bytesRead + seqLen.length;
    offset += seqLen.bytesRead;

    while (offset < endOffset) {
      if (bytes[offset] === 0x31) { // SET
        offset++;
        const setLen = this.parseLength(bytes, offset);
        offset += setLen.bytesRead;

        if (bytes[offset] === 0x30) { // SEQUENCE
          offset++;
          const attrLen = this.parseLength(bytes, offset);
          offset += attrLen.bytesRead;

          // OID
          if (bytes[offset] === 0x06) {
            offset++;
            const oidLen = bytes[offset++];
            const oidBytes = bytes.slice(offset, offset + oidLen);
            const oidHex = Array.from(oidBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            offset += oidLen;

            // Value
            const valueType = bytes[offset++];
            const valueLen = bytes[offset++];
            const valueBytes = bytes.slice(offset, offset + valueLen);
            const value = new TextDecoder().decode(valueBytes);
            offset += valueLen;

            const attrName = attrOidMap[oidHex] || oidHex;
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
    if (tag === 0x17) { // UTCTime
      const year = parseInt(timeStr.substr(0, 2));
      const fullYear = year >= 50 ? 1900 + year : 2000 + year;
      time = new Date(
        fullYear,
        parseInt(timeStr.substr(2, 2)) - 1,
        parseInt(timeStr.substr(4, 2)),
        parseInt(timeStr.substr(6, 2)),
        parseInt(timeStr.substr(8, 2)),
        parseInt(timeStr.substr(10, 2))
      );
    } else if (tag === 0x18) { // GeneralizedTime
      time = new Date(
        parseInt(timeStr.substr(0, 4)),
        parseInt(timeStr.substr(4, 2)) - 1,
        parseInt(timeStr.substr(6, 2)),
        parseInt(timeStr.substr(8, 2)),
        parseInt(timeStr.substr(10, 2)),
        parseInt(timeStr.substr(12, 2))
      );
    }

    return { time, nextOffset: offset + len };
  }

  parsePublicKeyInfo(bytes, offset) {
    offset++; // Skip SEQUENCE tag
    const seqLen = this.parseLength(bytes, offset);
    offset += seqLen.bytesRead;

    const algInfo = this.parseAlgorithmIdentifier(bytes, offset);

    // Estimate key size based on bit string length
    let keySize = 0;
    // Find BIT STRING
    const endOffset = offset + seqLen.length;
    while (offset < endOffset) {
      if (bytes[offset] === 0x03) { // BIT STRING
        offset++;
        const bitLen = this.parseLength(bytes, offset);
        keySize = (bitLen.length - 1) * 8;
        break;
      }
      offset++;
    }

    return { algorithm: algInfo.algorithm, keySize };
  }

  async calculateFingerprint(derData, algorithm) {
    const hashBuffer = await crypto.subtle.digest(algorithm, derData);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(':');
  }

  displayCertificateInfo(info, sha256Fingerprint, sha1Fingerprint) {
    document.getElementById('version').textContent = `V${info.version}`;
    document.getElementById('serialNumber').textContent = info.serialNumber || '-';

    // Subject
    const subjectHtml = Object.entries(info.subject)
      .map(([key, value]) => `<div class="setting-row"><label>${key}</label><span>${value}</span></div>`)
      .join('');
    document.getElementById('subjectInfo').innerHTML = subjectHtml || '<div class="setting-row"><span>-</span></div>';

    // Issuer
    const issuerHtml = Object.entries(info.issuer)
      .map(([key, value]) => `<div class="setting-row"><label>${key}</label><span>${value}</span></div>`)
      .join('');
    document.getElementById('issuerInfo').innerHTML = issuerHtml || '<div class="setting-row"><span>-</span></div>';

    // Validity
    document.getElementById('notBefore').textContent = info.notBefore ? info.notBefore.toLocaleString() : '-';
    document.getElementById('notAfter').textContent = info.notAfter ? info.notAfter.toLocaleString() : '-';

    const now = new Date();
    let validityStatus = '';
    if (info.notBefore && info.notAfter) {
      if (now < info.notBefore) {
        validityStatus = '<span style="color: #f59e0b;">尚未生效</span>';
      } else if (now > info.notAfter) {
        validityStatus = '<span style="color: #ef4444;">已過期</span>';
      } else {
        const daysRemaining = Math.ceil((info.notAfter - now) / (1000 * 60 * 60 * 24));
        validityStatus = `<span style="color: #22c55e;">有效 (剩餘 ${daysRemaining} 天)</span>`;
      }
    }
    document.getElementById('validityStatus').innerHTML = validityStatus || '-';

    // Public Key
    document.getElementById('publicKeyAlgorithm').textContent = info.publicKeyAlgorithm || '-';
    document.getElementById('keySize').textContent = info.keySize ? `${info.keySize} bits` : '-';

    // Signature
    document.getElementById('signatureAlgorithm').textContent = info.signatureAlgorithm || '-';

    // Fingerprints
    document.getElementById('sha256Fingerprint').textContent = sha256Fingerprint;
    document.getElementById('sha1Fingerprint').textContent = sha1Fingerprint;
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
      if (line.includes('-----END')) {
        break;
      }
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
    this.certificateFile.value = '';
    this.certificateInfo.style.display = 'none';
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
  window.x509Viewer = new X509Viewer();
});

export default X509Viewer;
