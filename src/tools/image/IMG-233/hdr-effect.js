/**
 * IMG-233 圖片HDR效果工具
 */
class HDREffectTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { strength: 50, localContrast: 40, detail: 30, saturation: 120, tonemap: 50 };
    this.presets = {
      natural: { strength: 40, localContrast: 30, detail: 20, saturation: 110, tonemap: 40 },
      vivid: { strength: 60, localContrast: 50, detail: 40, saturation: 140, tonemap: 50 },
      dramatic: { strength: 80, localContrast: 70, detail: 60, saturation: 130, tonemap: 70 },
      grunge: { strength: 70, localContrast: 80, detail: 50, saturation: 90, tonemap: 60 }
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = this.presets[btn.dataset.preset];
        this.settings = { ...preset };
        this.updateSliders();
        this.render();
      });
    });

    ['strength', 'localContrast', 'detail', 'saturation', 'tonemap'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        document.getElementById(id + 'Value').textContent = this.settings[id] + '%';
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        this.render();
      });
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    ['strength', 'localContrast', 'detail', 'saturation', 'tonemap'].forEach(id => {
      document.getElementById(id).value = this.settings[id];
      document.getElementById(id + 'Value').textContent = this.settings[id] + '%';
    });
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

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  }

  hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // Tone mapping function (Reinhard style)
  toneMap(value, strength) {
    const normalizedStrength = strength / 100;
    return value / (1 + value * normalizedStrength);
  }

  render() {
    if (!this.originalImage) return;
    const { strength, localContrast, detail, saturation, tonemap } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    // Get original data
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Create blurred version for local contrast
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const blurCtx = blurCanvas.getContext('2d');
    blurCtx.filter = 'blur(20px)';
    blurCtx.drawImage(this.originalImage, 0, 0);
    const blurData = blurCtx.getImageData(0, 0, w, h).data;

    // Create detail layer (sharpen)
    const detailCanvas = document.createElement('canvas');
    detailCanvas.width = w;
    detailCanvas.height = h;
    const detailCtx = detailCanvas.getContext('2d');
    detailCtx.filter = 'blur(1px)';
    detailCtx.drawImage(this.originalImage, 0, 0);
    const detailBlurData = detailCtx.getImageData(0, 0, w, h).data;

    const strengthFactor = strength / 100;
    const localContrastFactor = localContrast / 100;
    const detailFactor = detail / 100;
    const satFactor = saturation / 100;
    const tonemapFactor = tonemap / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Get blur values
      const br = blurData[i];
      const bg = blurData[i + 1];
      const bb = blurData[i + 2];

      // Local contrast enhancement (unsharp mask with blur)
      if (localContrastFactor > 0) {
        r += (r - br) * localContrastFactor * 0.5;
        g += (g - bg) * localContrastFactor * 0.5;
        b += (b - bb) * localContrastFactor * 0.5;
      }

      // Detail enhancement (high-pass filter)
      if (detailFactor > 0) {
        const dr = data[i] - detailBlurData[i];
        const dg = data[i + 1] - detailBlurData[i + 1];
        const db = data[i + 2] - detailBlurData[i + 2];
        r += dr * detailFactor;
        g += dg * detailFactor;
        b += db * detailFactor;
      }

      // Tone mapping (compress dynamic range)
      if (tonemapFactor > 0) {
        r = this.toneMap(r / 255, tonemapFactor) * 255 * (1 + tonemapFactor * 0.5);
        g = this.toneMap(g / 255, tonemapFactor) * 255 * (1 + tonemapFactor * 0.5);
        b = this.toneMap(b / 255, tonemapFactor) * 255 * (1 + tonemapFactor * 0.5);
      }

      // Clamp values
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      // Saturation adjustment
      if (satFactor !== 1) {
        let [hue, sat, lit] = this.rgbToHsl(r, g, b);
        sat = Math.min(100, sat * satFactor);
        [r, g, b] = this.hslToRgb(hue, sat, lit);
      }

      // Apply strength
      data[i] = data[i] * (1 - strengthFactor) + r * strengthFactor;
      data[i + 1] = data[i + 1] * (1 - strengthFactor) + g * strengthFactor;
      data[i + 2] = data[i + 2] * (1 - strengthFactor) + b * strengthFactor;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { strength: 50, localContrast: 40, detail: 30, saturation: 120, tonemap: 50 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    this.updateSliders();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `hdr_effect_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new HDREffectTool());
