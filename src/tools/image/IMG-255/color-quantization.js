/**
 * IMG-255 圖片色彩量化工具
 */
class ColorQuantizationTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      colors: 16,
      iterations: 10,
      dithering: false
    };
    this.mode = 'median';
    this.palette = [];
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

    document.getElementById('colors').addEventListener('input', (e) => {
      this.settings.colors = parseInt(e.target.value);
      document.getElementById('colorsValue').textContent = this.settings.colors;
      this.render();
    });

    document.getElementById('iterations').addEventListener('input', (e) => {
      this.settings.iterations = parseInt(e.target.value);
      document.getElementById('iterationsValue').textContent = this.settings.iterations;
      this.render();
    });

    document.getElementById('dithering').addEventListener('change', (e) => {
      this.settings.dithering = e.target.checked;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
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

  medianCut(colors, numColors) {
    let buckets = [colors];

    while (buckets.length < numColors) {
      let maxRangeBucket = 0;
      let maxRange = 0;

      buckets.forEach((bucket, i) => {
        if (bucket.length === 0) return;
        const ranges = this.getColorRanges(bucket);
        const range = Math.max(ranges.r, ranges.g, ranges.b);
        if (range > maxRange) {
          maxRange = range;
          maxRangeBucket = i;
        }
      });

      const bucket = buckets[maxRangeBucket];
      if (bucket.length <= 1) break;

      const ranges = this.getColorRanges(bucket);
      let channel = 0;
      if (ranges.g > ranges.r && ranges.g > ranges.b) channel = 1;
      else if (ranges.b > ranges.r && ranges.b > ranges.g) channel = 2;

      bucket.sort((a, b) => a[channel] - b[channel]);
      const mid = Math.floor(bucket.length / 2);
      buckets.splice(maxRangeBucket, 1, bucket.slice(0, mid), bucket.slice(mid));
    }

    return buckets.map(bucket => {
      if (bucket.length === 0) return [0, 0, 0];
      const sum = bucket.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]);
      return [Math.round(sum[0] / bucket.length), Math.round(sum[1] / bucket.length), Math.round(sum[2] / bucket.length)];
    });
  }

  getColorRanges(colors) {
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    colors.forEach(c => {
      minR = Math.min(minR, c[0]); maxR = Math.max(maxR, c[0]);
      minG = Math.min(minG, c[1]); maxG = Math.max(maxG, c[1]);
      minB = Math.min(minB, c[2]); maxB = Math.max(maxB, c[2]);
    });
    return { r: maxR - minR, g: maxG - minG, b: maxB - minB };
  }

  kMeans(colors, numColors, iterations) {
    // Initialize centroids randomly
    let centroids = [];
    for (let i = 0; i < numColors; i++) {
      centroids.push(colors[Math.floor(Math.random() * colors.length)].slice());
    }

    for (let iter = 0; iter < iterations; iter++) {
      // Assign colors to nearest centroid
      const clusters = Array.from({ length: numColors }, () => []);
      colors.forEach(color => {
        let minDist = Infinity;
        let nearest = 0;
        centroids.forEach((c, i) => {
          const dist = (color[0] - c[0]) ** 2 + (color[1] - c[1]) ** 2 + (color[2] - c[2]) ** 2;
          if (dist < minDist) { minDist = dist; nearest = i; }
        });
        clusters[nearest].push(color);
      });

      // Update centroids
      centroids = clusters.map((cluster, i) => {
        if (cluster.length === 0) return centroids[i];
        const sum = cluster.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]);
        return [Math.round(sum[0] / cluster.length), Math.round(sum[1] / cluster.length), Math.round(sum[2] / cluster.length)];
      });
    }

    return centroids;
  }

  octreeQuantize(colors, numColors) {
    // Simplified octree - use median cut as fallback
    return this.medianCut(colors, numColors);
  }

  findClosestColor(r, g, b, palette) {
    let minDist = Infinity;
    let closest = palette[0];
    for (const color of palette) {
      const dist = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
      if (dist < minDist) { minDist = dist; closest = color; }
    }
    return closest;
  }

  render() {
    if (!this.originalImage) return;
    const { colors, iterations, dithering } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Extract all colors
    const allColors = [];
    for (let i = 0; i < data.length; i += 4) {
      allColors.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Generate palette
    if (this.mode === 'median') {
      this.palette = this.medianCut(allColors, colors);
    } else if (this.mode === 'kmeans') {
      this.palette = this.kMeans(allColors, colors, iterations);
    } else {
      this.palette = this.octreeQuantize(allColors, colors);
    }

    // Apply palette
    if (dithering) {
      this.applyFloydSteinberg(data, w, h, this.palette);
    } else {
      for (let i = 0; i < data.length; i += 4) {
        const newColor = this.findClosestColor(data[i], data[i + 1], data[i + 2], this.palette);
        data[i] = newColor[0];
        data[i + 1] = newColor[1];
        data[i + 2] = newColor[2];
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
    this.updatePaletteDisplay();
  }

  applyFloydSteinberg(data, w, h, palette) {
    const errors = new Float32Array(w * h * 3);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const errIdx = (y * w + x) * 3;

        let r = data[idx] + errors[errIdx];
        let g = data[idx + 1] + errors[errIdx + 1];
        let b = data[idx + 2] + errors[errIdx + 2];

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        const newColor = this.findClosestColor(r, g, b, palette);
        data[idx] = newColor[0];
        data[idx + 1] = newColor[1];
        data[idx + 2] = newColor[2];

        const errR = r - newColor[0];
        const errG = g - newColor[1];
        const errB = b - newColor[2];

        if (x + 1 < w) {
          const i = (y * w + x + 1) * 3;
          errors[i] += errR * 7 / 16;
          errors[i + 1] += errG * 7 / 16;
          errors[i + 2] += errB * 7 / 16;
        }
        if (y + 1 < h) {
          if (x > 0) {
            const i = ((y + 1) * w + x - 1) * 3;
            errors[i] += errR * 3 / 16;
            errors[i + 1] += errG * 3 / 16;
            errors[i + 2] += errB * 3 / 16;
          }
          const i = ((y + 1) * w + x) * 3;
          errors[i] += errR * 5 / 16;
          errors[i + 1] += errG * 5 / 16;
          errors[i + 2] += errB * 5 / 16;
          if (x + 1 < w) {
            const i = ((y + 1) * w + x + 1) * 3;
            errors[i] += errR * 1 / 16;
            errors[i + 1] += errG * 1 / 16;
            errors[i + 2] += errB * 1 / 16;
          }
        }
      }
    }
  }

  updatePaletteDisplay() {
    const display = document.getElementById('paletteDisplay');
    display.innerHTML = this.palette.map(c =>
      `<div class="palette-color" style="background: rgb(${c[0]}, ${c[1]}, ${c[2]})" title="RGB(${c[0]}, ${c[1]}, ${c[2]})"></div>`
    ).join('');
  }

  reset() {
    this.originalImage = null;
    this.settings = { colors: 16, iterations: 10, dithering: false };
    this.mode = 'median';
    this.palette = [];
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('colors').value = 16;
    document.getElementById('colorsValue').textContent = '16';
    document.getElementById('iterations').value = 10;
    document.getElementById('iterationsValue').textContent = '10';
    document.getElementById('dithering').checked = false;
    document.getElementById('paletteDisplay').innerHTML = '';
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `quantized_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ColorQuantizationTool());
