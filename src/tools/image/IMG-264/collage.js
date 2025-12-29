class CollageTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.images = [];
    this.settings = {
      layout: '2x2',
      gap: 10,
      radius: 0,
      bgColor: '#ffffff',
      outputWidth: 1200
    };
    this.layouts = [
      { id: '2x1', cols: 2, rows: 1, cells: 2 },
      { id: '1x2', cols: 1, rows: 2, cells: 2 },
      { id: '2x2', cols: 2, rows: 2, cells: 4 },
      { id: '3x1', cols: 3, rows: 1, cells: 3 },
      { id: '1x3', cols: 1, rows: 3, cells: 3 },
      { id: '3x2', cols: 3, rows: 2, cells: 6 },
      { id: '2x3', cols: 2, rows: 3, cells: 6 },
      { id: '3x3', cols: 3, rows: 3, cells: 9 }
    ];
    this.init();
  }

  init() {
    this.createLayoutButtons();
    this.bindEvents();
  }

  createLayoutButtons() {
    const grid = document.getElementById('layoutGrid');
    this.layouts.forEach(layout => {
      const btn = document.createElement('button');
      btn.className = 'layout-btn' + (layout.id === this.settings.layout ? ' active' : '');
      btn.dataset.layout = layout.id;

      const preview = document.createElement('div');
      preview.className = 'layout-preview';
      preview.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
      preview.style.gridTemplateRows = `repeat(${layout.rows}, 1fr)`;

      for (let i = 0; i < layout.cells; i++) {
        const cell = document.createElement('div');
        preview.appendChild(cell);
      }

      btn.appendChild(preview);
      btn.innerHTML += layout.id;
      grid.appendChild(btn);
    });
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
        this.loadImages(Array.from(e.dataTransfer.files));
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImages(Array.from(e.target.files));
      }
    });

    // Add more images button
    document.getElementById('addMoreBtn').addEventListener('click', () => {
      fileInput.click();
    });

    // Layout buttons
    document.getElementById('layoutGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('.layout-btn');
      if (btn) {
        document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.layout = btn.dataset.layout;
        this.render();
      }
    });

    // Gap slider
    const gapSlider = document.getElementById('gap');
    gapSlider.addEventListener('input', (e) => {
      this.settings.gap = parseInt(e.target.value);
      document.getElementById('gapValue').textContent = `${this.settings.gap}px`;
      this.render();
    });

    // Radius slider
    const radiusSlider = document.getElementById('radius');
    radiusSlider.addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = `${this.settings.radius}px`;
      this.render();
    });

    // Background color
    const bgColorInput = document.getElementById('bgColor');
    bgColorInput.addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImages(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    let loaded = 0;

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.images.push({ img, name: file.name });
          loaded++;
          if (loaded === imageFiles.length) {
            this.updateImageList();
            document.getElementById('editorSection').classList.add('active');
            this.render();
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  updateImageList() {
    const list = document.getElementById('imageList');
    list.innerHTML = '';

    this.images.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'image-item';
      div.innerHTML = `
        <img src="${item.img.src}" class="image-thumb" alt="">
        <span class="image-name">${item.name}</span>
        <button class="image-remove" data-index="${index}">×</button>
      `;
      list.appendChild(div);
    });

    // Remove image events
    list.querySelectorAll('.image-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.images.splice(index, 1);
        this.updateImageList();
        this.render();
      });
    });
  }

  getLayoutConfig() {
    return this.layouts.find(l => l.id === this.settings.layout) || this.layouts[2];
  }

  render() {
    if (this.images.length === 0) return;

    const layout = this.getLayoutConfig();
    const gap = this.settings.gap;
    const cellWidth = Math.floor((this.settings.outputWidth - gap * (layout.cols + 1)) / layout.cols);
    const cellHeight = cellWidth; // Square cells

    const canvasWidth = cellWidth * layout.cols + gap * (layout.cols + 1);
    const canvasHeight = cellHeight * layout.rows + gap * (layout.rows + 1);

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    // Fill background
    this.ctx.fillStyle = this.settings.bgColor;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw images in grid
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        const index = row * layout.cols + col;
        if (index < this.images.length) {
          const x = gap + col * (cellWidth + gap);
          const y = gap + row * (cellHeight + gap);
          this.drawImageInCell(this.images[index].img, x, y, cellWidth, cellHeight);
        }
      }
    }
  }

  drawImageInCell(img, x, y, width, height) {
    const radius = this.settings.radius;

    this.ctx.save();

    // Create rounded rect clip
    if (radius > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + width - radius, y);
      this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.ctx.lineTo(x + width, y + height - radius);
      this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      this.ctx.lineTo(x + radius, y + height);
      this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
      this.ctx.closePath();
      this.ctx.clip();
    }

    // Calculate cover dimensions
    const imgRatio = img.width / img.height;
    const cellRatio = width / height;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgRatio > cellRatio) {
      drawHeight = height;
      drawWidth = height * imgRatio;
      offsetX = x - (drawWidth - width) / 2;
      offsetY = y;
    } else {
      drawWidth = width;
      drawHeight = width / imgRatio;
      offsetX = x;
      offsetY = y - (drawHeight - height) / 2;
    }

    this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    this.ctx.restore();
  }

  download() {
    const link = document.createElement('a');
    link.download = 'collage.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.images = [];
    this.settings = {
      layout: '2x2',
      gap: 10,
      radius: 0,
      bgColor: '#ffffff',
      outputWidth: 1200
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('imageList').innerHTML = '';
    document.getElementById('gap').value = 10;
    document.getElementById('gapValue').textContent = '10px';
    document.getElementById('radius').value = 0;
    document.getElementById('radiusValue').textContent = '0px';
    document.getElementById('bgColor').value = '#ffffff';
    document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.layout-btn[data-layout="2x2"]')?.classList.add('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CollageTool();
});
