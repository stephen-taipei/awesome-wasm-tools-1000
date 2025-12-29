class ColorBalanceTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.currentTone = 'midtones';
    this.preserveLuminosity = true;
    this.settings = {
      shadows: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      midtones: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      highlights: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 }
    };
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

    // Tone tabs
    document.querySelectorAll('.tone-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tone-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTone = tab.dataset.tone;
        this.updateSliders();
      });
    });

    // Sliders
    const sliderIds = ['cyanRed', 'magentaGreen', 'yellowBlue'];
    sliderIds.forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[this.currentTone][id] = parseInt(e.target.value);
        document.getElementById(`${id}Value`).textContent = this.settings[this.currentTone][id];
        this.render();
      });
    });

    // Preserve luminosity toggle
    document.getElementById('preserveLuminosity').addEventListener('change', (e) => {
      this.preserveLuminosity = e.target.checked;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    const tone = this.settings[this.currentTone];
    document.getElementById('cyanRed').value = tone.cyanRed;
    document.getElementById('cyanRedValue').textContent = tone.cyanRed;
    document.getElementById('magentaGreen').value = tone.magentaGreen;
    document.getElementById('magentaGreenValue').textContent = tone.magentaGreen;
    document.getElementById('yellowBlue').value = tone.yellowBlue;
    document.getElementById('yellowBlueValue').textContent = tone.yellowBlue;
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        this.imageData = tempCtx.getImageData(0, 0, img.width, img.height);

        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getLuminosity(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Calculate tone weight based on luminosity
  getToneWeight(luminosity) {
    // Returns weights for shadows, midtones, highlights
    const shadows = 1 - Math.min(1, luminosity / 85);
    const highlights = Math.max(0, (luminosity - 170) / 85);
    const midtones = 1 - shadows - highlights;
    return { shadows, midtones, highlights };
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;

    for (let i = 0; i < srcData.length; i += 4) {
      let r = srcData[i];
      let g = srcData[i + 1];
      let b = srcData[i + 2];

      const originalLum = this.getLuminosity(r, g, b);
      const weights = this.getToneWeight(originalLum);

      // Apply color balance for each tone range
      let rShift = 0, gShift = 0, bShift = 0;

      for (const tone of ['shadows', 'midtones', 'highlights']) {
        const weight = weights[tone];
        const settings = this.settings[tone];

        // Cyan-Red affects R and (inversely) G and B
        rShift += settings.cyanRed * weight * 0.5;
        gShift -= settings.cyanRed * weight * 0.25;
        bShift -= settings.cyanRed * weight * 0.25;

        // Magenta-Green affects G and (inversely) R and B
        gShift += settings.magentaGreen * weight * 0.5;
        rShift -= settings.magentaGreen * weight * 0.25;
        bShift -= settings.magentaGreen * weight * 0.25;

        // Yellow-Blue affects B and (inversely) R and G
        bShift += settings.yellowBlue * weight * 0.5;
        rShift -= settings.yellowBlue * weight * 0.25;
        gShift -= settings.yellowBlue * weight * 0.25;
      }

      r = Math.max(0, Math.min(255, r + rShift));
      g = Math.max(0, Math.min(255, g + gShift));
      b = Math.max(0, Math.min(255, b + bShift));

      // Preserve luminosity if enabled
      if (this.preserveLuminosity) {
        const newLum = this.getLuminosity(r, g, b);
        if (newLum > 0) {
          const ratio = originalLum / newLum;
          r = Math.max(0, Math.min(255, r * ratio));
          g = Math.max(0, Math.min(255, g * ratio));
          b = Math.max(0, Math.min(255, b * ratio));
        }
      }

      dstData[i] = r;
      dstData[i + 1] = g;
      dstData[i + 2] = b;
      dstData[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'color-balanced-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.currentTone = 'midtones';
    this.preserveLuminosity = true;
    this.settings = {
      shadows: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      midtones: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      highlights: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 }
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('preserveLuminosity').checked = true;
    document.querySelectorAll('.tone-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tone-tab[data-tone="midtones"]').classList.add('active');
    this.updateSliders();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ColorBalanceTool();
});
