/**
 * IMG-006: GIF Converter
 *
 * Bidirectional GIF conversion:
 * - GIF → PNG/JPG (extract all frames)
 * - PNG/JPG → GIF (create animated GIF from multiple images)
 *
 * Uses:
 * - Native Canvas API for frame extraction
 * - gif.js library for GIF encoding
 *
 * Performance Characteristics:
 * - Memory: frames x image size
 * - Processing time: varies by frame count
 */

class GifConverter {
  constructor() {
    this.direction = 'extract';
    this.originalFile = null;
    this.sourceFiles = [];
    this.extractedFrames = [];
    this.selectedFrames = new Set();
    this.convertedBlob = null;
    this.outputFormat = 'png';
    this.quality = 0.92;
    this.frameDelay = 100;
    this.loopCount = 0;
    this.gifEncoder = null;

    this.init();
  }

  init() {
    // DOM Elements
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.outputFormatSelect = document.getElementById('outputFormat');
    this.qualitySlider = document.getElementById('qualitySlider');
    this.qualityValue = document.getElementById('qualityValue');
    this.qualityRow = document.getElementById('qualityRow');
    this.delayRow = document.getElementById('delayRow');
    this.loopRow = document.getElementById('loopRow');
    this.frameDelayInput = document.getElementById('frameDelay');
    this.loopCountSelect = document.getElementById('loopCount');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.framesArea = document.getElementById('framesArea');
    this.framesGrid = document.getElementById('framesGrid');
    this.frameCount = document.getElementById('frameCount');
    this.previewArea = document.getElementById('previewArea');
    this.originalImage = document.getElementById('originalImage');
    this.convertedImage = document.getElementById('convertedImage');
    this.originalSize = document.getElementById('originalSize');
    this.convertedSize = document.getElementById('convertedSize');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.frameCountInfo = document.getElementById('frameCountInfo');
    this.imageResolution = document.getElementById('imageResolution');
    this.multiUploadInfo = document.getElementById('multiUploadInfo');

    // Expose functions to window
    window.setDirection = (dir) => this.setDirection(dir);
    window.selectAllFrames = () => this.selectAllFrames();
    window.deselectAllFrames = () => this.deselectAllFrames();

    this.bindEvents();
  }

