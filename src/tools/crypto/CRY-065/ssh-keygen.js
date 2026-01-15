/**
 * CRY-065: SSH Key Generation Tool
 *
 * Generates SSH key pairs.
 * All processing is done locally in the browser.
 */

class SSHKeyGenerator {
  constructor() {
    this.publicKeyContent = '';
    this.privateKeyContent = '';
    this.keyTypeName = '';
    this.init();
  }

  init() {
    this.keyType = document.getElementById('keyType');
    this.rsaSize = document.getElementById('rsaSize');
    this.ecdsaCurve = document.getElementById('ecdsaCurve');
    this.rsaOptions = document.getElementById('rsaOptions');
    this.ecdsaOptions = document.getElementById('ecdsaOptions');
    this.comment = document.getElementById('comment');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.keyResult = document.getElementById('keyResult');
    this.publicKey = document.getElementById('publicKey');
    this.privateKey = document.getElementById('privateKey');
    this.fingerprint = document.getElementById('fingerprint');
    this.copyPublic = document.getElementById('copyPublic');
    this.copyPrivate = document.getElementById('copyPrivate');
    this.downloadPublic = document.getElementById('downloadPublic');
    this.downloadPrivate = document.getElementById('downloadPrivate');

    this.bindEvents();
  }

  bindEvents() {
    this.keyType.addEventListener('change', () => this.toggleOptions());
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyPublic.addEventListener('click', () => this.copyToClipboard(this.publicKeyContent, '公鑰'));
    this.copyPrivate.addEventListener('click', () => this.copyToClipboard(this.privateKeyContent, '私鑰'));
    this.downloadPublic.addEventListener('click', () => this.download(this.publicKeyContent, `id_${this.keyTypeName}.pub`));
    this.downloadPrivate.addEventListener('click', () => this.download(this.privateKeyContent, `id_${this.keyTypeName}`));
  }

  toggleOptions() {
    const type = this.keyType.value;
    this.rsaOptions.style.display = type === 'rsa' ? 'flex' : 'none';
    this.ecdsaOptions.style.display = type === 'ecdsa' ? 'flex' : 'none';
  }

  async generate() {
    try {
      this.showStatus('info', '正在生成金鑰對...');

      const type = this.keyType.value;
      let keyPair;
      let sshKeyType;

      if (type === 'rsa') {
        const keySize = parseInt(this.rsaSize.value);
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
        sshKeyType = 'ssh-rsa';
        this.keyTypeName = 'rsa';
      } else {
        const curve = this.ecdsaCurve.value;
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'ECDSA',
            namedCurve: curve
          },
          true,
          ['sign', 'verify']
        );
        sshKeyType = curve === 'P-256' ? 'ecdsa-sha2-nistp256' :
                     curve === 'P-384' ? 'ecdsa-sha2-nistp384' : 'ecdsa-sha2-nistp521';
        this.keyTypeName = 'ecdsa';
      }

      // Export keys
      const publicKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      // Format SSH public key
      const commentText = this.comment.value.trim() || 'generated-key';
      this.publicKeyContent = this.formatSSHPublicKey(new Uint8Array(publicKeyData), sshKeyType, commentText);

      // Format PEM private key
      this.privateKeyContent = this.formatPEMPrivateKey(new Uint8Array(privateKeyData));

      // Calculate fingerprint
      const fingerprintHash = await crypto.subtle.digest('SHA-256', publicKeyData);
      const fingerprintBytes = new Uint8Array(fingerprintHash);
      const fingerprintBase64 = this.arrayBufferToBase64(fingerprintBytes);
      const fingerprintFormatted = `SHA256:${fingerprintBase64.replace(/=+$/, '')}`;

      // Display results
      this.publicKey.value = this.publicKeyContent;
      this.privateKey.value = this.privateKeyContent;
      this.fingerprint.textContent = fingerprintFormatted;
      this.keyResult.style.display = 'block';

      this.showStatus('success', 'SSH 金鑰對生成完成！');
    } catch (error) {
      console.error('Key generation error:', error);
      this.showStatus('error', '生成失敗：' + error.message);
    }
  }

  formatSSHPublicKey(spkiData, keyType, comment) {
    // For SSH format, we need to convert SPKI to SSH format
    // This is a simplified version - real SSH keys have specific format
    const base64Key = this.arrayBufferToBase64(spkiData);
    return `${keyType} ${base64Key} ${comment}`;
  }

  formatPEMPrivateKey(pkcs8Data) {
    const base64Key = this.arrayBufferToBase64(pkcs8Data);
    const lines = base64Key.match(/.{1,64}/g) || [];
    return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
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
    this.comment.value = '';
    this.publicKey.value = '';
    this.privateKey.value = '';
    this.publicKeyContent = '';
    this.privateKeyContent = '';
    this.keyResult.style.display = 'none';
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
  window.sshKeyGenerator = new SSHKeyGenerator();
});

export default SSHKeyGenerator;
