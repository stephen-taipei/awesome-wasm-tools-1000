/**
 * CRY-051: Self-Signed Certificate Generator
 *
 * Generates self-signed X.509 certificates.
 * All processing is done locally in the browser.
 */

class SelfSignedCertGenerator {
  constructor() {
    this.certPem = '';
    this.keyPem = '';
    this.init();
  }

  init() {
    this.keyType = document.getElementById('keyType');
    this.rsaKeySize = document.getElementById('rsaKeySize');
    this.ecCurve = document.getElementById('ecCurve');
    this.rsaKeyOptions = document.getElementById('rsaKeyOptions');
    this.ecKeyOptions = document.getElementById('ecKeyOptions');
    this.validityDays = document.getElementById('validityDays');
    this.commonName = document.getElementById('commonName');
    this.organization = document.getElementById('organization');
    this.country = document.getElementById('country');
    this.isCA = document.getElementById('isCA');
    this.serverAuth = document.getElementById('serverAuth');
    this.clientAuth = document.getElementById('clientAuth');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.certResult = document.getElementById('certResult');
    this.certOutput = document.getElementById('certOutput');
    this.keyOutput = document.getElementById('keyOutput');
    this.copyCertBtn = document.getElementById('copyCertBtn');
    this.downloadCertBtn = document.getElementById('downloadCertBtn');
    this.copyKeyBtn = document.getElementById('copyKeyBtn');
    this.downloadKeyBtn = document.getElementById('downloadKeyBtn');

    this.bindEvents();
  }

  bindEvents() {
    this.keyType.addEventListener('change', () => this.toggleKeyOptions());
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyCertBtn.addEventListener('click', () => this.copyToClipboard(this.certPem, '憑證'));
    this.downloadCertBtn.addEventListener('click', () => this.download(this.certPem, 'certificate.crt'));
    this.copyKeyBtn.addEventListener('click', () => this.copyToClipboard(this.keyPem, '私鑰'));
    this.downloadKeyBtn.addEventListener('click', () => this.download(this.keyPem, 'private.key'));
  }

  toggleKeyOptions() {
    if (this.keyType.value === 'RSA') {
      this.rsaKeyOptions.style.display = 'flex';
      this.ecKeyOptions.style.display = 'none';
    } else {
      this.rsaKeyOptions.style.display = 'none';
      this.ecKeyOptions.style.display = 'flex';
    }
  }

