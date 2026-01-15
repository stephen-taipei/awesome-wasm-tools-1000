/**
 * CMP-065: Compression Efficiency Analyzer
 *
 * Analyzes file compressibility and provides recommendations.
 * All processing is done locally in the browser.
 */

class EfficiencyAnalyzer {
  constructor() {
    this.file = null;
    this.fileData = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.fileType = document.getElementById('fileType');
    this.analysisResults = document.getElementById('analysisResults');
    this.entropy = document.getElementById('entropy');
    this.compressibilityScore = document.getElementById('compressibilityScore');
    this.redundancy = document.getElementById('redundancy');
    this.zeroBytes = document.getElementById('zeroBytes');
    this.testResults = document.getElementById('testResults');
    this.compressionTests = document.getElementById('compressionTests');
    this.recommendations = document.getElementById('recommendations');
    this.recommendationList = document.getElementById('recommendationList');
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.setFile(e.dataTransfer.files[0]);
      }
    });

    this.analyzeBtn.addEventListener('click', () => this.analyze());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.setFile(event.target.files[0]);
    }
  }

  setFile(file) {
    this.file = file;
    this.fileName.textContent = `檔名: ${file.name}`;
    this.fileSize.textContent = `大小: ${this.formatFileSize(file.size)}`;
    this.fileType.textContent = `類型: ${file.type || '未知'}`;
    this.fileInfo.style.display = 'block';
    this.analyzeBtn.disabled = false;
    this.resetBtn.style.display = 'inline-flex';
  }

  async analyze() {
    if (!this.file) return;

    this.progressContainer.classList.add('active');
    this.updateProgress(0, '讀取檔案...');

    try {
      const arrayBuffer = await this.file.arrayBuffer();
      this.fileData = new Uint8Array(arrayBuffer);

      this.updateProgress(20, '計算熵值...');
      const entropyValue = this.calculateEntropy();

      this.updateProgress(40, '分析資料特性...');
      const analysis = this.analyzeDataCharacteristics();

      this.updateProgress(60, '測試壓縮效率...');
      const compressionResults = await this.testCompression();

      this.updateProgress(90, '生成建議...');
      const recs = this.generateRecommendations(entropyValue, analysis, compressionResults);

      // Display results
      this.entropy.textContent = `${(entropyValue * 100).toFixed(2)}%`;
      this.compressibilityScore.textContent = this.getCompressibilityRating(entropyValue);
      this.redundancy.textContent = `${analysis.redundancy.toFixed(2)}%`;
      this.zeroBytes.textContent = `${analysis.zeroPercent.toFixed(2)}%`;
      this.analysisResults.style.display = 'block';

      this.displayCompressionTests(compressionResults);
      this.displayRecommendations(recs);

      this.updateProgress(100, '分析完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '分析完成！');
      }, 500);

    } catch (error) {
      console.error('Analysis error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '分析失敗');
    }
  }

  calculateEntropy() {
    const freq = new Array(256).fill(0);
    for (let i = 0; i < this.fileData.length; i++) {
      freq[this.fileData[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / this.fileData.length;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy / 8; // Normalize to 0-1
  }

  analyzeDataCharacteristics() {
    let zeroCount = 0;
    const freq = new Array(256).fill(0);

    for (let i = 0; i < this.fileData.length; i++) {
      if (this.fileData[i] === 0) zeroCount++;
      freq[this.fileData[i]]++;
    }

    // Calculate redundancy (based on byte frequency distribution)
    const maxFreq = Math.max(...freq);
    const redundancy = (maxFreq / this.fileData.length) * 100;

    // Check for patterns (simple run-length analysis)
    let runs = 0;
    let currentRun = 1;
    for (let i = 1; i < this.fileData.length; i++) {
      if (this.fileData[i] === this.fileData[i - 1]) {
        currentRun++;
      } else {
        if (currentRun >= 4) runs++;
        currentRun = 1;
      }
    }

    return {
      zeroPercent: (zeroCount / this.fileData.length) * 100,
      redundancy: redundancy,
      patternRuns: runs
    };
  }

  async testCompression() {
    const results = [];
    const sampleSize = Math.min(this.fileData.length, 1024 * 1024); // Test on 1MB max
    const sample = this.fileData.slice(0, sampleSize);

    // Test different compression levels
    const levels = [1, 6, 9];

    for (const level of levels) {
      const start = performance.now();
      const compressed = pako.deflate(sample, { level });
      const time = performance.now() - start;
      const ratio = (1 - compressed.length / sample.length) * 100;

      results.push({
        level,
        originalSize: sample.length,
        compressedSize: compressed.length,
        ratio: ratio,
        time: time,
        speed: (sample.length / 1024 / 1024) / (time / 1000)
      });
    }

    return results;
  }

  getCompressibilityRating(entropy) {
    if (entropy < 0.3) return '極佳 (高度可壓縮)';
    if (entropy < 0.5) return '良好 (適度可壓縮)';
    if (entropy < 0.7) return '普通 (輕度可壓縮)';
    if (entropy < 0.9) return '困難 (壓縮效果有限)';
    return '極低 (幾乎不可壓縮)';
  }

  generateRecommendations(entropy, analysis, compressionResults) {
    const recs = [];

    // Based on entropy
    if (entropy < 0.5) {
      recs.push({
        type: 'success',
        text: '此檔案具有良好的壓縮潛力，建議使用最高壓縮等級以獲得最佳壓縮比。'
      });
    } else if (entropy > 0.85) {
      recs.push({
        type: 'warning',
        text: '此檔案熵值較高，可能是已壓縮或加密的資料，進一步壓縮效果有限。'
      });
    }

    // Based on zero bytes
    if (analysis.zeroPercent > 30) {
      recs.push({
        type: 'info',
        text: `檔案包含 ${analysis.zeroPercent.toFixed(1)}% 的零字節，使用稀疏感知壓縮可能更有效。`
      });
    }

    // Based on compression tests
    const bestResult = compressionResults.reduce((best, r) =>
      r.ratio > best.ratio ? r : best, compressionResults[0]);
    const fastestResult = compressionResults.reduce((best, r) =>
      r.time < best.time ? r : best, compressionResults[0]);

    recs.push({
      type: 'info',
      text: `最佳壓縮比: 等級 ${bestResult.level} (${bestResult.ratio.toFixed(1)}% 減少)`
    });

    if (this.file.size > 10 * 1024 * 1024) { // > 10MB
      recs.push({
        type: 'info',
        text: `大型檔案建議使用等級 ${fastestResult.level}，可在 ${fastestResult.speed.toFixed(2)} MB/s 速度下壓縮。`
      });
    }

    // File type specific
    const ext = this.file.name.split('.').pop().toLowerCase();
    const compressedFormats = ['zip', 'gz', 'rar', '7z', 'jpg', 'jpeg', 'png', 'mp3', 'mp4', 'pdf'];
    if (compressedFormats.includes(ext)) {
      recs.push({
        type: 'warning',
        text: '此檔案格式通常已經過壓縮，再次壓縮可能不會顯著減小檔案大小。'
      });
    }

    return recs;
  }

  displayCompressionTests(results) {
    let html = '<table class="compression-table">';
    html += '<tr><th>等級</th><th>壓縮後大小</th><th>壓縮比</th><th>時間</th><th>速度</th></tr>';

    results.forEach(r => {
      html += `<tr>
        <td>等級 ${r.level}</td>
        <td>${this.formatFileSize(r.compressedSize)}</td>
        <td>${r.ratio.toFixed(1)}%</td>
        <td>${r.time.toFixed(0)} ms</td>
        <td>${r.speed.toFixed(2)} MB/s</td>
      </tr>`;
    });

    html += '</table>';
    this.compressionTests.innerHTML = html;
    this.testResults.style.display = 'block';
  }

  displayRecommendations(recs) {
    let html = '<ul class="recommendation-list">';
    recs.forEach(r => {
      const icon = r.type === 'success' ? '✅' : r.type === 'warning' ? '⚠️' : 'ℹ️';
      html += `<li class="${r.type}"><span>${icon}</span> ${r.text}</li>`;
    });
    html += '</ul>';
    this.recommendationList.innerHTML = html;
    this.recommendations.style.display = 'block';
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.fileData = null;
    this.fileInfo.style.display = 'none';
    this.analysisResults.style.display = 'none';
    this.testResults.style.display = 'none';
    this.recommendations.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.analyzeBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
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

document.addEventListener('DOMContentLoaded', () => {
  window.analyzer = new EfficiencyAnalyzer();
});

export default EfficiencyAnalyzer;
