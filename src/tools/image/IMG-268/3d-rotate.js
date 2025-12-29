class Rotate3DTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.settings = {
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      perspective: 500,
      bgColor: '#1a1a2e',
      addShadow: false
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

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.rotateX = parseInt(btn.dataset.x);
        this.settings.rotateY = parseInt(btn.dataset.y);
        document.getElementById('rotateX').value = this.settings.rotateX;
        document.getElementById('rotateY').value = this.settings.rotateY;
        document.getElementById('rotateXValue').textContent = `${this.settings.rotateX}°`;
        document.getElementById('rotateYValue').textContent = `${this.settings.rotateY}°`;
        this.render();
      });
    });

    // Rotation sliders
    ['rotateX', 'rotateY', 'rotateZ'].forEach(param => {
      const slider = document.getElementById(param);
      slider.addEventListener('input', (e) => {
        this.settings[param] = parseInt(e.target.value);
        document.getElementById(`${param}Value`).textContent = `${this.settings[param]}°`;
        this.render();
      });
    });

    // Perspective slider
    const perspectiveSlider = document.getElementById('perspective');
    perspectiveSlider.addEventListener('input', (e) => {
      this.settings.perspective = parseInt(e.target.value);
      document.getElementById('perspectiveValue').textContent = this.settings.perspective;
      this.render();
    });

    // Background color
    const bgColorInput = document.getElementById('bgColor');
    bgColorInput.addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    // Add shadow checkbox
    const addShadowCheckbox = document.getElementById('addShadow');
    addShadowCheckbox.addEventListener('change', (e) => {
      this.settings.addShadow = e.target.checked;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 3D transformation matrix calculations
  multiply(a, b) {
    const result = [];
    for (let i = 0; i < 4; i++) {
      result[i] = [];
      for (let j = 0; j < 4; j++) {
        result[i][j] = 0;
        for (let k = 0; k < 4; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  }

  getRotationMatrixX(angle) {
    const rad = (angle * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
      [1, 0, 0, 0],
      [0, c, -s, 0],
      [0, s, c, 0],
      [0, 0, 0, 1]
    ];
  }

  getRotationMatrixY(angle) {
    const rad = (angle * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
      [c, 0, s, 0],
      [0, 1, 0, 0],
      [-s, 0, c, 0],
      [0, 0, 0, 1]
    ];
  }

  getRotationMatrixZ(angle) {
    const rad = (angle * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
      [c, -s, 0, 0],
      [s, c, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
  }

  transformPoint(x, y, z, matrix, perspective) {
    const w = 1;
    const tx = matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z + matrix[0][3] * w;
    const ty = matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z + matrix[1][3] * w;
    const tz = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z + matrix[2][3] * w;

    // Apply perspective
    const scale = perspective / (perspective + tz);
    return {
      x: tx * scale,
      y: ty * scale,
      scale: scale
    };
  }

  render() {
    if (!this.originalImage) return;

    const img = this.originalImage;
    const padding = 100;
    const maxDim = Math.max(img.width, img.height);
    const canvasSize = maxDim + padding * 2;

    this.canvas.width = canvasSize;
    this.canvas.height = canvasSize;

    // Fill background
    this.ctx.fillStyle = this.settings.bgColor;
    this.ctx.fillRect(0, 0, canvasSize, canvasSize);

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const halfW = img.width / 2;
    const halfH = img.height / 2;

    // Calculate transformation matrix
    let matrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];

    matrix = this.multiply(matrix, this.getRotationMatrixX(this.settings.rotateX));
    matrix = this.multiply(matrix, this.getRotationMatrixY(this.settings.rotateY));
    matrix = this.multiply(matrix, this.getRotationMatrixZ(this.settings.rotateZ));

    // Transform corners
    const corners = [
      { x: -halfW, y: -halfH, z: 0 },
      { x: halfW, y: -halfH, z: 0 },
      { x: halfW, y: halfH, z: 0 },
      { x: -halfW, y: halfH, z: 0 }
    ];

    const transformedCorners = corners.map(c => {
      const t = this.transformPoint(c.x, c.y, c.z, matrix, this.settings.perspective);
      return {
        x: t.x + centerX,
        y: t.y + centerY
      };
    });

    // Draw shadow if enabled
    if (this.settings.addShadow) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.filter = 'blur(20px)';
      this.ctx.beginPath();
      this.ctx.moveTo(transformedCorners[0].x + 10, transformedCorners[0].y + 20);
      for (let i = 1; i < transformedCorners.length; i++) {
        this.ctx.lineTo(transformedCorners[i].x + 10, transformedCorners[i].y + 20);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }

    // Use canvas 2D transformation to approximate 3D
    // We'll use a simple approach with setTransform for the main rotation
    this.ctx.save();

    // Draw the transformed image using perspective transform
    this.drawPerspectiveImage(img, transformedCorners);

    this.ctx.restore();
  }

  drawPerspectiveImage(img, corners) {
    // Create a temporary canvas for the source image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);

    // Use texture mapping approach - draw in strips for better quality
    const steps = Math.max(img.width, img.height);

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const t2 = (i + 1) / steps;

      // Interpolate corners for this strip
      const left1 = this.lerp2D(corners[0], corners[3], t);
      const right1 = this.lerp2D(corners[1], corners[2], t);
      const left2 = this.lerp2D(corners[0], corners[3], t2);
      const right2 = this.lerp2D(corners[1], corners[2], t2);

      // Draw strip
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(left1.x, left1.y);
      this.ctx.lineTo(right1.x, right1.y);
      this.ctx.lineTo(right2.x, right2.y);
      this.ctx.lineTo(left2.x, left2.y);
      this.ctx.closePath();
      this.ctx.clip();

      // Calculate transform for this strip
      const srcY = t * img.height;
      const srcH = img.height / steps;

      const scaleX = Math.sqrt(
        Math.pow(right1.x - left1.x, 2) + Math.pow(right1.y - left1.y, 2)
      ) / img.width;

      const angle = Math.atan2(right1.y - left1.y, right1.x - left1.x);

      this.ctx.translate(left1.x, left1.y);
      this.ctx.rotate(angle);
      this.ctx.scale(scaleX, 1);

      this.ctx.drawImage(
        tempCanvas,
        0, srcY, img.width, srcH + 1,
        0, 0, img.width, srcH + 1
      );

      this.ctx.restore();
    }
  }

  lerp2D(p1, p2, t) {
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    };
  }

  download() {
    const link = document.createElement('a');
    link.download = '3d-rotated-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.settings = {
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      perspective: 500,
      bgColor: '#1a1a2e',
      addShadow: false
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('rotateX').value = 0;
    document.getElementById('rotateY').value = 0;
    document.getElementById('rotateZ').value = 0;
    document.getElementById('perspective').value = 500;
    document.getElementById('rotateXValue').textContent = '0°';
    document.getElementById('rotateYValue').textContent = '0°';
    document.getElementById('rotateZValue').textContent = '0°';
    document.getElementById('perspectiveValue').textContent = '500';
    document.getElementById('addShadow').checked = false;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Rotate3DTool();
});
