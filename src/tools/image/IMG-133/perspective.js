/**
 * IMG-133 透視校正
 * 校正透視變形（如文件拍攝）
 */

(function() {
  // DOM Elements
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const instructions = document.getElementById('instructions');
  const settingsSection = document.getElementById('settingsSection');
  const editorSection = document.getElementById('editorSection');
  const sourceCanvas = document.getElementById('sourceCanvas');
  const resultCanvas = document.getElementById('resultCanvas');
  const sourceContainer = document.getElementById('sourceContainer');
  const applyBtn = document.getElementById('applyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const statusMessage = document.getElementById('statusMessage');

  // Corner points
  const corners = {
    tl: document.getElementById('corner-tl'),
    tr: document.getElementById('corner-tr'),
    bl: document.getElementById('corner-bl'),
    br: document.getElementById('corner-br')
  };

  const labels = {
    tl: document.getElementById('label-tl'),
    tr: document.getElementById('label-tr'),
    bl: document.getElementById('label-bl'),
    br: document.getElementById('label-br')
  };

  // Preset items
  const presetItems = document.querySelectorAll('.preset-item');
  const autoEnhance = document.getElementById('autoEnhance');
  const outputFormat = document.getElementById('outputFormat');
  const outputQuality = document.getElementById('outputQuality');

  // Info displays
  const originalSizeEl = document.getElementById('originalSize');
  const outputSizeEl = document.getElementById('outputSize');
  const selectedRatioEl = document.getElementById('selectedRatio');
  const processTimeEl = document.getElementById('processTime');

  // State
  let originalImage = null;
  let sourceCtx = null;
  let resultCtx = null;
  let canvasRect = null;
  let imageScale = 1;
  let imageOffset = { x: 0, y: 0 };
  let selectedRatio = 'auto';
  let isDragging = false;
  let activeCorner = null;

  // Corner positions (in image coordinates)
  let cornerPositions = {
    tl: { x: 0, y: 0 },
    tr: { x: 0, y: 0 },
    bl: { x: 0, y: 0 },
    br: { x: 0, y: 0 }
  };

  // Initialize
  function init() {
    setupEventListeners();
    sourceCtx = sourceCanvas.getContext('2d');
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

    // Preset selection
    presetItems.forEach(item => {
      item.addEventListener('click', () => {
        presetItems.forEach(p => p.classList.remove('active'));
        item.classList.add('active');
        selectedRatio = item.dataset.ratio;
        updateRatioDisplay();
      });
    });

    // Corner dragging
    Object.keys(corners).forEach(key => {
      corners[key].addEventListener('mousedown', (e) => startDrag(e, key));
      corners[key].addEventListener('touchstart', (e) => startDrag(e, key), { passive: false });
    });

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('touchmove', handleDrag, { passive: false });
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);

    // Buttons
    applyBtn.addEventListener('click', applyCorrection);
    downloadBtn.addEventListener('click', downloadResult);
    resetBtn.addEventListener('click', resetTool);

    // Window resize
    window.addEventListener('resize', () => {
      if (originalImage) {
        updateCanvasSize();
        drawSourceImage();
        updateCornerElements();
      }
    });
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
        instructions.style.display = 'block';
        settingsSection.style.display = 'block';
        editorSection.classList.add('active');

        updateCanvasSize();
        drawSourceImage();
        initializeCorners();

        originalSizeEl.textContent = `${img.width} × ${img.height}`;
        applyBtn.disabled = false;

        showStatus('圖片載入成功，請拖曳四個角點選取需要校正的區域', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Update canvas size
  function updateCanvasSize() {
    const container = sourceContainer;
    const containerWidth = container.clientWidth - 20;
    const containerHeight = 400;

    const imgRatio = originalImage.width / originalImage.height;
    const containerRatio = containerWidth / containerHeight;

    let canvasWidth, canvasHeight;

    if (imgRatio > containerRatio) {
      canvasWidth = containerWidth;
      canvasHeight = containerWidth / imgRatio;
    } else {
      canvasHeight = containerHeight;
      canvasWidth = containerHeight * imgRatio;
    }

    sourceCanvas.width = canvasWidth;
    sourceCanvas.height = canvasHeight;

    imageScale = canvasWidth / originalImage.width;

    // Update container rect for corner positioning
    setTimeout(() => {
      canvasRect = sourceCanvas.getBoundingClientRect();
    }, 0);
  }

  // Draw source image
  function drawSourceImage() {
    sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceCtx.drawImage(originalImage, 0, 0, sourceCanvas.width, sourceCanvas.height);

    // Draw perspective quadrilateral
    drawQuadrilateral();
  }

  // Draw quadrilateral overlay
  function drawQuadrilateral() {
    sourceCtx.drawImage(originalImage, 0, 0, sourceCanvas.width, sourceCanvas.height);

    // Semi-transparent overlay
    sourceCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    sourceCtx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);

    // Clear the selected area
    sourceCtx.save();
    sourceCtx.beginPath();
    const tl = imageToCanvas(cornerPositions.tl);
    const tr = imageToCanvas(cornerPositions.tr);
    const br = imageToCanvas(cornerPositions.br);
    const bl = imageToCanvas(cornerPositions.bl);

    sourceCtx.moveTo(tl.x, tl.y);
    sourceCtx.lineTo(tr.x, tr.y);
    sourceCtx.lineTo(br.x, br.y);
    sourceCtx.lineTo(bl.x, bl.y);
    sourceCtx.closePath();
    sourceCtx.clip();

    sourceCtx.drawImage(originalImage, 0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceCtx.restore();

    // Draw border
    sourceCtx.strokeStyle = '#00b4d8';
    sourceCtx.lineWidth = 2;
    sourceCtx.beginPath();
    sourceCtx.moveTo(tl.x, tl.y);
    sourceCtx.lineTo(tr.x, tr.y);
    sourceCtx.lineTo(br.x, br.y);
    sourceCtx.lineTo(bl.x, bl.y);
    sourceCtx.closePath();
    sourceCtx.stroke();

    // Draw grid lines
    sourceCtx.strokeStyle = 'rgba(0, 180, 216, 0.5)';
    sourceCtx.lineWidth = 1;
    sourceCtx.setLineDash([5, 5]);

    // Horizontal lines
    for (let i = 1; i < 3; i++) {
      const t = i / 3;
      const left = lerp(tl, bl, t);
      const right = lerp(tr, br, t);
      sourceCtx.beginPath();
      sourceCtx.moveTo(left.x, left.y);
      sourceCtx.lineTo(right.x, right.y);
      sourceCtx.stroke();
    }

    // Vertical lines
    for (let i = 1; i < 3; i++) {
      const t = i / 3;
      const top = lerp(tl, tr, t);
      const bottom = lerp(bl, br, t);
      sourceCtx.beginPath();
      sourceCtx.moveTo(top.x, top.y);
      sourceCtx.lineTo(bottom.x, bottom.y);
      sourceCtx.stroke();
    }

    sourceCtx.setLineDash([]);
  }

  // Linear interpolation
  function lerp(p1, p2, t) {
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    };
  }

  // Initialize corner positions
  function initializeCorners() {
    const margin = 0.1;
    const w = originalImage.width;
    const h = originalImage.height;

    cornerPositions = {
      tl: { x: w * margin, y: h * margin },
      tr: { x: w * (1 - margin), y: h * margin },
      bl: { x: w * margin, y: h * (1 - margin) },
      br: { x: w * (1 - margin), y: h * (1 - margin) }
    };

    updateCornerElements();
    updateRatioDisplay();
  }

  // Convert image coordinates to canvas coordinates
  function imageToCanvas(pos) {
    return {
      x: pos.x * imageScale,
      y: pos.y * imageScale
    };
  }

  // Convert canvas coordinates to image coordinates
  function canvasToImage(pos) {
    return {
      x: pos.x / imageScale,
      y: pos.y / imageScale
    };
  }

  // Update corner DOM elements
  function updateCornerElements() {
    if (!canvasRect) {
      canvasRect = sourceCanvas.getBoundingClientRect();
    }

    const containerRect = sourceContainer.getBoundingClientRect();
    const canvasOffsetX = canvasRect.left - containerRect.left;
    const canvasOffsetY = canvasRect.top - containerRect.top;

    Object.keys(corners).forEach(key => {
      const canvasPos = imageToCanvas(cornerPositions[key]);
      const x = canvasOffsetX + canvasPos.x;
      const y = canvasOffsetY + canvasPos.y;

      corners[key].style.left = x + 'px';
      corners[key].style.top = y + 'px';

      // Update labels
      labels[key].style.left = (x + 15) + 'px';
      labels[key].style.top = (y - 10) + 'px';
    });
  }

  // Start dragging corner
  function startDrag(e, cornerKey) {
    e.preventDefault();
    isDragging = true;
    activeCorner = cornerKey;
    corners[cornerKey].classList.add('active');
  }

  // Handle drag
  function handleDrag(e) {
    if (!isDragging || !activeCorner) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    canvasRect = sourceCanvas.getBoundingClientRect();

    let x = clientX - canvasRect.left;
    let y = clientY - canvasRect.top;

    // Clamp to canvas bounds
    x = Math.max(0, Math.min(x, sourceCanvas.width));
    y = Math.max(0, Math.min(y, sourceCanvas.height));

    // Update corner position
    cornerPositions[activeCorner] = canvasToImage({ x, y });

    updateCornerElements();
    drawSourceImage();
    updateRatioDisplay();
  }

  // Stop dragging
  function stopDrag() {
    if (activeCorner) {
      corners[activeCorner].classList.remove('active');
    }
    isDragging = false;
    activeCorner = null;
  }

  // Update ratio display
  function updateRatioDisplay() {
    const width = Math.max(
      distance(cornerPositions.tl, cornerPositions.tr),
      distance(cornerPositions.bl, cornerPositions.br)
    );
    const height = Math.max(
      distance(cornerPositions.tl, cornerPositions.bl),
      distance(cornerPositions.tr, cornerPositions.br)
    );

    const ratio = width / height;
    selectedRatioEl.textContent = ratio.toFixed(2) + ':1';
  }

  // Calculate distance between two points
  function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  // Apply perspective correction
  function applyCorrection() {
    const startTime = performance.now();

    showStatus('正在處理透視校正...', 'success');
    applyBtn.disabled = true;

    setTimeout(() => {
      try {
        // Calculate output dimensions
        const { width: outWidth, height: outHeight } = calculateOutputSize();

        resultCanvas.width = outWidth;
        resultCanvas.height = outHeight;

        // Perform perspective transform
        perspectiveTransform(outWidth, outHeight);

        // Auto enhance if enabled
        if (autoEnhance.checked) {
          enhanceContrast();
        }

        const endTime = performance.now();
        processTimeEl.textContent = Math.round(endTime - startTime) + 'ms';
        outputSizeEl.textContent = `${outWidth} × ${outHeight}`;

        showStatus('透視校正完成！', 'success');
        downloadBtn.disabled = false;
        applyBtn.disabled = false;
      } catch (error) {
        showStatus('處理失敗：' + error.message, 'error');
        applyBtn.disabled = false;
      }
    }, 50);
  }

  // Calculate output size based on selected ratio
  function calculateOutputSize() {
    const srcWidth = Math.max(
      distance(cornerPositions.tl, cornerPositions.tr),
      distance(cornerPositions.bl, cornerPositions.br)
    );
    const srcHeight = Math.max(
      distance(cornerPositions.tl, cornerPositions.bl),
      distance(cornerPositions.tr, cornerPositions.br)
    );

    let width, height;

    switch (selectedRatio) {
      case 'a4':
        // A4 ratio is 1:1.414
        height = Math.max(srcWidth, srcHeight);
        width = height / 1.414;
        if (srcWidth > srcHeight) {
          [width, height] = [height, width];
        }
        break;
      case 'square':
        width = height = Math.max(srcWidth, srcHeight);
        break;
      case '4:3':
        if (srcWidth > srcHeight) {
          width = Math.max(srcWidth, srcHeight);
          height = width * 3 / 4;
        } else {
          height = Math.max(srcWidth, srcHeight);
          width = height * 3 / 4;
        }
        break;
      case '16:9':
        if (srcWidth > srcHeight) {
          width = Math.max(srcWidth, srcHeight);
          height = width * 9 / 16;
        } else {
          height = Math.max(srcWidth, srcHeight);
          width = height * 9 / 16;
        }
        break;
      case '3:2':
        if (srcWidth > srcHeight) {
          width = Math.max(srcWidth, srcHeight);
          height = width * 2 / 3;
        } else {
          height = Math.max(srcWidth, srcHeight);
          width = height * 2 / 3;
        }
        break;
      case 'card':
        // Standard card ratio 1.586 (credit card)
        if (srcWidth > srcHeight) {
          width = Math.max(srcWidth, srcHeight);
          height = width / 1.586;
        } else {
          height = Math.max(srcWidth, srcHeight);
          width = height / 1.586;
        }
        break;
      default: // auto
        width = srcWidth;
        height = srcHeight;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  // Perspective transform using bilinear interpolation
  function perspectiveTransform(outWidth, outHeight) {
    // Source points
    const srcPoints = [
      cornerPositions.tl,
      cornerPositions.tr,
      cornerPositions.br,
      cornerPositions.bl
    ];

    // Destination points (rectangle)
    const dstPoints = [
      { x: 0, y: 0 },
      { x: outWidth, y: 0 },
      { x: outWidth, y: outHeight },
      { x: 0, y: outHeight }
    ];

    // Calculate perspective transform matrix
    const matrix = getPerspectiveTransform(dstPoints, srcPoints);

    // Create temporary canvas for source image at full resolution
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0);
    const srcData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Create output image data
    const dstData = resultCtx.createImageData(outWidth, outHeight);

    // Transform each pixel
    for (let y = 0; y < outHeight; y++) {
      for (let x = 0; x < outWidth; x++) {
        // Apply inverse perspective transform
        const srcPos = applyMatrix(matrix, x, y);

        // Bilinear interpolation
        const color = bilinearInterpolate(srcData, srcPos.x, srcPos.y);

        const idx = (y * outWidth + x) * 4;
        dstData.data[idx] = color.r;
        dstData.data[idx + 1] = color.g;
        dstData.data[idx + 2] = color.b;
        dstData.data[idx + 3] = color.a;
      }
    }

    resultCtx.putImageData(dstData, 0, 0);
  }

  // Get perspective transform matrix
  function getPerspectiveTransform(src, dst) {
    // Solve for homography matrix using 4 point correspondences
    const A = [];
    const b = [];

    for (let i = 0; i < 4; i++) {
      const sx = src[i].x;
      const sy = src[i].y;
      const dx = dst[i].x;
      const dy = dst[i].y;

      A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
      A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
      b.push(dx);
      b.push(dy);
    }

    // Solve using Gaussian elimination
    const h = solve(A, b);

    return [
      [h[0], h[1], h[2]],
      [h[3], h[4], h[5]],
      [h[6], h[7], 1]
    ];
  }

  // Gaussian elimination
  function solve(A, b) {
    const n = b.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
          maxRow = row;
        }
      }
      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

      // Eliminate
      for (let row = col + 1; row < n; row++) {
        const factor = augmented[row][col] / augmented[col][col];
        for (let j = col; j <= n; j++) {
          augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
      x[i] /= augmented[i][i];
    }

    return x;
  }

  // Apply matrix to point
  function applyMatrix(m, x, y) {
    const w = m[2][0] * x + m[2][1] * y + m[2][2];
    return {
      x: (m[0][0] * x + m[0][1] * y + m[0][2]) / w,
      y: (m[1][0] * x + m[1][1] * y + m[1][2]) / w
    };
  }

  // Bilinear interpolation
  function bilinearInterpolate(imageData, x, y) {
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

    const getPixel = (px, py) => {
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

  // Enhance contrast
  function enhanceContrast() {
    const imageData = resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    const data = imageData.data;

    // Find min and max values
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      min = Math.min(min, gray);
      max = Math.max(max, gray);
    }

    // Stretch histogram
    const range = max - min;
    if (range > 0) {
      const factor = 255 / range;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, (data[i] - min) * factor));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - min) * factor));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - min) * factor));
      }
    }

    resultCtx.putImageData(imageData, 0, 0);
  }

  // Download result
  function downloadResult() {
    const format = outputFormat.value;
    const quality = parseFloat(outputQuality.value);

    let mimeType = 'image/png';
    let extension = 'png';

    if (format === 'jpg') {
      mimeType = 'image/jpeg';
      extension = 'jpg';
    } else if (format === 'webp') {
      mimeType = 'image/webp';
      extension = 'webp';
    }

    const dataURL = resultCanvas.toDataURL(mimeType, quality);
    const link = document.createElement('a');
    link.download = `perspective-corrected.${extension}`;
    link.href = dataURL;
    link.click();

    showStatus('圖片已下載', 'success');
  }

  // Reset tool
  function resetTool() {
    originalImage = null;
    sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);

    uploadZone.classList.remove('has-file');
    uploadZone.style.display = 'block';
    instructions.style.display = 'none';
    settingsSection.style.display = 'none';
    editorSection.classList.remove('active');

    applyBtn.disabled = true;
    downloadBtn.disabled = true;
    fileInput.value = '';

    originalSizeEl.textContent = '-';
    outputSizeEl.textContent = '-';
    selectedRatioEl.textContent = '-';
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
