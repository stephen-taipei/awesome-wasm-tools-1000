/**
 * CMP-057: Archive Comment Editor
 *
 * Edits comments in ZIP archive files.
 * All processing is done locally in the browser.
 */

class CommentEditor {
  constructor() {
    this.file = null;
    this.zip = null;
    this.modifiedBlob = null;
    this.fileComments = {};
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.archiveInfo = document.getElementById('archiveInfo');
    this.archiveName = document.getElementById('archiveName');
    this.archiveSize = document.getElementById('archiveSize');
    this.fileCount = document.getElementById('fileCount');
    this.commentEditor = document.getElementById('commentEditor');
    this.currentComment = document.getElementById('currentComment');
    this.newComment = document.getElementById('newComment');
    this.fileCommentsPanel = document.getElementById('fileComments');
    this.fileCommentList = document.getElementById('fileCommentList');
    this.saveBtn = document.getElementById('saveBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
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
        this.loadArchive(e.dataTransfer.files[0]);
      }
    });

    this.saveBtn.addEventListener('click', () => this.saveChanges());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.loadArchive(event.target.files[0]);
    }
  }

  async loadArchive(file) {
    this.file = file;
    this.progressContainer.classList.add('active');
    this.updateProgress(10, '讀取壓縮檔...');

    try {
      const arrayBuffer = await file.arrayBuffer();

      this.updateProgress(30, '解析 ZIP 結構...');
      this.zip = await JSZip.loadAsync(arrayBuffer);

      this.updateProgress(60, '讀取註解...');
      this.displayArchiveInfo();
      this.displayComments();

      this.updateProgress(100, '載入完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '壓縮檔載入完成！');
        this.saveBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('Archive loading error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '載入失敗，請確認檔案格式正確');
    }
  }

  displayArchiveInfo() {
    this.archiveName.textContent = this.file.name;
    this.archiveSize.textContent = this.formatFileSize(this.file.size);
    this.fileCount.textContent = `${Object.keys(this.zip.files).filter(f => !f.endsWith('/')).length} 個`;
    this.archiveInfo.style.display = 'block';
  }

  displayComments() {
    // Display archive comment
    const archiveComment = this.zip.comment || '';
    this.currentComment.textContent = archiveComment || '無註解';
    this.newComment.value = archiveComment;
    this.commentEditor.style.display = 'block';

    // Display file comments
    this.fileCommentList.innerHTML = '';
    let hasFileComments = false;

    Object.keys(this.zip.files).forEach(filename => {
      if (!filename.endsWith('/')) {
        const file = this.zip.files[filename];
        const comment = file.comment || '';
        this.fileComments[filename] = comment;

        if (comment) hasFileComments = true;

        const item = document.createElement('div');
        item.className = 'file-comment-item';
        item.innerHTML = `
          <div class="file-comment-header">
            <span class="file-name">📄 ${filename}</span>
          </div>
          <textarea class="file-comment-input"
                    data-filename="${filename}"
                    placeholder="輸入檔案註解...">${comment}</textarea>
        `;
        this.fileCommentList.appendChild(item);
      }
    });

    // Bind file comment change events
    this.fileCommentList.querySelectorAll('.file-comment-input').forEach(textarea => {
      textarea.addEventListener('change', (e) => {
        this.fileComments[e.target.dataset.filename] = e.target.value;
      });
    });

    this.fileCommentsPanel.style.display = 'block';
  }

  async saveChanges() {
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '準備儲存...');

    try {
      // Update archive comment
      this.zip.comment = this.newComment.value;

      // Update file comments
      Object.keys(this.fileComments).forEach(filename => {
        if (this.zip.files[filename]) {
          this.zip.files[filename].comment = this.fileComments[filename];
        }
      });

      this.updateProgress(30, '重建壓縮檔...');

      // Generate new ZIP with updated comments
      this.modifiedBlob = await this.zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        comment: this.newComment.value
      }, (metadata) => {
        this.updateProgress(30 + metadata.percent * 0.6, '生成中...');
      });

      this.updateProgress(100, '儲存完成');

      // Update current comment display
      this.currentComment.textContent = this.newComment.value || '無註解';

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '註解已更新！');
        this.downloadBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('Save error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '儲存失敗');
    }
  }

  download() {
    if (!this.modifiedBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.modifiedBlob);
    link.download = this.file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.zip = null;
    this.modifiedBlob = null;
    this.fileComments = {};
    this.archiveInfo.style.display = 'none';
    this.commentEditor.style.display = 'none';
    this.fileCommentsPanel.style.display = 'none';
    this.saveBtn.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.newComment.value = '';
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
  window.editor = new CommentEditor();
});

export default CommentEditor;
