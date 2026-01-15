/**
 * CRY-038: UUID Generator
 * Generates UUIDs of various versions using CSPRNG.
 */

class UUIDGenerator {
  constructor() { this.init(); }

  init() {
    this.uuidVersion = document.getElementById('uuidVersion');
    this.outputFormat = document.getElementById('outputFormat');
    this.batchCount = document.getElementById('batchCount');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.uuidResult = document.getElementById('uuidResult');
    this.uuidInfo = document.getElementById('uuidInfo');
    this.generatedCount = document.getElementById('generatedCount');
    this.uuidVersionInfo = document.getElementById('uuidVersionInfo');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
    this.generate();
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
  }

  generateUUIDv4() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant
    return this.bytesToUUID(bytes);
  }

  generateUUIDv1() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Timestamp (100-nanosecond intervals since Oct 15, 1582)
    const now = Date.now();
    const gregorianOffset = 122192928000000000n; // Offset from Gregorian calendar epoch
    const timestamp = BigInt(now) * 10000n + gregorianOffset;

    // time_low (32 bits)
    bytes[0] = Number((timestamp >> 24n) & 0xffn);
    bytes[1] = Number((timestamp >> 16n) & 0xffn);
    bytes[2] = Number((timestamp >> 8n) & 0xffn);
    bytes[3] = Number(timestamp & 0xffn);

    // time_mid (16 bits)
    bytes[4] = Number((timestamp >> 40n) & 0xffn);
    bytes[5] = Number((timestamp >> 32n) & 0xffn);

    // time_hi_and_version (16 bits) with version 1
    bytes[6] = (Number((timestamp >> 56n) & 0x0fn)) | 0x10;
    bytes[7] = Number((timestamp >> 48n) & 0xffn);

    // clock_seq_hi_and_reserved with variant
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return this.bytesToUUID(bytes);
  }

  generateUUIDv7() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Unix timestamp in milliseconds (48 bits)
    const timestamp = Date.now();
    bytes[0] = (timestamp / 0x10000000000) & 0xff;
    bytes[1] = (timestamp / 0x100000000) & 0xff;
    bytes[2] = (timestamp / 0x1000000) & 0xff;
    bytes[3] = (timestamp / 0x10000) & 0xff;
    bytes[4] = (timestamp / 0x100) & 0xff;
    bytes[5] = timestamp & 0xff;

    // Version 7
    bytes[6] = (bytes[6] & 0x0f) | 0x70;

    // Variant
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return this.bytesToUUID(bytes);
  }

  bytesToUUID(bytes) {
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  formatUUID(uuid) {
    const format = this.outputFormat.value;
    switch (format) {
      case 'uppercase': return uuid.toUpperCase();
      case 'braces': return `{${uuid}}`;
      case 'urn': return `urn:uuid:${uuid}`;
      case 'raw': return uuid.replace(/-/g, '');
      default: return uuid;
    }
  }

  generate() {
    const version = this.uuidVersion.value;
    const count = parseInt(this.batchCount.value);
    const uuids = [];

    for (let i = 0; i < count; i++) {
      let uuid;
      switch (version) {
        case '1': uuid = this.generateUUIDv1(); break;
        case '7': uuid = this.generateUUIDv7(); break;
        default: uuid = this.generateUUIDv4();
      }
      uuids.push(this.formatUUID(uuid));
    }

    this.uuidResult.value = uuids.join('\n');
    this.generatedCount.textContent = `${count} 個`;
    this.uuidVersionInfo.textContent = `UUID v${version}`;
    this.uuidInfo.style.display = 'block';
    this.showStatus('success', `已生成 ${count} 個 UUID`);
  }

  clear() {
    this.uuidResult.value = '';
    this.uuidInfo.style.display = 'none';
    this.statusMessage.classList.remove('active');
  }

  copyResult() {
    if (this.uuidResult.value) {
      navigator.clipboard.writeText(this.uuidResult.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => { window.uuidGenerator = new UUIDGenerator(); });
export default UUIDGenerator;
