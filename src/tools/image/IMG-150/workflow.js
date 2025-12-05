/**
 * IMG-150 圖片處理工作流
 * Image Processing Workflow Tool
 */

class ImageWorkflow {
  constructor() {
    this.originalImage = null;
    this.currentCanvas = null;
    this.workflowSteps = [];
    this.activeStepIndex = -1;

    this.stepDefinitions = {
      resize: { name: '調整尺寸', icon: '📐', params: { width: 800, height: 600, keepRatio: true } },
      rotate: { name: '旋轉', icon: '🔄', params: { angle: 90 } },
      flip: { name: '翻轉', icon: '↔️', params: { direction: 'horizontal' } },
      crop: { name: '裁切', icon: '✂️', params: { x: 0, y: 0, width: 100, height: 100, percent: true } },
      brightness: { name: '亮度', icon: '☀️', params: { value: 0 } },
      contrast: { name: '對比', icon: '🌓', params: { value: 0 } },
      saturation: { name: '飽和度', icon: '🎨', params: { value: 0 } },
      hue: { name: '色相', icon: '🌈', params: { value: 0 } },
      grayscale: { name: '灰階', icon: '⬛', params: { intensity: 100 } },
      sepia: { name: '復古', icon: '🟤', params: { intensity: 100 } },
      invert: { name: '反轉', icon: '🔀', params: {} },
      blur: { name: '模糊', icon: '🌫️', params: { radius: 5 } },
      sharpen: { name: '銳化', icon: '🔪', params: { amount: 50 } },
      noise: { name: '雜訊', icon: '📡', params: { amount: 20 } },
      vignette: { name: '暗角', icon: '🔲', params: { intensity: 50 } }
    };

    this.presets = {
      instagram: [
        { type: 'contrast', params: { value: 10 } },
        { type: 'saturation', params: { value: 20 } },
        { type: 'vignette', params: { intensity: 30 } }
      ],
      vintage: [
        { type: 'sepia', params: { intensity: 60 } },
        { type: 'contrast', params: { value: -10 } },
        { type: 'vignette', params: { intensity: 40 } },
        { type: 'noise', params: { amount: 10 } }
      ],
      hdr: [
        { type: 'contrast', params: { value: 30 } },
        { type: 'saturation', params: { value: 30 } },
        { type: 'sharpen', params: { amount: 30 } }
      ],
      bw: [
        { type: 'grayscale', params: { intensity: 100 } },
        { type: 'contrast', params: { value: 20 } }
      ],
      thumbnail: [
        { type: 'resize', params: { width: 200, height: 200, keepRatio: true } },
        { type: 'sharpen', params: { amount: 20 } }
      ]
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Preview
    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    // Steps
    this.stepsList = document.getElementById('stepsList');
    this.stepOptions = document.querySelectorAll('.step-option');

    // Settings
    this.settingsContent = document.getElementById('settingsContent');

    // Presets
    this.presetBtns = document.querySelectorAll('.preset-btn');

    // Buttons
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Step options
    this.stepOptions.forEach(option => {
      option.addEventListener('click', () => {
        const stepType = option.dataset.step;
        this.addStep(stepType);
      });
    });

    // Presets
    this.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetName = btn.dataset.preset;
        this.loadPreset(presetName);
      });
    });

    // Buttons
    this.processBtn.addEventListener('click', () => this.processWorkflow());
    this.downloadBtn.addEventListener('click', () => this.downloadResult());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      this.loadImage(files[0]);
    } else {
      this.showStatus('請選擇圖片檔案', 'error');
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;

        // 設定 canvas
        this.previewCanvas.width = img.width;
        this.previewCanvas.height = img.height;
        this.previewCtx.drawImage(img, 0, 0);

        // 更新 UI
        this.uploadZone.classList.add('has-file');
        this.previewInfo.textContent = `${img.width} × ${img.height} px`;
        this.processBtn.disabled = false;

        this.showStatus('圖片載入成功！', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  addStep(stepType) {
    const definition = this.stepDefinitions[stepType];
    if (!definition) return;

    const step = {
      type: stepType,
      name: definition.name,
      icon: definition.icon,
      params: { ...definition.params }
    };

    this.workflowSteps.push(step);
    this.renderSteps();
    this.selectStep(this.workflowSteps.length - 1);
    this.showStatus(`已加入「${definition.name}」步驟`, 'success');
  }

  removeStep(index) {
    this.workflowSteps.splice(index, 1);
    if (this.activeStepIndex >= this.workflowSteps.length) {
      this.activeStepIndex = this.workflowSteps.length - 1;
    }
    this.renderSteps();
    if (this.activeStepIndex >= 0) {
      this.renderSettings(this.activeStepIndex);
    } else {
      this.clearSettings();
    }
  }

  moveStep(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.workflowSteps.length) return;

    [this.workflowSteps[index], this.workflowSteps[newIndex]] =
    [this.workflowSteps[newIndex], this.workflowSteps[index]];

    this.activeStepIndex = newIndex;
    this.renderSteps();
  }

  selectStep(index) {
    this.activeStepIndex = index;
    this.renderSteps();
    this.renderSettings(index);
  }

  renderSteps() {
    if (this.workflowSteps.length === 0) {
      this.stepsList.innerHTML = '<div class="empty-workflow">點擊左側步驟加入工作流程</div>';
      return;
    }

    this.stepsList.innerHTML = this.workflowSteps.map((step, index) => `
      <div class="workflow-step ${index === this.activeStepIndex ? 'active' : ''}" data-index="${index}">
        <div class="step-header">
          <div class="step-title">
            <span class="step-num">${index + 1}</span>
            <span>${step.icon} ${step.name}</span>
          </div>
          <div class="step-actions">
            <button class="step-action-btn" data-action="up" title="上移">↑</button>
            <button class="step-action-btn" data-action="down" title="下移">↓</button>
            <button class="step-action-btn delete" data-action="delete" title="刪除">×</button>
          </div>
        </div>
        <div class="step-params">${this.getParamsPreview(step)}</div>
      </div>
    `).join('');

    // Bind events
    this.stepsList.querySelectorAll('.workflow-step').forEach(el => {
      el.addEventListener('click', (e) => {
        if (!e.target.closest('.step-action-btn')) {
          this.selectStep(parseInt(el.dataset.index));
        }
      });
    });

    this.stepsList.querySelectorAll('.step-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const stepEl = btn.closest('.workflow-step');
        const index = parseInt(stepEl.dataset.index);
        const action = btn.dataset.action;

        if (action === 'up') this.moveStep(index, -1);
        else if (action === 'down') this.moveStep(index, 1);
        else if (action === 'delete') this.removeStep(index);
      });
    });
  }

  getParamsPreview(step) {
    const p = step.params;
    switch (step.type) {
      case 'resize': return `${p.width} × ${p.height} px${p.keepRatio ? ' (保持比例)' : ''}`;
      case 'rotate': return `${p.angle}°`;
      case 'flip': return p.direction === 'horizontal' ? '水平翻轉' : '垂直翻轉';
      case 'crop': return p.percent ? `${p.width}% × ${p.height}%` : `${p.width} × ${p.height}`;
      case 'brightness': return `${p.value > 0 ? '+' : ''}${p.value}%`;
      case 'contrast': return `${p.value > 0 ? '+' : ''}${p.value}%`;
      case 'saturation': return `${p.value > 0 ? '+' : ''}${p.value}%`;
      case 'hue': return `${p.value}°`;
      case 'grayscale': return `${p.intensity}%`;
      case 'sepia': return `${p.intensity}%`;
      case 'invert': return '100%';
      case 'blur': return `半徑 ${p.radius}px`;
      case 'sharpen': return `強度 ${p.amount}%`;
      case 'noise': return `強度 ${p.amount}%`;
      case 'vignette': return `強度 ${p.intensity}%`;
      default: return '';
    }
  }

  renderSettings(index) {
    const step = this.workflowSteps[index];
    if (!step) {
      this.clearSettings();
      return;
    }

    let html = `<h4 style="margin-bottom: 15px;">${step.icon} ${step.name}</h4>`;

    switch (step.type) {
      case 'resize':
        html += this.createNumberInput('寬度 (px)', 'width', step.params.width, 1, 10000);
        html += this.createNumberInput('高度 (px)', 'height', step.params.height, 1, 10000);
        html += this.createCheckbox('保持比例', 'keepRatio', step.params.keepRatio);
        break;

      case 'rotate':
        html += this.createSelect('旋轉角度', 'angle', step.params.angle, [
          { value: 90, label: '90° 順時針' },
          { value: 180, label: '180°' },
          { value: 270, label: '90° 逆時針' }
        ]);
        break;

      case 'flip':
        html += this.createSelect('翻轉方向', 'direction', step.params.direction, [
          { value: 'horizontal', label: '水平翻轉' },
          { value: 'vertical', label: '垂直翻轉' }
        ]);
        break;

      case 'crop':
        html += this.createCheckbox('使用百分比', 'percent', step.params.percent);
        html += this.createNumberInput('X 位置', 'x', step.params.x, 0, 100);
        html += this.createNumberInput('Y 位置', 'y', step.params.y, 0, 100);
        html += this.createNumberInput('寬度', 'width', step.params.width, 1, 100);
        html += this.createNumberInput('高度', 'height', step.params.height, 1, 100);
        break;

      case 'brightness':
      case 'contrast':
      case 'saturation':
        html += this.createRangeInput('調整值', 'value', step.params.value, -100, 100);
        break;

      case 'hue':
        html += this.createRangeInput('色相偏移', 'value', step.params.value, -180, 180);
        break;

      case 'grayscale':
      case 'sepia':
        html += this.createRangeInput('強度', 'intensity', step.params.intensity, 0, 100);
        break;

      case 'invert':
        html += '<p style="color: #888;">此效果無參數可調整</p>';
        break;

      case 'blur':
        html += this.createRangeInput('模糊半徑', 'radius', step.params.radius, 1, 20);
        break;

      case 'sharpen':
      case 'noise':
        html += this.createRangeInput('強度', 'amount', step.params.amount, 0, 100);
        break;

      case 'vignette':
        html += this.createRangeInput('暗角強度', 'intensity', step.params.intensity, 0, 100);
        break;
    }

    this.settingsContent.innerHTML = html;
    this.bindSettingsEvents(index);
  }

  createNumberInput(label, name, value, min, max) {
    return `
      <div class="setting-group">
        <label class="setting-label">${label}</label>
        <input type="number" class="setting-input" data-param="${name}"
               value="${value}" min="${min}" max="${max}">
      </div>
    `;
  }

  createRangeInput(label, name, value, min, max) {
    return `
      <div class="setting-group">
        <label class="setting-label">${label}</label>
        <input type="range" class="setting-range" data-param="${name}"
               value="${value}" min="${min}" max="${max}">
        <div class="range-value">${value}</div>
      </div>
    `;
  }

  createSelect(label, name, value, options) {
    const optionsHtml = options.map(opt =>
      `<option value="${opt.value}" ${opt.value == value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
    return `
      <div class="setting-group">
        <label class="setting-label">${label}</label>
        <select class="setting-select" data-param="${name}">${optionsHtml}</select>
      </div>
    `;
  }

  createCheckbox(label, name, checked) {
    return `
      <div class="setting-group" style="display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" data-param="${name}" ${checked ? 'checked' : ''}
               style="width: auto;">
        <label class="setting-label" style="margin: 0;">${label}</label>
      </div>
    `;
  }

  bindSettingsEvents(stepIndex) {
    this.settingsContent.querySelectorAll('[data-param]').forEach(input => {
      const param = input.dataset.param;
      const eventType = input.type === 'range' ? 'input' : 'change';

      input.addEventListener(eventType, (e) => {
        let value;
        if (input.type === 'checkbox') {
          value = input.checked;
        } else if (input.type === 'number' || input.type === 'range') {
          value = parseFloat(input.value);
        } else {
          value = input.value;
        }

        this.workflowSteps[stepIndex].params[param] = value;

        // Update range display
        if (input.type === 'range') {
          input.nextElementSibling.textContent = value;
        }

        this.renderSteps();
      });
    });
  }

  clearSettings() {
    this.settingsContent.innerHTML = '<p style="color: #666; font-size: 0.9rem;">選擇工作流程中的步驟來調整參數</p>';
  }

  loadPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) return;

    this.workflowSteps = preset.map(step => ({
      type: step.type,
      name: this.stepDefinitions[step.type].name,
      icon: this.stepDefinitions[step.type].icon,
      params: { ...this.stepDefinitions[step.type].params, ...step.params }
    }));

    this.renderSteps();
    if (this.workflowSteps.length > 0) {
      this.selectStep(0);
    }

    this.showStatus(`已載入「${presetName}」預設`, 'success');
  }

  async processWorkflow() {
    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    if (this.workflowSteps.length === 0) {
      this.showStatus('請先加入處理步驟', 'error');
      return;
    }

    try {
      this.processBtn.disabled = true;
      this.processBtn.innerHTML = '<span>⏳</span> 處理中...';

      // 建立工作 canvas
      let workCanvas = document.createElement('canvas');
      workCanvas.width = this.originalImage.width;
      workCanvas.height = this.originalImage.height;
      let ctx = workCanvas.getContext('2d');
      ctx.drawImage(this.originalImage, 0, 0);

      // 執行每個步驟
      for (const step of this.workflowSteps) {
        workCanvas = await this.applyStep(workCanvas, step);
      }

      // 更新預覽
      this.currentCanvas = workCanvas;
      this.previewCanvas.width = workCanvas.width;
      this.previewCanvas.height = workCanvas.height;
      this.previewCtx.drawImage(workCanvas, 0, 0);
      this.previewInfo.textContent = `${workCanvas.width} × ${workCanvas.height} px`;

      this.downloadBtn.disabled = false;
      this.showStatus('處理完成！', 'success');
    } catch (error) {
      console.error('Process error:', error);
      this.showStatus('處理過程中發生錯誤', 'error');
    } finally {
      this.processBtn.disabled = false;
      this.processBtn.innerHTML = '<span>▶️</span> 執行處理';
    }
  }

  async applyStep(canvas, step) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const p = step.params;

    switch (step.type) {
      case 'resize': {
        const newCanvas = document.createElement('canvas');
        let newWidth = p.width;
        let newHeight = p.height;

        if (p.keepRatio) {
          const ratio = Math.min(p.width / canvas.width, p.height / canvas.height);
          newWidth = Math.round(canvas.width * ratio);
          newHeight = Math.round(canvas.height * ratio);
        }

        newCanvas.width = newWidth;
        newCanvas.height = newHeight;
        const newCtx = newCanvas.getContext('2d');
        newCtx.imageSmoothingEnabled = true;
        newCtx.imageSmoothingQuality = 'high';
        newCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
        return newCanvas;
      }

      case 'rotate': {
        const newCanvas = document.createElement('canvas');
        const angle = p.angle * Math.PI / 180;

        if (p.angle === 90 || p.angle === 270) {
          newCanvas.width = canvas.height;
          newCanvas.height = canvas.width;
        } else {
          newCanvas.width = canvas.width;
          newCanvas.height = canvas.height;
        }

        const newCtx = newCanvas.getContext('2d');
        newCtx.translate(newCanvas.width / 2, newCanvas.height / 2);
        newCtx.rotate(angle);
        newCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        return newCanvas;
      }

      case 'flip': {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        const newCtx = newCanvas.getContext('2d');

        if (p.direction === 'horizontal') {
          newCtx.scale(-1, 1);
          newCtx.drawImage(canvas, -canvas.width, 0);
        } else {
          newCtx.scale(1, -1);
          newCtx.drawImage(canvas, 0, -canvas.height);
        }
        return newCanvas;
      }

      case 'crop': {
        let x, y, w, h;
        if (p.percent) {
          x = Math.round(canvas.width * p.x / 100);
          y = Math.round(canvas.height * p.y / 100);
          w = Math.round(canvas.width * p.width / 100);
          h = Math.round(canvas.height * p.height / 100);
        } else {
          x = p.x;
          y = p.y;
          w = p.width;
          h = p.height;
        }

        const newCanvas = document.createElement('canvas');
        newCanvas.width = w;
        newCanvas.height = h;
        const newCtx = newCanvas.getContext('2d');
        newCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
        return newCanvas;
      }

      case 'brightness': {
        const factor = p.value / 100 * 255;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, data[i] + factor));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + factor));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + factor));
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }

      case 'contrast': {
        const factor = (259 * (p.value + 255)) / (255 * (259 - p.value));
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
          data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
          data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }

      case 'saturation': {
        const factor = 1 + p.value / 100;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = Math.max(0, Math.min(255, gray + factor * (data[i] - gray)));
          data[i + 1] = Math.max(0, Math.min(255, gray + factor * (data[i + 1] - gray)));
          data[i + 2] = Math.max(0, Math.min(255, gray + factor * (data[i + 2] - gray)));
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }

      case 'hue': {
        const angle = p.value * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          data[i] = Math.max(0, Math.min(255,
            r * (0.213 + cos * 0.787 - sin * 0.213) +
            g * (0.715 - cos * 0.715 - sin * 0.715) +
            b * (0.072 - cos * 0.072 + sin * 0.928)
          ));
          data[i + 1] = Math.max(0, Math.min(255,
            r * (0.213 - cos * 0.213 + sin * 0.143) +
            g * (0.715 + cos * 0.285 + sin * 0.140) +
            b * (0.072 - cos * 0.072 - sin * 0.283)
          ));
          data[i + 2] = Math.max(0, Math.min(255,
            r * (0.213 - cos * 0.213 - sin * 0.787) +
            g * (0.715 - cos * 0.715 + sin * 0.715) +
            b * (0.072 + cos * 0.928 + sin * 0.072)
          ));
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }

      case 'grayscale': {
        const intensity = p.intensity / 100;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i] * (1 - intensity) + gray * intensity;
          data[i + 1] = data[i + 1] * (1 - intensity) + gray * intensity;
          data[i + 2] = data[i + 2] * (1 - intensity) + gray * intensity;
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }

      case 'sepia': {
        const intensity = p.intensity / 100;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const sepiaR = r * 0.393 + g * 0.769 + b * 0.189;
          const sepiaG = r * 0.349 + g * 0.686 + b * 0.168;
          const sepiaB = r * 0.272 + g * 0.534 + b * 0.131;
          data[i] = Math.min(255, r * (1 - intensity) + sepiaR * intensity);
          data[i + 1] = Math.min(255, g * (1 - intensity) + sepiaG * intensity);
          data[i + 2] = Math.min(255, b * (1 - intensity) + sepiaB * intensity);
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }

      case 'invert': {
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }

      case 'blur': {
        // Simple box blur
        const radius = p.radius;
        const tempData = new Uint8ClampedArray(data);

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            let r = 0, g = 0, b = 0, count = 0;

            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                  const idx = (ny * canvas.width + nx) * 4;
                  r += tempData[idx];
                  g += tempData[idx + 1];
                  b += tempData[idx + 2];
                  count++;
                }
              }
            }

            const idx = (y * canvas.width + x) * 4;
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }

      case 'sharpen': {
        const amount = p.amount / 100;
        const kernel = [
          0, -amount, 0,
          -amount, 1 + 4 * amount, -amount,
          0, -amount, 0
        ];
        return this.applyConvolution(canvas, kernel);
      }

      case 'noise': {
        const amount = p.amount * 2.55;
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * amount;
          data[i] = Math.max(0, Math.min(255, data[i] + noise));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }

      case 'vignette': {
        const intensity = p.intensity / 100;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            const factor = 1 - (dist / maxDist) * intensity;
            const idx = (y * canvas.width + x) * 4;
            data[idx] *= factor;
            data[idx + 1] *= factor;
            data[idx + 2] *= factor;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      }

      default:
        return canvas;
    }
  }

  applyConvolution(canvas, kernel) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    const w = canvas.width;
    const h = canvas.height;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * w + (x + kx)) * 4 + c;
              sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          data[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, sum));
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  downloadResult() {
    if (!this.currentCanvas) {
      this.showStatus('請先執行處理', 'error');
      return;
    }

    const link = document.createElement('a');
    link.download = `processed_${Date.now()}.png`;
    link.href = this.currentCanvas.toDataURL('image/png');
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.originalImage = null;
    this.currentCanvas = null;
    this.workflowSteps = [];
    this.activeStepIndex = -1;

    // 重置 UI
    this.uploadZone.classList.remove('has-file');
    this.previewCanvas.width = 300;
    this.previewCanvas.height = 200;
    this.previewCtx.clearRect(0, 0, 300, 200);
    this.previewInfo.textContent = '尚未載入圖片';
    this.processBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    this.renderSteps();
    this.clearSettings();

    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageWorkflow();
});