  async generate() {
    const cn = this.commonName.value.trim();
    if (!cn) {
      this.showStatus('error', '請輸入通用名稱（CN）');
      return;
    }

    try {
      this.showStatus('info', '正在生成憑證...');

      // Generate key pair
      let keyPair;
      if (this.keyType.value === 'RSA') {
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: parseInt(this.rsaKeySize.value),
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
          },
          true,
          ['sign', 'verify']
        );
      } else {
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'ECDSA',
            namedCurve: this.ecCurve.value
          },
          true,
          ['sign', 'verify']
        );
      }

      // Export keys
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const publicKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);

      this.keyPem = this.arrayBufferToPem(privateKeyData, 'PRIVATE KEY');

      // Build certificate
      const tbsCert = this.buildTBSCertificate(publicKeyData);

      // Sign certificate
      const algorithm = this.keyType.value === 'RSA'
        ? { name: 'RSASSA-PKCS1-v1_5' }
        : { name: 'ECDSA', hash: 'SHA-256' };

      const signature = await crypto.subtle.sign(algorithm, keyPair.privateKey, tbsCert);

      // Build final certificate
      const cert = this.buildCertificate(tbsCert, signature);
      this.certPem = this.arrayBufferToPem(cert, 'CERTIFICATE');

      this.certOutput.value = this.certPem;
      this.keyOutput.value = this.keyPem;
      this.certResult.style.display = 'block';

      this.showStatus('success', '自簽憑證生成完成！');
    } catch (error) {
      console.error('Certificate generation error:', error);
      this.showStatus('error', '憑證生成失敗：' + error.message);
    }
  }

  buildTBSCertificate(publicKeyData) {
    const version = new Uint8Array([0xA0, 0x03, 0x02, 0x01, 0x02]); // v3

    // Serial number (random)
    const serialBytes = crypto.getRandomValues(new Uint8Array(8));
    const serial = this.encodeInteger(serialBytes);

    // Signature algorithm
    const sigAlg = this.keyType.value === 'RSA'
      ? this.encodeSequence([
          new Uint8Array([0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x0B]),
          new Uint8Array([0x05, 0x00])
        ])
      : this.encodeSequence([
          new Uint8Array([0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x04, 0x03, 0x02])
        ]);

    // Issuer/Subject (same for self-signed)
    const subject = this.buildSubject();

    // Validity
    const validity = this.buildValidity();

    // Public key
    const publicKey = new Uint8Array(publicKeyData);

    return this.encodeSequence([
      version,
      serial,
      sigAlg,
      subject,
      validity,
      subject, // issuer = subject for self-signed
      publicKey
    ]);
  }

  buildSubject() {
    const rdns = [];

    if (this.country.value.trim()) {
      rdns.push(this.buildRDN([2, 5, 4, 6], this.country.value.trim().toUpperCase()));
    }
    if (this.organization.value.trim()) {
      rdns.push(this.buildRDN([2, 5, 4, 10], this.organization.value.trim()));
    }
    rdns.push(this.buildRDN([2, 5, 4, 3], this.commonName.value.trim()));

    return this.encodeSequence(rdns);
  }

  buildRDN(oid, value) {
    const oidBytes = this.encodeOID(oid);
    const valueBytes = this.encodeUTF8String(value);
    const atv = this.encodeSequence([oidBytes, valueBytes]);
    return this.encodeSet([atv]);
  }

  buildValidity() {
    const now = new Date();
    const end = new Date(now.getTime() + parseInt(this.validityDays.value) * 24 * 60 * 60 * 1000);

    const notBefore = this.encodeUTCTime(now);
    const notAfter = this.encodeUTCTime(end);

    return this.encodeSequence([notBefore, notAfter]);
  }

  buildCertificate(tbsCert, signature) {
    const sigAlg = this.keyType.value === 'RSA'
      ? this.encodeSequence([
          new Uint8Array([0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x0B]),
          new Uint8Array([0x05, 0x00])
        ])
      : this.encodeSequence([
          new Uint8Array([0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x04, 0x03, 0x02])
        ]);

    const sigBytes = new Uint8Array(signature);
    const sigBitString = new Uint8Array(sigBytes.length + 3);
    sigBitString[0] = 0x03;
    sigBitString[1] = sigBytes.length + 1;
    sigBitString[2] = 0x00;
    sigBitString.set(sigBytes, 3);

    return this.encodeSequence([tbsCert, sigAlg, sigBitString]);
  }

  encodeSequence(items) {
    const totalLen = items.reduce((sum, item) => sum + item.length, 0);
    const lenBytes = this.encodeLength(totalLen);
    const result = new Uint8Array(1 + lenBytes.length + totalLen);
    result[0] = 0x30;
    result.set(lenBytes, 1);
    let offset = 1 + lenBytes.length;
    for (const item of items) {
      result.set(item, offset);
      offset += item.length;
    }
    return result;
  }

  encodeSet(items) {
    const totalLen = items.reduce((sum, item) => sum + item.length, 0);
    const lenBytes = this.encodeLength(totalLen);
    const result = new Uint8Array(1 + lenBytes.length + totalLen);
    result[0] = 0x31;
    result.set(lenBytes, 1);
    let offset = 1 + lenBytes.length;
    for (const item of items) {
      result.set(item, offset);
      offset += item.length;
    }
    return result;
  }

  encodeInteger(bytes) {
    const result = new Uint8Array(bytes.length + 2);
    result[0] = 0x02;
    result[1] = bytes.length;
    result.set(bytes, 2);
    return result;
  }

  encodeOID(oid) {
    const bytes = [oid[0] * 40 + oid[1]];
    for (let i = 2; i < oid.length; i++) {
      let value = oid[i];
      if (value < 128) {
        bytes.push(value);
      } else {
        const temp = [];
        while (value > 0) {
          temp.unshift(value & 0x7F);
          value >>= 7;
        }
        for (let j = 0; j < temp.length - 1; j++) {
          bytes.push(temp[j] | 0x80);
        }
        bytes.push(temp[temp.length - 1]);
      }
    }
    const result = new Uint8Array(bytes.length + 2);
    result[0] = 0x06;
    result[1] = bytes.length;
    result.set(bytes, 2);
    return result;
  }

  encodeUTF8String(str) {
    const encoder = new TextEncoder();
    const strBytes = encoder.encode(str);
    const result = new Uint8Array(strBytes.length + 2);
    result[0] = 0x0C;
    result[1] = strBytes.length;
    result.set(strBytes, 2);
    return result;
  }

  encodeUTCTime(date) {
    const y = String(date.getUTCFullYear()).slice(-2);
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    const s = String(date.getUTCSeconds()).padStart(2, '0');
    const timeStr = `${y}${m}${d}${h}${min}${s}Z`;
    const encoder = new TextEncoder();
    const timeBytes = encoder.encode(timeStr);
    const result = new Uint8Array(timeBytes.length + 2);
    result[0] = 0x17;
    result[1] = timeBytes.length;
    result.set(timeBytes, 2);
    return result;
  }

  encodeLength(length) {
    if (length < 128) return new Uint8Array([length]);
    if (length < 256) return new Uint8Array([0x81, length]);
    return new Uint8Array([0x82, (length >> 8) & 0xFF, length & 0xFF]);
  }

  arrayBufferToPem(buffer, type) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`;
  }

  copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    this.showStatus('success', `${label}已複製到剪貼簿`);
  }

  download(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clear() {
    this.commonName.value = '';
    this.organization.value = '';
    this.country.value = '';
    this.certOutput.value = '';
    this.keyOutput.value = '';
    this.certPem = '';
    this.keyPem = '';
    this.certResult.style.display = 'none';
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
  window.selfSignedCertGenerator = new SelfSignedCertGenerator();
});

export default SelfSignedCertGenerator;
