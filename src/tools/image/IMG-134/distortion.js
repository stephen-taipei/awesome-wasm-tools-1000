/**
 * IMG-134 鏡頭畸變校正
 * 校正廣角/魚眼鏡頭造成的畸變
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

  // Distortion type elements
  const distortionTypes = document.querySelectorAll('.distortion-type');

  // Slider elements
  const k1Slider = document.getElementById('k1');
  const k2Slider = document.getElementById('k2');
  const cxSlider = document.getElementById('cx');
  const cySlider = document.getElementById('cy');
  const k1Value = document.getElementById('k1Value');
  const k2Value = document.getElementById('k2Value');
  const cxValue = document.getElementById('cxValue');
  const cyValue = document.getElementById('cyValue');

  // Toggle elements
  const realtimePreview = document.getElementById('realtimePreview');
  const toggleOriginalGrid = document.getElementById('toggleOriginalGrid');
  const toggleResultGrid = document.getElementById('toggleResultGrid');

  // Info displays
  const imageSizeEl = document.getElementById('imageSize');
  const distortionTypeEl = document.getElementById('distortionType');
  const correctionParamsEl = document.getElementById('correctionParams');
  const processTimeEl = document.getElementById('processTime');

  // State
  let originalImage = null;
  let originalCtx = null;
  let resultCtx = null;
  let selectedType = 'barrel';
  let showOriginalGrid = false;
  let showResultGrid = false;
  let previewTimeout = null;

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

    // Distortion type selection
    distortionTypes.forEach(type => {
      type.addEventListener('click', () => {
        distortionTypes.forEach(t => t.classList.remove('active'));
        type.classList.add('active');
        selectedType = type.dataset.type;
        distortionTypeEl.textContent = type.querySelector('.distortion-name').textContent;
        setDefaultValues();
        schedulePreview();
      });
    });

    // Sliders
    k1Slider.addEventListener('input', handleSliderChange);
    k2Slider.addEventListener('input', handleSliderChange);
    cxSlider.addEventListener('input', handleSliderChange);
    cySlider.addEventListener('input', handleSliderChange);

    // Grid toggles
    toggleOriginalGrid.addEventListener('click', () => {
      showOriginalGrid = !showOriginalGrid;
      toggleOriginalGrid.classList.toggle('active', showOriginalGrid);
      drawOriginalImage();
    });

    toggleResultGrid.addEventListener('click', () => {
      showResultGrid = !showResultGrid;
      toggleResultGrid.classList.toggle('active', showResultGrid);
      if (resultCanvas.width > 0) {
        drawGrid(resultCtx, resultCanvas.width, resultCanvas.height, showResultGrid);
      }
    });

    // Buttons
    applyBtn.addEventListener('click', applyCorrection);
    downloadBtn.addEventListener('click', downloadResult);
    resetBtn.addEventListener('click', resetTool);
  }

  // Set default values based on distortion type
  function setDefaultValues() {
    switch (selectedType) {
      case 'barrel':
        k1Slider.value = -30;
        k2Slider.value = 0;
        break;
      case 'pincushion':
        k1Slider.value = 30;
        k2Slider.value = 0;
        break;
      case 'fisheye':
        k1Slider.value = -50;
        k2Slider.value = -20;
        break;
    }
    cxSlider.value = 0;
    cySlider.value = 0;
    updateSliderDisplays();
  }

  // Handle slider change
  function handleSliderChange() {
    updateSliderDisplays();
    schedulePreview();
  }

  // Update slider value displays
  function updateSliderDisplays() {
    const k1 = parseFloat(k1Slider.value) / 100;
    const k2 = parseFloat(k2Slider.value) / 100;
    const cx = parseInt(cxSlider.value);
    const cy = parseInt(cySlider.value);

    k1Value.textContent = k1.toFixed(2);
    k2Value.textContent = k2.toFixed(2);
    cxValue.textContent = cx + '%';
    cyValue.textContent = cy + '%';

    correctionParamsEl.textContent = `k1: ${k1.toFixed(2)}, k2: ${k2.toFixed(2)}`;
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
        setDefaultValues();

        imageSizeEl.textContent = `${img.width} × ${img.height}`;
        applyBtn.disabled = false;

        showStatus('圖片載入成功，調整參數以校正畸變', 'success');

        // Auto preview if enabled
        if (realtimePreview.checked) {
          applyCorrection(true);
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
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    originalCtx.drawImage(originalImage, 0, 0, originalCanvas.width, originalCanvas.height);

    if (showOriginalGrid) {
      drawGrid(originalCtx, originalCanvas.width, originalCanvas.height, true);
    }
  }

  // Draw grid overlay
  function drawGrid(ctx, width, height, show) {
    if (!show) return;

    ctx.strokeStyle = 'rgba(244, 114, 182, 0.5)';
    ctx.lineWidth = 1;

    const gridSize = 8;
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;

    // Vertical lines
    for (let i = 1; i < gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 1; i < gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(width, i * cellHeight);
      ctx.stroke();
    }

    // Center crosshair
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  // Apply distortion correction
  function applyCorrection(isPreview = false) {
    const startTime = performance.now();

    if (!isPreview) {
      showStatus('正在處理畸變校正...', 'success');
      applyBtn.disabled = true;
    }

    // Get parameters
    const k1 = parseFloat(k1Slider.value) / 100;
    const k2 = parseFloat(k2Slider.value) / 100;
    const cxOffset = parseInt(cxSlider.value) / 100;
    const cyOffset = parseInt(cySlider.value) / 100;

    // Create temporary canvas at full resolution for final output
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    let srcWidth, srcHeight;
    if (isPreview) {
      srcWidth = originalCanvas.width;
      srcHeight = originalCanvas.height;
      tempCanvas.width = srcWidth;
      tempCanvas.height = srcHeight;
      tempCtx.drawImage(originalImage, 0, 0, srcWidth, srcHeight);
    } else {
      srcWidth = originalImage.width;
      srcHeight = originalImage.height;
      tempCanvas.width = srcWidth;
      tempCanvas.height = srcHeight;
      tempCtx.drawImage(originalImage, 0, 0);
    }

    const srcData = tempCtx.getImageData(0, 0, srcWidth, srcHeight);

    // Create output canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = srcWidth;
    outCanvas.height = srcHeight;
    const outCtx = outCanvas.getContext('2d');
    const dstData = outCtx.createImageData(srcWidth, srcHeight);

    // Calculate center
    const cx = srcWidth / 2 + cxOffset * srcWidth;
    const cy = srcHeight / 2 + cyOffset * srcHeight;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);

    // Process each pixel
    for (let y = 0; y < srcHeight; y++) {
      for (let x = 0; x < srcWidth; x++) {
        // Normalize coordinates to center
        const dx = (x - cx) / maxRadius;
        const dy = (y - cy) / maxRadius;
        const r = Math.sqrt(dx * dx + dy * dy);

        // Apply radial distortion correction
        let rCorrected;
        if (selectedType === 'fisheye') {
          // Fisheye to rectilinear
          rCorrected = r * (1 + k1 * r * r + k2 * r * r * r * r);
        } else {
          // Brown-Conrady model
          rCorrected = r * (1 + k1 * r * r + k2 * r * r * r * r);
        }

        // Calculate source coordinates
        let srcX, srcY;
        if (r === 0) {
          srcX = cx;
          srcY = cy;
        } else {
          const scale = rCorrected / r;
          srcX = cx + dx * maxRadius * scale;
          srcY = cy + dy * maxRadius * scale;
        }

        // Bilinear interpolation
        const color = bilinearInterpolate(srcData, srcX, srcY);

        const idx = (y * srcWidth + x) * 4;
        dstData.data[idx] = color.r;
        dstData.data[idx + 1] = color.g;
        dstData.data[idx + 2] = color.b;
        dstData.data[idx + 3] = color.a;
      }
    }

    // Draw result
    if (isPreview) {
      resultCtx.putImageData(dstData, 0, 0);
      if (showResultGrid) {
        drawGrid(resultCtx, resultCanvas.width, resultCanvas.height, true);
      }
    } else {
      // Full resolution
      outCtx.putImageData(dstData, 0, 0);

      // Scale for display
      resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
      resultCtx.drawImage(outCanvas, 0, 0, resultCanvas.width, resultCanvas.height);

      if (showResultGrid) {
        drawGrid(resultCtx, resultCanvas.width, resultCanvas.height, true);
      }

      // Store full resolution result
      resultCanvas.fullResCanvas = outCanvas;
    }

    const endTime = performance.now();
    processTimeEl.textContent = Math.round(endTime - startTime) + 'ms';

    if (!isPreview) {
      showStatus('畸變校正完成！', 'success');
      downloadBtn.disabled = false;
      applyBtn.disabled = false;
    }
  }

  // Bilinear interpolation
  function bilinearInterpolate(imageData, x, y) {
    const w = imageData.width;
    const h = imageData.height;

    // Handle out of bounds
    if (x < 0 || x >= w - 1 || y < 0 || y >= h - 1) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }

    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = x1 + 1;
    const y2 = y1 + 1;

    const fx = x - x1;
    const fy = y - y1;

    const getPixel = (px, py) => {
      if (px < 0 || px >= w || py < 0 || py >= h) {
        return { r: 0, g: 0, b: 0, a: 0 };
      }
      const idx = (py * w + px) * 4;
      return {
        r: imageData.data[idx],
        g: imageData.data[idx + 1],
        b: imageData.data[idx + 2],
        a: imageData.data[idx + 3]
      };
    };

    const p11 = getPixel(x1, y1);
    const p21 = getPixel(x2, y1);
    const p12 = getPixel(x1, y2);
    const p22 = getPixel(x2, y2);

    return {
      r: Math.round((1 - fx) * (1 - fy) * p11.r + fx * (1 - fy) * p21.r + (1 - fx) * fy * p12.r + fx * fy * p22.r),
      g: Math.round((1 - fx) * (1 - fy) * p11.g + fx * (1 - fy) * p21.g + (1 - fx) * fy * p12.g + fx * fy * p22.g),
      b: Math.round((1 - fx) * (1 - fy) * p11.b + fx * (1 - fy) * p21.b + (1 - fx) * fy * p12.b + fx * fy * p22.b),
      a: Math.round((1 - fx) * (1 - fy) * p11.a + fx * (1 - fy) * p21.a + (1 - fx) * fy * p12.a + fx * fy * p22.a)
    };
  }

  // Download result
  function downloadResult() {
    // Use full resolution canvas if available
    const canvas = resultCanvas.fullResCanvas || resultCanvas;

    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'distortion-corrected.png';
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

    // Reset distortion type
    distortionTypes.forEach(t => t.classList.remove('active'));
    distortionTypes[0].classList.add('active');
    selectedType = 'barrel';
    distortionTypeEl.textContent = '桶形畸變';

    // Reset sliders
    k1Slider.value = 0;
    k2Slider.value = 0;
    cxSlider.value = 0;
    cySlider.value = 0;
    updateSliderDisplays();

    // Reset grid toggles
    showOriginalGrid = false;
    showResultGrid = false;
    toggleOriginalGrid.classList.remove('active');
    toggleResultGrid.classList.remove('active');

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

  // Initialize on DOM ready
  init();
})();
