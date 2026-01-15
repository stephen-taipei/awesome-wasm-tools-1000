/**
 * CRY-047: PGP Verification Tool
 *
 * Verifies PGP signatures using public key.
 * All processing is done locally in the browser.
 */

class PGPVerifier {
  constructor() {
    this.init();
  }

  init() {
    this.publicKey = document.getElementById('publicKey');
    this.publicKeyFile = document.getElementById('publicKeyFile');
    this.signedMessage = document.getElementById('signedMessage');
    this.signedMessageFile = document.getElementById('signedMessageFile');
    this.originalMessage = document.getElementById('originalMessage');
    this.originalMessageGroup = document.getElementById('originalMessageGroup');
    this.signatureType = document.getElementById('signatureType');
    this.verifyBtn = document.getElementById('verifyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.verificationResult = document.getElementById('verificationResult');
    this.resultIcon = document.getElementById('resultIcon');
    this.resultText = document.getElementById('resultText');
    this.signerInfo = document.getElementById('signerInfo');
    this.hashAlgorithmDisplay = document.getElementById('hashAlgorithm');

    this.bindEvents();
  }

  bindEvents() {
    this.publicKeyFile.addEventListener('change', (e) => this.loadFile(e, this.publicKey, '公鑰'));
    this.signedMessageFile.addEventListener('change', (e) => this.loadFile(e, this.signedMessage, '簽章訊息'));
    this.signatureType.addEventListener('change', () => this.toggleOriginalMessage());
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

  toggleOriginalMessage() {
    if (this.signatureType.value === 'detached') {
      this.originalMessageGroup.style.display = 'block';
    } else {
      this.originalMessageGroup.style.display = 'none';
    }
  }

  async verify() {
    const publicKeyPem = this.publicKey.value.trim();
    const signedMessageText = this.signedMessage.value.trim();
    const signatureType = this.signatureType.value;

    if (!publicKeyPem) {
      this.showStatus('error', '請輸入公鑰');
      return;
    }

    if (!signedMessageText) {
      this.showStatus('error', '請輸入簽章訊息');
      return;
    }

    try {
      // Extract public key
      const publicKeyBase64 = this.extractBase64FromPem(publicKeyPem);
      const publicKeyData = this.base64ToArrayBuffer(publicKeyBase64);

      // Parse signed message
      let message, signature, hashAlgorithm;

      if (signatureType === 'cleartext') {
        const parsed = this.parseClearsign(signedMessageText);
        message = parsed.message;
        signature = parsed.signature;
        hashAlgorithm = parsed.hash || 'SHA-256';
      } else {
        message = this.originalMessage.value;
        signature = this.extractBase64FromPem(signedMessageText);
        hashAlgorithm = 'SHA-256';
      }

      if (!message) {
        this.showStatus('error', '無法解析訊息');
        return;
      }

      // Import public key
      const publicKeyObj = await crypto.subtle.importKey(
        'spki',
        publicKeyData,
        {
          name: 'RSA-PSS',
          hash: hashAlgorithm
        },
        false,
        ['verify']
      );

      // Verify signature
      const encoder = new TextEncoder();
      const messageData = encoder.encode(message);
      const signatureData = this.base64ToArrayBuffer(signature);

      const isValid = await crypto.subtle.verify(
        {
          name: 'RSA-PSS',
          saltLength: 32
        },
        publicKeyObj,
        signatureData,
        messageData
      );

      // Display result
      this.verificationResult.style.display = 'block';

      if (isValid) {
        this.resultIcon.textContent = '✅';
        this.resultIcon.style.color = '#22c55e';
        this.resultText.textContent = '簽章驗證成功！';
        this.resultText.style.color = '#22c55e';
      } else {
        this.resultIcon.textContent = '❌';
        this.resultIcon.style.color = '#ef4444';
        this.resultText.textContent = '簽章驗證失敗！';
        this.resultText.style.color = '#ef4444';
      }

      this.hashAlgorithmDisplay.textContent = hashAlgorithm;
      this.signerInfo.textContent = this.extractSignerInfo(publicKeyPem);

      this.showStatus(isValid ? 'success' : 'error', isValid ? '驗證成功' : '驗證失敗');
    } catch (error) {
      console.error('Verification error:', error);
      this.showStatus('error', '驗證失敗：' + error.message);
    }
  }

  parseClearsign(text) {
    const result = { message: '', signature: '', hash: '' };
    const lines = text.split('\n');
    let section = 'none';
    let messageLines = [];
    let signatureLines = [];

    for (const line of lines) {
      if (line.includes('-----BEGIN PGP SIGNED MESSAGE-----')) {
        section = 'header';
        continue;
      }
      if (line.startsWith('Hash:')) {
        result.hash = line.replace('Hash:', '').trim();
        if (result.hash.includes('256')) result.hash = 'SHA-256';
        else if (result.hash.includes('384')) result.hash = 'SHA-384';
        else if (result.hash.includes('512')) result.hash = 'SHA-512';
        continue;
      }
      if (line.includes('-----BEGIN PGP SIGNATURE-----')) {
        section = 'signature';
        continue;
      }
      if (line.includes('-----END PGP SIGNATURE-----')) {
        break;
      }
      if (section === 'header' && line.trim() === '') {
        section = 'message';
        continue;
      }
      if (section === 'message') {
        messageLines.push(line);
      }
      if (section === 'signature' && !line.startsWith('Version:') && line.trim()) {
        signatureLines.push(line.trim());
      }
    }

    result.message = messageLines.join('\n');
    result.signature = signatureLines.join('');

    return result;
  }

  extractSignerInfo(pem) {
    const lines = pem.split('\n');
    for (const line of lines) {
      if (line.startsWith('Comment: User-ID:')) {
        return line.replace('Comment: User-ID:', '').trim();
      }
    }
    return '未知';
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
      if (inBlock && !line.startsWith('Comment:') && !line.startsWith('Version:') && line.trim()) {
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
    this.publicKey.value = '';
    this.signedMessage.value = '';
    this.originalMessage.value = '';
    this.publicKeyFile.value = '';
    this.signedMessageFile.value = '';
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
  window.pgpVerifier = new PGPVerifier();
});

export default PGPVerifier;
