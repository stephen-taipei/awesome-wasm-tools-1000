/**
 * AUD-046 音頻分割 - Audio Splitter
 * Split audio into multiple segments
 */

class AudioSplitter {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.segments = [];
        this.splitPoints = [];
        this.mode = 'equal';
        this.splitCount = 4;
        this.segmentDuration = 60;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        this.canvas = document.getElementById('waveformCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.splitSettings = document.getElementById('splitSettings');
        this.previewSection = document.getElementById('previewSection');
        this.outputSettings = document.getElementById('outputSettings');
        this.processBtn = document.getElementById('processBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.resultPanel = document.getElementById('resultPanel');
    }

    bindEvents() {
        // Upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));

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
                this.handleFile(e.dataTransfer.files[0]);
            }
        });

        // Mode tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.mode = tab.dataset.mode;

                document.querySelectorAll('.mode-content').forEach(c => c.classList.remove('active'));
                document.getElementById(this.mode + 'Mode').classList.add('active');

                if (this.audioBuffer) this.updatePreview();
            });
        });

        // Split count slider
        document.getElementById('splitCount').addEventListener('input', (e) => {
            this.splitCount = parseInt(e.target.value);
            document.getElementById('splitCountValue').textContent = this.splitCount + ' 段';
            if (this.audioBuffer) this.updatePreview();
        });

        // Segment duration
        document.getElementById('segmentDuration').addEventListener('input', (e) => {
            this.segmentDuration = parseInt(e.target.value);
            if (this.audioBuffer) this.updatePreview();
        });

        // Add point button
        document.getElementById('addPointBtn').addEventListener('click', () => this.addSplitPoint());

        // Format buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.outputFormat = btn.dataset.format;
            });
        });

        // Canvas click for manual mode
        this.canvas.addEventListener('click', (e) => {
            if (this.mode === 'manual' && this.audioBuffer) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const time = (x / this.canvas.width) * this.audioBuffer.duration;

                document.getElementById('splitMinutes').value = Math.floor(time / 60);
                document.getElementById('splitSeconds').value = Math.floor(time % 60);
            }
        });

        // Process button
        this.processBtn.addEventListener('click', () => this.processAudio());

        // Download all button
        document.getElementById('downloadAllBtn').addEventListener('click', () => this.downloadAll());

        // Resize
        window.addEventListener('resize', () => {
            if (this.audioBuffer) this.drawWaveform();
        });
    }

    async handleFile(file) {
        if (!file || !file.type.startsWith('audio/')) {
            alert('請選擇有效的音頻文件');
            return;
        }

        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            this.originalFileName = file.name.replace(/\.[^/.]+$/, '');

            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            this.updateFileInfo(file);

            // Reset split points
            this.splitPoints = [];
            this.updateSplitPointsList();

            // Show panels
            this.fileInfo.classList.add('show');
            this.splitSettings.classList.add('show');
            this.previewSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.updatePreview();

        } catch (error) {
            console.error('Error loading audio:', error);
            alert('無法載入音頻文件: ' + error.message);
        }
    }

    updateFileInfo(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileDuration').textContent = this.formatTime(this.audioBuffer.duration);
        document.getElementById('fileSampleRate').textContent = this.audioBuffer.sampleRate + ' Hz';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    addSplitPoint() {
        const minutes = parseInt(document.getElementById('splitMinutes').value) || 0;
        const seconds = parseInt(document.getElementById('splitSeconds').value) || 0;
        const time = minutes * 60 + seconds;

        if (time <= 0 || time >= this.audioBuffer.duration) {
            alert('分割點必須在音頻時長範圍內');
            return;
        }

        if (!this.splitPoints.includes(time)) {
            this.splitPoints.push(time);
            this.splitPoints.sort((a, b) => a - b);
            this.updateSplitPointsList();
            this.updatePreview();
        }
    }

    removeSplitPoint(time) {
        this.splitPoints = this.splitPoints.filter(t => t !== time);
        this.updateSplitPointsList();
        this.updatePreview();
    }

    updateSplitPointsList() {
        const list = document.getElementById('splitPointsList');
        list.innerHTML = this.splitPoints.map(time => `
            <div class="split-point-item">
                <span>分割點: ${this.formatTime(time)}</span>
                <button class="remove-point-btn" onclick="splitter.removeSplitPoint(${time})">移除</button>
            </div>
        `).join('');
    }

    calculateSegments() {
        const duration = this.audioBuffer.duration;
        const segments = [];

        switch (this.mode) {
            case 'equal':
                const segDuration = duration / this.splitCount;
                for (let i = 0; i < this.splitCount; i++) {
                    segments.push({
                        start: i * segDuration,
                        end: (i + 1) * segDuration,
                        name: `${this.originalFileName}_part${i + 1}`
                    });
                }
                break;

            case 'duration':
                let start = 0;
                let part = 1;
                while (start < duration) {
                    const end = Math.min(start + this.segmentDuration, duration);
                    segments.push({
                        start: start,
                        end: end,
                        name: `${this.originalFileName}_part${part}`
                    });
                    start = end;
                    part++;
                }
                break;

            case 'manual':
                const points = [0, ...this.splitPoints, duration];
                for (let i = 0; i < points.length - 1; i++) {
                    segments.push({
                        start: points[i],
                        end: points[i + 1],
                        name: `${this.originalFileName}_part${i + 1}`
                    });
                }
                break;
        }

        return segments;
    }

    updatePreview() {
        this.segments = this.calculateSegments();
        this.drawWaveform();
        this.updateSegmentsList();
    }

    drawWaveform() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 100;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const duration = this.audioBuffer.duration;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw segments with alternating colors
        const colors = ['rgba(249, 115, 22, 0.2)', 'rgba(251, 146, 60, 0.2)'];
        this.segments.forEach((seg, i) => {
            const x = (seg.start / duration) * width;
            const w = ((seg.end - seg.start) / duration) * width;
            this.ctx.fillStyle = colors[i % 2];
            this.ctx.fillRect(x, 0, w, height);
        });

        // Draw waveform
        const channelData = this.audioBuffer.getChannelData(0);
        const samplesPerPixel = Math.floor(channelData.length / width);
        const centerY = height / 2;

        this.ctx.fillStyle = '#f97316';

        for (let x = 0; x < width; x++) {
            const start = x * samplesPerPixel;
            let max = 0;

            for (let i = 0; i < samplesPerPixel; i++) {
                const sample = Math.abs(channelData[start + i] || 0);
                if (sample > max) max = sample;
            }

            const barHeight = max * height * 0.9;
            this.ctx.fillRect(x, centerY - barHeight / 2, 1, barHeight);
        }

        // Draw split lines
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        for (let i = 1; i < this.segments.length; i++) {
            const x = (this.segments[i].start / duration) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        this.ctx.setLineDash([]);
    }

    updateSegmentsList() {
        const list = document.getElementById('segmentsList');
        list.innerHTML = this.segments.map((seg, i) => `
            <div class="segment-item">
                <div class="segment-name">片段 ${i + 1}</div>
                <div class="segment-info">
                    ${this.formatTime(seg.start)} - ${this.formatTime(seg.end)}<br>
                    時長: ${this.formatTime(seg.end - seg.start)}
                </div>
            </div>
        `).join('');
    }

    async processAudio() {
        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        try {
            const numChannels = this.audioBuffer.numberOfChannels;
            const sampleRate = this.audioBuffer.sampleRate;

            this.processedSegments = [];

            for (let i = 0; i < this.segments.length; i++) {
                const seg = this.segments[i];
                const startSample = Math.floor(seg.start * sampleRate);
                const endSample = Math.floor(seg.end * sampleRate);
                const length = endSample - startSample;

                const segBuffer = this.audioContext.createBuffer(
                    numChannels,
                    length,
                    sampleRate
                );

                for (let ch = 0; ch < numChannels; ch++) {
                    const input = this.audioBuffer.getChannelData(ch);
                    const output = segBuffer.getChannelData(ch);

                    for (let j = 0; j < length; j++) {
                        output[j] = input[startSample + j];
                    }
                }

                let blob;
                if (this.outputFormat === 'mp3') {
                    blob = this.encodeMP3(segBuffer);
                } else {
                    blob = this.encodeWAV(segBuffer);
                }

                this.processedSegments.push({
                    name: seg.name,
                    blob: blob
                });

                const progress = ((i + 1) / this.segments.length) * 100;
                this.progressFill.style.width = progress + '%';
            }

            // Show result
            setTimeout(() => {
                this.progressBar.classList.remove('show');
                this.resultPanel.classList.add('show');
                this.processBtn.disabled = false;
                this.updateDownloadList();
            }, 300);

        } catch (error) {
            console.error('Processing error:', error);
            alert('處理時發生錯誤: ' + error.message);
            this.processBtn.disabled = false;
            this.progressBar.classList.remove('show');
        }
    }

    updateDownloadList() {
        const list = document.getElementById('downloadList');
        const ext = this.outputFormat;

        list.innerHTML = this.processedSegments.map((seg, i) => `
            <div class="download-item">
                <div class="download-item-name">${seg.name}.${ext}</div>
                <button class="download-item-btn" onclick="splitter.downloadSegment(${i})">📥 下載</button>
            </div>
        `).join('');
    }

    downloadSegment(index) {
        const seg = this.processedSegments[index];
        const url = URL.createObjectURL(seg.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${seg.name}.${this.outputFormat}`;
        link.click();
        URL.revokeObjectURL(url);
    }

    async downloadAll() {
        const zip = new JSZip();

        this.processedSegments.forEach(seg => {
            zip.file(`${seg.name}.${this.outputFormat}`, seg.blob);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.originalFileName}_split.zip`;
        link.click();
        URL.revokeObjectURL(url);
    }

    encodeWAV(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const length = buffer.length;
        const bytesPerSample = 2;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = length * blockAlign;
        const headerSize = 44;
        const totalSize = headerSize + dataSize;

        const arrayBuffer = new ArrayBuffer(totalSize);
        const view = new DataView(arrayBuffer);

        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, totalSize - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bytesPerSample * 8, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        let offset = 44;
        const channels = [];
        for (let ch = 0; ch < numChannels; ch++) {
            channels.push(buffer.getChannelData(ch));
        }

        for (let i = 0; i < length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                let sample = channels[ch][i];
                sample = Math.max(-1, Math.min(1, sample));
                const intSample = sample < 0 ? sample * 32768 : sample * 32767;
                view.setInt16(offset, intSample, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    encodeMP3(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const length = buffer.length;

        const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 192);
        const mp3Data = [];

        const left = buffer.getChannelData(0);
        const right = numChannels > 1 ? buffer.getChannelData(1) : left;

        const sampleBlockSize = 1152;
        const leftInt = new Int16Array(sampleBlockSize);
        const rightInt = new Int16Array(sampleBlockSize);

        for (let i = 0; i < length; i += sampleBlockSize) {
            const blockSize = Math.min(sampleBlockSize, length - i);

            for (let j = 0; j < blockSize; j++) {
                leftInt[j] = Math.max(-32768, Math.min(32767, left[i + j] * 32767));
                rightInt[j] = Math.max(-32768, Math.min(32767, right[i + j] * 32767));
            }

            let mp3buf;
            if (numChannels === 1) {
                mp3buf = mp3encoder.encodeBuffer(leftInt.subarray(0, blockSize));
            } else {
                mp3buf = mp3encoder.encodeBuffer(
                    leftInt.subarray(0, blockSize),
                    rightInt.subarray(0, blockSize)
                );
            }

            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }

        const end = mp3encoder.flush();
        if (end.length > 0) {
            mp3Data.push(end);
        }

        return new Blob(mp3Data, { type: 'audio/mp3' });
    }
}

// Initialize
let splitter;
document.addEventListener('DOMContentLoaded', () => {
    splitter = new AudioSplitter();
});
