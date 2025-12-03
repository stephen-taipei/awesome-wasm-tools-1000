/**
 * IMG-041 查看 EXIF 資訊
 * 查看圖片的 EXIF 元資料（拍攝參數、GPS、設備資訊）
 */

class ExifViewerTool {
  constructor() {
    this.originalFile = null;
    this.exifData = null;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.resultPanel = document.getElementById('resultPanel');

    this.downloadBtn = document.getElementById('downloadBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.statusMessage = document.getElementById('statusMessage');
    this.previewImage = document.getElementById('previewImage');

    this.basicInfo = document.getElementById('basicInfo');
    this.cameraInfo = document.getElementById('cameraInfo');
    this.imageInfo = document.getElementById('imageInfo');
    this.gpsInfo = document.getElementById('gpsInfo');
    this.rawJson = document.getElementById('rawJson');

    this.noCamera = document.getElementById('noCamera');
    this.noGps = document.getElementById('noGps');
    this.gpsContent = document.getElementById('gpsContent');
    this.mapLink = document.getElementById('mapLink');

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

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.dataset.tab + 'Tab';
        document.getElementById(tabId).classList.add('active');
      });
    });

    // Action buttons
    this.downloadBtn.addEventListener('click', () => this.downloadJson());
    this.copyBtn.addEventListener('click', () => this.copyData());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    const validTypes = ['image/jpeg', 'image/tiff', 'image/heic'];
    const isHeic = file.name.toLowerCase().endsWith('.heic');

    if (!validTypes.includes(file.type) && !isHeic) {
      this.showStatus('error', '請上傳 JPG、TIFF 或 HEIC 格式的圖片');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewImage.src = e.target.result;

      // Extract EXIF
      this.extractExif(file);
    };
    reader.readAsDataURL(file);
  }

  extractExif(file) {
    EXIF.getData(file, () => {
      const allTags = EXIF.getAllTags(file);

      if (Object.keys(allTags).length === 0) {
        this.showStatus('warning', '此圖片不含 EXIF 資訊');
        this.exifData = {};
      } else {
        this.exifData = allTags;
        this.showStatus('success', '成功讀取 EXIF 資訊');
      }

      this.displayExif(allTags, file);
      this.resultPanel.style.display = 'block';
      this.downloadBtn.style.display = 'inline-flex';
      this.copyBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
    });
  }

  displayExif(tags, file) {
    // Basic info
    this.basicInfo.innerHTML = this.createRow('檔案名稱', file.name);
    this.basicInfo.innerHTML += this.createRow('檔案大小', this.formatSize(file.size));
    this.basicInfo.innerHTML += this.createRow('檔案類型', file.type || 'image/heic');

    if (tags.DateTime) {
      this.basicInfo.innerHTML += this.createRow('修改時間', this.formatDateTime(tags.DateTime));
    }
    if (tags.DateTimeOriginal) {
      this.basicInfo.innerHTML += this.createRow('拍攝時間', this.formatDateTime(tags.DateTimeOriginal));
    }

    // Camera info
    const cameraFields = [
      ['Make', '相機品牌'],
      ['Model', '相機型號'],
      ['LensModel', '鏡頭型號'],
      ['FocalLength', '焦距'],
      ['FNumber', '光圈'],
      ['ExposureTime', '快門速度'],
      ['ISOSpeedRatings', 'ISO'],
      ['ExposureProgram', '曝光模式'],
      ['MeteringMode', '測光模式'],
      ['WhiteBalance', '白平衡'],
      ['Flash', '閃光燈'],
      ['Software', '軟體']
    ];

    let cameraHtml = '';
    for (const [key, label] of cameraFields) {
      if (tags[key] !== undefined) {
        let value = tags[key];

        if (key === 'FocalLength' && value.numerator) {
          value = `${Math.round(value.numerator / value.denominator)} mm`;
        } else if (key === 'FNumber' && value.numerator) {
          value = `f/${(value.numerator / value.denominator).toFixed(1)}`;
        } else if (key === 'ExposureTime' && value.numerator) {
          if (value.numerator === 1) {
            value = `1/${value.denominator} 秒`;
          } else {
            value = `${value.numerator / value.denominator} 秒`;
          }
        } else if (key === 'ExposureProgram') {
          const programs = ['未定義', '手動', 'P 自動', 'A 光圈優先', 'S 快門優先', '創意', '動作', '肖像', '風景'];
          value = programs[value] || value;
        } else if (key === 'MeteringMode') {
          const modes = ['未知', '平均', '中央重點', '點測光', '多點', '矩陣', '局部'];
          value = modes[value] || value;
        } else if (key === 'WhiteBalance') {
          value = value === 0 ? '自動' : '手動';
        }

        cameraHtml += this.createRow(label, value);
      }
    }

    if (cameraHtml) {
      this.cameraInfo.innerHTML = cameraHtml;
      this.noCamera.style.display = 'none';
    } else {
      this.cameraInfo.innerHTML = '';
      this.noCamera.style.display = 'block';
    }

    // Image info
    const imageFields = [
      ['PixelXDimension', '寬度'],
      ['PixelYDimension', '高度'],
      ['Orientation', '方向'],
      ['ColorSpace', '色彩空間'],
      ['XResolution', 'X 解析度'],
      ['YResolution', 'Y 解析度'],
      ['ResolutionUnit', '解析度單位'],
      ['Compression', '壓縮']
    ];

    let imageHtml = '';
    for (const [key, label] of imageFields) {
      if (tags[key] !== undefined) {
        let value = tags[key];

        if (key === 'PixelXDimension' || key === 'PixelYDimension') {
          value = `${value} px`;
        } else if (key === 'Orientation') {
          const orientations = ['', '正常', '水平翻轉', '旋轉180°', '垂直翻轉', '順時針90°+水平翻轉', '順時針90°', '逆時針90°+水平翻轉', '逆時針90°'];
          value = orientations[value] || value;
        } else if (key === 'ColorSpace') {
          value = value === 1 ? 'sRGB' : (value === 65535 ? '未校準' : value);
        } else if (key === 'XResolution' || key === 'YResolution') {
          if (value.numerator) {
            value = `${value.numerator / value.denominator} dpi`;
          }
        } else if (key === 'ResolutionUnit') {
          const units = ['', '無單位', '英吋', '公分'];
          value = units[value] || value;
        }

        imageHtml += this.createRow(label, value);
      }
    }

    this.imageInfo.innerHTML = imageHtml || '<tr><td colspan="2" style="color: #888;">無圖片資訊</td></tr>';

    // GPS info
    if (tags.GPSLatitude && tags.GPSLongitude) {
      const lat = this.convertDMSToDD(tags.GPSLatitude, tags.GPSLatitudeRef);
      const lng = this.convertDMSToDD(tags.GPSLongitude, tags.GPSLongitudeRef);

      let gpsHtml = '';
      gpsHtml += this.createRow('緯度', `${lat.toFixed(6)}° ${tags.GPSLatitudeRef || 'N'}`);
      gpsHtml += this.createRow('經度', `${lng.toFixed(6)}° ${tags.GPSLongitudeRef || 'E'}`);

      if (tags.GPSAltitude) {
        const alt = tags.GPSAltitude.numerator / tags.GPSAltitude.denominator;
        gpsHtml += this.createRow('海拔', `${alt.toFixed(1)} 公尺`);
      }

      if (tags.GPSDateStamp) {
        gpsHtml += this.createRow('GPS 日期', tags.GPSDateStamp);
      }

      this.gpsInfo.innerHTML = gpsHtml;
      this.mapLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
      this.noGps.style.display = 'none';
      this.gpsContent.style.display = 'block';
    } else {
      this.noGps.style.display = 'block';
      this.gpsContent.style.display = 'none';
    }

    // Raw JSON
    this.rawJson.textContent = JSON.stringify(this.cleanExifForJson(tags), null, 2);
  }

  createRow(label, value) {
    return `<tr><td>${label}</td><td>${value}</td></tr>`;
  }

  convertDMSToDD(dms, ref) {
    const d = dms[0].numerator / dms[0].denominator;
    const m = dms[1].numerator / dms[1].denominator;
    const s = dms[2].numerator / dms[2].denominator;

    let dd = d + m / 60 + s / 3600;

    if (ref === 'S' || ref === 'W') {
      dd = -dd;
    }

    return dd;
  }

  cleanExifForJson(tags) {
    const clean = {};

    for (const [key, value] of Object.entries(tags)) {
      if (value === undefined) continue;

      if (value && value.numerator !== undefined && value.denominator !== undefined) {
        clean[key] = value.numerator / value.denominator;
      } else if (Array.isArray(value)) {
        clean[key] = value.map(v => {
          if (v && v.numerator !== undefined) {
            return v.numerator / v.denominator;
          }
          return v;
        });
      } else if (typeof value === 'object' && value !== null) {
        // Skip complex objects
        continue;
      } else {
        clean[key] = value;
      }
    }

    return clean;
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDateTime(str) {
    // EXIF date format: "2024:01:15 12:30:45"
    if (!str) return '';
    const parts = str.split(' ');
    if (parts.length >= 2) {
      const date = parts[0].replace(/:/g, '-');
      return `${date} ${parts[1]}`;
    }
    return str;
  }

  async downloadJson() {
    if (!this.exifData) return;

    const data = this.cleanExifForJson(this.exifData);
    data._filename = this.originalFile.name;
    data._filesize = this.originalFile.size;

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });

    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${originalName}_exif.json`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'JSON 檔案已下載');
  }

  async copyData() {
    if (!this.exifData) return;

    const data = this.cleanExifForJson(this.exifData);
    const json = JSON.stringify(data, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      this.showStatus('success', 'EXIF 資料已複製到剪貼簿');
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showStatus('success', 'EXIF 資料已複製到剪貼簿');
    }
  }

  reset() {
    this.originalFile = null;
    this.exifData = null;

    this.fileInput.value = '';
    this.resultPanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.copyBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';

    this.statusMessage.style.display = 'none';

    // Reset tabs
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
      b.classList.toggle('active', i === 0);
    });
    document.querySelectorAll('.tab-content').forEach((c, i) => {
      c.classList.toggle('active', i === 0);
    });
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ExifViewerTool();
});
