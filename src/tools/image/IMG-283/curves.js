class CurvesTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.curveCanvas = document.getElementById('curveCanvas');
    this.curveCtx = this.curveCanvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.currentChannel = 'rgb';
    this.curves = {
      rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
    };
    this.lookupTables = {
      rgb: null,
      red: null,
      green: null,
      blue: null
    };
    this.draggingPoint = null;
    this.init();
  }

  init() {
    this.setupCurveCanvas();
    this.bindEvents();
    this.updateLookupTables();
    this.drawCurve();
  }

  setupCurveCanvas() {
    const rect = this.curveCanvas.getBoundingClientRect();
    this.curveCanvas.width = rect.width * window.devicePixelRatio;
    this.curveCanvas.height = rect.height * window.devicePixelRatio;
    this.curveCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
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

    // Channel tabs
    document.querySelectorAll('.channel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentChannel = tab.dataset.channel;
        this.drawCurve();
      });
    });

    // Curve canvas interactions
    this.curveCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.curveCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.curveCanvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.curveCanvas.addEventListener('mouseleave', () => this.handleMouseUp());
    this.curveCanvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());

    // Handle resize
    window.addEventListener('resize', () => {
      this.setupCurveCanvas();
      this.drawCurve();
    });
  }

  getCurvePosition(e) {
    const rect = this.curveCanvas.getBoundingClientRect();
    const padding = 20;
    const size = rect.width - padding * 2;
    const x = ((e.clientX - rect.left - padding) / size) * 255;
    const y = (1 - (e.clientY - rect.top - padding) / size) * 255;
    return { x: Math.max(0, Math.min(255, x)), y: Math.max(0, Math.min(255, y)) };
  }

  handleMouseDown(e) {
    const pos = this.getCurvePosition(e);
    const points = this.curves[this.currentChannel];
    const threshold = 15;

    // Check if clicking on existing point
    for (let i = 0; i < points.length; i++) {
      const dx = Math.abs(points[i].x - pos.x);
      const dy = Math.abs(points[i].y - pos.y);
      if (dx < threshold && dy < threshold) {
        this.draggingPoint = i;
        return;
      }
    }

    // Add new point
    let insertIndex = points.length;
    for (let i = 0; i < points.length; i++) {
      if (points[i].x > pos.x) {
        insertIndex = i;
        break;
      }
    }
    points.splice(insertIndex, 0, { x: pos.x, y: pos.y });
    this.draggingPoint = insertIndex;
    this.updateLookupTables();
    this.drawCurve();
    this.render();
  }

  handleMouseMove(e) {
    if (this.draggingPoint === null) return;

    const pos = this.getCurvePosition(e);
    const points = this.curves[this.currentChannel];
    const point = points[this.draggingPoint];

    // Lock first and last points to edges
    if (this.draggingPoint === 0) {
      point.x = 0;
      point.y = pos.y;
    } else if (this.draggingPoint === points.length - 1) {
      point.x = 255;
      point.y = pos.y;
    } else {
      // Constrain x between neighbors
      const minX = points[this.draggingPoint - 1].x + 1;
      const maxX = points[this.draggingPoint + 1].x - 1;
      point.x = Math.max(minX, Math.min(maxX, pos.x));
      point.y = pos.y;
    }

    this.updateLookupTables();
    this.drawCurve();
    this.render();
  }

  handleMouseUp() {
    this.draggingPoint = null;
  }

  handleDoubleClick(e) {
    const pos = this.getCurvePosition(e);
    const points = this.curves[this.currentChannel];
    const threshold = 15;

    // Remove point (except first and last)
    for (let i = 1; i < points.length - 1; i++) {
      const dx = Math.abs(points[i].x - pos.x);
      const dy = Math.abs(points[i].y - pos.y);
      if (dx < threshold && dy < threshold) {
        points.splice(i, 1);
        this.updateLookupTables();
        this.drawCurve();
        this.render();
        return;
      }
    }
  }

  updateLookupTables() {
    for (const channel in this.curves) {
      this.lookupTables[channel] = this.createLookupTable(this.curves[channel]);
    }
  }

  createLookupTable(points) {
    const lut = new Uint8Array(256);

    for (let i = 0; i < 256; i++) {
      // Find the two points that bracket this value
      let p1 = points[0];
      let p2 = points[points.length - 1];

      for (let j = 0; j < points.length - 1; j++) {
        if (points[j].x <= i && points[j + 1].x >= i) {
          p1 = points[j];
          p2 = points[j + 1];
          break;
        }
      }

      // Linear interpolation
      if (p1.x === p2.x) {
        lut[i] = Math.round(p1.y);
      } else {
        const t = (i - p1.x) / (p2.x - p1.x);
        lut[i] = Math.round(p1.y + t * (p2.y - p1.y));
      }
    }

    return lut;
  }

  drawCurve() {
    const rect = this.curveCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const padding = 20;
    const size = width - padding * 2;

    this.curveCtx.clearRect(0, 0, width, height);

    // Draw background grid
    this.curveCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.curveCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const pos = padding + (size / 4) * i;
      this.curveCtx.beginPath();
      this.curveCtx.moveTo(pos, padding);
      this.curveCtx.lineTo(pos, padding + size);
      this.curveCtx.stroke();
      this.curveCtx.beginPath();
      this.curveCtx.moveTo(padding, pos);
      this.curveCtx.lineTo(padding + size, pos);
      this.curveCtx.stroke();
    }

    // Draw diagonal reference line
    this.curveCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.curveCtx.beginPath();
    this.curveCtx.moveTo(padding, padding + size);
    this.curveCtx.lineTo(padding + size, padding);
    this.curveCtx.stroke();

    // Draw histogram if image loaded
    if (this.imageData) {
      this.drawHistogram(padding, size);
    }

    // Draw curves for all channels (faded)
    const colors = {
      rgb: '#a855f7',
      red: '#ff4444',
      green: '#44ff44',
      blue: '#4444ff'
    };

    for (const channel in this.curves) {
      if (channel !== this.currentChannel) {
        this.drawCurveLine(this.curves[channel], colors[channel], 0.3, padding, size);
      }
    }

    // Draw current channel curve
    this.drawCurveLine(this.curves[this.currentChannel], colors[this.currentChannel], 1, padding, size);

    // Draw control points for current channel
    const points = this.curves[this.currentChannel];
    this.curveCtx.fillStyle = colors[this.currentChannel];
    for (const point of points) {
      const px = padding + (point.x / 255) * size;
      const py = padding + (1 - point.y / 255) * size;
      this.curveCtx.beginPath();
      this.curveCtx.arc(px, py, 6, 0, Math.PI * 2);
      this.curveCtx.fill();
      this.curveCtx.strokeStyle = '#fff';
      this.curveCtx.lineWidth = 2;
      this.curveCtx.stroke();
    }
  }

  drawCurveLine(points, color, alpha, padding, size) {
    this.curveCtx.strokeStyle = color;
    this.curveCtx.globalAlpha = alpha;
    this.curveCtx.lineWidth = 2;
    this.curveCtx.beginPath();

    const lut = this.createLookupTable(points);
    for (let i = 0; i < 256; i++) {
      const x = padding + (i / 255) * size;
      const y = padding + (1 - lut[i] / 255) * size;
      if (i === 0) {
        this.curveCtx.moveTo(x, y);
      } else {
        this.curveCtx.lineTo(x, y);
      }
    }
    this.curveCtx.stroke();
    this.curveCtx.globalAlpha = 1;
  }

  drawHistogram(padding, size) {
    const data = this.imageData.data;
    const histogram = { r: new Array(256).fill(0), g: new Array(256).fill(0), b: new Array(256).fill(0) };

    for (let i = 0; i < data.length; i += 4) {
      histogram.r[data[i]]++;
      histogram.g[data[i + 1]]++;
      histogram.b[data[i + 2]]++;
    }

    const maxVal = Math.max(...histogram.r, ...histogram.g, ...histogram.b);

    const colors = { r: 'rgba(255, 68, 68, 0.2)', g: 'rgba(68, 255, 68, 0.2)', b: 'rgba(68, 68, 255, 0.2)' };

    for (const channel of ['r', 'g', 'b']) {
      this.curveCtx.fillStyle = colors[channel];
      for (let i = 0; i < 256; i++) {
        const x = padding + (i / 255) * size;
        const h = (histogram[channel][i] / maxVal) * size * 0.5;
        this.curveCtx.fillRect(x, padding + size - h, size / 256, h);
      }
    }
  }

  applyPreset(preset) {
    switch (preset) {
      case 'contrast':
        this.curves[this.currentChannel] = [
          { x: 0, y: 0 },
          { x: 64, y: 48 },
          { x: 192, y: 208 },
          { x: 255, y: 255 }
        ];
        break;
      case 'brighten':
        this.curves[this.currentChannel] = [
          { x: 0, y: 0 },
          { x: 128, y: 160 },
          { x: 255, y: 255 }
        ];
        break;
      case 'darken':
        this.curves[this.currentChannel] = [
          { x: 0, y: 0 },
          { x: 128, y: 96 },
          { x: 255, y: 255 }
        ];
        break;
      case 'fade':
        this.curves[this.currentChannel] = [
          { x: 0, y: 32 },
          { x: 255, y: 224 }
        ];
        break;
      case 'negative':
        this.curves[this.currentChannel] = [
          { x: 0, y: 255 },
          { x: 255, y: 0 }
        ];
        break;
      case 'reset':
        this.curves[this.currentChannel] = [
          { x: 0, y: 0 },
          { x: 255, y: 255 }
        ];
        break;
    }

    this.updateLookupTables();
    this.drawCurve();
    this.render();
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
        this.drawCurve();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;

    const rgbLut = this.lookupTables.rgb;
    const rLut = this.lookupTables.red;
    const gLut = this.lookupTables.green;
    const bLut = this.lookupTables.blue;

    for (let i = 0; i < srcData.length; i += 4) {
      // Apply individual channel curves first, then RGB curve
      let r = rLut[srcData[i]];
      let g = gLut[srcData[i + 1]];
      let b = bLut[srcData[i + 2]];

      // Apply RGB curve to all channels
      dstData[i] = rgbLut[r];
      dstData[i + 1] = rgbLut[g];
      dstData[i + 2] = rgbLut[b];
      dstData[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'curves-adjusted-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.curves = {
      rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
    };
    this.currentChannel = 'rgb';
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.channel-tab[data-channel="rgb"]').classList.add('active');
    this.updateLookupTables();
    this.drawCurve();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CurvesTool();
});
