/**
 * CRY-050: CSR Generator Tool
 *
 * Generates Certificate Signing Requests.
 * All processing is done locally in the browser.
 */

class CSRGenerator {
  constructor() {
    this.privateKeyPem = '';
    this.csrPem = '';
    this.init();
  }

  init() {
    this.keyType = document.getElementById('keyType');
    this.rsaKeySize = document.getElementById('rsaKeySize');
    this.ecCurve = document.getElementById('ecCurve');
    this.rsaKeyOptions = document.getElementById('rsaKeyOptions');
    this.ecKeyOptions = document.getElementById('ecKeyOptions');
    this.commonName = document.getElementById('commonName');
    this.organization = document.getElementById('organization');
    this.organizationalUnit = document.getElementById('organizationalUnit');
    this.locality = document.getElementById('locality');
    this.state = document.getElementById('state');
    this.country = document.getElementById('country');
    this.email = document.getElementById('email');
    this.sanDns = document.getElementById('sanDns');
    this.sanIp = document.getElementById('sanIp');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressBar = document.getElementById('progressBar');
    this.progressText = document.getElementById('progressText');
    this.csrResult = document.getElementById('csrResult');
    this.csrOutput = document.getElementById('csrOutput');
    this.privateKeyOutput = document.getElementById('privateKeyOutput');
    this.copyCsrBtn = document.getElementById('copyCsrBtn');
    this.downloadCsrBtn = document.getElementById('downloadCsrBtn');
    this.copyKeyBtn = document.getElementById('copyKeyBtn');
    this.downloadKeyBtn = document.getElementById('downloadKeyBtn');

    this.bindEvents();
  }

  bindEvents() {
    this.keyType.addEventListener('change', () => this.toggleKeyOptions());
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyCsrBtn.addEventListener('click', () => this.copyToClipboard(this.csrPem, 'CSR'));
    this.downloadCsrBtn.addEventListener('click', () => this.download(this.csrPem, 'certificate.csr'));
    this.copyKeyBtn.addEventListener('click', () => this.copyToClipboard(this.privateKeyPem, '私鑰'));
    this.downloadKeyBtn.addEventListener('click', () => this.download(this.privateKeyPem, 'private.key'));
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

    this.progressContainer.style.display = 'block';
    this.progressBar.style.width = '20%';
    this.progressText.textContent = '正在生成金鑰對...';

    try {
      // Generate key pair
      let keyPair;
      if (this.keyType.value === 'RSA') {
        const keySize = parseInt(this.rsaKeySize.value);
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: keySize,
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

      this.progressBar.style.width = '50%';
      this.progressText.textContent = '正在生成 CSR...';

      // Export private key
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      this.privateKeyPem = this.arrayBufferToPem(privateKeyData, 'PRIVATE KEY');

      // Export public key
      const publicKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);

      // Build subject DN
      const subject = this.buildSubjectDN();

      // Build CSR
      const csrData = this.buildCSR(subject, publicKeyData, keyPair.privateKey);

      this.progressBar.style.width = '80%';
      this.progressText.textContent = '正在簽署 CSR...';

      // Sign the CSR
      const signedCsr = await this.signCSR(csrData, keyPair.privateKey);
      this.csrPem = this.arrayBufferToPem(signedCsr, 'CERTIFICATE REQUEST');

      this.progressBar.style.width = '100%';
      this.progressText.textContent = '完成！';

      this.csrOutput.value = this.csrPem;
      this.privateKeyOutput.value = this.privateKeyPem;
      this.csrResult.style.display = 'block';

      this.showStatus('success', 'CSR 生成完成！');
    } catch (error) {
      console.error('CSR generation error:', error);
      this.showStatus('error', 'CSR 生成失敗：' + error.message);
    }
  }

  buildSubjectDN() {
    const rdns = [];

    const addRdn = (oid, value) => {
      if (value) {
        rdns.push({ oid, value });
      }
    };

    addRdn([2, 5, 4, 6], this.country.value.trim().toUpperCase()); // C
    addRdn([2, 5, 4, 8], this.state.value.trim()); // ST
    addRdn([2, 5, 4, 7], this.locality.value.trim()); // L
    addRdn([2, 5, 4, 10], this.organization.value.trim()); // O
    addRdn([2, 5, 4, 11], this.organizationalUnit.value.trim()); // OU
    addRdn([2, 5, 4, 3], this.commonName.value.trim()); // CN

    if (this.email.value.trim()) {
      addRdn([1, 2, 840, 113549, 1, 9, 1], this.email.value.trim());
    }

    return rdns;
  }