  bindEvents() {
    // File upload events
    this.uploadArea?.addEventListener('click', () => this.fileInput?.click());
    this.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop
    this.uploadArea?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea?.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files);
      this.processFiles(files);
    });

    // Output format
    this.outputFormatSelect?.addEventListener('change', (e) => {
      this.outputFormat = e.target.value;
      this.qualityRow.style.display = this.outputFormat === 'jpg' ? 'flex' : 'none';
    });

    // Quality slider
    this.qualitySlider?.addEventListener('input', (e) => {
      this.quality = e.target.value / 100;
      if (this.qualityValue) {
        this.qualityValue.textContent = `${e.target.value}%`;
      }
    });

    // Frame delay
    this.frameDelayInput?.addEventListener('change', (e) => {
      this.frameDelay = parseInt(e.target.value) || 100;
    });

    // Loop count
    this.loopCountSelect?.addEventListener('change', (e) => {
      this.loopCount = parseInt(e.target.value);
    });

    // Action buttons
    this.convertBtn?.addEventListener('click', () => this.convert());
    this.downloadBtn?.addEventListener('click', () => this.downloadAll());
    this.downloadSelectedBtn?.addEventListener('click', () => this.downloadSelected());
    this.resetBtn?.addEventListener('click', () => this.reset());
  }

  setDirection(direction) {
    this.direction = direction;
    this.reset();

    // Update UI
    document.querySelectorAll('.format-option').forEach(el => {
      el.classList.toggle('active', el.dataset.direction === direction);
    });

    const uploadTitle = document.getElementById('uploadTitle');
    const uploadFormats = document.getElementById('uploadFormats');
    const outputFormatRow = document.getElementById('outputFormatRow');
    const convertText = document.getElementById('convertText');
    const downloadText = document.getElementById('downloadText');
    const gifTip = document.getElementById('gifTip');

    if (direction === 'extract') {
      this.fileInput.accept = 'image/gif';
      this.fileInput.multiple = false;
      uploadTitle.textContent = window.t ? window.t('upload_title_gif_extract') : '拖放 GIF 動畫到此處';
      uploadFormats.textContent = window.t ? window.t('upload_formats_gif_extract') : '支援格式：GIF';
      outputFormatRow.style.display = 'flex';
      this.delayRow.style.display = 'none';
      this.loopRow.style.display = 'none';
      this.multiUploadInfo.style.display = 'none';
      convertText.textContent = window.t ? window.t('extract_frames') : '提取幀';
      downloadText.textContent = window.t ? window.t('download_all_frames') : '下載全部幀';
      gifTip.textContent = window.t ? window.t('gif_extract_tip') : '提取後可選擇要下載的幀，或下載全部';
    } else {
      this.fileInput.accept = 'image/png,image/jpeg,image/webp';
      this.fileInput.multiple = true;
      uploadTitle.textContent = window.t ? window.t('upload_title_gif_create') : '拖放多張圖片到此處';
      uploadFormats.textContent = window.t ? window.t('upload_formats_gif_create') : '支援格式：PNG, JPG, WebP';
      outputFormatRow.style.display = 'none';
      this.qualityRow.style.display = 'none';
      this.delayRow.style.display = 'flex';
      this.loopRow.style.display = 'flex';
      this.multiUploadInfo.style.display = 'block';
      convertText.textContent = window.t ? window.t('create_gif') : '製作 GIF';
      downloadText.textContent = window.t ? window.t('download_gif') : '下載 GIF';
      gifTip.textContent = window.t ? window.t('gif_create_tip') : '圖片將按照檔名順序合成動畫';
    }
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    this.processFiles(files);
  }

  processFiles(files) {
    if (this.direction === 'extract') {
      // Filter GIF files
      const gifFile = files.find(f => f.type === 'image/gif');
      if (!gifFile) {
        this.showStatus('error', window.t ? window.t('invalid_format_gif') : '請選擇 GIF 格式的圖片');
        return;
      }
      this.originalFile = gifFile;
      this.showGifPreview(gifFile);
    } else {
      // Filter image files for create mode
      const validFiles = files.filter(f =>
        ['image/png', 'image/jpeg', 'image/webp'].includes(f.type)
      );
      if (validFiles.length < 1) {
        this.showStatus('error', window.t ? window.t('invalid_format') : '請選擇 PNG/JPG/WebP 圖片');
        return;
      }
      // Sort by filename
      validFiles.sort((a, b) => a.name.localeCompare(b.name));
      this.sourceFiles = validFiles;
      this.showSourcePreview(validFiles);
    }

    if (this.convertBtn) this.convertBtn.disabled = false;
  }

  showGifPreview(file) {
    const url = URL.createObjectURL(file);
    if (this.originalImage) {
      this.originalImage.src = url;
    }
    this.showStatus('info', `已載入: ${file.name} (${this.formatFileSize(file.size)})`);
  }

  showSourcePreview(files) {
    // Show first image as preview
    if (files.length > 0 && this.originalImage) {
      const url = URL.createObjectURL(files[0]);
      this.originalImage.src = url;
    }
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (this.originalSize) {
      this.originalSize.textContent = `${files.length} 張 / ${this.formatFileSize(totalSize)}`;
    }
    this.showStatus('info', `已載入 ${files.length} 張圖片`);
  }

  async convert() {
    if (this.direction === 'extract') {
      await this.extractFrames();
    } else {
      await this.createGif();
    }
  }

  async extractFrames() {
    if (!this.originalFile) {
      this.showStatus('error', window.t ? window.t('no_file') : '請先選擇 GIF 圖片');
      return;
    }

    const startTime = performance.now();

    this.progressContainer?.classList.add('active');
    this.updateProgress(0, '讀取 GIF...');
    if (this.convertBtn) this.convertBtn.disabled = true;

    try {
      // Read GIF file as ArrayBuffer
      const buffer = await this.originalFile.arrayBuffer();
      this.updateProgress(20, '解析 GIF 幀...');

      // Parse GIF and extract frames
      this.extractedFrames = await this.parseGif(buffer);

      this.updateProgress(80, '生成預覽...');

      // Display frames
      this.displayFrames();

      // Update stats
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      if (this.processTime) this.processTime.textContent = `${processingTime} 秒`;
      if (this.frameCountInfo) this.frameCountInfo.textContent = `${this.extractedFrames.length} 幀`;
      if (this.extractedFrames.length > 0) {
        const firstFrame = this.extractedFrames[0];
        if (this.imageResolution) {
          this.imageResolution.textContent = `${firstFrame.width} × ${firstFrame.height} px`;
        }
      }
      if (this.performanceInfo) this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '完成！');

      setTimeout(() => {
        this.progressContainer?.classList.remove('active');
        this.showStatus('success', `成功提取 ${this.extractedFrames.length} 幀！`);
        if (this.downloadBtn) this.downloadBtn.style.display = 'inline-flex';
        if (this.resetBtn) this.resetBtn.style.display = 'inline-flex';
        if (this.convertBtn) this.convertBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Extraction error:', error);
      this.progressContainer?.classList.remove('active');
      this.showStatus('error', window.t ? window.t('convert_error') : '提取失敗，請重試');
      if (this.convertBtn) this.convertBtn.disabled = false;
    }
  }

  async parseGif(buffer) {
    const frames = [];
    const uint8 = new Uint8Array(buffer);

    // Verify GIF signature
    const signature = String.fromCharCode(...uint8.slice(0, 6));
    if (!signature.startsWith('GIF')) {
      throw new Error('Invalid GIF file');
    }

    // Read logical screen descriptor
    const width = uint8[6] | (uint8[7] << 8);
    const height = uint8[8] | (uint8[9] << 8);
    const packed = uint8[10];
    const hasGlobalColorTable = (packed & 0x80) !== 0;
    const globalColorTableSize = hasGlobalColorTable ? 3 * (1 << ((packed & 0x07) + 1)) : 0;

    // Read global color table
    let globalColorTable = null;
    let offset = 13;
    if (hasGlobalColorTable) {
      globalColorTable = uint8.slice(offset, offset + globalColorTableSize);
      offset += globalColorTableSize;
    }

    // Create canvas for compositing
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Previous frame for disposal
    let previousImageData = null;
    let disposalMethod = 0;
    let delayTime = 100;
    let transparentIndex = -1;

    // Parse blocks
    while (offset < uint8.length) {
      const blockType = uint8[offset++];

      if (blockType === 0x21) {
        // Extension block
        const extType = uint8[offset++];

        if (extType === 0xF9) {
          // Graphics Control Extension
          offset++; // Block size (always 4)
          const gcePacked = uint8[offset++];
          disposalMethod = (gcePacked >> 2) & 0x07;
          const hasTransparency = (gcePacked & 0x01) !== 0;
          delayTime = (uint8[offset] | (uint8[offset + 1] << 8)) * 10;
          offset += 2;
          transparentIndex = hasTransparency ? uint8[offset++] : -1;
          offset++; // Block terminator
        } else {
          // Skip other extensions
          while (uint8[offset] !== 0) {
            offset += uint8[offset] + 1;
          }
          offset++; // Block terminator
        }
      } else if (blockType === 0x2C) {
        // Image descriptor
        const left = uint8[offset] | (uint8[offset + 1] << 8);
        const top = uint8[offset + 2] | (uint8[offset + 3] << 8);
        const imgWidth = uint8[offset + 4] | (uint8[offset + 5] << 8);
        const imgHeight = uint8[offset + 6] | (uint8[offset + 7] << 8);
        offset += 8;

        const imgPacked = uint8[offset++];
        const hasLocalColorTable = (imgPacked & 0x80) !== 0;
        const interlaced = (imgPacked & 0x40) !== 0;
        const localColorTableSize = hasLocalColorTable ? 3 * (1 << ((imgPacked & 0x07) + 1)) : 0;

        // Read local color table
        let colorTable = globalColorTable;
        if (hasLocalColorTable) {
          colorTable = uint8.slice(offset, offset + localColorTableSize);
          offset += localColorTableSize;
        }

        // LZW decode
        const minCodeSize = uint8[offset++];
        const lzwData = [];
        while (uint8[offset] !== 0) {
          const subBlockSize = uint8[offset++];
          for (let i = 0; i < subBlockSize; i++) {
            lzwData.push(uint8[offset++]);
          }
        }
        offset++; // Block terminator

        // Decode LZW data
        const pixels = this.decodeLZW(lzwData, minCodeSize, imgWidth * imgHeight);

        // Handle disposal
        if (disposalMethod === 2) {
          // Restore to background
          ctx.clearRect(0, 0, width, height);
        } else if (disposalMethod === 3 && previousImageData) {
          // Restore to previous
          ctx.putImageData(previousImageData, 0, 0);
        }

        // Save current state for disposal method 3
        if (disposalMethod === 3) {
          previousImageData = ctx.getImageData(0, 0, width, height);
        }

        // Draw frame
        const imageData = ctx.getImageData(left, top, imgWidth, imgHeight);
        const data = imageData.data;

        for (let i = 0; i < pixels.length; i++) {
          const colorIndex = pixels[i];
          if (colorIndex === transparentIndex) continue;

          const r = colorTable[colorIndex * 3];
          const g = colorTable[colorIndex * 3 + 1];
          const b = colorTable[colorIndex * 3 + 2];

          let y = Math.floor(i / imgWidth);
          let x = i % imgWidth;

          // Handle interlacing
          if (interlaced) {
            const passes = [0, 4, 2, 1];
            const increments = [8, 8, 4, 2];
            let realY = 0;
            let remaining = y;
            for (let p = 0; p < 4; p++) {
              const rows = Math.ceil((imgHeight - passes[p]) / increments[p]);
              if (remaining < rows) {
                realY = passes[p] + remaining * increments[p];
                break;
              }
              remaining -= rows;
            }
            y = realY;
          }

          const idx = (y * imgWidth + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }

        ctx.putImageData(imageData, left, top);

        // Save current state for disposal method 3
        if (disposalMethod !== 3) {
          previousImageData = ctx.getImageData(0, 0, width, height);
        }

        // Capture frame
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = width;
        frameCanvas.height = height;
        const frameCtx = frameCanvas.getContext('2d');
        frameCtx.drawImage(canvas, 0, 0);

        frames.push({
          canvas: frameCanvas,
          width,
          height,
          delay: delayTime || 100
        });

        // Reset for next frame
        transparentIndex = -1;
        delayTime = 100;

        this.updateProgress(20 + (frames.length / 50) * 60, `提取第 ${frames.length} 幀...`);
      } else if (blockType === 0x3B) {
        // Trailer - end of GIF
        break;
      } else {
        // Unknown block, try to skip
        break;
      }
    }

    return frames;
  }

  decodeLZW(data, minCodeSize, pixelCount) {
    const clearCode = 1 << minCodeSize;
    const endCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = endCode + 1;
    const maxCodeSize = 12;

    // Initialize code table
    const codeTable = [];
    for (let i = 0; i < clearCode; i++) {
      codeTable[i] = [i];
    }

    const pixels = [];
    let bitBuffer = 0;
    let bitCount = 0;
    let dataIndex = 0;
    let prevCode = -1;

    const readCode = () => {
      while (bitCount < codeSize && dataIndex < data.length) {
        bitBuffer |= data[dataIndex++] << bitCount;
        bitCount += 8;
      }
      const code = bitBuffer & ((1 << codeSize) - 1);
      bitBuffer >>= codeSize;
      bitCount -= codeSize;
      return code;
    };

    while (pixels.length < pixelCount) {
      const code = readCode();

      if (code === clearCode) {
        // Reset
        codeSize = minCodeSize + 1;
        nextCode = endCode + 1;
        codeTable.length = clearCode + 2;
        for (let i = 0; i < clearCode; i++) {
          codeTable[i] = [i];
        }
        prevCode = -1;
        continue;
      }

      if (code === endCode) {
        break;
      }

      let entry;
      if (code < nextCode) {
        entry = codeTable[code];
      } else if (code === nextCode && prevCode !== -1) {
        entry = [...codeTable[prevCode], codeTable[prevCode][0]];
      } else {
        break; // Invalid code
      }

      pixels.push(...entry);

      if (prevCode !== -1 && nextCode < (1 << maxCodeSize)) {
        codeTable[nextCode++] = [...codeTable[prevCode], entry[0]];
        if (nextCode >= (1 << codeSize) && codeSize < maxCodeSize) {
          codeSize++;
        }
      }

      prevCode = code;
    }

    return pixels.slice(0, pixelCount);
  }

  displayFrames() {
    this.framesGrid.innerHTML = '';
    this.selectedFrames.clear();

    this.extractedFrames.forEach((frame, index) => {
      const div = document.createElement('div');
      div.className = 'frame-item';
      div.dataset.index = index;

      const img = document.createElement('img');
      img.src = frame.canvas.toDataURL('image/png');

      const number = document.createElement('div');
      number.className = 'frame-number';
      number.textContent = `#${index + 1} (${frame.delay}ms)`;

      div.appendChild(img);
      div.appendChild(number);

      div.addEventListener('click', () => this.toggleFrameSelection(index, div));

      this.framesGrid.appendChild(div);
    });

    this.frameCount.textContent = this.extractedFrames.length;
    this.framesArea.style.display = 'block';
  }

  toggleFrameSelection(index, element) {
    if (this.selectedFrames.has(index)) {
      this.selectedFrames.delete(index);
      element.classList.remove('selected');
    } else {
      this.selectedFrames.add(index);
      element.classList.add('selected');
    }

    this.downloadSelectedBtn.style.display = this.selectedFrames.size > 0 ? 'inline-flex' : 'none';
  }

  selectAllFrames() {
    document.querySelectorAll('.frame-item').forEach((el, index) => {
      this.selectedFrames.add(index);
      el.classList.add('selected');
    });
    this.downloadSelectedBtn.style.display = 'inline-flex';
  }

  deselectAllFrames() {
    document.querySelectorAll('.frame-item').forEach(el => {
      el.classList.remove('selected');
    });
    this.selectedFrames.clear();
    this.downloadSelectedBtn.style.display = 'none';
  }

  async createGif() {
    if (this.sourceFiles.length < 1) {
      this.showStatus('error', window.t ? window.t('no_file') : '請先選擇圖片');
      return;
    }

    const startTime = performance.now();

    this.progressContainer?.classList.add('active');
    this.updateProgress(0, '載入 GIF 編碼器...');
    if (this.convertBtn) this.convertBtn.disabled = true;

    try {
      // Load gif.js library
      await this.loadGifJs();
      this.updateProgress(10, '載入圖片...');

      // Load all images
      const images = [];
      for (let i = 0; i < this.sourceFiles.length; i++) {
        const img = await this.loadImage(this.sourceFiles[i]);
        images.push(img);
        this.updateProgress(10 + (i / this.sourceFiles.length) * 30, `載入圖片 ${i + 1}/${this.sourceFiles.length}...`);
      }

      // Determine dimensions (use first image)
      const width = images[0].width;
      const height = images[0].height;

      this.updateProgress(40, '建立 GIF...');

      // Create GIF encoder
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: width,
        height: height,
        workerScript: '/vendor/gif/gif.worker.js'
      });

      // Add frames
      images.forEach((img, i) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Scale image to fit canvas
        const scale = Math.min(width / img.width, height / img.height);
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        gif.addFrame(ctx, { delay: this.frameDelay, copy: true });
        this.updateProgress(40 + (i / images.length) * 30, `加入幀 ${i + 1}/${images.length}...`);
      });

      // Set loop
      gif.setOption('repeat', this.loopCount);

      // Render
      this.updateProgress(70, '編碼中...');

      this.convertedBlob = await new Promise((resolve, reject) => {
        gif.on('finished', (blob) => resolve(blob));
        gif.on('progress', (p) => {
          this.updateProgress(70 + p * 25, `編碼中 ${Math.round(p * 100)}%...`);
        });
        gif.render();
      });

      // Show preview
      const convertedUrl = URL.createObjectURL(this.convertedBlob);
      if (this.convertedImage) this.convertedImage.src = convertedUrl;
      if (this.convertedSize) this.convertedSize.textContent = this.formatFileSize(this.convertedBlob.size);
      if (this.previewArea) this.previewArea.style.display = 'grid';

      // Update stats
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      if (this.processTime) this.processTime.textContent = `${processingTime} 秒`;
      if (this.frameCountInfo) this.frameCountInfo.textContent = `${images.length} 幀`;
      if (this.imageResolution) this.imageResolution.textContent = `${width} × ${height} px`;
      if (this.performanceInfo) this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '完成！');

      setTimeout(() => {
        this.progressContainer?.classList.remove('active');
        this.showStatus('success', `成功製作 GIF！(${images.length} 幀)`);
        if (this.downloadBtn) this.downloadBtn.style.display = 'inline-flex';
        if (this.resetBtn) this.resetBtn.style.display = 'inline-flex';
        if (this.convertBtn) this.convertBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Creation error:', error);
      this.progressContainer?.classList.remove('active');
      this.showStatus('error', window.t ? window.t('convert_error') : '製作失敗，請重試');
      if (this.convertBtn) this.convertBtn.disabled = false;
    }
  }

  async loadGifJs() {
    if (window.GIF) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/gif/gif.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async downloadAll() {
    if (this.direction === 'extract') {
      // Download all extracted frames
      if (this.extractedFrames.length === 0) return;

      for (let i = 0; i < this.extractedFrames.length; i++) {
        await this.downloadFrame(i);
        await new Promise(r => setTimeout(r, 100)); // Small delay between downloads
      }
    } else {
      // Download created GIF
      if (!this.convertedBlob) return;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(this.convertedBlob);
      link.download = 'animation.gif';
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }

  async downloadSelected() {
    for (const index of this.selectedFrames) {
      await this.downloadFrame(index);
      await new Promise(r => setTimeout(r, 100));
    }
  }

  async downloadFrame(index) {
    const frame = this.extractedFrames[index];
    if (!frame) return;

    const format = this.outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
    const ext = this.outputFormat === 'jpg' ? 'jpg' : 'png';
    const quality = this.outputFormat === 'jpg' ? this.quality : undefined;

    const blob = await new Promise(resolve => {
      frame.canvas.toBlob(resolve, format, quality);
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `frame_${String(index + 1).padStart(4, '0')}.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    if (this.fileInput) this.fileInput.value = '';
    this.originalFile = null;
    this.sourceFiles = [];
    this.extractedFrames = [];
    this.selectedFrames.clear();
    this.convertedBlob = null;

    if (this.originalImage) this.originalImage.src = '';
    if (this.convertedImage) this.convertedImage.src = '';
    if (this.originalSize) this.originalSize.textContent = '-';
    if (this.convertedSize) this.convertedSize.textContent = '-';
    if (this.previewArea) this.previewArea.style.display = 'none';
    if (this.framesArea) this.framesArea.style.display = 'none';
    if (this.framesGrid) this.framesGrid.innerHTML = '';
    if (this.downloadBtn) this.downloadBtn.style.display = 'none';
    if (this.downloadSelectedBtn) this.downloadSelectedBtn.style.display = 'none';
    if (this.resetBtn) this.resetBtn.style.display = 'none';
    if (this.performanceInfo) this.performanceInfo.style.display = 'none';
    if (this.convertBtn) this.convertBtn.disabled = true;
    this.progressContainer?.classList.remove('active');
    this.statusMessage?.classList.remove('active');
  }

  updateProgress(percent, text) {
    if (this.progressFill) this.progressFill.style.width = `${percent}%`;
    if (text && this.progressText) this.progressText.textContent = text;
  }

  showStatus(type, message) {
    if (!this.statusMessage) return;
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;

    if (type === 'success') {
      setTimeout(() => {
        this.statusMessage?.classList.remove('active');
      }, 3000);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialize converter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.converter = new GifConverter();
});

export default GifConverter;
