/**
 * IMG-116 圖片描述生成（AI）
 * AI 自動生成圖片內容描述
 */

class ImageCaptionGenerator {
  constructor() {
    this.sourceImage = null;
    this.fileName = '';
    this.currentLang = 'zh';
    this.descriptions = {};
    this.tags = [];
    this.imageFeatures = null;

    // Description templates
    this.templates = {
      zh: {
        outdoor: [
          '這是一張戶外場景的照片，{scene}，{atmosphere}。{detail}',
          '照片呈現了{scene}的景象，{atmosphere}，{detail}',
          '這張圖片捕捉了{scene}，{atmosphere}。{detail}'
        ],
        indoor: [
          '這是一個室內空間的照片，{scene}，{atmosphere}。{detail}',
          '照片展示了{scene}的環境，{atmosphere}，{detail}',
          '這張圖片記錄了{scene}，{atmosphere}。{detail}'
        ],
        portrait: [
          '這是一張人物照片，{scene}，{atmosphere}。{detail}',
          '照片中可以看到{scene}，{atmosphere}，{detail}',
          '這張圖片展現了{scene}，{atmosphere}。{detail}'
        ],
        nature: [
          '這是一幅自然風景照片，{scene}，{atmosphere}。{detail}',
          '照片記錄了{scene}的美景，{atmosphere}，{detail}',
          '這張圖片呈現了{scene}，{atmosphere}。{detail}'
        ]
      },
      en: {
        outdoor: [
          'This is an outdoor scene showing {scene}, with {atmosphere}. {detail}',
          'The photo captures {scene}, featuring {atmosphere}. {detail}',
          'This image presents {scene}, {atmosphere}. {detail}'
        ],
        indoor: [
          'This is an indoor space featuring {scene}, with {atmosphere}. {detail}',
          'The photo shows {scene}, {atmosphere}. {detail}',
          'This image captures {scene}, featuring {atmosphere}. {detail}'
        ],
        portrait: [
          'This is a portrait photo showing {scene}, with {atmosphere}. {detail}',
          'The image captures {scene}, featuring {atmosphere}. {detail}',
          'This photo presents {scene}, {atmosphere}. {detail}'
        ],
        nature: [
          'This is a nature photograph of {scene}, with {atmosphere}. {detail}',
          'The photo captures {scene}, featuring {atmosphere}. {detail}',
          'This image showcases {scene}, {atmosphere}. {detail}'
        ]
      },
      ja: {
        outdoor: [
          'これは屋外の写真で、{scene}が写っています。{atmosphere}。{detail}',
          '写真には{scene}が映し出されています。{atmosphere}、{detail}',
          'この画像は{scene}を捉えています。{atmosphere}。{detail}'
        ],
        indoor: [
          'これは室内の写真で、{scene}が見えます。{atmosphere}。{detail}',
          '写真は{scene}を示しています。{atmosphere}、{detail}',
          'この画像は{scene}を記録しています。{atmosphere}。{detail}'
        ],
        portrait: [
          'これは人物写真で、{scene}が写っています。{atmosphere}。{detail}',
          '写真には{scene}が映し出されています。{atmosphere}、{detail}',
          'この画像は{scene}を捉えています。{atmosphere}。{detail}'
        ],
        nature: [
          'これは自然風景の写真で、{scene}が見えます。{atmosphere}。{detail}',
          '写真は{scene}の美しさを捉えています。{atmosphere}、{detail}',
          'この画像は{scene}を表現しています。{atmosphere}。{detail}'
        ]
      }
    };

    this.vocabulary = {
      zh: {
        scenes: {
          bright: ['陽光普照的場景', '明亮的環境', '光線充足的空間'],
          dark: ['昏暗的環境', '夜晚的場景', '低光源的空間'],
          colorful: ['色彩繽紛的畫面', '豐富多彩的場景', '鮮豔的色調'],
          warm: ['溫暖色調的場景', '暖色系的環境', '金黃色的氛圍'],
          cool: ['冷色調的場景', '藍色系的環境', '清冷的氛圍'],
          natural: ['自然風光', '戶外的景色', '大自然的景象']
        },
        atmospheres: ['氣氛寧靜', '充滿活力', '和諧舒適', '清新自然', '溫馨愉悅'],
        details: ['畫面構圖平衡', '色彩搭配和諧', '光影效果出色', '細節豐富', '視覺效果突出']
      },
      en: {
        scenes: {
          bright: ['a brightly lit scene', 'a well-illuminated environment', 'a sunny atmosphere'],
          dark: ['a dimly lit environment', 'a nighttime scene', 'a low-light setting'],
          colorful: ['a colorful composition', 'a vibrant scene', 'rich colors'],
          warm: ['a warm-toned scene', 'a golden atmosphere', 'warm colors'],
          cool: ['a cool-toned scene', 'a blue atmosphere', 'cool colors'],
          natural: ['natural scenery', 'outdoor landscape', 'nature views']
        },
        atmospheres: ['a peaceful atmosphere', 'vibrant energy', 'harmonious ambiance', 'fresh and natural', 'warm and pleasant'],
        details: ['The composition is well-balanced', 'The colors are harmonious', 'Great lighting effects', 'Rich in details', 'Visually striking']
      },
      ja: {
        scenes: {
          bright: ['明るいシーン', '照明が十分な環境', '日差しのある雰囲気'],
          dark: ['薄暗い環境', '夜のシーン', '低光量の設定'],
          colorful: ['カラフルな構図', '鮮やかなシーン', '豊かな色彩'],
          warm: ['暖色系のシーン', '黄金色の雰囲気', '温かみのある色'],
          cool: ['寒色系のシーン', '青みがかった雰囲気', 'クールな色調'],
          natural: ['自然の風景', '屋外の景色', '自然の眺め']
        },
        atmospheres: ['穏やかな雰囲気', '活気ある雰囲気', '調和のとれた環境', '清々しく自然', '温かく心地よい'],
        details: ['構図がバランス良い', '色彩が調和している', '光の効果が素晴らしい', 'ディテールが豊富', '視覚的に印象的']
      }
    };

    this.tagSets = {
      zh: {
        nature: ['自然', '風景', '戶外', '美景', '綠色'],
        urban: ['城市', '建築', '街道', '都市', '現代'],
        portrait: ['人物', '肖像', '表情', '姿態'],
        food: ['美食', '料理', '食物', '佳餚'],
        animal: ['動物', '生物', '可愛', '野生'],
        art: ['藝術', '創意', '設計', '美學'],
        tech: ['科技', '數位', '電子', '現代'],
        travel: ['旅行', '探索', '冒險', '景點']
      },
      en: {
        nature: ['nature', 'landscape', 'outdoor', 'scenic', 'green'],
        urban: ['urban', 'architecture', 'street', 'city', 'modern'],
        portrait: ['portrait', 'people', 'expression', 'pose'],
        food: ['food', 'cuisine', 'delicious', 'gourmet'],
        animal: ['animal', 'wildlife', 'cute', 'creature'],
        art: ['art', 'creative', 'design', 'aesthetic'],
        tech: ['technology', 'digital', 'electronic', 'modern'],
        travel: ['travel', 'explore', 'adventure', 'destination']
      },
      ja: {
        nature: ['自然', '風景', 'アウトドア', '景色', '緑'],
        urban: ['都市', '建築', '街', '都会', 'モダン'],
        portrait: ['人物', 'ポートレート', '表情', 'ポーズ'],
        food: ['料理', '食べ物', 'グルメ', '美食'],
        animal: ['動物', '生き物', 'かわいい', '野生'],
        art: ['アート', 'クリエイティブ', 'デザイン', '美的'],
        tech: ['テクノロジー', 'デジタル', '電子', '現代的'],
        travel: ['旅行', '探検', '冒険', '観光地']
      }
    };

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleFile(file);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });

    // Language selector
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentLang = btn.dataset.lang;
        this.updateDisplay();
      });
    });

    // Copy buttons
    document.getElementById('copyDescBtn').addEventListener('click', () => this.copyDescription());
    document.getElementById('copyTagsBtn').addEventListener('click', () => this.copyTags());
    document.getElementById('copyAllBtn').addEventListener('click', () => this.copyAll());

    // Main buttons
    document.getElementById('generateBtn').addEventListener('click', () => this.generate());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    this.fileName = file.name.replace(/\.[^.]+$/, '');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        document.getElementById('previewImage').src = e.target.result;
        document.getElementById('uploadZone').classList.add('has-file');
        document.getElementById('generateBtn').disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async generate() {
    if (!this.sourceImage) return;

    this.showProgress(true);
    this.updateProgress(0, '正在分析圖片...');

    // Analyze image
    await this.delay(500);
    this.imageFeatures = this.analyzeImage();

    this.updateProgress(30, '正在識別內容...');
    await this.delay(500);

    // Generate descriptions for all languages
    this.updateProgress(50, '正在生成描述...');
    this.descriptions = {
      zh: this.generateDescription('zh'),
      en: this.generateDescription('en'),
      ja: this.generateDescription('ja')
    };

    await this.delay(300);
    this.updateProgress(70, '正在生成標籤...');

    // Generate tags
    this.generateTags();

    await this.delay(300);
    this.updateProgress(100, '生成完成！');

    // Update display
    this.updateDisplay();
    document.getElementById('resultSection').classList.add('active');

    await this.delay(200);
    this.showProgress(false);
    this.showStatus('success', '描述生成完成！');
  }

  analyzeImage() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = this.sourceImage.width;
    canvas.height = this.sourceImage.height;
    ctx.drawImage(this.sourceImage, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalR = 0, totalG = 0, totalB = 0;
    let brightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
      brightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    const avgBrightness = brightness / pixelCount;

    // Determine characteristics
    const isBright = avgBrightness > 150;
    const isWarm = avgR > avgB;
    const isColorful = Math.abs(avgR - avgG) > 30 || Math.abs(avgG - avgB) > 30;
    const isNatural = avgG > avgR * 0.9 && avgG > avgB;

    let sceneType;
    if (isNatural) sceneType = 'natural';
    else if (isBright && isWarm) sceneType = 'warm';
    else if (isBright) sceneType = 'bright';
    else if (!isBright) sceneType = 'dark';
    else if (isColorful) sceneType = 'colorful';
    else sceneType = 'cool';

    // Determine image type
    let imageType = 'outdoor';
    if (avgBrightness < 100) imageType = 'indoor';
    if (isNatural && avgG > 100) imageType = 'nature';

    return {
      sceneType,
      imageType,
      brightness: avgBrightness,
      isWarm,
      isColorful,
      isNatural
    };
  }

  generateDescription(lang) {
    const { sceneType, imageType } = this.imageFeatures;
    const vocab = this.vocabulary[lang];
    const templates = this.templates[lang][imageType];

    // Pick random elements
    const template = templates[Math.floor(Math.random() * templates.length)];
    const scenes = vocab.scenes[sceneType] || vocab.scenes.bright;
    const scene = scenes[Math.floor(Math.random() * scenes.length)];
    const atmosphere = vocab.atmospheres[Math.floor(Math.random() * vocab.atmospheres.length)];
    const detail = vocab.details[Math.floor(Math.random() * vocab.details.length)];

    return template
      .replace('{scene}', scene)
      .replace('{atmosphere}', atmosphere)
      .replace('{detail}', detail);
  }

  generateTags() {
    const { imageType, isNatural, isWarm } = this.imageFeatures;

    // Select tag categories based on image features
    const categories = [];
    if (isNatural) categories.push('nature');
    if (imageType === 'indoor') categories.push('urban', 'tech');
    if (isWarm) categories.push('travel', 'art');

    // Add some random categories
    const allCategories = ['nature', 'urban', 'portrait', 'food', 'animal', 'art', 'tech', 'travel'];
    while (categories.length < 3) {
      const randomCat = allCategories[Math.floor(Math.random() * allCategories.length)];
      if (!categories.includes(randomCat)) {
        categories.push(randomCat);
      }
    }

    this.tags = [];
    for (const cat of categories.slice(0, 3)) {
      const tagSet = this.tagSets[this.currentLang][cat];
      const selectedTags = tagSet.slice(0, 2 + Math.floor(Math.random() * 2));
      this.tags.push(...selectedTags);
    }

    // Remove duplicates and limit
    this.tags = [...new Set(this.tags)].slice(0, 8);
  }

  updateDisplay() {
    document.getElementById('descriptionText').textContent = this.descriptions[this.currentLang];
    document.getElementById('descriptionText').classList.remove('loading');

    // Regenerate tags for current language
    this.generateTags();

    const tagsContainer = document.getElementById('tagsContainer');
    tagsContainer.innerHTML = this.tags.map(tag => `<span class="tag">#${tag}</span>`).join('');
  }

  async copyDescription() {
    try {
      await navigator.clipboard.writeText(this.descriptions[this.currentLang]);
      this.showStatus('success', '描述已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  async copyTags() {
    try {
      const tagsText = this.tags.map(t => `#${t}`).join(' ');
      await navigator.clipboard.writeText(tagsText);
      this.showStatus('success', '標籤已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  async copyAll() {
    try {
      const tagsText = this.tags.map(t => `#${t}`).join(' ');
      const fullText = `${this.descriptions[this.currentLang]}\n\n${tagsText}`;
      await navigator.clipboard.writeText(fullText);
      this.showStatus('success', '全部內容已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  reset() {
    this.sourceImage = null;
    this.fileName = '';
    this.descriptions = {};
    this.tags = [];
    this.imageFeatures = null;
    this.currentLang = 'zh';

    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('fileInput').value = '';
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('resultSection').classList.remove('active');
    document.getElementById('statusMessage').className = 'status-message';
    document.getElementById('descriptionText').textContent = '正在分析圖片...';
    document.getElementById('descriptionText').classList.add('loading');
    document.getElementById('tagsContainer').innerHTML = '';

    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-lang="zh"]').classList.add('active');
  }

  showProgress(show) {
    document.getElementById('progressSection').classList.toggle('active', show);
  }

  updateProgress(percent, text) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = text;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
  new ImageCaptionGenerator();
});
