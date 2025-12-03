/**
 * IMG-057 照片拼貼模板
 * 使用預設模板快速製作精美拼貼畫
 */

class CollageTemplateTool {
  constructor() {
    this.templates = this.defineTemplates();
    this.selectedTemplate = null;
    this.slots = [];
    this.activeSlotIndex = -1;
    this.canvasSize = 800;
    this.gap = 10;
    this.borderRadius = 8;
    this.bgColor = '#1a1a2e';

    this.init();
  }

  defineTemplates() {
    return [
      {
        id: 'grid-2x2',
        name: '2×2 網格',
        slots: [
          { x: 0, y: 0, w: 0.5, h: 0.5 },
          { x: 0.5, y: 0, w: 0.5, h: 0.5 },
          { x: 0, y: 0.5, w: 0.5, h: 0.5 },
          { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
        ],
        preview: { cols: 2, rows: 2 }
      },
      {
        id: 'grid-3x3',
        name: '3×3 網格',
        slots: [
          { x: 0, y: 0, w: 1/3, h: 1/3 },
          { x: 1/3, y: 0, w: 1/3, h: 1/3 },
          { x: 2/3, y: 0, w: 1/3, h: 1/3 },
          { x: 0, y: 1/3, w: 1/3, h: 1/3 },
          { x: 1/3, y: 1/3, w: 1/3, h: 1/3 },
          { x: 2/3, y: 1/3, w: 1/3, h: 1/3 },
          { x: 0, y: 2/3, w: 1/3, h: 1/3 },
          { x: 1/3, y: 2/3, w: 1/3, h: 1/3 },
          { x: 2/3, y: 2/3, w: 1/3, h: 1/3 }
        ],
        preview: { cols: 3, rows: 3 }
      },
      {
        id: 'left-big',
        name: '左大右小',
        slots: [
          { x: 0, y: 0, w: 0.6, h: 1 },
          { x: 0.6, y: 0, w: 0.4, h: 0.5 },
          { x: 0.6, y: 0.5, w: 0.4, h: 0.5 }
        ],
        preview: { custom: [[0.6, 1], [0.4, 0.5], [0.4, 0.5]] }
      },
      {
        id: 'right-big',
        name: '右大左小',
        slots: [
          { x: 0, y: 0, w: 0.4, h: 0.5 },
          { x: 0, y: 0.5, w: 0.4, h: 0.5 },
          { x: 0.4, y: 0, w: 0.6, h: 1 }
        ],
        preview: { custom: [[0.4, 0.5], [0.4, 0.5], [0.6, 1]] }
      },
      {
        id: 'top-big',
        name: '上大下小',
        slots: [
          { x: 0, y: 0, w: 1, h: 0.6 },
          { x: 0, y: 0.6, w: 0.5, h: 0.4 },
          { x: 0.5, y: 0.6, w: 0.5, h: 0.4 }
        ],
        preview: { custom: [[1, 0.6], [0.5, 0.4], [0.5, 0.4]] }
      },
      {
        id: 'bottom-big',
        name: '下大上小',
        slots: [
          { x: 0, y: 0, w: 0.5, h: 0.4 },
          { x: 0.5, y: 0, w: 0.5, h: 0.4 },
          { x: 0, y: 0.4, w: 1, h: 0.6 }
        ],
        preview: { custom: [[0.5, 0.4], [0.5, 0.4], [1, 0.6]] }
      },
      {
        id: 'center-focus',
        name: '中心焦點',
        slots: [
          { x: 0.2, y: 0.2, w: 0.6, h: 0.6 },
          { x: 0, y: 0, w: 0.25, h: 0.25 },
          { x: 0.75, y: 0, w: 0.25, h: 0.25 },
          { x: 0, y: 0.75, w: 0.25, h: 0.25 },
          { x: 0.75, y: 0.75, w: 0.25, h: 0.25 }
        ],
        preview: { custom: 'center' }
      },
      {
        id: 'horizontal-strip',
        name: '橫向三連',
        slots: [
          { x: 0, y: 0.25, w: 1/3, h: 0.5 },
          { x: 1/3, y: 0.25, w: 1/3, h: 0.5 },
          { x: 2/3, y: 0.25, w: 1/3, h: 0.5 }
        ],
        preview: { cols: 3, rows: 1, aspect: 0.5 }
      },
      {
        id: 'vertical-strip',
        name: '直向三連',
        slots: [
          { x: 0.25, y: 0, w: 0.5, h: 1/3 },
          { x: 0.25, y: 1/3, w: 0.5, h: 1/3 },
          { x: 0.25, y: 2/3, w: 0.5, h: 1/3 }
        ],
        preview: { cols: 1, rows: 3, aspect: 0.5 }
      },
      {
        id: 'diagonal',
        name: '對角排列',
        slots: [
          { x: 0, y: 0, w: 0.55, h: 0.55 },
          { x: 0.45, y: 0.45, w: 0.55, h: 0.55 }
        ],
        preview: { custom: 'diagonal' }
      },
      {
        id: 'mosaic-5',
        name: '五格拼貼',
        slots: [
          { x: 0, y: 0, w: 0.5, h: 0.5 },
          { x: 0.5, y: 0, w: 0.5, h: 0.25 },
          { x: 0.5, y: 0.25, w: 0.5, h: 0.25 },
          { x: 0, y: 0.5, w: 0.25, h: 0.5 },
          { x: 0.25, y: 0.5, w: 0.75, h: 0.5 }
        ],
        preview: { custom: 'mosaic5' }
      },
      {
        id: 'polaroid',
        name: '拍立得風格',
        slots: [
          { x: 0.05, y: 0.05, w: 0.4, h: 0.55 },
          { x: 0.55, y: 0.1, w: 0.4, h: 0.55 },
          { x: 0.3, y: 0.4, w: 0.4, h: 0.55 }
        ],
        preview: { custom: 'polaroid' }
      }
    ];
  }

  init() {
    this.templateGrid = document.getElementById('templateGrid');
    this.editorSection = document.getElementById('editorSection');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.slotsList = document.getElementById('slotsList');
    this.collageCanvas = document.getElementById('collageCanvas');
    this.ctx = this.collageCanvas.getContext('2d');
    this.outputInfo = document.getElementById('outputInfo');

    this.gapSlider = document.getElementById('gapSlider');
    this.gapValue = document.getElementById('gapValue');
    this.radiusSlider = document.getElementById('radiusSlider');
    this.radiusValue = document.getElementById('radiusValue');
    this.bgColorPicker = document.getElementById('bgColorPicker');

    this.fileInput = document.getElementById('fileInput');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.renderTemplates();
    this.bindEvents();
  }

  renderTemplates() {
    this.templateGrid.innerHTML = '';

    this.templates.forEach(template => {
      const item = document.createElement('div');
      item.className = 'template-item';
      item.dataset.id = template.id;

      const preview = document.createElement('div');
      preview.className = 'template-preview';
      preview.style.cssText = this.getPreviewStyle(template);
      preview.innerHTML = this.getPreviewHTML(template);

      const name = document.createElement('div');
      name.className = 'template-name';
      name.textContent = template.name;

      item.appendChild(preview);
      item.appendChild(name);
      item.addEventListener('click', () => this.selectTemplate(template));

      this.templateGrid.appendChild(item);
    });
  }

  getPreviewStyle(template) {
    if (template.preview.cols && template.preview.rows) {
      return `grid-template-columns: repeat(${template.preview.cols}, 1fr); grid-template-rows: repeat(${template.preview.rows}, 1fr);`;
    }
    return 'position: relative;';
  }

  getPreviewHTML(template) {
    if (template.preview.cols && template.preview.rows) {
      let html = '';
      for (let i = 0; i < template.preview.cols * template.preview.rows; i++) {
        html += '<div></div>';
      }
      return html;
    }

    // Custom previews
    let html = '';
    template.slots.forEach((slot, i) => {
      const style = `position: absolute; left: ${slot.x * 100}%; top: ${slot.y * 100}%; width: ${slot.w * 100}%; height: ${slot.h * 100}%;`;
      html += `<div style="${style}"></div>`;
    });
    return html;
  }

  bindEvents() {
    this.gapSlider.addEventListener('input', () => {
      this.gap = parseInt(this.gapSlider.value);
      this.gapValue.textContent = `${this.gap}px`;
      this.render();
    });

    this.radiusSlider.addEventListener('input', () => {
      this.borderRadius = parseInt(this.radiusSlider.value);
      this.radiusValue.textContent = `${this.borderRadius}px`;
      this.render();
    });

    this.bgColorPicker.addEventListener('input', () => {
      this.bgColor = this.bgColorPicker.value;
      this.updateColorPresets();
      this.render();
    });

    document.querySelectorAll('.color-preset').forEach(el => {
      el.addEventListener('click', () => {
        this.bgColor = el.dataset.color;
        this.bgColorPicker.value = this.bgColor;
        this.updateColorPresets();
        this.render();
      });
    });

    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && this.activeSlotIndex >= 0) {
        this.loadImageToSlot(file, this.activeSlotIndex);
      }
      this.fileInput.value = '';
    });

    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateColorPresets() {
    document.querySelectorAll('.color-preset').forEach(el => {
      el.classList.toggle('active', el.dataset.color === this.bgColor);
    });
  }

  selectTemplate(template) {
    this.selectedTemplate = template;

    // Update UI
    document.querySelectorAll('.template-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === template.id);
    });

    // Initialize slots
    this.slots = template.slots.map((slot, i) => ({
      ...slot,
      image: null,
      index: i
    }));

    this.editorSection.style.display = 'block';
    this.optionsPanel.style.display = 'block';

    this.renderSlotsList();
    this.render();
    this.updateDownloadButton();
  }

  renderSlotsList() {
    this.slotsList.innerHTML = '';

    this.slots.forEach((slot, index) => {
      const item = document.createElement('div');
      item.className = 'slot-item' + (slot.image ? ' filled' : '') + (index === this.activeSlotIndex ? ' active' : '');
      item.dataset.index = index;

      const preview = document.createElement('div');
      preview.className = 'slot-preview';
      if (slot.image) {
        const img = document.createElement('img');
        img.src = slot.dataUrl;
        preview.appendChild(img);
      } else {
        preview.textContent = '📷';
      }

      const info = document.createElement('div');
      info.className = 'slot-info';
      info.innerHTML = `
        <div class="slot-label">位置 ${index + 1}</div>
        <div class="slot-size">${Math.round(slot.w * 100)}% × ${Math.round(slot.h * 100)}%</div>
      `;

      const actions = document.createElement('div');
      actions.className = 'slot-actions';

      const uploadBtn = document.createElement('button');
      uploadBtn.className = 'slot-btn upload';
      uploadBtn.textContent = '+';
      uploadBtn.title = '上傳圖片';
      uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeSlotIndex = index;
        this.fileInput.click();
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'slot-btn remove';
      removeBtn.textContent = '×';
      removeBtn.title = '移除圖片';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeSlotImage(index);
      });

      actions.appendChild(uploadBtn);
      actions.appendChild(removeBtn);

      item.appendChild(preview);
      item.appendChild(info);
      item.appendChild(actions);

      item.addEventListener('click', () => {
        this.activeSlotIndex = index;
        this.renderSlotsList();
        if (!slot.image) {
          this.fileInput.click();
        }
      });

      this.slotsList.appendChild(item);
    });
  }

  loadImageToSlot(file, index) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.slots[index].image = img;
        this.slots[index].dataUrl = e.target.result;
        this.renderSlotsList();
        this.render();
        this.updateDownloadButton();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeSlotImage(index) {
    this.slots[index].image = null;
    this.slots[index].dataUrl = null;
    this.renderSlotsList();
    this.render();
    this.updateDownloadButton();
  }

  render() {
    if (!this.selectedTemplate) return;

    const size = this.canvasSize;
    this.collageCanvas.width = size;
    this.collageCanvas.height = size;

    // Background
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, size, size);

    const gap = this.gap;
    const radius = this.borderRadius;

    this.slots.forEach((slot, index) => {
      const x = slot.x * size + gap / 2;
      const y = slot.y * size + gap / 2;
      const w = slot.w * size - gap;
      const h = slot.h * size - gap;

      // Draw slot background
      this.ctx.save();
      this.roundRect(x, y, w, h, radius);
      this.ctx.clip();

      if (slot.image) {
        // Draw image with cover fit
        this.drawImageCover(slot.image, x, y, w, h);
      } else {
        // Empty slot placeholder
        this.ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
        this.ctx.fillRect(x, y, w, h);

        // Draw placeholder text
        this.ctx.fillStyle = 'rgba(102, 126, 234, 0.5)';
        this.ctx.font = '24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${index + 1}`, x + w / 2, y + h / 2);
      }

      this.ctx.restore();

      // Draw border for empty slots
      if (!slot.image) {
        this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.roundRect(x, y, w, h, radius);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    });

    this.outputInfo.textContent = `${size} × ${size} px`;
  }

  roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  drawImageCover(img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const slotRatio = w / h;

    let sx, sy, sw, sh;

    if (imgRatio > slotRatio) {
      // Image is wider, crop sides
      sh = img.height;
      sw = sh * slotRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      // Image is taller, crop top/bottom
      sw = img.width;
      sh = sw / slotRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }

    this.ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  updateDownloadButton() {
    const hasAnyImage = this.slots.some(slot => slot.image);
    this.downloadBtn.disabled = !hasAnyImage;
  }

  download() {
    const hasAnyImage = this.slots.some(slot => slot.image);
    if (!hasAnyImage) {
      this.showStatus('error', '請至少上傳一張照片');
      return;
    }

    this.collageCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `collage_${this.selectedTemplate.id}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);

      this.showStatus('success', '拼貼圖已下載');
    }, 'image/png');
  }

  reset() {
    this.selectedTemplate = null;
    this.slots = [];
    this.activeSlotIndex = -1;

    document.querySelectorAll('.template-item').forEach(el => {
      el.classList.remove('selected');
    });

    this.editorSection.style.display = 'none';
    this.optionsPanel.style.display = 'none';
    this.downloadBtn.disabled = true;

    this.gap = 10;
    this.borderRadius = 8;
    this.bgColor = '#1a1a2e';

    this.gapSlider.value = 10;
    this.gapValue.textContent = '10px';
    this.radiusSlider.value = 8;
    this.radiusValue.textContent = '8px';
    this.bgColorPicker.value = '#1a1a2e';
    this.updateColorPresets();

    this.ctx.clearRect(0, 0, this.collageCanvas.width, this.collageCanvas.height);
    this.outputInfo.textContent = '';
    this.slotsList.innerHTML = '';

    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new CollageTemplateTool();
});