  buildCSR(subject, publicKeyData, privateKey) {
    // Build a simplified CSR structure
    const encoder = new TextEncoder();

    // Certification Request Info
    const version = new Uint8Array([0x02, 0x01, 0x00]); // INTEGER 0

    // Subject encoding
    const subjectBytes = this.encodeSubject(subject);

    // Public key info is already in SPKI format
    const publicKeyBytes = new Uint8Array(publicKeyData);

    // Attributes (empty for now)
    const attributes = new Uint8Array([0xA0, 0x00]);

    // Combine into CertificationRequestInfo
    const certReqInfo = this.encodeSequence([
      version,
      subjectBytes,
      publicKeyBytes,
      attributes
    ]);

    return certReqInfo;
  }

  async signCSR(certReqInfo, privateKey) {
    // Sign the certification request info
    const algorithm = this.keyType.value === 'RSA'
      ? { name: 'RSASSA-PKCS1-v1_5' }
      : { name: 'ECDSA', hash: 'SHA-256' };

    const signature = await crypto.subtle.sign(
      algorithm,
      privateKey,
      certReqInfo
    );

    // Algorithm identifier for signature
    const sigAlgId = this.keyType.value === 'RSA'
      ? this.encodeSequence([
          new Uint8Array([0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x0B]), // sha256WithRSAEncryption
          new Uint8Array([0x05, 0x00]) // NULL
        ])
      : this.encodeSequence([
          new Uint8Array([0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x04, 0x03, 0x02]) // ecdsa-with-SHA256
        ]);

    // Encode signature as BIT STRING
    const signatureBytes = new Uint8Array(signature);
    const signatureBitString = new Uint8Array(signatureBytes.length + 3);
    signatureBitString[0] = 0x03; // BIT STRING tag
    signatureBitString[1] = signatureBytes.length + 1;
    signatureBitString[2] = 0x00; // unused bits
    signatureBitString.set(signatureBytes, 3);

    // Build final CSR
    return this.encodeSequence([
      certReqInfo,
      sigAlgId,
      signatureBitString
    ]);
  }

  encodeSubject(rdns) {
    const rdnSets = rdns.map(rdn => {
      const oidBytes = this.encodeOID(rdn.oid);
      const valueBytes = this.encodeString(rdn.value);
      const attrTypeAndValue = this.encodeSequence([oidBytes, valueBytes]);
      // Wrap in SET
      return this.encodeSet([attrTypeAndValue]);
    });

    return this.encodeSequence(rdnSets);
  }

  encodeOID(oid) {
    const bytes = [];
    bytes.push(oid[0] * 40 + oid[1]);

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
    result[0] = 0x06; // OID tag
    result[1] = bytes.length;
    result.set(bytes, 2);
    return result;
  }

  encodeString(str) {
    const encoder = new TextEncoder();
    const strBytes = encoder.encode(str);
    const result = new Uint8Array(strBytes.length + 2);
    result[0] = 0x0C; // UTF8String tag
    result[1] = strBytes.length;
    result.set(strBytes, 2);
    return result;
  }

  encodeSequence(items) {
    const totalLength = items.reduce((sum, item) => sum + item.length, 0);
    const lengthBytes = this.encodeLength(totalLength);
    const result = new Uint8Array(1 + lengthBytes.length + totalLength);
    result[0] = 0x30; // SEQUENCE tag
    result.set(lengthBytes, 1);

    let offset = 1 + lengthBytes.length;
    for (const item of items) {
      result.set(item, offset);
      offset += item.length;
    }

    return result;
  }

  encodeSet(items) {
    const totalLength = items.reduce((sum, item) => sum + item.length, 0);
    const lengthBytes = this.encodeLength(totalLength);
    const result = new Uint8Array(1 + lengthBytes.length + totalLength);
    result[0] = 0x31; // SET tag
    result.set(lengthBytes, 1);

    let offset = 1 + lengthBytes.length;
    for (const item of items) {
      result.set(item, offset);
      offset += item.length;
    }

    return result;
  }

  encodeLength(length) {
    if (length < 128) {
      return new Uint8Array([length]);
    } else if (length < 256) {
      return new Uint8Array([0x81, length]);
    } else {
      return new Uint8Array([0x82, (length >> 8) & 0xFF, length & 0xFF]);
    }
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
    this.organizationalUnit.value = '';
    this.locality.value = '';
    this.state.value = '';
    this.country.value = '';
    this.email.value = '';
    this.sanDns.value = '';
    this.sanIp.value = '';
    this.csrOutput.value = '';
    this.privateKeyOutput.value = '';
    this.csrPem = '';
    this.privateKeyPem = '';
    this.csrResult.style.display = 'none';
    this.progressContainer.style.display = 'none';
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
  window.csrGenerator = new CSRGenerator();
});

export default CSRGenerator;
