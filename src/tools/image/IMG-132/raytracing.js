/**
 * IMG-132 圖片光線追蹤效果
 * 模擬真實光線反射與折射效果
 */

class RayTracingEffect {
  constructor() {
    this.originalImage = null;
    this.lightPosition = { x: 0.5, y: 0.3 }; // Normalized coordinates
    this.settings = {
      mode: 'sunburst',
      intensity: 50,
      rayLength: 60,
      rayCount: 12,
      colorTemp: 70
    };
    this.isProcessing = false;
    this.init();
  }

  init() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.originalImageEl = document.getElementById('originalImage');
    this.originalArea = document.getElementById('originalArea');
    this.lightSourceEl = document.getElementById('lightSource');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.ctx = this.resultCanvas.getContext('2d');
    this.previewSection = document.getElementById('previewSection');
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.applyBtn = document.getElementById('applyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Info elements
    this.imageSizeEl = document.getElementById('imageSize');
    this.lightPositionEl = document.getElementById('lightPosition');
    this.effectModeEl = document.getElementById('effectMode');
    this.processTimeEl = document.getElementById('processTime');

    // Sliders
    this.intensitySlider = document.getElementById('intensity');
    this.rayLengthSlider = document.getElementById('rayLength');
    this.rayCountSlider = document.getElementById('rayCount');
    this.colorTempSlider = document.getElementById('colorTemp');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadZone.classList.add('dragover');
    });

    this.uploadZone.addEventListener('dragleave', () => {
      this.uploadZone.classList.remove('dragover');
    });

    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.loadImage(file);
      }
    });

    // Light source selection
    this.originalArea.addEventListener('click', (e) => this.handleLightClick(e));

    // Mode selection
    document.querySelectorAll('.mode-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.mode-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.settings.mode = item.dataset.mode;
        this.updateModeDisplay();
      });
    });

    // Sliders
    this.intensitySlider.addEventListener('input', (e) => {
      this.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = e.target.value + '%';
    });

    this.rayLengthSlider.addEventListener('input', (e) => {
      this.settings.rayLength = parseInt(e.target.value);
      document.getElementById('rayLengthValue').textContent = e.target.value + '%';
    });

    this.rayCountSlider.addEventListener('input', (e) => {
      this.settings.rayCount = parseInt(e.target.value);
      document.getElementById('rayCountValue').textContent = e.target.value;
    });

    this.colorTempSlider.addEventListener('input', (e) => {
      this.settings.colorTemp = parseInt(e.target.value);
      const temp = e.target.value;
      let label = '中性';
      if (temp < 33) label = '冷色';
      else if (temp > 66) label = '暖色';
      document.getElementById('colorTempValue').textContent = label;
    });

    // Buttons
    this.applyBtn.addEventListener('click', () => this.applyRayTracing());
    this.downloadBtn.addEventListener('click', () => this.downloadResult());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.loadImage(file);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalImageEl.src = e.target.result;
        this.uploadZone.classList.add('has-file');
        this.previewSection.classList.add('active');
        this.applyBtn.disabled = false;

        // Reset light position
        this.lightPosition = { x: 0.5, y: 0.3 };
        this.updateLightSourceDisplay();

        // Update info
        this.imageSizeEl.textContent = `${img.width} x ${img.height}`;
        this.updateModeDisplay();

        this.showStatus('', '');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  handleLightClick(e) {
    if (!this.originalImage) return;

    const rect = this.originalImageEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    this.lightPosition = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    this.updateLightSourceDisplay();
  }

  updateLightSourceDisplay() {
    const rect = this.originalImageEl.getBoundingClientRect();
    const areaRect = this.originalArea.getBoundingClientRect();

    const offsetX = rect.left - areaRect.left;
    const offsetY = rect.top - areaRect.top;

    this.lightSourceEl.style.display = 'block';
    this.lightSourceEl.style.left = (offsetX + this.lightPosition.x * rect.width) + 'px';
    this.lightSourceEl.style.top = (offsetY + this.lightPosition.y * rect.height) + 'px';

    const px = Math.round(this.lightPosition.x * 100);
    const py = Math.round(this.lightPosition.y * 100);
    this.lightPositionEl.textContent = `${px}%, ${py}%`;
  }

  updateModeDisplay() {
    const modeNames = {
      'sunburst': '太陽光芒',
      'volumetric': '體積光',
      'godrays': '神光效果',
      'lens': '鏡頭光暈'
    };
    this.effectModeEl.textContent = modeNames[this.settings.mode] || '太陽光芒';
  }

  getColorFromTemp(temp) {
    // Temperature: 0 = cold (blue), 100 = warm (orange)
    const t = temp / 100;

    if (t < 0.5) {
      // Cold to neutral
      const ratio = t * 2;
      return {
        r: Math.round(180 + 75 * ratio),
        g: Math.round(200 + 55 * ratio),
        b: Math.round(255 - 55 * ratio)
      };
    } else {
      // Neutral to warm
      const ratio = (t - 0.5) * 2;
      return {
        r: 255,
        g: Math.round(255 - 80 * ratio),
        b: Math.round(200 - 150 * ratio)
      };
    }
  }

  async applyRayTracing() {
    if (!this.originalImage || this.isProcessing) return;

    this.isProcessing = true;
    this.applyBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.progressSection.classList.add('active');

    const startTime = performance.now();

    try {
      const { width, height } = this.originalImage;
      this.resultCanvas.width = width;
      this.resultCanvas.height = height;

      // Draw original image
      this.ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(10, '計算光線路徑...');
      await this.sleep(10);

      const lightX = this.lightPosition.x * width;
      const lightY = this.lightPosition.y * height;
      const lightColor = this.getColorFromTemp(this.settings.colorTemp);

      switch (this.settings.mode) {
        case 'sunburst':
          await this.applySunburstEffect(width, height, lightX, lightY, lightColor);
          break;
        case 'volumetric':
          await this.applyVolumetricLight(width, height, lightX, lightY, lightColor);
          break;
        case 'godrays':
          await this.applyGodRays(width, height, lightX, lightY, lightColor);
          break;
        case 'lens':
          await this.applyLensFlare(width, height, lightX, lightY, lightColor);
          break;
      }

      this.updateProgress(100, '完成！');

      const endTime = performance.now();
      this.processTimeEl.textContent = ((endTime - startTime) / 1000).toFixed(2) + 's';

      this.downloadBtn.disabled = false;
      this.showStatus('光線效果已套用成功！', 'success');

    } catch (error) {
      console.error('Processing error:', error);
      this.showStatus('處理時發生錯誤：' + error.message, 'error');
    } finally {
      this.isProcessing = false;
      this.applyBtn.disabled = false;
      setTimeout(() => {
        this.progressSection.classList.remove('active');
      }, 1000);
    }
  }

  async applySunburstEffect(width, height, lightX, lightY, color) {
    const rayCount = this.settings.rayCount;
    const maxLength = Math.max(width, height) * (this.settings.rayLength / 100);
    const intensity = this.settings.intensity / 100;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < rayCount; i++) {
      const progress = 10 + Math.round((i / rayCount) * 80);
      this.updateProgress(progress, `繪製光線 ${i + 1}/${rayCount}...`);

      const angle = (i / rayCount) * Math.PI * 2;
      const gradient = this.ctx.createLinearGradient(
        lightX, lightY,
        lightX + Math.cos(angle) * maxLength,
        lightY + Math.sin(angle) * maxLength
      );

      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity})`);
      gradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      const spreadAngle = Math.PI / rayCount / 2;
      this.ctx.moveTo(lightX, lightY);
      this.ctx.arc(lightX, lightY, maxLength, angle - spreadAngle, angle + spreadAngle);
      this.ctx.closePath();
      this.ctx.fill();

      if (i % 3 === 0) await this.sleep(1);
    }

    // Add central glow
    const glowGradient = this.ctx.createRadialGradient(
      lightX, lightY, 0,
      lightX, lightY, maxLength * 0.3
    );
    glowGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
    glowGradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.5})`);
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(lightX, lightY, maxLength * 0.3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  async applyVolumetricLight(width, height, lightX, lightY, color) {
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const intensity = this.settings.intensity / 100;
    const rayLength = this.settings.rayLength / 100;
    const samples = 60;

    this.updateProgress(20, '計算體積光...');
    await this.sleep(10);

    // Create light buffer
    const lightBuffer = new Float32Array(width * height);

    // Cast rays from each pixel to light source
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = lightX - x;
        const dy = lightY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.max(width, height) * rayLength;

        if (dist > maxDist) continue;

        let accumulator = 0;
        const stepX = dx / samples;
        const stepY = dy / samples;

        for (let s = 0; s < samples; s++) {
          const sampleX = Math.floor(x + stepX * s);
          const sampleY = Math.floor(y + stepY * s);

          if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
            const idx = (sampleY * width + sampleX) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 765;
            accumulator += brightness;
          }
        }

        const falloff = 1 - (dist / maxDist);
        lightBuffer[y * width + x] = (accumulator / samples) * falloff * intensity;
      }

      if (y % 50 === 0) {
        const progress = 20 + Math.round((y / height) * 60);
        this.updateProgress(progress, `處理中... ${Math.round((y / height) * 100)}%`);
        await this.sleep(1);
      }
    }

    this.updateProgress(85, '套用光線效果...');
    await this.sleep(10);

    // Apply light buffer
    for (let i = 0; i < width * height; i++) {
      const light = lightBuffer[i];
      const idx = i * 4;

      data[idx] = Math.min(255, data[idx] + color.r * light);
      data[idx + 1] = Math.min(255, data[idx + 1] + color.g * light);
      data[idx + 2] = Math.min(255, data[idx + 2] + color.b * light);
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  async applyGodRays(width, height, lightX, lightY, color) {
    const intensity = this.settings.intensity / 100;
    const rayLength = this.settings.rayLength / 100;

    // Get image data for radial blur
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const originalData = new Uint8ClampedArray(imageData.data);
    const data = imageData.data;

    const passes = 3;
    const samplesPerPass = 20;

    for (let pass = 0; pass < passes; pass++) {
      const progress = 10 + Math.round((pass / passes) * 70);
      this.updateProgress(progress, `光線計算 ${pass + 1}/${passes}...`);
      await this.sleep(10);

      const decay = 0.95 - pass * 0.1;
      const weight = 0.3 / (pass + 1);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - lightX;
          const dy = y - lightY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.max(width, height) * rayLength;

          if (dist === 0 || dist > maxDist) continue;

          const dirX = -dx / dist;
          const dirY = -dy / dist;

          let r = 0, g = 0, b = 0;
          let sampleWeight = 1;

          for (let s = 0; s < samplesPerPass; s++) {
            const sampleDist = s * (dist / samplesPerPass) * 0.5;
            const sampleX = Math.floor(x + dirX * sampleDist);
            const sampleY = Math.floor(y + dirY * sampleDist);

            if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
              const idx = (sampleY * width + sampleX) * 4;
              r += originalData[idx] * sampleWeight;
              g += originalData[idx + 1] * sampleWeight;
              b += originalData[idx + 2] * sampleWeight;
            }

            sampleWeight *= decay;
          }

          const idx = (y * width + x) * 4;
          const falloff = Math.pow(1 - dist / maxDist, 2);

          data[idx] = Math.min(255, data[idx] + r * weight * falloff * intensity);
          data[idx + 1] = Math.min(255, data[idx + 1] + g * weight * falloff * intensity);
          data[idx + 2] = Math.min(255, data[idx + 2] + b * weight * falloff * intensity);
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);

    // Add colored glow at light source
    this.updateProgress(90, '添加光暈...');

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    const glowRadius = Math.max(width, height) * 0.15;
    const glowGradient = this.ctx.createRadialGradient(
      lightX, lightY, 0,
      lightX, lightY, glowRadius
    );
    glowGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.8})`);
    glowGradient.addColorStop(0.2, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.5})`);
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(lightX, lightY, glowRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  async applyLensFlare(width, height, lightX, lightY, color) {
    const intensity = this.settings.intensity / 100;
    const rayCount = this.settings.rayCount;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    // Calculate direction from center to light
    const centerX = width / 2;
    const centerY = height / 2;
    const dirX = lightX - centerX;
    const dirY = lightY - centerY;
    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);

    this.updateProgress(20, '生成鏡頭光暈...');
    await this.sleep(10);

    // Main glow at light source
    const mainGlowRadius = Math.max(width, height) * 0.1;
    const mainGlow = this.ctx.createRadialGradient(
      lightX, lightY, 0,
      lightX, lightY, mainGlowRadius
    );
    mainGlow.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
    mainGlow.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.6})`);
    mainGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = mainGlow;
    this.ctx.beginPath();
    this.ctx.arc(lightX, lightY, mainGlowRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.updateProgress(40, '添加光斑...');
    await this.sleep(10);

    // Lens flare spots along the opposite direction
    const flareSpots = [
      { pos: -0.2, size: 0.03, alpha: 0.4 },
      { pos: -0.4, size: 0.02, alpha: 0.3 },
      { pos: -0.6, size: 0.05, alpha: 0.25 },
      { pos: -0.8, size: 0.02, alpha: 0.2 },
      { pos: -1.0, size: 0.04, alpha: 0.3 },
      { pos: -1.2, size: 0.06, alpha: 0.15 },
      { pos: -1.4, size: 0.03, alpha: 0.1 },
    ];

    for (let i = 0; i < flareSpots.length; i++) {
      const spot = flareSpots[i];
      const spotX = lightX + dirX * spot.pos;
      const spotY = lightY + dirY * spot.pos;
      const spotRadius = Math.max(width, height) * spot.size;

      // Alternate colors for chromatic effect
      const spotColor = i % 2 === 0
        ? { r: color.r, g: color.g * 0.8, b: color.b * 0.6 }
        : { r: color.r * 0.6, g: color.g, b: Math.min(255, color.b * 1.3) };

      const spotGlow = this.ctx.createRadialGradient(
        spotX, spotY, 0,
        spotX, spotY, spotRadius
      );
      spotGlow.addColorStop(0, `rgba(${spotColor.r}, ${spotColor.g}, ${spotColor.b}, ${intensity * spot.alpha})`);
      spotGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.fillStyle = spotGlow;
      this.ctx.beginPath();
      this.ctx.arc(spotX, spotY, spotRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.updateProgress(70, '添加星芒...');
    await this.sleep(10);

    // Star burst effect
    const starLength = Math.max(width, height) * 0.15 * (this.settings.rayLength / 100);

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const gradient = this.ctx.createLinearGradient(
        lightX, lightY,
        lightX + Math.cos(angle) * starLength,
        lightY + Math.sin(angle) * starLength
      );

      gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.7})`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.3})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(lightX, lightY);
      this.ctx.lineTo(
        lightX + Math.cos(angle) * starLength,
        lightY + Math.sin(angle) * starLength
      );
      this.ctx.stroke();
    }

    // Anamorphic streak (horizontal flare)
    this.updateProgress(85, '添加水平光暈...');

    const streakLength = width * 0.4 * (this.settings.rayLength / 100);
    const streakHeight = 4;

    const horizontalStreak = this.ctx.createLinearGradient(
      lightX - streakLength, lightY,
      lightX + streakLength, lightY
    );
    horizontalStreak.addColorStop(0, 'rgba(255, 255, 255, 0)');
    horizontalStreak.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.3})`);
    horizontalStreak.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.5})`);
    horizontalStreak.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.3})`);
    horizontalStreak.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = horizontalStreak;
    this.ctx.fillRect(lightX - streakLength, lightY - streakHeight, streakLength * 2, streakHeight * 2);

    this.ctx.restore();
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = percent + '%';
    this.progressText.textContent = text;
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = 'status-message' + (type ? ' ' + type : '');
  }

  downloadResult() {
    const link = document.createElement('a');
    link.download = 'raytracing_result.png';
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.lightPosition = { x: 0.5, y: 0.3 };
    this.originalImageEl.src = '';
    this.lightSourceEl.style.display = 'none';
    this.ctx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.progressSection.classList.remove('active');
    this.applyBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // Reset info
    this.imageSizeEl.textContent = '-';
    this.lightPositionEl.textContent = '中心';
    this.processTimeEl.textContent = '-';

    this.showStatus('', '');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new RayTracingEffect();
});
