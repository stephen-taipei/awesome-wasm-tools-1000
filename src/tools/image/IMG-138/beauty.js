/**
 * IMG-138 美顏濾鏡
 * 自動美顏處理（磨皮、美白、瘦臉）
 */

(function() {
  // DOM Elements
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const settingsSection = document.getElementById('settingsSection');
  const previewSection = document.getElementById('previewSection');
  const originalCanvas = document.getElementById('originalCanvas');
  const resultCanvas = document.getElementById('resultCanvas');
  const applyBtn = document.getElementById('applyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const statusMessage = document.getElementById('statusMessage');

  // Preset items
  const presetItems = document.querySelectorAll('.preset-item');

  // Sliders
  const sliders = {
    smooth: document.getElementById('smooth'),
    whiten: document.getElementById('whiten'),
    even: document.getElementById('even'),
    brightness: document.getElementById('brightness'),
    contrast: document.getElementById('contrast'),
    softFocus: document.getElementById('softFocus'),
    rosy: document.getElementById('rosy'),
    saturation: document.getElementById('saturation'),
    temperature: document.getElementById('temperature'),
    sharpen: document.getElementById('sharpen'),
    eyeBrighten: document.getElementById('eyeBrighten'),
    vignette: document.getElementById('vignette')
  };

  // Value displays
  const values = {
    smooth: document.getElementById('smoothValue'),
    whiten: document.getElementById('whitenValue'),
    even: document.getElementById('evenValue'),
    brightness: document.getElementById('brightnessValue'),
    contrast: document.getElementById('contrastValue'),
    softFocus: document.getElementById('softFocusValue'),
    rosy: document.getElementById('rosyValue'),
    saturation: document.getElementById('saturationValue'),
    temperature: document.getElementById('temperatureValue'),
    sharpen: document.getElementById('sharpenValue'),
    eyeBrighten: document.getElementById('eyeBrightenValue'),
    vignette: document.getElementById('vignetteValue')
  };

  // Toggle
  const realtimePreview = document.getElementById('realtimePreview');

  // Info displays
  const imageSizeEl = document.getElementById('imageSize');
  const currentPresetEl = document.getElementById('currentPreset');
  const effectLevelEl = document.getElementById('effectLevel');
  const processTimeEl = document.getElementById('processTime');

  // Presets
  const presets = {
    natural: { smooth: 10, whiten: 5, even: 5, brightness: 5, contrast: 0, softFocus: 0, rosy: 5, saturation: 0, temperature: 0, sharpen: 5, eyeBrighten: 0, vignette: 0 },
    light: { smooth: 30, whiten: 20, even: 15, brightness: 10, contrast: 5, softFocus: 10, rosy: 15, saturation: 5, temperature: 0, sharpen: 10, eyeBrighten: 0, vignette: 0 },
    medium: { smooth: 50, whiten: 35, even: 25, brightness: 15, contrast: 8, softFocus: 15, rosy: 20, saturation: 8, temperature: 5, sharpen: 15, eyeBrighten: 10, vignette: 5 },
    strong: { smooth: 70, whiten: 50, even: 40, brightness: 20, contrast: 10, softFocus: 20, rosy: 25, saturation: 10, temperature: 5, sharpen: 20, eyeBrighten: 20, vignette: 10 },
    soft: { smooth: 60, whiten: 30, even: 20, brightness: 15, contrast: -5, softFocus: 35, rosy: 15, saturation: -5, temperature: 5, sharpen: 0, eyeBrighten: 5, vignette: 15 },
    bright: { smooth: 35, whiten: 40, even: 20, brightness: 25, contrast: 15, softFocus: 5, rosy: 10, saturation: 10, temperature: -5, sharpen: 15, eyeBrighten: 15, vignette: 0 },
    porcelain: { smooth: 80, whiten: 60, even: 50, brightness: 20, contrast: 5, softFocus: 15, rosy: 5, saturation: -10, temperature: -10, sharpen: 10, eyeBrighten: 10, vignette: 5 },
    custom: null
  };

  // State
  let originalImage = null;
  let originalCtx = null;
  let resultCtx = null;
  let selectedPreset = 'light';
  let previewTimeout = null;

  // Initialize
  function init() {
    setupEventListeners();
    originalCtx = originalCanvas.getContext('2d');
    resultCtx = resultCanvas.getContext('2d');
    updateSliderDisplays();
  }

  // Event Listeners
  function setupEventListeners() {
    // Upload
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Preset selection
    presetItems.forEach(item => {
      item.addEventListener('click', () => {
        presetItems.forEach(p => p.classList.remove('active'));
        item.classList.add('active');
        selectedPreset = item.dataset.preset;
        currentPresetEl.textContent = item.querySelector('.preset-name').textContent;

        if (presets[selectedPreset]) {
          applyPreset(presets[selectedPreset]);
        }
      });
    });

    // Sliders
    Object.keys(sliders).forEach(key => {
      sliders[key].addEventListener('input', () => {
        updateSliderDisplays();
        // Mark as custom
        presetItems.forEach(p => p.classList.remove('active'));
        document.querySelector('[data-preset="custom"]').classList.add('active');
        selectedPreset = 'custom';
        currentPresetEl.textContent = '自訂';
        schedulePreview();
      });
    });

    // Buttons
    applyBtn.addEventListener('click', () => applyBeautyFilter(false));
    downloadBtn.addEventListener('click', downloadResult);
    resetBtn.addEventListener('click', resetTool);
  }

  // Apply preset values
  function applyPreset(preset) {
    Object.keys(preset).forEach(key => {
      if (sliders[key]) {
        sliders[key].value = preset[key];
      }
    });
    updateSliderDisplays();
    schedulePreview();
  }

  // Update slider displays
  function updateSliderDisplays() {
    values.smooth.textContent = sliders.smooth.value + '%';
    values.whiten.textContent = sliders.whiten.value + '%';
    values.even.textContent = sliders.even.value + '%';
    values.brightness.textContent = sliders.brightness.value + '%';
    values.contrast.textContent = sliders.contrast.value + '%';
    values.softFocus.textContent = sliders.softFocus.value + '%';
    values.rosy.textContent = sliders.rosy.value + '%';
    values.saturation.textContent = sliders.saturation.value + '%';
    values.temperature.textContent = sliders.temperature.value;
    values.sharpen.textContent = sliders.sharpen.value + '%';
    values.eyeBrighten.textContent = sliders.eyeBrighten.value + '%';
    values.vignette.textContent = sliders.vignette.value + '%';

    // Calculate effect level
    const total = parseInt(sliders.smooth.value) + parseInt(sliders.whiten.value) + Math.abs(parseInt(sliders.brightness.value));
    if (total < 30) effectLevelEl.textContent = '輕微';
    else if (total < 70) effectLevelEl.textContent = '中等';
    else effectLevelEl.textContent = '強烈';
  }

  // Schedule preview update
  function schedulePreview() {
    if (!realtimePreview.checked || !originalImage) return;

    if (previewTimeout) {
      clearTimeout(previewTimeout);
    }

    previewTimeout = setTimeout(() => {
      applyBeautyFilter(true);
    }, 150);
  }

  // Drag and drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
  }

  function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      loadImage(file);
    }
  }

  // Load image
  function loadImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        originalImage = img;

        uploadZone.classList.add('has-file');
        uploadZone.style.display = 'none';
        settingsSection.classList.add('active');
        previewSection.classList.add('active');

        setupCanvases();
        drawOriginalImage();

        imageSizeEl.textContent = `${img.width} × ${img.height}`;
        applyBtn.disabled = false;

        showStatus('圖片載入成功', 'success');

        if (realtimePreview.checked) {
          applyBeautyFilter(true);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Setup canvases
  function setupCanvases() {
    const maxSize = 400;
    let width = originalImage.width;
    let height = originalImage.height;

    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    originalCanvas.width = width;
    originalCanvas.height = height;
    resultCanvas.width = width;
    resultCanvas.height = height;
  }

  // Draw original image
  function drawOriginalImage() {
    originalCtx.drawImage(originalImage, 0, 0, originalCanvas.width, originalCanvas.height);
  }

  // Apply beauty filter
  function applyBeautyFilter(isPreview = false) {
    const startTime = performance.now();

    if (!isPreview) {
      showStatus('正在處理美顏效果...', 'success');
      applyBtn.disabled = true;
    }

    // Get parameters
    const params = {
      smooth: parseInt(sliders.smooth.value) / 100,
      whiten: parseInt(sliders.whiten.value) / 100,
      even: parseInt(sliders.even.value) / 100,
      brightness: parseInt(sliders.brightness.value) / 100,
      contrast: parseInt(sliders.contrast.value) / 100,
      softFocus: parseInt(sliders.softFocus.value) / 100,
      rosy: parseInt(sliders.rosy.value) / 100,
      saturation: parseInt(sliders.saturation.value) / 100,
      temperature: parseInt(sliders.temperature.value) / 100,
      sharpen: parseInt(sliders.sharpen.value) / 100,
      eyeBrighten: parseInt(sliders.eyeBrighten.value) / 100,
      vignette: parseInt(sliders.vignette.value) / 100
    };

    // Process
    let srcWidth, srcHeight;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (isPreview) {
      srcWidth = originalCanvas.width;
      srcHeight = originalCanvas.height;
    } else {
      srcWidth = originalImage.width;
      srcHeight = originalImage.height;
    }

    tempCanvas.width = srcWidth;
    tempCanvas.height = srcHeight;
    tempCtx.drawImage(originalImage, 0, 0, srcWidth, srcHeight);

    let imageData = tempCtx.getImageData(0, 0, srcWidth, srcHeight);

    // Apply effects in order
    if (params.smooth > 0) {
      imageData = applySkinSmoothing(imageData, params.smooth);
    }

    if (params.whiten > 0 || params.brightness !== 0 || params.contrast !== 0) {
      imageData = applyBrightnessContrast(imageData, params.brightness, params.contrast, params.whiten);
    }

    if (params.even > 0) {
      imageData = applySkinEven(imageData, params.even);
    }

    if (params.rosy > 0 || params.saturation !== 0 || params.temperature !== 0) {
      imageData = applyColorAdjustment(imageData, params.rosy, params.saturation, params.temperature);
    }

    if (params.softFocus > 0) {
      imageData = applySoftFocus(imageData, params.softFocus, srcWidth, srcHeight);
    }

    if (params.sharpen > 0) {
      imageData = applySharpen(imageData, params.sharpen, srcWidth);
    }

    if (params.vignette > 0) {
      imageData = applyVignette(imageData, params.vignette, srcWidth, srcHeight);
    }

    // Draw result
    tempCtx.putImageData(imageData, 0, 0);

    if (isPreview) {
      resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
      resultCtx.drawImage(tempCanvas, 0, 0);
    } else {
      resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
      resultCtx.drawImage(tempCanvas, 0, 0, resultCanvas.width, resultCanvas.height);
      resultCanvas.fullResCanvas = tempCanvas;
    }

    const endTime = performance.now();
    processTimeEl.textContent = Math.round(endTime - startTime) + 'ms';

    if (!isPreview) {
      showStatus('美顏處理完成！', 'success');
      downloadBtn.disabled = false;
      applyBtn.disabled = false;
    }
  }

  // Skin smoothing (bilateral filter approximation)
  function applySkinSmoothing(imageData, strength) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(data);

    const radius = Math.max(2, Math.floor(strength * 8));
    const sigma = strength * 30;

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = (y * width + x) * 4;

        // Detect skin tone
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (isSkinTone(r, g, b)) {
          // Apply bilateral filter
          let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              const nr = data[nIdx];
              const ng = data[nIdx + 1];
              const nb = data[nIdx + 2];

              // Spatial weight
              const spatialDist = Math.sqrt(dx * dx + dy * dy);
              const spatialWeight = Math.exp(-spatialDist * spatialDist / (2 * radius * radius));

              // Range weight
              const colorDist = Math.sqrt(
                Math.pow(r - nr, 2) +
                Math.pow(g - ng, 2) +
                Math.pow(b - nb, 2)
              );
              const rangeWeight = Math.exp(-colorDist * colorDist / (2 * sigma * sigma));

              const weight = spatialWeight * rangeWeight;
              sumR += nr * weight;
              sumG += ng * weight;
              sumB += nb * weight;
              sumWeight += weight;
            }
          }

          output[idx] = Math.round(sumR / sumWeight);
          output[idx + 1] = Math.round(sumG / sumWeight);
          output[idx + 2] = Math.round(sumB / sumWeight);
        }
      }
    }

    return new ImageData(output, width, height);
  }

  // Check if color is skin tone
  function isSkinTone(r, g, b) {
    // Simple skin detection
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    return (
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      (max - min) > 15 &&
      Math.abs(r - g) > 15
    );
  }

  // Brightness and contrast with whitening
  function applyBrightnessContrast(imageData, brightness, contrast, whiten) {
    const data = imageData.data;

    const brightnessVal = brightness * 50;
    const contrastFactor = 1 + contrast;
    const whitenVal = whiten * 30;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Whitening (especially for skin)
      if (isSkinTone(r, g, b)) {
        r = Math.min(255, r + whitenVal);
        g = Math.min(255, g + whitenVal * 0.9);
        b = Math.min(255, b + whitenVal * 0.8);
      }

      // Brightness
      r += brightnessVal;
      g += brightnessVal;
      b += brightnessVal;

      // Contrast
      r = ((r - 128) * contrastFactor) + 128;
      g = ((g - 128) * contrastFactor) + 128;
      b = ((b - 128) * contrastFactor) + 128;

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    return imageData;
  }

  // Skin tone evening
  function applySkinEven(imageData, strength) {
    const data = imageData.data;

    // Calculate average skin tone
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (isSkinTone(data[i], data[i + 1], data[i + 2])) {
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
        count++;
      }
    }

    if (count === 0) return imageData;

    const avgR = sumR / count;
    const avgG = sumG / count;
    const avgB = sumB / count;

    // Even out skin tones
    for (let i = 0; i < data.length; i += 4) {
      if (isSkinTone(data[i], data[i + 1], data[i + 2])) {
        data[i] = Math.round(data[i] + (avgR - data[i]) * strength * 0.3);
        data[i + 1] = Math.round(data[i + 1] + (avgG - data[i + 1]) * strength * 0.3);
        data[i + 2] = Math.round(data[i + 2] + (avgB - data[i + 2]) * strength * 0.3);
      }
    }

    return imageData;
  }

  // Color adjustment (rosy, saturation, temperature)
  function applyColorAdjustment(imageData, rosy, saturation, temperature) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Add rosy tint to skin
      if (isSkinTone(r, g, b) && rosy > 0) {
        r = Math.min(255, r + rosy * 20);
        b = Math.max(0, b - rosy * 5);
      }

      // Saturation adjustment
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * (1 + saturation);
      g = gray + (g - gray) * (1 + saturation);
      b = gray + (b - gray) * (1 + saturation);

      // Temperature adjustment
      r += temperature * 15;
      b -= temperature * 15;

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    return imageData;
  }

  // Soft focus effect
  function applySoftFocus(imageData, strength, width, height) {
    const data = imageData.data;
    const blurred = new Uint8ClampedArray(data);
    const radius = Math.max(1, Math.floor(strength * 5));

    // Simple box blur
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count++;
          }
        }

        const idx = (y * width + x) * 4;
        blurred[idx] = sumR / count;
        blurred[idx + 1] = sumG / count;
        blurred[idx + 2] = sumB / count;
      }
    }

    // Blend with original
    const blend = strength * 0.5;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i] + (blurred[i] - data[i]) * blend);
      data[i + 1] = Math.round(data[i + 1] + (blurred[i + 1] - data[i + 1]) * blend);
      data[i + 2] = Math.round(data[i + 2] + (blurred[i + 2] - data[i + 2]) * blend);
    }

    return imageData;
  }

  // Sharpen
  function applySharpen(imageData, strength, width) {
    const data = imageData.data;
    const output = new Uint8ClampedArray(data);
    const factor = strength * 2;

    // Unsharp mask
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);

      if (x > 0 && x < width - 1 && y > 0) {
        const idx = i;
        const top = idx - width * 4;
        const bottom = idx + width * 4;
        const left = idx - 4;
        const right = idx + 4;

        for (let c = 0; c < 3; c++) {
          const laplacian = 4 * data[idx + c] - data[top + c] - data[bottom + c] - data[left + c] - data[right + c];
          output[idx + c] = Math.max(0, Math.min(255, data[idx + c] + laplacian * factor));
        }
      }
    }

    return new ImageData(output, width, imageData.height);
  }

  // Vignette effect
  function applyVignette(imageData, strength, width, height) {
    const data = imageData.data;
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
        const vignette = 1 - (dist / maxDist) * strength;

        data[idx] = Math.round(data[idx] * vignette);
        data[idx + 1] = Math.round(data[idx + 1] * vignette);
        data[idx + 2] = Math.round(data[idx + 2] * vignette);
      }
    }

    return imageData;
  }

  // Download result
  function downloadResult() {
    const canvas = resultCanvas.fullResCanvas || resultCanvas;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'beauty-filtered.png';
    link.href = dataURL;
    link.click();

    showStatus('圖片已下載', 'success');
  }

  // Reset tool
  function resetTool() {
    originalImage = null;
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    resultCanvas.fullResCanvas = null;

    uploadZone.classList.remove('has-file');
    uploadZone.style.display = 'block';
    settingsSection.classList.remove('active');
    previewSection.classList.remove('active');

    // Reset preset
    presetItems.forEach(p => p.classList.remove('active'));
    document.querySelector('[data-preset="light"]').classList.add('active');
    selectedPreset = 'light';
    currentPresetEl.textContent = '輕度美顏';
    applyPreset(presets.light);

    applyBtn.disabled = true;
    downloadBtn.disabled = true;
    fileInput.value = '';

    imageSizeEl.textContent = '-';
    processTimeEl.textContent = '-';

    statusMessage.className = 'status-message';
  }

  // Show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
  }

  // Initialize
  init();
})();
