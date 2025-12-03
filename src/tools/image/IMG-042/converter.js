/**
 * IMG-042 編輯 EXIF 資訊
 * 編輯或修改圖片的 EXIF 資訊
 */

class ExifEditorTool {
  constructor() {
    this.originalFile = null;
    this.originalDataUrl = null;
    this.exifData = null;
    this.resultBlob = null;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editPanel = document.getElementById('editPanel');

    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.previewImage = document.getElementById('previewImage');

    // Form fields
    this.makeInput = document.getElementById('make');
    this.modelInput = document.getElementById('model');
    this.softwareInput = document.getElementById('software');
    this.dateOriginalInput = document.getElementById('dateOriginal');
    this.timeOriginalInput = document.getElementById('timeOriginal');
    this.latitudeInput = document.getElementById('latitude');
    this.latRefSelect = document.getElementById('latRef');
    this.longitudeInput = document.getElementById('longitude');
    this.lngRefSelect = document.getElementById('lngRef');
    this.clearGpsCheckbox = document.getElementById('clearGps');
    this.imageTitleInput = document.getElementById('imageTitle');
    this.imageDescriptionInput = document.getElementById('imageDescription');
    this.artistInput = document.getElementById('artist');
    this.copyrightInput = document.getElementById('copyright');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('drag-over');
    });
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('drag-over');
    });
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });

    // Clear GPS checkbox
    this.clearGpsCheckbox.addEventListener('change', () => {
      const disabled = this.clearGpsCheckbox.checked;
      this.latitudeInput.disabled = disabled;
      this.latRefSelect.disabled = disabled;
      this.longitudeInput.disabled = disabled;
      this.lngRefSelect.disabled = disabled;
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.saveChanges());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    if (file.type !== 'image/jpeg') {
      this.showStatus('error', '僅支援 JPG 格式的圖片');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalDataUrl = e.target.result;
      this.previewImage.src = this.originalDataUrl;

      // Load existing EXIF
      this.loadExif();

      this.editPanel.style.display = 'block';
      this.convertBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  loadExif() {
    try {
      this.exifData = piexif.load(this.originalDataUrl);

      // Populate form with existing data
      const zeroth = this.exifData['0th'] || {};
      const exif = this.exifData['Exif'] || {};
      const gps = this.exifData['GPS'] || {};

      // Camera info
      if (zeroth[piexif.ImageIFD.Make]) {
        this.makeInput.value = zeroth[piexif.ImageIFD.Make];
      }
      if (zeroth[piexif.ImageIFD.Model]) {
        this.modelInput.value = zeroth[piexif.ImageIFD.Model];
      }
      if (zeroth[piexif.ImageIFD.Software]) {
        this.softwareInput.value = zeroth[piexif.ImageIFD.Software];
      }

      // Date/time
      if (exif[piexif.ExifIFD.DateTimeOriginal]) {
        const dt = exif[piexif.ExifIFD.DateTimeOriginal];
        const parts = dt.split(' ');
        if (parts.length >= 2) {
          this.dateOriginalInput.value = parts[0].replace(/:/g, '-');
          this.timeOriginalInput.value = parts[1];
        }
      }

      // GPS
      if (gps[piexif.GPSIFD.GPSLatitude]) {
        const lat = this.convertToDecimal(gps[piexif.GPSIFD.GPSLatitude]);
        this.latitudeInput.value = lat.toFixed(6);
        this.latRefSelect.value = gps[piexif.GPSIFD.GPSLatitudeRef] || 'N';
      }
      if (gps[piexif.GPSIFD.GPSLongitude]) {
        const lng = this.convertToDecimal(gps[piexif.GPSIFD.GPSLongitude]);
        this.longitudeInput.value = lng.toFixed(6);
        this.lngRefSelect.value = gps[piexif.GPSIFD.GPSLongitudeRef] || 'E';
      }

      // Description
      if (zeroth[piexif.ImageIFD.ImageDescription]) {
        this.imageDescriptionInput.value = zeroth[piexif.ImageIFD.ImageDescription];
      }
      if (zeroth[piexif.ImageIFD.Artist]) {
        this.artistInput.value = zeroth[piexif.ImageIFD.Artist];
      }
      if (zeroth[piexif.ImageIFD.Copyright]) {
        this.copyrightInput.value = zeroth[piexif.ImageIFD.Copyright];
      }

      this.showStatus('success', '已讀取現有 EXIF 資訊，可進行編輯');

    } catch (error) {
      console.error('EXIF load error:', error);
      this.exifData = {
        '0th': {},
        'Exif': {},
        'GPS': {},
        '1st': {},
        'thumbnail': null
      };
      this.showStatus('info', '此圖片無 EXIF 資訊，可新增');
    }
  }

  convertToDecimal(dms) {
    if (!dms || dms.length < 3) return 0;
    const d = dms[0][0] / dms[0][1];
    const m = dms[1][0] / dms[1][1];
    const s = dms[2][0] / dms[2][1];
    return d + m / 60 + s / 3600;
  }

  convertToDMS(decimal) {
    const d = Math.floor(Math.abs(decimal));
    const mFloat = (Math.abs(decimal) - d) * 60;
    const m = Math.floor(mFloat);
    const s = (mFloat - m) * 60;

    return [
      [d, 1],
      [m, 1],
      [Math.round(s * 10000), 10000]
    ];
  }

  async saveChanges() {
    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.updateProgress(10, '準備修改 EXIF...');

    try {
      // Initialize EXIF structure if needed
      if (!this.exifData['0th']) this.exifData['0th'] = {};
      if (!this.exifData['Exif']) this.exifData['Exif'] = {};
      if (!this.exifData['GPS']) this.exifData['GPS'] = {};

      const zeroth = this.exifData['0th'];
      const exif = this.exifData['Exif'];
      const gps = this.exifData['GPS'];

      this.updateProgress(30, '更新相機資訊...');

      // Update camera info
      if (this.makeInput.value) {
        zeroth[piexif.ImageIFD.Make] = this.makeInput.value;
      }
      if (this.modelInput.value) {
        zeroth[piexif.ImageIFD.Model] = this.modelInput.value;
      }
      if (this.softwareInput.value) {
        zeroth[piexif.ImageIFD.Software] = this.softwareInput.value;
      }

      // Update date/time
      if (this.dateOriginalInput.value && this.timeOriginalInput.value) {
        const date = this.dateOriginalInput.value.replace(/-/g, ':');
        const time = this.timeOriginalInput.value;
        const datetime = `${date} ${time}`;
        exif[piexif.ExifIFD.DateTimeOriginal] = datetime;
        exif[piexif.ExifIFD.DateTimeDigitized] = datetime;
        zeroth[piexif.ImageIFD.DateTime] = datetime;
      }

      this.updateProgress(50, '更新 GPS 資訊...');

      // Update GPS
      if (this.clearGpsCheckbox.checked) {
        this.exifData['GPS'] = {};
      } else if (this.latitudeInput.value && this.longitudeInput.value) {
        const lat = parseFloat(this.latitudeInput.value);
        const lng = parseFloat(this.longitudeInput.value);

        gps[piexif.GPSIFD.GPSLatitude] = this.convertToDMS(lat);
        gps[piexif.GPSIFD.GPSLatitudeRef] = this.latRefSelect.value;
        gps[piexif.GPSIFD.GPSLongitude] = this.convertToDMS(lng);
        gps[piexif.GPSIFD.GPSLongitudeRef] = this.lngRefSelect.value;
      }

      this.updateProgress(70, '更新描述資訊...');

      // Update description
      if (this.imageDescriptionInput.value) {
        zeroth[piexif.ImageIFD.ImageDescription] = this.imageDescriptionInput.value;
      }
      if (this.artistInput.value) {
        zeroth[piexif.ImageIFD.Artist] = this.artistInput.value;
      }
      if (this.copyrightInput.value) {
        zeroth[piexif.ImageIFD.Copyright] = this.copyrightInput.value;
      }

      this.updateProgress(85, '寫入 EXIF 資料...');

      // Generate new EXIF bytes
      const exifBytes = piexif.dump(this.exifData);

      // Insert into image
      const newDataUrl = piexif.insert(exifBytes, this.originalDataUrl);

      this.updateProgress(95, '生成圖片...');

      // Convert to blob
      const byteString = atob(newDataUrl.split(',')[1]);
      const mimeType = 'image/jpeg';
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);

      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      this.resultBlob = new Blob([ab], { type: mimeType });

      this.updateProgress(100, '完成！');
      this.progressContainer.style.display = 'none';

      this.previewImage.src = newDataUrl;
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';

      this.showStatus('success', 'EXIF 資訊已更新！');

    } catch (error) {
      console.error('Save error:', error);
      this.showStatus('error', `儲存失敗：${error.message}`);
      this.progressContainer.style.display = 'none';
    }

    this.convertBtn.disabled = false;
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  download() {
    if (!this.resultBlob) return;

    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.resultBlob);
    link.download = `${originalName}_edited.jpg`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.originalFile = null;
    this.originalDataUrl = null;
    this.exifData = null;
    this.resultBlob = null;

    this.fileInput.value = '';
    this.editPanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;

    // Clear form
    this.makeInput.value = '';
    this.modelInput.value = '';
    this.softwareInput.value = '';
    this.dateOriginalInput.value = '';
    this.timeOriginalInput.value = '';
    this.latitudeInput.value = '';
    this.latRefSelect.value = 'N';
    this.longitudeInput.value = '';
    this.lngRefSelect.value = 'E';
    this.clearGpsCheckbox.checked = false;
    this.latitudeInput.disabled = false;
    this.latRefSelect.disabled = false;
    this.longitudeInput.disabled = false;
    this.lngRefSelect.disabled = false;
    this.imageTitleInput.value = '';
    this.imageDescriptionInput.value = '';
    this.artistInput.value = '';
    this.copyrightInput.value = '';

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
  new ExifEditorTool();
});
