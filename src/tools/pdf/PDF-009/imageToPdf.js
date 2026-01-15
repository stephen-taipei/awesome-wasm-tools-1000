/**
 * PDF-009: Image to PDF Converter
 *
 * Converts multiple images into a single PDF document.
 */

class ImageToPDF {
  constructor() {
    this.images = [];
    this.outputBytes = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.imageListContainer = document.getElementById('imageListContainer');
    this.imageList = document.getElementById('imageList');
    this.addMoreBtn = document.getElementById('addMoreBtn');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.pageSize = document.getElementById('pageSize');
    this.orientation = document.getElementById('orientation');
    this.imageFit = document.getElementById('imageFit');
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.pageCount = document.getElementById('pageCount');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.addMoreBtn.addEventListener('click', () => this.fileInput.click());

    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      this.addImages(Array.from(e.dataTransfer.files));
    });

    this.processBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    this.addImages(Array.from(event.target.files));
    this.fileInput.value = '';
  }

  addImages(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      this.showStatus('error', '請選擇圖片文件');
      return;
    }

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.images.push({
          file,
          dataUrl: e.target.result,
          name: file.name
        });
        this.renderImageList();
      };
      reader.readAsDataURL(file);
    });

    this.imageListContainer.style.display = 'block';
    this.settingsPanel.style.display = 'block';
    this.processBtn.disabled = false;
    this.showStatus('success', `已添加 ${imageFiles.length} 張圖片`);
  }

  renderImageList() {
    this.imageList.innerHTML = '';
    this.images.forEach((img, index) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.draggable = true;
      item.dataset.index = index;
      item.innerHTML = `
        <img src="${img.dataUrl}" alt="${img.name}" class="thumbnail">
        <span class="file-name">${img.name}</span>
        <button class="remove-btn" data-index="${index}">✕</button>
      `;

      item.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeImage(index);
      });

      item.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
      item.addEventListener('dragover', (e) => this.handleDragOver(e));
      item.addEventListener('drop', (e) => this.handleDrop(e, index));

      this.imageList.appendChild(item);
    });
  }

  handleDragStart(e, index) {
    e.dataTransfer.setData('text/plain', index);
  }

  handleDragOver(e) {
    e.preventDefault();
  }

  handleDrop(e, targetIndex) {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIndex !== targetIndex) {
      const [removed] = this.images.splice(sourceIndex, 1);
      this.images.splice(targetIndex, 0, removed);
      this.renderImageList();
    }
  }

  removeImage(index) {
    this.images.splice(index, 1);
    this.renderImageList();
    if (this.images.length === 0) {
      this.imageListContainer.style.display = 'none';
      this.settingsPanel.style.display = 'none';
      this.processBtn.disabled = true;
    }
  }

  getPageDimensions(imgWidth, imgHeight) {
    const pageSize = this.pageSize.value;
    const orientation = this.orientation.value;

    // Standard page sizes in points (1 inch = 72 points)
    const sizes = {
      a4: { width: 595, height: 842 },
      letter: { width: 612, height: 792 }
    };

    if (pageSize === 'fit') {
      return { width: imgWidth, height: imgHeight };
    }

    let { width, height } = sizes[pageSize];

    if (orientation === 'landscape' || (orientation === 'auto' && imgWidth > imgHeight)) {
      [width, height] = [height, width];
    }

    return { width, height };
  }

  async convert() {
    if (this.images.length === 0) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();

      for (let i = 0; i < this.images.length; i++) {
        this.updateProgress((i / this.images.length) * 90, `處理圖片 ${i + 1}/${this.images.length}...`);

        const img = this.images[i];
        let embeddedImage;

        if (img.file.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(await img.file.arrayBuffer());
        } else {
          // Convert other formats to JPEG via canvas
          const jpegData = await this.convertToJpeg(img.dataUrl);
          embeddedImage = await pdfDoc.embedJpg(jpegData);
        }

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;
        const { width: pageWidth, height: pageHeight } = this.getPageDimensions(imgWidth, imgHeight);

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Calculate image dimensions based on fit mode
        let drawWidth, drawHeight, drawX, drawY;
        const fit = this.imageFit.value;

        if (fit === 'stretch') {
          drawWidth = pageWidth;
          drawHeight = pageHeight;
          drawX = 0;
          drawY = 0;
        } else if (fit === 'cover') {
          const scale = Math.max(pageWidth / imgWidth, pageHeight / imgHeight);
          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          drawX = (pageWidth - drawWidth) / 2;
          drawY = (pageHeight - drawHeight) / 2;
        } else { // contain
          const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;
          drawX = (pageWidth - drawWidth) / 2;
          drawY = (pageHeight - drawHeight) / 2;
        }

        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight
        });
      }

      this.updateProgress(95, '生成 PDF...');
      this.outputBytes = await pdfDoc.save();

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.pageCount.textContent = `${this.images.length} 頁`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '轉換完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '轉換完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Convert error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '轉換失敗：' + error.message);
      this.processBtn.disabled = false;
    }
  }

  convertToJpeg(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          blob => blob.arrayBuffer().then(resolve).catch(reject),
          'image/jpeg',
          0.92
        );
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  download() {
    if (!this.outputBytes) return;

    const blob = new Blob([this.outputBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'images.pdf';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.images = [];
    this.outputBytes = null;
    this.fileInput.value = '';
    this.imageList.innerHTML = '';
    this.imageListContainer.style.display = 'none';
    this.settingsPanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.processBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.imageToPdf = new ImageToPDF();
});

export default ImageToPDF;
