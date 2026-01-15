/**
 * CRY-066: SSH Key Conversion Tool
 *
 * Converts between SSH key formats.
 * All processing is done locally in the browser.
 */

class SSHKeyConverter {
  constructor() {
    this.outputContent = '';
    this.init();
  }

  init() {
    this.conversionType = document.getElementById('conversionType');
    this.inputKey = document.getElementById('inputKey');
    this.keyFile = document.getElementById('keyFile');
    this.comment = document.getElementById('comment');
    this.commentGroup = document.getElementById('commentGroup');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.outputKey = document.getElementById('outputKey');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.conversionType.addEventListener('change', () => this.toggleOptions());
    this.keyFile.addEventListener('change', (e) => this.loadFile(e));
    this.convertBtn.addEventListener('click', () => this.convert());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.downloadBtn.addEventListener('click', () => this.download());
  }

  toggleOptions() {
    const type = this.conversionType.value;
    this.commentGroup.style.display = type === 'pem-to-ssh' ? 'block' : 'none';
  }

  async loadFile(e) {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      this.inputKey.value = text;
      this.showStatus('info', '檔案已載入');
    }
  }

  async convert() {
    const input = this.inputKey.value.trim();

    if (!input) {
      this.showStatus('error', '請輸入金鑰');
      return;
    }

    try {
      if (this.conversionType.value === 'pem-to-ssh') {
        await this.pemToSSH(input);
      } else {
        await this.sshToPEM(input);
      }
    } catch (error) {
      console.error('Conversion error:', error);
      this.showStatus('error', '轉換失敗：' + error.message);
    }
  }

  async pemToSSH(pem) {
    // Extract base64 from PEM
    const base64 = this.extractBase64FromPem(pem);
    const derData = this.base64ToArrayBuffer(base64);

    // Determine key type by trying to import
    let keyType = 'ssh-rsa';
    try {
      await crypto.subtle.importKey(
        'spki',
        derData,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
      );
      keyType = 'ecdsa-sha2-nistp256';
    } catch {
      try {
        await crypto.subtle.importKey(
          'spki',
          derData,
          { name: 'ECDSA', namedCurve: 'P-384' },
          true,
          ['verify']
        );
        keyType = 'ecdsa-sha2-nistp384';
      } catch {
        // Assume RSA
        keyType = 'ssh-rsa';
      }
    }

    const comment = this.comment.value.trim() || 'converted-key';
    this.outputContent = `${keyType} ${base64} ${comment}`;
    this.outputKey.value = this.outputContent;

    this.showStatus('success', '轉換完成');
  }

  async sshToPEM(ssh) {
    // Parse SSH public key format
    const parts = ssh.trim().split(/\s+/);
    if (parts.length < 2) {
      throw new Error('無效的 SSH 公鑰格式');
    }

    const [keyType, base64Data] = parts;
    const keyData = this.base64ToArrayBuffer(base64Data);

    // Format as PEM
    const lines = base64Data.match(/.{1,64}/g) || [];
    this.outputContent = `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
    this.outputKey.value = this.outputContent;

    this.showStatus('success', '轉換完成');
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

  copy() {
    if (this.outputContent) {
      navigator.clipboard.writeText(this.outputContent);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  download() {
    if (this.outputContent) {
      const isSSH = this.conversionType.value === 'pem-to-ssh';
      const filename = isSSH ? 'id_key.pub' : 'id_key.pem';

      const blob = new Blob([this.outputContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  clear() {
    this.inputKey.value = '';
    this.comment.value = '';
    this.outputKey.value = '';
    this.outputContent = '';
    this.keyFile.value = '';
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
  window.sshKeyConverter = new SSHKeyConverter();
});

export default SSHKeyConverter;
