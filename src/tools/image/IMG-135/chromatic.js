/**
 * IMG-135 色差校正
 * 校正邊緣色差（紫邊、綠邊）
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

  // Mode elements
  const modeItems = document.querySelectorAll('.mode-item');
  const channelControls = document.getElementById('channelControls');

  // Channel sliders
  const sliders = {
    redScale: document.getElementById('redScale'),
    redX: document.getElementById('redX'),
    redY: document.getElementById('redY'),
    greenScale: document.getElementById('greenScale'),
    greenX: document.getElementById('greenX'),
    greenY: document.getElementById('greenY'),
    blueScale: document.getElementById('blueScale'),
    blueX: document.getElementById('blueX'),
    blueY: document.getElementById('blueY'),
    defringe: document.getElementById('defringe'),
    edgeMask: document.getElementById('edgeMask')
  };

  // Value displays
  const values = {
    redScale: document.getElementById('redScaleValue'),
    redX: document.getElementById('redXValue'),
    redY: document.getElementById('redYValue'),
    greenScale: document.getElementById('greenScaleValue'),
    greenX: document.getElementById('greenXValue'),
    greenY: document.getElementById('greenYValue'),
    blueScale: document.getElementById('blueScaleValue'),
    blueX: document.getElementById('blueXValue'),
    blueY: document.getElementById('blueYValue'),
    defringe: document.getElementById('defringeValue'),
    edgeMask: document.getElementById('edgeMaskValue')
  };

  // Detection displays
  const purpleFringeEl = document.getElementById('purpleFringe');
  const greenFringeEl = document.getElementById('greenFringe');
  const redShiftEl = document.getElementById('redShift');
  const blueShiftEl = document.getElementById('blueShift');

  // Info displays
  const imageSizeEl = document.getElementById('imageSize');
  const correctionModeEl = document.getElementById('correctionMode');
  const channelAdjustEl = document.getElementById('channelAdjust');
  const processTimeEl = document.getElementById('processTime');

  // Toggle
  const realtimePreview = document.getElementById('realtimePreview');

  // State
  let originalImage = null;
  let originalCtx = null;
  let resultCtx = null;
  let selectedMode = 'auto';
  let previewTimeout = null;
  let detectedCA = null;

  // Initialize
  function init() {
    setupEventListeners();
    originalCtx = originalCanvas.getContext('2d');
    resultCtx = resultCanvas.getContext('2d');
  }

  // Event Listeners
  function setupEventListeners() {
    // Upload
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Mode selection
    modeItems.forEach(item => {
      item.addEventListener('click', () => {
        modeItems.forEach(m => m.classList.remove('active'));
        item.classList.add('active');
        selectedMode = item.dataset.mode;
        correctionModeEl.textContent = item.querySelector('.mode-name').textContent;
        updateControlsForMode();
        if (originalImage && selectedMode === 'auto') {
          applyAutoCorrection();
        }
      });
    });

    // Sliders
    Object.keys(sliders).forEach(key => {
      sliders[key].addEventListener('input', () => {
        updateValueDisplays();
        schedulePreview();
      });
    });

    // Buttons
    applyBtn.addEventListener('click', () => applyCorrection(false));
    downloadBtn.addEventListener('click', downloadResult);
    resetBtn.addEventListener('click', resetTool);
  }

  // Update controls based on mode
  function updateControlsForMode() {
    const isManual = selectedMode === 'manual';
    const greenSliders = [sliders.greenScale, sliders.greenX, sliders.greenY];

    greenSliders.forEach(slider => {
      slider.disabled = !isManual;
    });

    if (selectedMode === 'auto' && originalImage) {
      applyAutoCorrection();
    } else if (selectedMode === 'lateral') {
      // Set default lateral correction values
      sliders.redScale.value = 0;
      sliders.blueScale.value = 0;
      sliders.redX.value = 0;
      sliders.redY.value = 0;
      sliders.blueX.value = 0;
      sliders.blueY.value = 0;
      updateValueDisplays();
    }
  }

  // Update value displays
  function updateValueDisplays() {
    values.redScale.textContent = (1 + parseInt(sliders.redScale.value) / 1000).toFixed(3);
    values.redX.textContent = sliders.redX.value;
    values.redY.textContent = sliders.redY.value;
    values.greenScale.textContent = (1 + parseInt(sliders.greenScale.value) / 1000).toFixed(3);
    values.greenX.textContent = sliders.greenX.value;
    values.greenY.textContent = sliders.greenY.value;
    values.blueScale.textContent = (1 + parseInt(sliders.blueScale.value) / 1000).toFixed(3);
    values.blueX.textContent = sliders.blueX.value;
    values.blueY.textContent = sliders.blueY.value;
    values.defringe.textContent = sliders.defringe.value + '%';
    values.edgeMask.textContent = sliders.edgeMask.value + '%';
  }

  // Schedule preview update (debounced)
  function schedulePreview() {
    if (!realtimePreview.checked || !originalImage) return;

    if (previewTimeout) {
      clearTimeout(previewTimeout);
    }

    previewTimeout = setTimeout(() => {
      applyCorrection(true);
    }, 100);
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
        detectChromaticAberration();

        imageSizeEl.textContent = `${img.width} × ${img.height}`;
        applyBtn.disabled = false;

        showStatus('圖片載入成功，正在分析色差...', 'success');

        if (selectedMode === 'auto') {
          applyAutoCorrection();
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

  // Detect chromatic aberration
  function detectChromaticAberration() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalCanvas.width;
    tempCanvas.height = originalCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0, tempCanvas.width, tempCanvas.height);

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    const width = tempCanvas.width;
    const height = tempCanvas.height;

    let purplePixels = 0;
    let greenPixels = 0;
    let totalEdgePixels = 0;
    let redShiftSum = 0;
    let blueShiftSum = 0;

    // Analyze edges for color fringing
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        // Calculate local contrast (edge detection)
        const gx = getGradient(data, width, x, y, 'x');
        const gy = getGradient(data, width, x, y, 'y');
        const gradient = Math.sqrt(gx * gx + gy * gy);

        if (gradient > 30) { // Edge pixel
          totalEdgePixels++;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Detect purple fringe (high R, low G, high B)
          if (r > 100 && b > 100 && g < Math.min(r, b) - 30) {
            purplePixels++;
          }

          // Detect green fringe (low R, high G, low B)
          if (g > 100 && r < g - 30 && b < g - 30) {
            greenPixels++;
          }

          // Estimate channel shifts at edges
          const cx = width / 2;
          const cy = height / 2;
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt(cx * cx + cy * cy);
          const normalizedDist = dist / maxDist;

          // Color difference suggests lateral CA
          redShiftSum += (r - g) * normalizedDist;
          blueShiftSum += (b - g) * normalizedDist;
        }
      }
    }

    // Calculate metrics
    const purpleRatio = totalEdgePixels > 0 ? purplePixels / totalEdgePixels : 0;
    const greenRatio = totalEdgePixels > 0 ? greenPixels / totalEdgePixels : 0;
    const avgRedShift = totalEdgePixels > 0 ? redShiftSum / totalEdgePixels : 0;
    const avgBlueShift = totalEdgePixels > 0 ? blueShiftSum / totalEdgePixels : 0;

    detectedCA = {
      purpleFringe: purpleRatio,
      greenFringe: greenRatio,
      redShift: avgRedShift,
      blueShift: avgBlueShift
    };

    // Update display
    updateDetectionDisplay();
  }

  // Get gradient at position
  function getGradient(data, width, x, y, direction) {
    const idx = (y * width + x) * 4;

    if (direction === 'x') {
      const idxL = (y * width + (x - 1)) * 4;
      const idxR = (y * width + (x + 1)) * 4;
      const gL = (data[idxL] + data[idxL + 1] + data[idxL + 2]) / 3;
      const gR = (data[idxR] + data[idxR + 1] + data[idxR + 2]) / 3;
      return gR - gL;
    } else {
      const idxT = ((y - 1) * width + x) * 4;
      const idxB = ((y + 1) * width + x) * 4;
      const gT = (data[idxT] + data[idxT + 1] + data[idxT + 2]) / 3;
      const gB = (data[idxB] + data[idxB + 1] + data[idxB + 2]) / 3;
      return gB - gT;
    }
  }

  // Update detection display
  function updateDetectionDisplay() {
    if (!detectedCA) return;

    const formatLevel = (ratio) => {
      if (ratio < 0.01) return { text: '輕微', class: 'good' };
      if (ratio < 0.05) return { text: '中等', class: 'warning' };
      return { text: '嚴重', class: 'error' };
    };

    const purple = formatLevel(detectedCA.purpleFringe);
    const green = formatLevel(detectedCA.greenFringe);

    purpleFringeEl.textContent = purple.text;
    purpleFringeEl.className = 'detection-value ' + purple.class;

    greenFringeEl.textContent = green.text;
    greenFringeEl.className = 'detection-value ' + green.class;

    redShiftEl.textContent = detectedCA.redShift.toFixed(1);
    blueShiftEl.textContent = detectedCA.blueShift.toFixed(1);
  }

  // Apply auto correction based on detection
  function applyAutoCorrection() {
    if (!detectedCA) return;

    // Calculate correction values based on detected CA
    const redScaleCorrection = Math.round(-detectedCA.redShift / 10);
    const blueScaleCorrection = Math.round(-detectedCA.blueShift / 10);
    const defringeCorrection = Math.round((detectedCA.purpleFringe + detectedCA.greenFringe) * 500);

    // Apply to sliders
    sliders.redScale.value = Math.max(-20, Math.min(20, redScaleCorrection));
    sliders.blueScale.value = Math.max(-20, Math.min(20, blueScaleCorrection));
    sliders.defringe.value = Math.max(0, Math.min(100, defringeCorrection));

    updateValueDisplays();

    // Apply correction
    applyCorrection(true);
  }

  // Apply chromatic aberration correction
  function applyCorrection(isPreview = false) {
    const startTime = performance.now();

    if (!isPreview) {
      showStatus('正在處理色差校正...', 'success');
      applyBtn.disabled = true;
    }

    // Get parameters
    const params = {
      redScale: 1 + parseInt(sliders.redScale.value) / 1000,
      redX: parseInt(sliders.redX.value),
      redY: parseInt(sliders.redY.value),
      greenScale: 1 + parseInt(sliders.greenScale.value) / 1000,
      greenX: parseInt(sliders.greenX.value),
      greenY: parseInt(sliders.greenY.value),
      blueScale: 1 + parseInt(sliders.blueScale.value) / 1000,
      blueX: parseInt(sliders.blueX.value),
      blueY: parseInt(sliders.blueY.value),
      defringe: parseInt(sliders.defringe.value) / 100,
      edgeMask: parseInt(sliders.edgeMask.value) / 100
    };

    // Process at preview or full resolution
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
    const srcData = tempCtx.getImageData(0, 0, srcWidth, srcHeight);

    // Create output image data
    const dstData = tempCtx.createImageData(srcWidth, srcHeight);

    // Process each pixel
    const cx = srcWidth / 2;
    const cy = srcHeight / 2;

    for (let y = 0; y < srcHeight; y++) {
      for (let x = 0; x < srcWidth; x++) {
        const idx = (y * srcWidth + x) * 4;

        // Calculate distance from center (for radial scaling)
        const dx = x - cx;
        const dy = y - cy;

        // Sample each channel with different transformations
        const redPos = transformPoint(x, y, cx, cy, params.redScale, params.redX, params.redY);
        const greenPos = transformPoint(x, y, cx, cy, params.greenScale, params.greenX, params.greenY);
        const bluePos = transformPoint(x, y, cx, cy, params.blueScale, params.blueX, params.blueY);

        // Sample colors
        const r = sampleChannel(srcData, redPos.x, redPos.y, 0);
        const g = sampleChannel(srcData, greenPos.x, greenPos.y, 1);
        const b = sampleChannel(srcData, bluePos.x, bluePos.y, 2);
        const a = srcData.data[idx + 3];

        // Apply defringe
        let finalR = r, finalG = g, finalB = b;

        if (params.defringe > 0) {
          // Detect edge
          const gradient = getPixelGradient(srcData, x, y);
          const isEdge = gradient > 30;

          if (isEdge) {
            // Check for purple/green fringe
            const isPurple = r > 100 && b > 100 && g < Math.min(r, b) - 20;
            const isGreen = g > 100 && r < g - 20 && b < g - 20;

            if (isPurple) {
              // Reduce purple by desaturating
              const gray = (r + g + b) / 3;
              finalR = r + (gray - r) * params.defringe;
              finalB = b + (gray - b) * params.defringe;
            }

            if (isGreen) {
              // Reduce green by desaturating
              const gray = (r + g + b) / 3;
              finalG = g + (gray - g) * params.defringe;
            }
          }
        }

        dstData.data[idx] = Math.round(Math.max(0, Math.min(255, finalR)));
        dstData.data[idx + 1] = Math.round(Math.max(0, Math.min(255, finalG)));
        dstData.data[idx + 2] = Math.round(Math.max(0, Math.min(255, finalB)));
        dstData.data[idx + 3] = a;
      }
    }

    // Draw result
    if (isPreview) {
      resultCtx.putImageData(dstData, 0, 0);
    } else {
      // Full resolution processing
      tempCtx.putImageData(dstData, 0, 0);

      // Scale for display
      resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
      resultCtx.drawImage(tempCanvas, 0, 0, resultCanvas.width, resultCanvas.height);

      // Store full resolution result
      resultCanvas.fullResCanvas = tempCanvas;
    }

    const endTime = performance.now();
    processTimeEl.textContent = Math.round(endTime - startTime) + 'ms';

    // Update channel adjust display
    const adjusted = [];
    if (params.redScale !== 1 || params.redX !== 0 || params.redY !== 0) adjusted.push('R');
    if (params.greenScale !== 1 || params.greenX !== 0 || params.greenY !== 0) adjusted.push('G');
    if (params.blueScale !== 1 || params.blueX !== 0 || params.blueY !== 0) adjusted.push('B');
    channelAdjustEl.textContent = adjusted.length > 0 ? adjusted.join('/') : '無';

    if (!isPreview) {
      showStatus('色差校正完成！', 'success');
      downloadBtn.disabled = false;
      applyBtn.disabled = false;
    }
  }

  // Transform point with scale and offset
  function transformPoint(x, y, cx, cy, scale, offsetX, offsetY) {
    // Apply radial scaling from center
    const dx = x - cx;
    const dy = y - cy;
    const scaledX = cx + dx * scale + offsetX;
    const scaledY = cy + dy * scale + offsetY;
    return { x: scaledX, y: scaledY };
  }

  // Sample single channel with bilinear interpolation
  function sampleChannel(imageData, x, y, channel) {
    const w = imageData.width;
    const h = imageData.height;

    // Clamp coordinates
    x = Math.max(0, Math.min(x, w - 1));
    y = Math.max(0, Math.min(y, h - 1));

    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = Math.min(x1 + 1, w - 1);
    const y2 = Math.min(y1 + 1, h - 1);

    const fx = x - x1;
    const fy = y - y1;

    const getVal = (px, py) => {
      const idx = (py * w + px) * 4 + channel;
      return imageData.data[idx];
    };

    const v11 = getVal(x1, y1);
    const v21 = getVal(x2, y1);
    const v12 = getVal(x1, y2);
    const v22 = getVal(x2, y2);

    return (1 - fx) * (1 - fy) * v11 + fx * (1 - fy) * v21 + (1 - fx) * fy * v12 + fx * fy * v22;
  }

  // Get pixel gradient magnitude
  function getPixelGradient(imageData, x, y) {
    const w = imageData.width;
    const h = imageData.height;

    if (x <= 0 || x >= w - 1 || y <= 0 || y >= h - 1) return 0;

    const getGray = (px, py) => {
      const idx = (py * w + px) * 4;
      return (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
    };

    const gx = getGray(x + 1, y) - getGray(x - 1, y);
    const gy = getGray(x, y + 1) - getGray(x, y - 1);

    return Math.sqrt(gx * gx + gy * gy);
  }

  // Download result
  function downloadResult() {
    const canvas = resultCanvas.fullResCanvas || resultCanvas;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'ca-corrected.png';
    link.href = dataURL;
    link.click();

    showStatus('圖片已下載', 'success');
  }

  // Reset tool
  function resetTool() {
    originalImage = null;
    detectedCA = null;
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    resultCanvas.fullResCanvas = null;

    uploadZone.classList.remove('has-file');
    uploadZone.style.display = 'block';
    settingsSection.classList.remove('active');
    previewSection.classList.remove('active');

    // Reset mode
    modeItems.forEach(m => m.classList.remove('active'));
    modeItems[0].classList.add('active');
    selectedMode = 'auto';
    correctionModeEl.textContent = '自動校正';

    // Reset sliders
    Object.keys(sliders).forEach(key => {
      if (key === 'edgeMask') {
        sliders[key].value = 50;
      } else {
        sliders[key].value = 0;
      }
    });

    // Re-disable green sliders
    sliders.greenScale.disabled = true;
    sliders.greenX.disabled = true;
    sliders.greenY.disabled = true;

    updateValueDisplays();

    // Reset detection
    purpleFringeEl.textContent = '-';
    purpleFringeEl.className = 'detection-value';
    greenFringeEl.textContent = '-';
    greenFringeEl.className = 'detection-value';
    redShiftEl.textContent = '-';
    blueShiftEl.textContent = '-';

    applyBtn.disabled = true;
    downloadBtn.disabled = true;
    fileInput.value = '';

    imageSizeEl.textContent = '-';
    channelAdjustEl.textContent = '-';
    processTimeEl.textContent = '-';

    statusMessage.className = 'status-message';
  }

  // Show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
  }

  // Initialize on DOM ready
  init();
})();
