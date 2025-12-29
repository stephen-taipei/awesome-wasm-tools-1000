/**
 * IMG-252 圖片ASCII藝術工具
 */
class AsciiArtTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.asciiOutput = document.getElementById('asciiOutput');
    this.settings = {
      outputWidth: 100,
      fontSize: 6,
      contrast: 100,
      textColor: '#00ff00',
      bgColor: '#000000',
      colorMode: false,
      invertColors: false
    };
    this.mode = 'standard';
    this.charSets = {
      standard: ' .:-=+*#%@',
      detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
      blocks: ' ░▒▓█'
    };
    this.init();
  }

  init() { this.bindEvents(); }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;
        this.render();
      });
    });

    document.getElementById('outputWidth').addEventListener('input', (e) => {
      this.settings.outputWidth = parseInt(e.target.value);
      document.getElementById('widthValue').textContent = this.settings.outputWidth;
      this.render();
    });

    document.getElementById('fontSize').addEventListener('input', (e) => {
      this.settings.fontSize = parseInt(e.target.value);
      document.getElementById('fontSizeValue').textContent = this.settings.fontSize + 'px';
      this.asciiOutput.style.fontSize = this.settings.fontSize + 'px';
    });

    document.getElementById('contrast').addEventListener('input', (e) => {
      this.settings.contrast = parseInt(e.target.value);
      document.getElementById('contrastValue').textContent = this.settings.contrast + '%';
      this.render();
    });

    document.getElementById('textColor').addEventListener('input', (e) => {
      this.settings.textColor = e.target.value;
      if (!this.settings.colorMode) {
        this.asciiOutput.style.color = this.settings.textColor;
      }
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.asciiOutput.parentElement.style.background = this.settings.bgColor;
    });

    document.getElementById('colorMode').addEventListener('change', (e) => {
      this.settings.colorMode = e.target.checked;
      this.render();
    });

    document.getElementById('invertColors').addEventListener('change', (e) => {
      this.settings.invertColors = e.target.checked;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('copyBtn').addEventListener('click', () => this.copyText());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;
    const { outputWidth, contrast, colorMode, invertColors } = this.settings;

    // Calculate height maintaining aspect ratio (characters are taller than wide)
    const aspectRatio = this.originalImage.height / this.originalImage.width;
    const outputHeight = Math.floor(outputWidth * aspectRatio * 0.5);

    // Create temporary canvas for sampling
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = outputWidth;
    tempCanvas.height = outputHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0, outputWidth, outputHeight);
    const imageData = tempCtx.getImageData(0, 0, outputWidth, outputHeight);
    const data = imageData.data;

    const charSet = this.charSets[this.mode];
    const contrastFactor = contrast / 100;

    let result = '';

    if (colorMode) {
      result = '<span>';
    }

    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        const idx = (y * outputWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        let gray = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Apply contrast
        gray = ((gray - 0.5) * contrastFactor) + 0.5;
        gray = Math.max(0, Math.min(1, gray));

        if (invertColors) {
          gray = 1 - gray;
        }

        const charIndex = Math.floor(gray * (charSet.length - 1));
        const char = charSet[charIndex];

        if (colorMode) {
          const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          result += `<span style="color:${hexColor}">${char === ' ' ? '&nbsp;' : char}</span>`;
        } else {
          result += char;
        }
      }
      result += colorMode ? '<br>' : '\n';
    }

    if (colorMode) {
      result += '</span>';
      this.asciiOutput.innerHTML = result;
    } else {
      this.asciiOutput.textContent = result;
      this.asciiOutput.style.color = this.settings.textColor;
    }
  }

  copyText() {
    const text = this.asciiOutput.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const copyBtn = document.getElementById('copyBtn');
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span>✓</span> 已複製';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 2000);
    });
  }

  download() {
    // Create a canvas from the ASCII art
    const lines = this.asciiOutput.textContent.split('\n');
    const lineHeight = this.settings.fontSize * 1.2;
    const charWidth = this.settings.fontSize * 0.6;

    this.canvas.width = lines[0].length * charWidth;
    this.canvas.height = lines.length * lineHeight;

    this.ctx.fillStyle = this.settings.bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = `${this.settings.fontSize}px "Courier New", monospace`;
    this.ctx.fillStyle = this.settings.textColor;
    this.ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      this.ctx.fillText(line, 0, i * lineHeight);
    });

    const link = document.createElement('a');
    link.download = `ascii_art_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.settings = { outputWidth: 100, fontSize: 6, contrast: 100, textColor: '#00ff00', bgColor: '#000000', colorMode: false, invertColors: false };
    this.mode = 'standard';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('outputWidth').value = 100;
    document.getElementById('widthValue').textContent = '100';
    document.getElementById('fontSize').value = 6;
    document.getElementById('fontSizeValue').textContent = '6px';
    document.getElementById('contrast').value = 100;
    document.getElementById('contrastValue').textContent = '100%';
    document.getElementById('textColor').value = '#00ff00';
    document.getElementById('bgColor').value = '#000000';
    document.getElementById('colorMode').checked = false;
    document.getElementById('invertColors').checked = false;
    this.asciiOutput.style.fontSize = '6px';
    this.asciiOutput.style.color = '#00ff00';
    this.asciiOutput.parentElement.style.background = '#000000';
    this.asciiOutput.textContent = '';
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }
}

document.addEventListener('DOMContentLoaded', () => new AsciiArtTool());
