/**
 * IMG-045 複製 EXIF 資訊
 * 將一張圖片的 EXIF 複製到另一張圖片
 */

class ExifCopyTool {
  constructor() {
    this.sourceFile = null;
    this.sourceDataUrl = null;
    this.sourceExif = null;
    this.targetFile = null;
    this.targetDataUrl = null;
    this.resultBlob = null;

    this.init();
  }

  init() {
    this.sourceUpload = document.getElementById('sourceUpload');
    this.sourceInput = document.getElementById('sourceInput');
    this.sourcePreview = document.getElementById('sourcePreview');
    this.sourceImage = document.getElementById('sourceImage');
    this.sourceInfo = document.getElementById('sourceInfo');

    this.targetUpload = document.getElementById('targetUpload');
    this.targetInput = document.getElementById('targetInput');
    this.targetPreview = document.getElementById('targetPreview');
    this.targetImage = document.getElementById('targetImage');
    this.targetInfo = document.getElementById('targetInfo');

    this.exifPreview = document.getElementById('exifPreview');
    this.exifGrid = document.getElementById('exifGrid');
    this.copyOptions = document.getElementById('copyOptions');

    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.resultSection = document.getElementById('resultSection');
    this.resultImage = document.getElementById('resultImage');
    this.resultInfo = document.getElementById('resultInfo');

    this.bindEvents();
  }

