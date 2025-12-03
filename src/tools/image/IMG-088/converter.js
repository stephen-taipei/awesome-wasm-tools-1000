/**
 * IMG-088 表情符號添加
 * 在圖片上添加 Emoji 表情符號
 */

class EmojiTool {
  constructor() {
    this.sourceImage = null;
    this.selectedEmoji = '😀';
    this.emojiSize = 60;
    this.emojiRotation = 0;
    this.placedEmojis = [];

    // Emoji categories
    this.emojiCategories = {
      'smileys': {
        name: '表情',
        emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭']
      },
      'gestures': {
        name: '手勢',
        emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙']
      },
      'hearts': {
        name: '愛心',
        emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '😻', '💑', '💏', '🥰']
      },
      'animals': {
        name: '動物',
        emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺']
      },
      'food': {
        name: '食物',
        emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍔', '🍕', '🍣', '🍦', '🍰', '🧁', '🍩']
      },
      'objects': {
        name: '物品',
        emojis: ['⭐', '🌟', '✨', '💫', '🔥', '💥', '💢', '💦', '💨', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💡', '💎', '🔔', '🎵', '🎶', '💬', '💭', '🗯️']
      },
      'symbols': {
        name: '符號',
        emojis: ['✅', '❌', '❓', '❗', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '▶️', '⏸️', '⏹️', '⏺️', '⏭️', '⏮️', '🔀', '🔁', '🔂', '➕']
      },
      'flags': {
        name: '旗幟',
        emojis: ['🏳️', '🏴', '🚩', '🎌', '🏁', '🇹🇼', '🇯🇵', '🇰🇷', '🇨🇳', '🇺🇸', '🇬🇧', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇵🇹', '🇷🇺', '🇧🇷', '🇦🇺', '🇨🇦', '🇮🇳', '🇲🇽', '🇹🇭', '🇻🇳']
      }
    };

    this.currentCategory = 'smileys';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorLayout = document.getElementById('editorLayout');

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.categoryTabs = document.getElementById('categoryTabs');
    this.emojiGrid = document.getElementById('emojiGrid');
    this.emojiList = document.getElementById('emojiList');

    this.emojiSizeSlider = document.getElementById('emojiSize');
    this.emojiSizeValue = document.getElementById('emojiSizeValue');
    this.emojiRotationSlider = document.getElementById('emojiRotation');
    this.emojiRotationValue = document.getElementById('emojiRotationValue');

    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.buildCategoryTabs();
    this.buildEmojiGrid();
    this.bindEvents();
  }

  buildCategoryTabs() {
    this.categoryTabs.innerHTML = '';
    Object.keys(this.emojiCategories).forEach(key => {
      const tab = document.createElement('button');
      tab.className = `category-tab ${key === this.currentCategory ? 'active' : ''}`;
      tab.textContent = this.emojiCategories[key].name;
      tab.dataset.category = key;
      this.categoryTabs.appendChild(tab);
    });
  }

  buildEmojiGrid() {
    this.emojiGrid.innerHTML = '';
    const emojis = this.emojiCategories[this.currentCategory].emojis;
    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = `emoji-btn ${emoji === this.selectedEmoji ? 'selected' : ''}`;
      btn.textContent = emoji;
      btn.dataset.emoji = emoji;
      this.emojiGrid.appendChild(btn);
    });
  }

  bindEvents() {
    // Upload events
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('drag-over');
    });
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('drag-over');
    });
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file);
    });

    // Category tabs
    this.categoryTabs.addEventListener('click', (e) => {
      if (e.target.classList.contains('category-tab')) {
        this.currentCategory = e.target.dataset.category;
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.buildEmojiGrid();
      }
    });

    // Emoji selection
    this.emojiGrid.addEventListener('click', (e) => {
      if (e.target.classList.contains('emoji-btn')) {
        this.selectedEmoji = e.target.dataset.emoji;
        document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
      }
    });

    // Size slider
    this.emojiSizeSlider.addEventListener('input', () => {
      this.emojiSize = parseInt(this.emojiSizeSlider.value);
      this.emojiSizeValue.textContent = this.emojiSize + ' px';
    });

    // Rotation slider
    this.emojiRotationSlider.addEventListener('input', () => {
      this.emojiRotation = parseInt(this.emojiRotationSlider.value);
      this.emojiRotationValue.textContent = this.emojiRotation + '°';
    });

    // Canvas click to place emoji
    this.previewCanvas.addEventListener('click', (e) => {
      if (!this.sourceImage) return;

      const rect = this.previewCanvas.getBoundingClientRect();
      const scaleX = this.previewCanvas.width / rect.width;
      const scaleY = this.previewCanvas.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      this.placedEmojis.push({
        emoji: this.selectedEmoji,
        x: x,
        y: y,
        size: this.emojiSize,
        rotation: this.emojiRotation
      });

      this.render();
      this.updateEmojiList();
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.placedEmojis = [];
        this.uploadArea.style.display = 'none';
        this.editorLayout.classList.add('active');
        this.downloadBtn.disabled = false;

        this.render();
        this.updateEmojiList();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.sourceImage) return;

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.previewCanvas.width = width;
    this.previewCanvas.height = height;

    const ctx = this.previewCtx;

    // Draw source image
    ctx.drawImage(this.sourceImage, 0, 0);

    // Draw all placed emojis
    this.placedEmojis.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.font = `${item.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.emoji, 0, 0);
      ctx.restore();
    });

    this.previewInfo.textContent = `${width} × ${height} px | ${this.placedEmojis.length} 個表情`;
  }

  updateEmojiList() {
    if (this.placedEmojis.length === 0) {
      this.emojiList.innerHTML = '<div style="color: #666; font-size: 0.8rem; text-align: center;">尚未添加表情</div>';
      return;
    }

    this.emojiList.innerHTML = '';
    this.placedEmojis.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'emoji-item';
      div.innerHTML = `
        <div class="emoji-item-info">
          <span class="emoji-item-emoji">${item.emoji}</span>
          <span class="emoji-item-pos">(${Math.round(item.x)}, ${Math.round(item.y)})</span>
        </div>
        <button class="emoji-item-remove" data-index="${index}">移除</button>
      `;
      this.emojiList.appendChild(div);
    });

    // Bind remove buttons
    this.emojiList.querySelectorAll('.emoji-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        this.placedEmojis.splice(index, 1);
        this.render();
        this.updateEmojiList();
      });
    });
  }

  download() {
    this.previewCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `emoji_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.placedEmojis = [];
    this.selectedEmoji = '😀';
    this.emojiSize = 60;
    this.emojiRotation = 0;
    this.currentCategory = 'smileys';

    this.uploadArea.style.display = 'block';
    this.editorLayout.classList.remove('active');
    this.downloadBtn.disabled = true;

    this.emojiSizeSlider.value = 60;
    this.emojiSizeValue.textContent = '60 px';
    this.emojiRotationSlider.value = 0;
    this.emojiRotationValue.textContent = '0°';

    this.buildCategoryTabs();
    this.buildEmojiGrid();
    this.updateEmojiList();

    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.previewInfo.textContent = '';
    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new EmojiTool();
});
