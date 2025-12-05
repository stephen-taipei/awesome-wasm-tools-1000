/**
 * IMG-136 紅眼移除
 * 移除閃光燈造成的紅眼效果
 */

(function() {
  // DOM Elements
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const settingsSection = document.getElementById('settingsSection');
  const previewSection = document.getElementById('previewSection');
  const originalCanvas = document.getElementById('originalCanvas');
  const resultCanvas = document.getElementById('resultCanvas');
  const originalArea = document.getElementById('originalArea');
  const applyBtn = document.getElementById('applyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const statusMessage = document.getElementById('statusMessage');

  // Mode elements
  const modeItems = document.querySelectorAll('.mode-item');

  // Sliders
  const intensitySlider = document.getElementById('intensity');
  const sensitivitySlider = document.getElementById('sensitivity');
  const pupilSizeSlider = document.getElementById('pupilSize');
  const featherSlider = document.getElementById('feather');

  // Value displays
  const intensityValue = document.getElementById('intensityValue');
  const sensitivityValue = document.getElementById('sensitivityValue');
  const pupilSizeValue = document.getElementById('pupilSizeValue');
  const featherValue = document.getElementById('featherValue');

  // Info displays
  const imageSizeEl = document.getElementById('imageSize');
  const detectionModeEl = document.getElementById('detectionMode');
  const eyeCountEl = document.getElementById('eyeCount');
  const processTimeEl = document.getElementById('processTime');
  const eyeList = document.getElementById('eyeList');

  // State
  let originalImage = null;
  let originalCtx = null;
  let resultCtx = null;
  let selectedMode = 'auto';
  let eyePositions = [];
  let imageScale = 1;

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
        detectionModeEl.textContent = item.querySelector('.mode-name').textContent;

        if (originalImage && selectedMode === 'auto') {
          detectRedEyes();
        }
      });
    });

    // Sliders
    intensitySlider.addEventListener('input', updateSliderDisplays);
    sensitivitySlider.addEventListener('input', () => {
      updateSliderDisplays();
      if (originalImage && selectedMode === 'auto') {
        detectRedEyes();
      }
    });
    pupilSizeSlider.addEventListener('input', updateSliderDisplays);
    featherSlider.addEventListener('input', updateSliderDisplays);

    // Click to add eye position (manual mode)
    originalArea.addEventListener('click', handleCanvasClick);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (eyePositions.length > 0) {
          eyePositions.pop();
          updateEyeList();
          drawEyeMarkers();
        }
      }
    });

    // Buttons
    applyBtn.addEventListener('click', applyRedEyeRemoval);
    downloadBtn.addEventListener('click', downloadResult);
    resetBtn.addEventListener('click', resetTool);
  }

  // Update slider displays
  function updateSliderDisplays() {
    intensityValue.textContent = intensitySlider.value + '%';
    sensitivityValue.textContent = sensitivitySlider.value + '%';

    const size = parseInt(pupilSizeSlider.value);
    if (size < 20) pupilSizeValue.textContent = '小';
    else if (size < 35) pupilSizeValue.textContent = '中';
    else pupilSizeValue.textContent = '大';

    featherValue.textContent = featherSlider.value + 'px';
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
        eyePositions = [];

        uploadZone.classList.add('has-file');
        uploadZone.style.display = 'none';
        settingsSection.classList.add('active');
        previewSection.classList.add('active');

        setupCanvases();
        drawOriginalImage();

        imageSizeEl.textContent = `${img.width} × ${img.height}`;
        applyBtn.disabled = false;

        showStatus('圖片載入成功', 'success');

        if (selectedMode === 'auto') {
          detectRedEyes();
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

    imageScale = width / originalImage.width;

    originalCanvas.width = width;
    originalCanvas.height = height;
    resultCanvas.width = width;
    resultCanvas.height = height;
  }

  // Draw original image
  function drawOriginalImage() {
    originalCtx.drawImage(originalImage, 0, 0, originalCanvas.width, originalCanvas.height);
  }

  // Handle canvas click for manual mode
  function handleCanvasClick(e) {
    if (!originalImage) return;

    const rect = originalCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to image coordinates
    const imgX = x / imageScale;
    const imgY = y / imageScale;

    // Add eye position
    const radius = parseInt(pupilSizeSlider.value);
    eyePositions.push({ x: imgX, y: imgY, radius: radius });

    updateEyeList();
    drawEyeMarkers();
  }

  // Detect red eyes automatically
  function detectRedEyes() {
    const startTime = performance.now();
    showStatus('正在偵測紅眼...', 'success');

    eyePositions = [];

    // Create temp canvas for analysis
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    const width = tempCanvas.width;
    const height = tempCanvas.height;

    const sensitivity = parseInt(sensitivitySlider.value) / 100;
    const minRadius = 5;
    const maxRadius = 50;

    // Find red eye candidates
    const candidates = [];
    const visited = new Set();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Red eye detection: high red, low green/blue
        const redRatio = r / (Math.max(g, b, 1));
        const brightness = (r + g + b) / 3;

        const threshold = 1.5 + (1 - sensitivity) * 1.5;

        if (redRatio > threshold && r > 80 && brightness > 40 && brightness < 220) {
          const key = `${Math.floor(x / 10)}_${Math.floor(y / 10)}`;
          if (!visited.has(key)) {
            visited.add(key);
            candidates.push({ x, y, strength: redRatio });
          }
        }
      }
    }

    // Cluster candidates into eye regions
    const clusters = clusterPoints(candidates, 30);

    // Filter and validate clusters
    clusters.forEach(cluster => {
      if (cluster.points.length >= 3) {
        const centerX = cluster.points.reduce((sum, p) => sum + p.x, 0) / cluster.points.length;
        const centerY = cluster.points.reduce((sum, p) => sum + p.y, 0) / cluster.points.length;

        // Estimate radius
        let maxDist = 0;
        cluster.points.forEach(p => {
          const dist = Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
          maxDist = Math.max(maxDist, dist);
        });

        const radius = Math.max(minRadius, Math.min(maxRadius, maxDist * 1.5));

        // Validate it's roughly circular
        if (isCircularRegion(data, width, centerX, centerY, radius)) {
          eyePositions.push({ x: centerX, y: centerY, radius: radius });
        }
      }
    });

    const endTime = performance.now();
    processTimeEl.textContent = Math.round(endTime - startTime) + 'ms';

    updateEyeList();
    drawEyeMarkers();

    if (eyePositions.length > 0) {
      showStatus(`偵測到 ${eyePositions.length} 個紅眼區域`, 'success');
    } else {
      showStatus('未偵測到紅眼，您可以切換到手動模式選取', 'success');
    }
  }

  // Cluster points using simple distance-based clustering
  function clusterPoints(points, threshold) {
    const clusters = [];
    const assigned = new Set();

    points.forEach((point, i) => {
      if (assigned.has(i)) return;

      const cluster = { points: [point] };
      assigned.add(i);

      points.forEach((other, j) => {
        if (i === j || assigned.has(j)) return;
        const dist = Math.sqrt(Math.pow(point.x - other.x, 2) + Math.pow(point.y - other.y, 2));
        if (dist < threshold) {
          cluster.points.push(other);
          assigned.add(j);
        }
      });

      clusters.push(cluster);
    });

    return clusters;
  }

  // Check if region is roughly circular
  function isCircularRegion(data, width, cx, cy, radius) {
    let redCount = 0;
    let totalCount = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const x = Math.round(cx + dx);
          const y = Math.round(cy + dy);
          if (x >= 0 && x < width && y >= 0) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            totalCount++;
            if (r > g * 1.3 && r > b * 1.3 && r > 60) {
              redCount++;
            }
          }
        }
      }
    }

    return totalCount > 0 && (redCount / totalCount) > 0.3;
  }

  // Update eye list display
  function updateEyeList() {
    eyeCountEl.textContent = eyePositions.length;

    if (eyePositions.length === 0) {
      eyeList.innerHTML = '<span style="color: #666; font-size: 0.85rem;">尚未偵測到紅眼</span>';
      return;
    }

    eyeList.innerHTML = eyePositions.map((eye, i) => `
      <div class="eye-item">
        眼睛 ${i + 1} (${Math.round(eye.x)}, ${Math.round(eye.y)})
        <button class="remove-eye" data-index="${i}">×</button>
      </div>
    `).join('');

    // Add remove handlers
    eyeList.querySelectorAll('.remove-eye').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        eyePositions.splice(index, 1);
        updateEyeList();
        drawEyeMarkers();
      });
    });
  }

  // Draw eye markers on original image
  function drawEyeMarkers() {
    // Redraw original
    drawOriginalImage();

    // Draw markers
    originalCtx.strokeStyle = '#ef4444';
    originalCtx.lineWidth = 2;

    eyePositions.forEach(eye => {
      const x = eye.x * imageScale;
      const y = eye.y * imageScale;
      const r = eye.radius * imageScale;

      originalCtx.beginPath();
      originalCtx.arc(x, y, r, 0, Math.PI * 2);
      originalCtx.stroke();

      // Center dot
      originalCtx.fillStyle = '#ef4444';
      originalCtx.beginPath();
      originalCtx.arc(x, y, 3, 0, Math.PI * 2);
      originalCtx.fill();
    });
  }

  // Apply red eye removal
  function applyRedEyeRemoval() {
    if (eyePositions.length === 0) {
      showStatus('請先選取或偵測紅眼區域', 'error');
      return;
    }

    const startTime = performance.now();
    showStatus('正在移除紅眼...', 'success');
    applyBtn.disabled = true;

    // Process at full resolution
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    const width = tempCanvas.width;

    const intensity = parseInt(intensitySlider.value) / 100;
    const feather = parseInt(featherSlider.value);

    // Process each eye
    eyePositions.forEach(eye => {
      const cx = eye.x;
      const cy = eye.y;
      const radius = eye.radius;
      const outerRadius = radius + feather;

      for (let dy = -outerRadius; dy <= outerRadius; dy++) {
        for (let dx = -outerRadius; dx <= outerRadius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= outerRadius) {
            const x = Math.round(cx + dx);
            const y = Math.round(cy + dy);

            if (x >= 0 && x < width && y >= 0) {
              const idx = (y * width + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];

              // Check if pixel is reddish
              if (r > g * 1.1 && r > b * 1.1) {
                // Calculate blend factor
                let blend = intensity;
                if (dist > radius) {
                  blend *= 1 - (dist - radius) / feather;
                }

                // Desaturate red to create natural pupil color
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                const darkFactor = 0.3; // Make pupil darker

                const newR = r + (luminance * darkFactor - r) * blend;
                const newG = g + (luminance * darkFactor - g) * blend * 0.5;
                const newB = b + (luminance * darkFactor - b) * blend * 0.5;

                data[idx] = Math.round(Math.max(0, Math.min(255, newR)));
                data[idx + 1] = Math.round(Math.max(0, Math.min(255, newG)));
                data[idx + 2] = Math.round(Math.max(0, Math.min(255, newB)));
              }
            }
          }
        }
      }
    });

    tempCtx.putImageData(imageData, 0, 0);

    // Draw to result canvas (scaled)
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    resultCtx.drawImage(tempCanvas, 0, 0, resultCanvas.width, resultCanvas.height);

    // Store full resolution
    resultCanvas.fullResCanvas = tempCanvas;

    const endTime = performance.now();
    processTimeEl.textContent = Math.round(endTime - startTime) + 'ms';

    showStatus('紅眼移除完成！', 'success');
    downloadBtn.disabled = false;
    applyBtn.disabled = false;
  }

  // Download result
  function downloadResult() {
    const canvas = resultCanvas.fullResCanvas || resultCanvas;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'redeye-removed.png';
    link.href = dataURL;
    link.click();

    showStatus('圖片已下載', 'success');
  }

  // Reset tool
  function resetTool() {
    originalImage = null;
    eyePositions = [];
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
    detectionModeEl.textContent = '自動偵測';

    // Reset sliders
    intensitySlider.value = 70;
    sensitivitySlider.value = 50;
    pupilSizeSlider.value = 25;
    featherSlider.value = 5;
    updateSliderDisplays();

    applyBtn.disabled = true;
    downloadBtn.disabled = true;
    fileInput.value = '';

    imageSizeEl.textContent = '-';
    eyeCountEl.textContent = '0';
    processTimeEl.textContent = '-';
    eyeList.innerHTML = '<span style="color: #666; font-size: 0.85rem;">尚未偵測到紅眼</span>';

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