  bindEvents() {
    // Source upload
    this.sourceUpload.addEventListener('click', () => this.sourceInput.click());
    this.sourceUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.sourceUpload.classList.add('drag-over');
    });
    this.sourceUpload.addEventListener('dragleave', () => {
      this.sourceUpload.classList.remove('drag-over');
    });
    this.sourceUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      this.sourceUpload.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadSource(file);
    });
    this.sourceInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadSource(file);
    });

    // Target upload
    this.targetUpload.addEventListener('click', () => this.targetInput.click());
    this.targetUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.targetUpload.classList.add('drag-over');
    });
    this.targetUpload.addEventListener('dragleave', () => {
      this.targetUpload.classList.remove('drag-over');
    });
    this.targetUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      this.targetUpload.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadTarget(file);
    });
    this.targetInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadTarget(file);
    });

    // Action buttons
    this.copyBtn.addEventListener('click', () => this.copyExif());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadSource(file) {
    if (file.type !== 'image/jpeg') {
      this.showStatus('error', '來源圖片必須是 JPG 格式');
      return;
    }

    this.sourceFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.sourceDataUrl = e.target.result;
      this.sourceImage.src = this.sourceDataUrl;
      this.sourcePreview.style.display = 'block';
      this.sourceUpload.classList.add('loaded');

      // Load EXIF
      try {
        this.sourceExif = piexif.load(this.sourceDataUrl);
        this.displayExifPreview();
        this.sourceInfo.textContent = `${file.name} | ${this.formatSize(file.size)}`;
        this.showStatus('success', '來源圖片載入成功，已讀取 EXIF 資訊');
      } catch (error) {
        console.error('EXIF load error:', error);
        this.sourceExif = null;
        this.showStatus('error', '無法讀取來源圖片的 EXIF 資訊');
      }

      this.updateCopyButton();
    };
    reader.readAsDataURL(file);
  }

  loadTarget(file) {
    if (file.type !== 'image/jpeg') {
      this.showStatus('error', '目標圖片必須是 JPG 格式');
      return;
    }

    this.targetFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.targetDataUrl = e.target.result;
      this.targetImage.src = this.targetDataUrl;
      this.targetPreview.style.display = 'block';
      this.targetUpload.classList.add('loaded');
      this.targetInfo.textContent = `${file.name} | ${this.formatSize(file.size)}`;

      this.updateCopyButton();
    };
    reader.readAsDataURL(file);
  }

  displayExifPreview() {
    if (!this.sourceExif) return;

    const zeroth = this.sourceExif['0th'] || {};
    const exif = this.sourceExif['Exif'] || {};
    const gps = this.sourceExif['GPS'] || {};

    const items = [];

    // Camera info
    if (zeroth[piexif.ImageIFD.Make]) {
      items.push({ label: '相機廠牌', value: zeroth[piexif.ImageIFD.Make] });
    }
    if (zeroth[piexif.ImageIFD.Model]) {
      items.push({ label: '相機型號', value: zeroth[piexif.ImageIFD.Model] });
    }

    // Date/time
    if (exif[piexif.ExifIFD.DateTimeOriginal]) {
      items.push({ label: '拍攝日期', value: exif[piexif.ExifIFD.DateTimeOriginal] });
    }

    // Exposure
    if (exif[piexif.ExifIFD.ExposureTime]) {
      const exp = exif[piexif.ExifIFD.ExposureTime];
      items.push({ label: '快門速度', value: `${exp[0]}/${exp[1]}s` });
    }
    if (exif[piexif.ExifIFD.FNumber]) {
      const fn = exif[piexif.ExifIFD.FNumber];
      items.push({ label: '光圈', value: `f/${(fn[0] / fn[1]).toFixed(1)}` });
    }
    if (exif[piexif.ExifIFD.ISOSpeedRatings]) {
      items.push({ label: 'ISO', value: exif[piexif.ExifIFD.ISOSpeedRatings] });
    }

    // Lens
    if (exif[piexif.ExifIFD.LensModel]) {
      items.push({ label: '鏡頭', value: exif[piexif.ExifIFD.LensModel] });
    }
    if (exif[piexif.ExifIFD.FocalLength]) {
      const fl = exif[piexif.ExifIFD.FocalLength];
      items.push({ label: '焦距', value: `${fl[0] / fl[1]}mm` });
    }

    // GPS
    if (gps[piexif.GPSIFD.GPSLatitude]) {
      const lat = this.convertToDecimal(gps[piexif.GPSIFD.GPSLatitude]);
      const latRef = gps[piexif.GPSIFD.GPSLatitudeRef] || 'N';
      const lng = this.convertToDecimal(gps[piexif.GPSIFD.GPSLongitude]);
      const lngRef = gps[piexif.GPSIFD.GPSLongitudeRef] || 'E';
      items.push({ label: 'GPS', value: `${lat.toFixed(6)}°${latRef}, ${lng.toFixed(6)}°${lngRef}` });
    }

    // Description
    if (zeroth[piexif.ImageIFD.Artist]) {
      items.push({ label: '攝影師', value: zeroth[piexif.ImageIFD.Artist] });
    }
    if (zeroth[piexif.ImageIFD.Copyright]) {
      items.push({ label: '版權', value: zeroth[piexif.ImageIFD.Copyright] });
    }

    if (items.length === 0) {
      this.exifGrid.innerHTML = '<div class="exif-item"><div class="exif-value">無 EXIF 資訊</div></div>';
    } else {
      this.exifGrid.innerHTML = items.map(item => `
        <div class="exif-item">
          <div class="exif-label">${item.label}</div>
          <div class="exif-value">${item.value}</div>
        </div>
      `).join('');
    }

    this.exifPreview.style.display = 'block';
    this.copyOptions.style.display = 'block';
  }

  convertToDecimal(dms) {
    if (!dms || dms.length < 3) return 0;
    const d = dms[0][0] / dms[0][1];
    const m = dms[1][0] / dms[1][1];
    const s = dms[2][0] / dms[2][1];
    return d + m / 60 + s / 3600;
  }

  updateCopyButton() {
    const canCopy = this.sourceFile && this.sourceExif && this.targetFile;
    this.copyBtn.disabled = !canCopy;
  }

  async copyExif() {
    if (!this.sourceExif || !this.targetDataUrl) return;

    this.progressContainer.style.display = 'block';
    this.copyBtn.disabled = true;
    this.updateProgress(10, '準備複製 EXIF...');

    try {
      // Load target's existing EXIF (if any) to preserve dimensions
      let targetExif;
      try {
        targetExif = piexif.load(this.targetDataUrl);
      } catch (e) {
        targetExif = {
          '0th': {},
          'Exif': {},
          'GPS': {},
          '1st': {},
          'thumbnail': null
        };
      }

      this.updateProgress(30, '複製選定的 EXIF 資訊...');

      const copyCamera = document.getElementById('copyCamera').checked;
      const copyDateTime = document.getElementById('copyDateTime').checked;
      const copyGps = document.getElementById('copyGps').checked;
      const copyExposure = document.getElementById('copyExposure').checked;
      const copyLens = document.getElementById('copyLens').checked;
      const copyDescription = document.getElementById('copyDescription').checked;

      const srcZeroth = this.sourceExif['0th'] || {};
      const srcExif = this.sourceExif['Exif'] || {};
      const srcGps = this.sourceExif['GPS'] || {};

      if (!targetExif['0th']) targetExif['0th'] = {};
      if (!targetExif['Exif']) targetExif['Exif'] = {};
      if (!targetExif['GPS']) targetExif['GPS'] = {};

      // Copy camera info
      if (copyCamera) {
        this.copyTag(srcZeroth, targetExif['0th'], piexif.ImageIFD.Make);
        this.copyTag(srcZeroth, targetExif['0th'], piexif.ImageIFD.Model);
        this.copyTag(srcZeroth, targetExif['0th'], piexif.ImageIFD.Software);
      }

      // Copy date/time
      if (copyDateTime) {
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.DateTimeOriginal);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.DateTimeDigitized);
        this.copyTag(srcZeroth, targetExif['0th'], piexif.ImageIFD.DateTime);
      }

      this.updateProgress(50, '複製曝光與鏡頭資訊...');

      // Copy exposure
      if (copyExposure) {
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.ExposureTime);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.FNumber);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.ISOSpeedRatings);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.ExposureProgram);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.ExposureBiasValue);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.MeteringMode);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.Flash);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.WhiteBalance);
      }

      // Copy lens
      if (copyLens) {
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.FocalLength);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.FocalLengthIn35mmFilm);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.LensModel);
        this.copyTag(srcExif, targetExif['Exif'], piexif.ExifIFD.LensMake);
      }

      this.updateProgress(70, '複製 GPS 資訊...');

      // Copy GPS
      if (copyGps) {
        this.copyTag(srcGps, targetExif['GPS'], piexif.GPSIFD.GPSLatitude);
        this.copyTag(srcGps, targetExif['GPS'], piexif.GPSIFD.GPSLatitudeRef);
        this.copyTag(srcGps, targetExif['GPS'], piexif.GPSIFD.GPSLongitude);
        this.copyTag(srcGps, targetExif['GPS'], piexif.GPSIFD.GPSLongitudeRef);
        this.copyTag(srcGps, targetExif['GPS'], piexif.GPSIFD.GPSAltitude);
        this.copyTag(srcGps, targetExif['GPS'], piexif.GPSIFD.GPSAltitudeRef);
      }

      // Copy description
      if (copyDescription) {
        this.copyTag(srcZeroth, targetExif['0th'], piexif.ImageIFD.ImageDescription);
        this.copyTag(srcZeroth, targetExif['0th'], piexif.ImageIFD.Artist);
        this.copyTag(srcZeroth, targetExif['0th'], piexif.ImageIFD.Copyright);
      }

      this.updateProgress(85, '寫入 EXIF 到目標圖片...');

      // Generate new EXIF bytes
      const exifBytes = piexif.dump(targetExif);

      // Insert into target image
      const newDataUrl = piexif.insert(exifBytes, this.targetDataUrl);

      this.updateProgress(95, '生成結果圖片...');

      // Convert to blob
      const byteString = atob(newDataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      this.resultBlob = new Blob([ab], { type: 'image/jpeg' });

      this.updateProgress(100, '完成！');

      // Show result
      this.resultImage.src = newDataUrl;
      this.resultInfo.textContent = `${this.formatSize(this.resultBlob.size)} | EXIF 已複製`;
      this.resultSection.style.display = 'block';

      this.progressContainer.style.display = 'none';
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';

      this.showStatus('success', 'EXIF 資訊已成功複製到目標圖片！');

    } catch (error) {
      console.error('Copy EXIF error:', error);
      this.showStatus('error', `複製失敗：${error.message}`);
      this.progressContainer.style.display = 'none';
    }

    this.copyBtn.disabled = false;
  }

  copyTag(src, dest, tag) {
    if (src[tag] !== undefined) {
      dest[tag] = src[tag];
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  download() {
    if (!this.resultBlob) return;

    const originalName = this.targetFile.name.replace(/\.[^/.]+$/, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.resultBlob);
    link.download = `${originalName}_with_exif.jpg`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.sourceFile = null;
    this.sourceDataUrl = null;
    this.sourceExif = null;
    this.targetFile = null;
    this.targetDataUrl = null;
    this.resultBlob = null;

    this.sourceInput.value = '';
    this.targetInput.value = '';

    this.sourcePreview.style.display = 'none';
    this.targetPreview.style.display = 'none';
    this.sourceUpload.classList.remove('loaded');
    this.targetUpload.classList.remove('loaded');

    this.exifPreview.style.display = 'none';
    this.copyOptions.style.display = 'none';
    this.resultSection.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.copyBtn.disabled = true;
    this.progressContainer.style.display = 'none';

    // Reset checkboxes
    document.getElementById('copyCamera').checked = true;
    document.getElementById('copyDateTime').checked = true;
    document.getElementById('copyGps').checked = true;
    document.getElementById('copyExposure').checked = true;
    document.getElementById('copyLens').checked = true;
    document.getElementById('copyDescription').checked = true;

    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ExifCopyTool();
});
