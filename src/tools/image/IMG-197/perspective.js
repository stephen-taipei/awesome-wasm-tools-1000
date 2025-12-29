/**
 * IMG-197 圖片透視工具
 */
class PerspectiveTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { rotateX: 0, rotateY: 0, perspective: 500 };
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
        const preset = btn.dataset.preset;
        switch (preset) {
          case 'left': this.setValues(0, -30, 500); break;
          case 'right': this.setValues(0, 30, 500); break;
          case 'top': this.setValues(-30, 0, 500); break;
          case 'bottom': this.setValues(30, 0, 500); break;
          case 'isometric': this.setValues(30, -30, 800); break;
          case 'reset': this.setValues(0, 0, 500); break;
        }
        this.render();
      });
    });

    document.getElementById('rotateX').addEventListener('input', (e) => {
      this.settings.rotateX = parseInt(e.target.value);
      document.getElementById('rotateXValue').textContent = this.settings.rotateX + '°';
      this.render();
    });

    document.getElementById('rotateY').addEventListener('input', (e) => {
      this.settings.rotateY = parseInt(e.target.value);
      document.getElementById('rotateYValue').textContent = this.settings.rotateY + '°';
      this.render();
    });

    document.getElementById('perspective').addEventListener('input', (e) => {
      this.settings.perspective = parseInt(e.target.value);
      document.getElementById('perspectiveValue').textContent = this.settings.perspective;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  setValues(x, y, p) {
    this.settings = { rotateX: x, rotateY: y, perspective: p };
    document.getElementById('rotateX').value = x;
    document.getElementById('rotateXValue').textContent = x + '°';
    document.getElementById('rotateY').value = y;
    document.getElementById('rotateYValue').textContent = y + '°';
    document.getElementById('perspective').value = p;
    document.getElementById('perspectiveValue').textContent = p;
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.setValues(0, 0, 500);
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
    const { rotateX, rotateY, perspective } = this.settings;
    const img = this.originalImage;

    // Calculate transformed corners
    const corners = this.getTransformedCorners(img.width, img.height, rotateX, rotateY, perspective);

    // Find bounding box
    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padding = 20;
    const w = Math.ceil(maxX - minX) + padding * 2;
    const h = Math.ceil(maxY - minY) + padding * 2;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.clearRect(0, 0, w, h);

    // Offset corners
    const offsetCorners = corners.map(c => ({
      x: c.x - minX + padding,
      y: c.y - minY + padding
    }));

    // Draw using triangles for perspective mapping
    this.drawPerspective(img, offsetCorners);
  }

  getTransformedCorners(w, h, rotX, rotY, persp) {
    const cx = w / 2, cy = h / 2;
    const radX = rotX * Math.PI / 180;
    const radY = rotY * Math.PI / 180;

    const corners = [
      { x: -cx, y: -cy, z: 0 },
      { x: cx, y: -cy, z: 0 },
      { x: cx, y: cy, z: 0 },
      { x: -cx, y: cy, z: 0 }
    ];

    return corners.map(c => {
      // Rotate around X axis
      let y = c.y * Math.cos(radX) - c.z * Math.sin(radX);
      let z = c.y * Math.sin(radX) + c.z * Math.cos(radX);
      c.y = y; c.z = z;

      // Rotate around Y axis
      let x = c.x * Math.cos(radY) + c.z * Math.sin(radY);
      z = -c.x * Math.sin(radY) + c.z * Math.cos(radY);
      c.x = x; c.z = z;

      // Apply perspective
      const scale = persp / (persp + c.z);
      return {
        x: c.x * scale + cx,
        y: c.y * scale + cy
      };
    });
  }

  drawPerspective(img, corners) {
    // Use canvas transform for simple approximation
    // For accurate perspective, we'd need texture mapping
    const [tl, tr, br, bl] = corners;

    // Draw using path clipping and transform
    this.ctx.save();

    // Calculate transform matrix (simplified)
    const srcW = img.width, srcH = img.height;

    // Use two triangles
    this.drawTriangle(img, 0, 0, srcW, 0, 0, srcH, tl, tr, bl);
    this.drawTriangle(img, srcW, 0, srcW, srcH, 0, srcH, tr, br, bl);

    this.ctx.restore();
  }

  drawTriangle(img, x0, y0, x1, y1, x2, y2, d0, d1, d2) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(d0.x, d0.y);
    ctx.lineTo(d1.x, d1.y);
    ctx.lineTo(d2.x, d2.y);
    ctx.closePath();
    ctx.clip();

    const denom = x0 * (y1 - y2) - x1 * (y0 - y2) + x2 * (y0 - y1);
    if (Math.abs(denom) < 0.01) { ctx.restore(); return; }

    const m11 = -(y0 * (d1.x - d2.x) - y1 * (d0.x - d2.x) + y2 * (d0.x - d1.x)) / denom;
    const m12 = (x0 * (d1.x - d2.x) - x1 * (d0.x - d2.x) + x2 * (d0.x - d1.x)) / denom;
    const m13 = (x0 * (y1 * d2.x - y2 * d1.x) - x1 * (y0 * d2.x - y2 * d0.x) + x2 * (y0 * d1.x - y1 * d0.x)) / denom;
    const m21 = -(y0 * (d1.y - d2.y) - y1 * (d0.y - d2.y) + y2 * (d0.y - d1.y)) / denom;
    const m22 = (x0 * (d1.y - d2.y) - x1 * (d0.y - d2.y) + x2 * (d0.y - d1.y)) / denom;
    const m23 = (x0 * (y1 * d2.y - y2 * d1.y) - x1 * (y0 * d2.y - y2 * d0.y) + x2 * (y0 * d1.y - y1 * d0.y)) / denom;

    ctx.transform(m11, m21, m12, m22, m13, m23);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  reset() {
    this.originalImage = null;
    this.setValues(0, 0, 500);
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `perspective_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new PerspectiveTool());
