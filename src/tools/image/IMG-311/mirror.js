class MirrorTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.currentImageData = null;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    document.getElementById('flipH').addEventListener('click', () => this.flipHorizontal());
    document.getElementById('flipV').addEventListener('click', () => this.flipVertical());
    document.getElementById('rotate90').addEventListener('click', () => this.rotate(-90));
    document.getElementById('rotate270').addEventListener('click', () => this.rotate(90));
    document.getElementById('mirrorLeft').addEventListener('click', () => this.mirrorHalf('left'));
    document.getElementById('mirrorRight').addEventListener('click', () => this.mirrorHalf('right'));
    document.getElementById('mirrorTop').addEventListener('click', () => this.mirrorHalf('top'));
    document.getElementById('mirrorBottom').addEventListener('click', () => this.mirrorHalf('bottom'));

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        this.currentImageData = this.ctx.getImageData(0, 0, img.width, img.height);
        this.updateSizeInfo();
        document.getElementById('editorSection').classList.add('active');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateSizeInfo() {
    document.getElementById('sizeInfo').textContent = `${this.canvas.width} x ${this.canvas.height} px`;
  }

  flipHorizontal() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = (y * width + (width - 1 - x)) * 4;
        output[dstIdx] = data[srcIdx];
        output[dstIdx + 1] = data[srcIdx + 1];
        output[dstIdx + 2] = data[srcIdx + 2];
        output[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    imageData.data.set(output);
    this.ctx.putImageData(imageData, 0, 0);
    this.currentImageData = imageData;
  }

  flipVertical() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = ((height - 1 - y) * width + x) * 4;
        output[dstIdx] = data[srcIdx];
        output[dstIdx + 1] = data[srcIdx + 1];
        output[dstIdx + 2] = data[srcIdx + 2];
        output[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    imageData.data.set(output);
    this.ctx.putImageData(imageData, 0, 0);
    this.currentImageData = imageData;
  }

  rotate(degrees) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Create new canvas with swapped dimensions
    const newWidth = height;
    const newHeight = width;
    const output = new Uint8ClampedArray(newWidth * newHeight * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        let dstX, dstY;

        if (degrees === 90 || degrees === -270) {
          dstX = height - 1 - y;
          dstY = x;
        } else {
          dstX = y;
          dstY = width - 1 - x;
        }

        const dstIdx = (dstY * newWidth + dstX) * 4;
        output[dstIdx] = data[srcIdx];
        output[dstIdx + 1] = data[srcIdx + 1];
        output[dstIdx + 2] = data[srcIdx + 2];
        output[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    const newImageData = this.ctx.createImageData(newWidth, newHeight);
    newImageData.data.set(output);
    this.ctx.putImageData(newImageData, 0, 0);
    this.currentImageData = newImageData;
    this.updateSizeInfo();
  }

  mirrorHalf(side) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    switch (side) {
      case 'left':
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width / 2; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = (y * width + (width - 1 - x)) * 4;
            data[dstIdx] = data[srcIdx];
            data[dstIdx + 1] = data[srcIdx + 1];
            data[dstIdx + 2] = data[srcIdx + 2];
            data[dstIdx + 3] = data[srcIdx + 3];
          }
        }
        break;
      case 'right':
        for (let y = 0; y < height; y++) {
          for (let x = Math.ceil(width / 2); x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = (y * width + (width - 1 - x)) * 4;
            data[dstIdx] = data[srcIdx];
            data[dstIdx + 1] = data[srcIdx + 1];
            data[dstIdx + 2] = data[srcIdx + 2];
            data[dstIdx + 3] = data[srcIdx + 3];
          }
        }
        break;
      case 'top':
        for (let y = 0; y < height / 2; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = ((height - 1 - y) * width + x) * 4;
            data[dstIdx] = data[srcIdx];
            data[dstIdx + 1] = data[srcIdx + 1];
            data[dstIdx + 2] = data[srcIdx + 2];
            data[dstIdx + 3] = data[srcIdx + 3];
          }
        }
        break;
      case 'bottom':
        for (let y = Math.ceil(height / 2); y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = ((height - 1 - y) * width + x) * 4;
            data[dstIdx] = data[srcIdx];
            data[dstIdx + 1] = data[srcIdx + 1];
            data[dstIdx + 2] = data[srcIdx + 2];
            data[dstIdx + 3] = data[srcIdx + 3];
          }
        }
        break;
    }

    this.ctx.putImageData(imageData, 0, 0);
    this.currentImageData = imageData;
  }

  download() {
    const link = document.createElement('a');
    link.download = 'mirrored-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    if (this.originalImage) {
      this.canvas.width = this.originalImage.width;
      this.canvas.height = this.originalImage.height;
      this.ctx.drawImage(this.originalImage, 0, 0);
      this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.updateSizeInfo();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MirrorTool();
});
