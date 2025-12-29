/**
 * AUD-048 音頻循環 - Audio Looper
 * Repeat audio segments with optional gap and fade
 */

class AudioLooper {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.loopCount = 4;
        this.gapDuration = 0;
        this.fadeDuration = 0;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        this.canvas = document.getElementById('loopCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.previewSection = document.getElementById('previewSection');
        this.outputSettings = document.getElementById('outputSettings');
        this.processBtn = document.getElementById('processBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.resultPanel = document.getElementById('resultPanel');
        this.downloadBtn = document.getElementById('downloadBtn');
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

        // Loop count slider
        document.getElementById('loopCount').addEventListener('input', (e) => {
            this.loopCount = parseInt(e.target.value);
            document.getElementById('loopCountValue').textContent = this.loopCount + ' 次';
            this.updatePresets();
            if (this.audioBuffer) this.updatePreview();
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loopCount = parseInt(btn.dataset.count);
                document.getElementById('loopCount').value = this.loopCount;
                document.getElementById('loopCountValue').textContent = this.loopCount + ' 次';
                this.updatePresets();
                if (this.audioBuffer) this.updatePreview();
            });
        });

        // Gap duration slider
        document.getElementById('gapDuration').addEventListener('input', (e) => {
            this.gapDuration = parseFloat(e.target.value);
            document.getElementById('gapValue').textContent = this.gapDuration.toFixed(1) + ' 秒';
            if (this.audioBuffer) this.updatePreview();
        });

        // Fade duration slider
        document.getElementById('fadeDuration').addEventListener('input', (e) => {
            this.fadeDuration = parseFloat(e.target.value);
            document.getElementById('fadeValue').textContent = this.fadeDuration.toFixed(1) + ' 秒';
            if (this.audioBuffer) this.updatePreview();
        });

        // Format buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.outputFormat = btn.dataset.format;
            });
        });

        // Process button
        this.processBtn.addEventListener('click', () => this.processAudio());

        // Download button
        this.downloadBtn.addEventListener('click', () => this.downloadAudio());

        // Resize
        window.addEventListener('resize', () => {
            if (this.audioBuffer) this.drawPreview();
        });
    }

    updatePresets() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.count) === this.loopCount);
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

            // Show panels
            this.fileInfo.classList.add('show');
            this.settingsPanel.classList.add('show');
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
        const secs = (seconds % 60).toFixed(2);
        return `${mins}:${secs.padStart(5, '0')}`;
    }

    calculateOutputDuration() {
        const audioDuration = this.audioBuffer.duration;
        const totalGaps = (this.loopCount - 1) * this.gapDuration;
        return (audioDuration * this.loopCount) + totalGaps;
    }

    updatePreview() {
        const originalDuration = this.audioBuffer.duration;
        const outputDuration = this.calculateOutputDuration();
        const multiplier = outputDuration / originalDuration;

        document.getElementById('originalDuration').textContent = this.formatTime(originalDuration);
        document.getElementById('totalLoops').textContent = this.loopCount + ' 次';
        document.getElementById('outputDuration').textContent = this.formatTime(outputDuration);
        document.getElementById('multiplier').textContent = multiplier.toFixed(1) + 'x';

        this.drawPreview();
    }

    drawPreview() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 80;

        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        const outputDuration = this.calculateOutputDuration();
        const audioDuration = this.audioBuffer.duration;

        // Draw each loop
        const colors = ['#d946ef', '#e879f9', '#f0abfc'];
        let currentTime = 0;

        for (let i = 0; i < this.loopCount; i++) {
            const x = (currentTime / outputDuration) * width;
            const w = (audioDuration / outputDuration) * width;

            // Draw audio block
            const gradient = this.ctx.createLinearGradient(x, 0, x + w, 0);
            gradient.addColorStop(0, colors[i % colors.length]);
            gradient.addColorStop(1, colors[(i + 1) % colors.length]);
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, 15, w, height - 30);

            // Draw loop number
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            if (w > 30) {
                this.ctx.fillText(`${i + 1}`, x + w / 2, height / 2);
            }

            currentTime += audioDuration + this.gapDuration;
        }

        // Draw gap indicators
        if (this.gapDuration > 0) {
            this.ctx.fillStyle = 'rgba(250, 204, 21, 0.3)';
            currentTime = audioDuration;

            for (let i = 0; i < this.loopCount - 1; i++) {
                const x = (currentTime / outputDuration) * width;
                const w = (this.gapDuration / outputDuration) * width;
                this.ctx.fillRect(x, 20, w, height - 40);
                currentTime += audioDuration + this.gapDuration;
            }
        }
    }

    async processAudio() {
        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        try {
            const numChannels = this.audioBuffer.numberOfChannels;
            const sampleRate = this.audioBuffer.sampleRate;
            const originalLength = this.audioBuffer.length;
            const gapSamples = Math.floor(this.gapDuration * sampleRate);
            const fadeSamples = Math.floor(this.fadeDuration * sampleRate);

            // Calculate output length
            const totalLength = (originalLength * this.loopCount) + (gapSamples * (this.loopCount - 1));

            // Create output buffer
            this.processedBuffer = this.audioContext.createBuffer(
                numChannels,
                totalLength,
                sampleRate
            );

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);
                let outputIndex = 0;

                for (let loop = 0; loop < this.loopCount; loop++) {
                    // Copy audio data
                    for (let i = 0; i < originalLength; i++) {
                        let sample = input[i];

                        // Apply fade in
                        if (this.fadeDuration > 0 && i < fadeSamples) {
                            sample *= i / fadeSamples;
                        }

                        // Apply fade out
                        if (this.fadeDuration > 0 && i >= originalLength - fadeSamples) {
                            sample *= (originalLength - i) / fadeSamples;
                        }

                        output[outputIndex++] = sample;

                        // Update progress
                        if (outputIndex % 50000 === 0) {
                            const progress = (outputIndex / totalLength) * 100;
                            this.progressFill.style.width = progress + '%';
                        }
                    }

                    // Add gap (silence)
                    if (loop < this.loopCount - 1) {
                        for (let i = 0; i < gapSamples; i++) {
                            output[outputIndex++] = 0;
                        }
                    }
                }
            }

            this.progressFill.style.width = '100%';

            // Update result info
            document.getElementById('resultInfo').textContent =
                `${this.loopCount} 次循環 | 總時長: ${this.formatTime(this.processedBuffer.duration)}`;

            // Show result
            setTimeout(() => {
                this.progressBar.classList.remove('show');
                this.resultPanel.classList.add('show');
                this.processBtn.disabled = false;
            }, 300);

        } catch (error) {
            console.error('Processing error:', error);
            alert('處理時發生錯誤: ' + error.message);
            this.processBtn.disabled = false;
            this.progressBar.classList.remove('show');
        }
    }

    downloadAudio() {
        if (!this.processedBuffer) return;

        let blob;
        let extension;

        if (this.outputFormat === 'mp3') {
            blob = this.encodeMP3(this.processedBuffer);
            extension = 'mp3';
        } else {
            blob = this.encodeWAV(this.processedBuffer);
            extension = 'wav';
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.originalFileName}_loop${this.loopCount}x.${extension}`;
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
document.addEventListener('DOMContentLoaded', () => {
    new AudioLooper();
});
