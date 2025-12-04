/**
 * IMG-109 Open Graph 圖片生成器
 * 生成社群分享用 OG 圖片（1200x630）
 */

class OGImageGenerator {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.backgroundImage = null;
    this.selectedTemplate = 'gradient';
    this.outputFormat = 'png';

    this.templates = [
      { id: 'gradient', name: '漸層', colors: ['#667eea', '#764ba2'] },
      { id: 'dark', name: '暗黑', colors: ['#1a1a2e', '#16213e'] },
      { id: 'light', name: '明亮', colors: ['#f5f7fa', '#c3cfe2'] },
      { id: 'sunset', name: '日落', colors: ['#f093fb', '#f5576c'] },
      { id: 'ocean', name: '海洋', colors: ['#4facfe', '#00f2fe'] },
      { id: 'forest', name: '森林', colors: ['#11998e', '#38ef7d'] },
      { id: 'fire', name: '火焰', colors: ['#f12711', '#f5af19'] },
      { id: 'minimal', name: '極簡', colors: ['#ffffff', '#ffffff'] }
    ];

    this.init();
  }

  init() {
    this.renderTemplates();
    this.bindEvents();
    this.render();
  }

  renderTemplates() {
    const grid = document.getElementById('templateGrid');
    grid.innerHTML = this.templates.map(t => `
      <div class="template-card ${t.id === this.selectedTemplate ? 'selected' : ''}" data-template="${t.id}">
        <div class="template-preview" style="background: linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]} 100%);">
        </div>
        <div class="template-name">${t.name}</div>
      </div>
    `).join('');
  }

  bindEvents() {
    // Template selection
    document.getElementById('templateGrid').addEventListener('click', (e) => {
      const card = e.target.closest('.template-card');
      if (card) {
        this.selectedTemplate = card.dataset.template;
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.render();
      }
    });

    // Text inputs
    ['titleInput', 'subtitleInput', 'siteNameInput'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => this.render());
    });

    // Color pickers
    document.getElementById('titleColor').addEventListener('input', (e) => {
      document.getElementById('titleColorText').value = e.target.value;
      this.render();
    });

    document.getElementById('titleColorText').addEventListener('input', (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        document.getElementById('titleColor').value = e.target.value;
        this.render();
      }
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
      document.getElementById('bgColorText').value = e.target.value;
      this.render();
    });

    document.getElementById('bgColorText').addEventListener('input', (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        document.getElementById('bgColor').value = e.target.value;
        this.render();
      }
    });

    // File upload
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

    // Format selection
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.outputFormat = btn.dataset.format;
      });
    });

    // Download
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.backgroundImage = img;
        document.getElementById('uploadBtn').textContent = `✓ ${file.name}`;
        document.getElementById('uploadBtn').classList.add('has-image');
        this.render();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  getTemplate() {
    return this.templates.find(t => t.id === this.selectedTemplate);
  }

  render() {
    const { ctx, canvas } = this;
    const template = this.getTemplate();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (this.backgroundImage) {
      // Draw image covering the canvas
      this.drawCoverImage(this.backgroundImage);

      // Add overlay for text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (template.id === 'minimal') {
      // Solid background
      const bgColor = document.getElementById('bgColor').value;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, template.colors[0]);
      gradient.addColorStop(1, template.colors[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Get text content
    const title = document.getElementById('titleInput').value || '標題';
    const subtitle = document.getElementById('subtitleInput').value;
    const siteName = document.getElementById('siteNameInput').value;
    const titleColor = document.getElementById('titleColor').value;

    // Determine text color based on template
    let textColor = titleColor;
    let subtitleColor = this.adjustAlpha(titleColor, 0.8);

    // Draw title
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate font size to fit
    let fontSize = 72;
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    while (ctx.measureText(title).width > canvas.width - 120 && fontSize > 32) {
      fontSize -= 4;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    }

    const centerY = subtitle ? canvas.height / 2 - 30 : canvas.height / 2;

    // Draw title with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(title, canvas.width / 2, centerY);

    // Draw subtitle
    if (subtitle) {
      ctx.shadowBlur = 5;
      ctx.fillStyle = subtitleColor;
      ctx.font = `400 ${fontSize * 0.4}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(subtitle, canvas.width / 2, centerY + fontSize * 0.7);
    }

    // Draw site name
    if (siteName) {
      ctx.shadowBlur = 3;
      ctx.fillStyle = subtitleColor;
      ctx.font = `500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(siteName, 50, canvas.height - 40);
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw decorative elements based on template
    this.drawDecorations(template);
  }

  drawCoverImage(img) {
    const { ctx, canvas } = this;
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;

    let sx, sy, sWidth, sHeight;

    if (imgRatio > canvasRatio) {
      // Image is wider
      sHeight = img.height;
      sWidth = img.height * canvasRatio;
      sx = (img.width - sWidth) / 2;
      sy = 0;
    } else {
      // Image is taller
      sWidth = img.width;
      sHeight = img.width / canvasRatio;
      sx = 0;
      sy = (img.height - sHeight) / 2;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
  }

  drawDecorations(template) {
    const { ctx, canvas } = this;

    // Draw corner accents for some templates
    if (['gradient', 'sunset', 'ocean'].includes(template.id)) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 3;

      // Top left corner
      ctx.beginPath();
      ctx.moveTo(30, 80);
      ctx.lineTo(30, 30);
      ctx.lineTo(80, 30);
      ctx.stroke();

      // Bottom right corner
      ctx.beginPath();
      ctx.moveTo(canvas.width - 30, canvas.height - 80);
      ctx.lineTo(canvas.width - 30, canvas.height - 30);
      ctx.lineTo(canvas.width - 80, canvas.height - 30);
      ctx.stroke();
    }

    // Draw line decoration for minimal
    if (template.id === 'minimal') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 100, canvas.height / 2 + 80);
      ctx.lineTo(canvas.width / 2 + 100, canvas.height / 2 + 80);
      ctx.stroke();
    }
  }

  adjustAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  download() {
    const link = document.createElement('a');
    const format = this.outputFormat;
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpg' ? 0.92 : undefined;

    link.download = `og-image.${format}`;
    link.href = this.canvas.toDataURL(mimeType, quality);
    link.click();

    this.showStatus('success', `已下載 og-image.${format}`);
  }

  reset() {
    document.getElementById('titleInput').value = '精彩文章標題';
    document.getElementById('subtitleInput').value = '副標題或描述文字';
    document.getElementById('siteNameInput').value = 'My Website';
    document.getElementById('titleColor').value = '#ffffff';
    document.getElementById('titleColorText').value = '#ffffff';
    document.getElementById('bgColor').value = '#1a1a2e';
    document.getElementById('bgColorText').value = '#1a1a2e';
    document.getElementById('uploadBtn').textContent = '點擊上傳背景圖片';
    document.getElementById('uploadBtn').classList.remove('has-image');
    document.getElementById('fileInput').value = '';

    this.backgroundImage = null;
    this.selectedTemplate = 'gradient';
    this.outputFormat = 'png';

    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
    document.querySelector('[data-template="gradient"]').classList.add('selected');
    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-format="png"]').classList.add('active');

    this.render();
    this.showStatus('success', '已重置所有設定');
  }

  showStatus(type, message) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.className = `status-message ${type}`;
    statusEl.textContent = message;

    if (type === 'success') {
      setTimeout(() => {
        statusEl.className = 'status-message';
      }, 3000);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new OGImageGenerator();
});
