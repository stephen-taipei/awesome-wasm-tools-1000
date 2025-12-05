/**
 * IMG-137 斑點移除
 * 移除圖片中的小斑點、瑕疵
 */

(function() {
  // DOM Elements
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const settingsSection = document.getElementById('settingsSection');
  const previewSection = document.getElementById('previewSection');
  const editCanvas = document.getElementById('editCanvas');
  const canvasWrapper = document.getElementById('canvasWrapper');
  const brushPreview = document.getElementById('brushPreview');
  const downloadBtn = document.getElementById('downloadBtn');
  const compareBtn = document.getElementById('compareBtn');
  const resetBtn = document.getElementById('resetBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusMessage = document.getElementById('statusMessage');

  // Tool buttons
  const toolButtons = document.querySelectorAll('.tool-btn');

  // Sliders
  const brushSizeSlider = document.getElementById('brushSize');
  const featherSlider = document.getElementById('feather');
  const strengthSlider = document.getElementById('strength');
  const sampleRadiusSlider = document.getElementById('sampleRadius');

  // Value displays
  const brushSizeValue = document.getElementById('brushSizeValue');
  const featherValue = document.getElementById('featherValue');
  const strengthValue = document.getElementById('strengthValue');
  const sampleRadiusValue = document.getElementById('sampleRadiusValue');

  // Info displays
  const imageSizeEl = document.getElementById('imageSize');
  const currentToolEl = document.getElementById('currentTool');
  const repairCountEl = document.getElementById('repairCount');
  const historyCountEl = document.getElementById('historyCount');

  // State
  let originalImage = null;
  let editCtx = null;
  let selectedTool = 'spot';
  let isDrawing = false;
  let imageScale = 1;
  let repairCount = 0;
  let cloneSource = null;
  let lastPoint = null;

  // History for undo/redo
  const history = [];
  let historyIndex = -1;
  const maxHistory = 20;

  // Initialize
  function init() {
    setupEventListeners();
    editCtx = editCanvas.getContext('2d');
  }

  // Event Listeners
  function setupEventListeners() {
    // Upload
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Tool selection
    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        toolButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTool = btn.dataset.tool;
        currentToolEl.textContent = btn.querySelector('span:last-child').textContent;
        cloneSource = null;
      });
    });

    // Sliders
    brushSizeSlider.addEventListener('input', updateSliderDisplays);
    featherSlider.addEventListener('input', updateSliderDisplays);
    strengthSlider.addEventListener('input', updateSliderDisplays);
    sampleRadiusSlider.addEventListener('input', updateSliderDisplays);

    // Canvas events
    editCanvas.addEventListener('mousedown', handleMouseDown);
    editCanvas.addEventListener('mousemove', handleMouseMove);
    editCanvas.addEventListener('mouseup', handleMouseUp);
    editCanvas.addEventListener('mouseleave', handleMouseUp);

    // Touch events
    editCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    editCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    editCanvas.addEventListener('touchend', handleMouseUp);

    // Brush preview
    canvasWrapper.addEventListener('mouseenter', () => {
      if (originalImage) brushPreview.style.display = 'block';
    });
    canvasWrapper.addEventListener('mouseleave', () => {
      brushPreview.style.display = 'none';
    });
    canvasWrapper.addEventListener('mousemove', updateBrushPreview);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Alt') {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    });

    // Buttons
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    clearBtn.addEventListener('click', clearAll);
    compareBtn.addEventListener('mousedown', showOriginal);
    compareBtn.addEventListener('mouseup', showEdited);
    compareBtn.addEventListener('mouseleave', showEdited);
    downloadBtn.addEventListener('click', downloadResult);
    resetBtn.addEventListener('click', resetTool);
  }

  // Update slider displays
  function updateSliderDisplays() {
    brushSizeValue.textContent = brushSizeSlider.value + 'px';
    featherValue.textContent = featherSlider.value + '%';
    strengthValue.textContent = strengthSlider.value + '%';

    const radius = parseInt(sampleRadiusSlider.value);
    sampleRadiusValue.textContent = ['小', '中', '大'][radius - 1];

    updateBrushPreviewSize();
  }

  // Update brush preview size
  function updateBrushPreviewSize() {
    const size = parseInt(brushSizeSlider.value) * imageScale;
    brushPreview.style.width = size + 'px';
    brushPreview.style.height = size + 'px';
  }

  // Update brush preview position
  function updateBrushPreview(e) {
    if (!originalImage) return;
    brushPreview.style.left = e.clientX + 'px';
    brushPreview.style.top = e.clientY + 'px';
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

        setupCanvas();
        drawImage();
        saveState();

        imageSizeEl.textContent = `${img.width} × ${img.height}`;
        downloadBtn.disabled = false;
        compareBtn.disabled = false;

        showStatus('圖片載入成功，選擇工具開始修復', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Setup canvas
  function setupCanvas() {
    const maxSize = 600;
    let width = originalImage.width;
    let height = originalImage.height;

    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    imageScale = width / originalImage.width;

    editCanvas.width = width;
    editCanvas.height = height;

    updateBrushPreviewSize();
  }

  // Draw image
  function drawImage() {
    editCtx.drawImage(originalImage, 0, 0, editCanvas.width, editCanvas.height);
  }

  // Handle mouse down
  function handleMouseDown(e) {
    if (!originalImage) return;

    const rect = editCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);

    // Clone tool: Alt+click to set source
    if (selectedTool === 'clone' && e.altKey) {
      cloneSource = { x: x / imageScale, y: y / imageScale };
      showStatus('已設定仿製來源', 'success');
      return;
    }

    isDrawing = true;
    lastPoint = { x, y };

    if (selectedTool === 'spot') {
      // Single spot heal
      healSpot(x / imageScale, y / imageScale);
      repairCount++;
      repairCountEl.textContent = repairCount;
      saveState();
    }
  }

  // Handle mouse move
  function handleMouseMove(e) {
    if (!isDrawing || !originalImage) return;

    const rect = editCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);

    if (selectedTool === 'brush') {
      healBrush(x / imageScale, y / imageScale);
    } else if (selectedTool === 'clone' && cloneSource) {
      cloneStamp(x / imageScale, y / imageScale);
    }

    lastPoint = { x, y };
  }

  // Handle mouse up
  function handleMouseUp() {
    if (isDrawing && (selectedTool === 'brush' || selectedTool === 'clone')) {
      saveState();
      repairCount++;
      repairCountEl.textContent = repairCount;
    }
    isDrawing = false;
    lastPoint = null;
  }

  // Touch handlers
  function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, altKey: false });
  }

  function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  // Heal spot (content-aware fill)
  function healSpot(x, y) {
    const brushSize = parseInt(brushSizeSlider.value);
    const feather = parseInt(featherSlider.value) / 100;
    const strength = parseInt(strengthSlider.value) / 100;
    const sampleMultiplier = parseInt(sampleRadiusSlider.value);

    const radius = brushSize / 2;
    const sampleRadius = radius * (1 + sampleMultiplier);

    // Get image data
    const imageData = editCtx.getImageData(0, 0, editCanvas.width, editCanvas.height);
    const data = imageData.data;
    const width = editCanvas.width;

    // Sample surrounding pixels
    const samples = [];
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      for (let r = radius + 2; r < sampleRadius; r += 2) {
        const sx = Math.round((x * imageScale) + Math.cos(angle) * r);
        const sy = Math.round((y * imageScale) + Math.sin(angle) * r);

        if (sx >= 0 && sx < width && sy >= 0 && sy < imageData.height) {
          const idx = (sy * width + sx) * 4;
          samples.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
            dist: r
          });
        }
      }
    }

    if (samples.length === 0) return;

    // Fill the spot
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const px = Math.round(x * imageScale + dx);
        const py = Math.round(y * imageScale + dy);

        if (px < 0 || px >= width || py < 0 || py >= imageData.height) continue;

        const idx = (py * width + px) * 4;

        // Calculate blend factor
        let blend = strength;
        if (feather > 0) {
          const featherStart = radius * (1 - feather);
          if (dist > featherStart) {
            blend *= 1 - (dist - featherStart) / (radius - featherStart);
          }
        }

        // Weighted average of samples
        let totalWeight = 0;
        let avgR = 0, avgG = 0, avgB = 0;

        samples.forEach(sample => {
          const weight = 1 / (sample.dist * sample.dist);
          avgR += sample.r * weight;
          avgG += sample.g * weight;
          avgB += sample.b * weight;
          totalWeight += weight;
        });

        avgR /= totalWeight;
        avgG /= totalWeight;
        avgB /= totalWeight;

        // Blend with original
        data[idx] = Math.round(data[idx] + (avgR - data[idx]) * blend);
        data[idx + 1] = Math.round(data[idx + 1] + (avgG - data[idx + 1]) * blend);
        data[idx + 2] = Math.round(data[idx + 2] + (avgB - data[idx + 2]) * blend);
      }
    }

    editCtx.putImageData(imageData, 0, 0);
  }

  // Heal brush (continuous stroke)
  function healBrush(x, y) {
    const brushSize = parseInt(brushSizeSlider.value);
    const strength = parseInt(strengthSlider.value) / 100;

    // Interpolate between last point and current point
    if (lastPoint) {
      const dx = x * imageScale - lastPoint.x;
      const dy = y * imageScale - lastPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / (brushSize / 4)));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = (lastPoint.x + dx * t) / imageScale;
        const py = (lastPoint.y + dy * t) / imageScale;
        healSpotLight(px, py, brushSize / 2, strength);
      }
    }
  }

  // Light heal for brush strokes
  function healSpotLight(x, y, radius, strength) {
    const imageData = editCtx.getImageData(0, 0, editCanvas.width, editCanvas.height);
    const data = imageData.data;
    const width = editCanvas.width;

    // Quick sampling
    const samples = [];
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const r = radius * 1.5;
      const sx = Math.round(x * imageScale + Math.cos(angle) * r);
      const sy = Math.round(y * imageScale + Math.sin(angle) * r);

      if (sx >= 0 && sx < width && sy >= 0 && sy < imageData.height) {
        const idx = (sy * width + sx) * 4;
        samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      }
    }

    if (samples.length === 0) return;

    const avgR = samples.reduce((s, p) => s + p.r, 0) / samples.length;
    const avgG = samples.reduce((s, p) => s + p.g, 0) / samples.length;
    const avgB = samples.reduce((s, p) => s + p.b, 0) / samples.length;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const px = Math.round(x * imageScale + dx);
        const py = Math.round(y * imageScale + dy);

        if (px < 0 || px >= width || py < 0 || py >= imageData.height) continue;

        const idx = (py * width + px) * 4;
        const blend = strength * (1 - dist / radius) * 0.3;

        data[idx] = Math.round(data[idx] + (avgR - data[idx]) * blend);
        data[idx + 1] = Math.round(data[idx + 1] + (avgG - data[idx + 1]) * blend);
        data[idx + 2] = Math.round(data[idx + 2] + (avgB - data[idx + 2]) * blend);
      }
    }

    editCtx.putImageData(imageData, 0, 0);
  }

  // Clone stamp
  function cloneStamp(x, y) {
    if (!cloneSource) {
      showStatus('請先按住 Alt 點擊設定仿製來源', 'error');
      return;
    }

    const brushSize = parseInt(brushSizeSlider.value);
    const feather = parseInt(featherSlider.value) / 100;
    const strength = parseInt(strengthSlider.value) / 100;
    const radius = brushSize / 2;

    // Create source canvas from original
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = editCanvas.width;
    srcCanvas.height = editCanvas.height;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(originalImage, 0, 0, editCanvas.width, editCanvas.height);
    const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

    const imageData = editCtx.getImageData(0, 0, editCanvas.width, editCanvas.height);
    const data = imageData.data;
    const width = editCanvas.width;

    // Calculate offset from source to destination
    const offsetX = (x - cloneSource.x) * imageScale;
    const offsetY = (y - cloneSource.y) * imageScale;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const dstX = Math.round(x * imageScale + dx);
        const dstY = Math.round(y * imageScale + dy);
        const srcX = Math.round(dstX - offsetX);
        const srcY = Math.round(dstY - offsetY);

        if (dstX < 0 || dstX >= width || dstY < 0 || dstY >= imageData.height) continue;
        if (srcX < 0 || srcX >= width || srcY < 0 || srcY >= srcData.height) continue;

        const dstIdx = (dstY * width + dstX) * 4;
        const srcIdx = (srcY * width + srcX) * 4;

        let blend = strength;
        if (feather > 0) {
          const featherStart = radius * (1 - feather);
          if (dist > featherStart) {
            blend *= 1 - (dist - featherStart) / (radius - featherStart);
          }
        }

        data[dstIdx] = Math.round(data[dstIdx] + (srcData.data[srcIdx] - data[dstIdx]) * blend);
        data[dstIdx + 1] = Math.round(data[dstIdx + 1] + (srcData.data[srcIdx + 1] - data[dstIdx + 1]) * blend);
        data[dstIdx + 2] = Math.round(data[dstIdx + 2] + (srcData.data[srcIdx + 2] - data[dstIdx + 2]) * blend);
      }
    }

    editCtx.putImageData(imageData, 0, 0);
  }

  // History management
  function saveState() {
    // Remove future states if we're not at the end
    if (historyIndex < history.length - 1) {
      history.splice(historyIndex + 1);
    }

    // Save current state
    const imageData = editCtx.getImageData(0, 0, editCanvas.width, editCanvas.height);
    history.push(imageData);

    // Limit history size
    if (history.length > maxHistory) {
      history.shift();
    } else {
      historyIndex++;
    }

    updateHistoryButtons();
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      editCtx.putImageData(history[historyIndex], 0, 0);
      updateHistoryButtons();
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      editCtx.putImageData(history[historyIndex], 0, 0);
      updateHistoryButtons();
    }
  }

  function updateHistoryButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
    historyCountEl.textContent = `${historyIndex + 1}/${history.length}`;
  }

  function clearAll() {
    drawImage();
    saveState();
    repairCount = 0;
    repairCountEl.textContent = '0';
    showStatus('已清除所有修改', 'success');
  }

  // Compare with original
  function showOriginal() {
    if (originalImage) {
      drawImage();
    }
  }

  function showEdited() {
    if (historyIndex >= 0 && history[historyIndex]) {
      editCtx.putImageData(history[historyIndex], 0, 0);
    }
  }

  // Download result
  function downloadResult() {
    // Create full resolution output
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = originalImage.width;
    outputCanvas.height = originalImage.height;
    const outputCtx = outputCanvas.getContext('2d');

    // Scale up the edited canvas
    outputCtx.drawImage(editCanvas, 0, 0, originalImage.width, originalImage.height);

    const dataURL = outputCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'spot-removed.png';
    link.href = dataURL;
    link.click();

    showStatus('圖片已下載', 'success');
  }

  // Reset tool
  function resetTool() {
    originalImage = null;
    history.length = 0;
    historyIndex = -1;
    repairCount = 0;
    cloneSource = null;

    editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);

    uploadZone.classList.remove('has-file');
    uploadZone.style.display = 'block';
    settingsSection.classList.remove('active');
    previewSection.classList.remove('active');

    // Reset tool
    toolButtons.forEach(b => b.classList.remove('active'));
    toolButtons[0].classList.add('active');
    selectedTool = 'spot';
    currentToolEl.textContent = '點選修復';

    // Reset sliders
    brushSizeSlider.value = 20;
    featherSlider.value = 50;
    strengthSlider.value = 100;
    sampleRadiusSlider.value = 2;
    updateSliderDisplays();

    downloadBtn.disabled = true;
    compareBtn.disabled = true;
    undoBtn.disabled = true;
    redoBtn.disabled = true;
    fileInput.value = '';

    imageSizeEl.textContent = '-';
    repairCountEl.textContent = '0';
    historyCountEl.textContent = '0/20';

    statusMessage.className = 'status-message';
  }

  // Show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
  }

  // Initialize
  init();
  updateSliderDisplays();
})();
