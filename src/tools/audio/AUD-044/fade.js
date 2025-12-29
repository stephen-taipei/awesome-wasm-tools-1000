/**
 * AUD-044 音頻淡入淡出 - Audio Fade Effect
 * Fade in/out with multiple curve types
 */

class AudioFader {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.fadeInDuration = 2;
        this.fadeOutDuration = 3;
        this.fadeInCurve = 'linear';
        this.fadeOutCurve = 'linear';
        this.outputFormat = 'wav';
        this.originalFileName = '';

        this.waveformCanvas = document.getElementById('waveformCanvas');
        this.waveformCtx = this.waveformCanvas.getContext('2d');
        this.fadeInCurveCanvas = document.getElementById('fadeInCurve');
        this.fadeInCurveCtx = this.fadeInCurveCanvas.getContext('2d');
        this.fadeOutCurveCanvas = document.getElementById('fadeOutCurve');
        this.fadeOutCurveCtx = this.fadeOutCurveCanvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.fadeControls = document.getElementById('fadeControls');
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

        // Fade duration sliders
        document.getElementById('fadeInDuration').addEventListener('input', (e) => {
            this.fadeInDuration = parseFloat(e.target.value);
            document.getElementById('fadeInValue').textContent = this.fadeInDuration.toFixed(1) + ' 秒';
            this.updatePreviews();
        });

        document.getElementById('fadeOutDuration').addEventListener('input', (e) => {
            this.fadeOutDuration = parseFloat(e.target.value);
            document.getElementById('fadeOutValue').textContent = this.fadeOutDuration.toFixed(1) + ' 秒';
            this.updatePreviews();
        });

        // Curve buttons
        document.querySelectorAll('.curve-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const curve = e.target.dataset.curve;

                // Update active state
                document.querySelectorAll(`.curve-btn[data-type="${type}"]`).forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');

                // Update curve type
                if (type === 'in') {
                    this.fadeInCurve = curve;
                } else {
                    this.fadeOutCurve = curve;
                }

                this.updatePreviews();
            });
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

        // Resize canvases
        window.addEventListener('resize', () => this.resizeCanvases());
    }

    resizeCanvases() {
        if (this.audioBuffer) {
            this.updatePreviews();
        }
    }

    async handleFile(file) {
        if (!file || !file.type.startsWith('audio/')) {
            alert('請選擇有效的音頻文件');
            return;
        }

        try {
            // Initialize audio context
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            this.originalFileName = file.name.replace(/\.[^/.]+$/, '');

            // Decode audio
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Update file info
            this.updateFileInfo(file);

            // Update max fade durations based on audio length
            const maxDuration = Math.min(30, this.audioBuffer.duration / 2);
            document.getElementById('fadeInDuration').max = maxDuration;
            document.getElementById('fadeOutDuration').max = maxDuration;

            // Show panels
            this.fileInfo.classList.add('show');
            this.fadeControls.classList.add('show');
            this.previewSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            // Draw previews
            this.updatePreviews();

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

    getCurveValue(progress, curveType, isFadeIn) {
        let value;

        switch (curveType) {
            case 'linear':
                value = progress;
                break;
            case 'exponential':
                value = isFadeIn ? progress * progress : 1 - (1 - progress) * (1 - progress);
                break;
            case 'logarithmic':
                value = isFadeIn ? Math.sqrt(progress) : 1 - Math.sqrt(1 - progress);
                break;
            case 'sine':
                value = isFadeIn
                    ? Math.sin(progress * Math.PI / 2)
                    : 1 - Math.sin((1 - progress) * Math.PI / 2);
                break;
            default:
                value = progress;
        }

        return isFadeIn ? value : value;
    }

    updatePreviews() {
        if (!this.audioBuffer) return;

        this.drawWaveform();
        this.drawCurve(this.fadeInCurveCanvas, this.fadeInCurveCtx, this.fadeInCurve, true);
        this.drawCurve(this.fadeOutCurveCanvas, this.fadeOutCurveCtx, this.fadeOutCurve, false);
    }

    drawWaveform() {
        const canvas = this.waveformCanvas;
        const ctx = this.waveformCtx;
        const rect = canvas.parentElement.getBoundingClientRect();

        canvas.width = rect.width - 48;
        canvas.height = 120;

        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        // Get audio data
        const channelData = this.audioBuffer.getChannelData(0);
        const samplesPerPixel = Math.floor(channelData.length / width);
        const duration = this.audioBuffer.duration;

        // Calculate fade regions
        const fadeInWidth = (this.fadeInDuration / duration) * width;
        const fadeOutWidth = (this.fadeOutDuration / duration) * width;
        const fadeOutStart = width - fadeOutWidth;

        // Draw fade regions
        const fadeInGradient = ctx.createLinearGradient(0, 0, fadeInWidth, 0);
        fadeInGradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
        fadeInGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = fadeInGradient;
        ctx.fillRect(0, 0, fadeInWidth, height);

        const fadeOutGradient = ctx.createLinearGradient(fadeOutStart, 0, width, 0);
        fadeOutGradient.addColorStop(0, 'rgba(168, 85, 247, 0)');
        fadeOutGradient.addColorStop(1, 'rgba(168, 85, 247, 0.3)');
        ctx.fillStyle = fadeOutGradient;
        ctx.fillRect(fadeOutStart, 0, fadeOutWidth, height);

        // Draw waveform
        const centerY = height / 2;

        for (let x = 0; x < width; x++) {
            const start = x * samplesPerPixel;
            let max = 0;

            for (let i = 0; i < samplesPerPixel; i++) {
                const sample = Math.abs(channelData[start + i] || 0);
                if (sample > max) max = sample;
            }

            // Apply fade preview
            let fade = 1;
            if (x < fadeInWidth) {
                const progress = x / fadeInWidth;
                fade = this.getCurveValue(progress, this.fadeInCurve, true);
            } else if (x > fadeOutStart) {
                const progress = (x - fadeOutStart) / fadeOutWidth;
                fade = 1 - this.getCurveValue(progress, this.fadeOutCurve, false);
            }

            const barHeight = max * height * 0.8 * fade;
            const y = centerY - barHeight / 2;

            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, '#a855f7');
            gradient.addColorStop(0.5, '#c084fc');
            gradient.addColorStop(1, '#a855f7');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, 1, barHeight);
        }

        // Draw center line
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
    }

    drawCurve(canvas, ctx, curveType, isFadeIn) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width - 32;
        canvas.height = 80;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 10;

        // Clear
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (i / 4) * (height - 2 * padding);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw curve
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let x = 0; x <= width - 2 * padding; x++) {
            const progress = x / (width - 2 * padding);
            let value = this.getCurveValue(progress, curveType, isFadeIn);

            if (!isFadeIn) {
                value = 1 - this.getCurveValue(progress, curveType, true);
            }

            const canvasX = padding + x;
            const canvasY = height - padding - value * (height - 2 * padding);

            if (x === 0) {
                ctx.moveTo(canvasX, canvasY);
            } else {
                ctx.lineTo(canvasX, canvasY);
            }
        }

        ctx.stroke();

        // Fill under curve
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
        ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.fill();
    }

    async processAudio() {
        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        try {
            const numChannels = this.audioBuffer.numberOfChannels;
            const sampleRate = this.audioBuffer.sampleRate;
            const length = this.audioBuffer.length;

            // Create output buffer
            this.processedBuffer = this.audioContext.createBuffer(
                numChannels,
                length,
                sampleRate
            );

            // Calculate fade samples
            const fadeInSamples = Math.floor(this.fadeInDuration * sampleRate);
            const fadeOutSamples = Math.floor(this.fadeOutDuration * sampleRate);
            const fadeOutStart = length - fadeOutSamples;

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                for (let i = 0; i < length; i++) {
                    let sample = input[i];
                    let fade = 1;

                    // Apply fade in
                    if (i < fadeInSamples) {
                        const progress = i / fadeInSamples;
                        fade = this.getCurveValue(progress, this.fadeInCurve, true);
                    }

                    // Apply fade out
                    if (i >= fadeOutStart) {
                        const progress = (i - fadeOutStart) / fadeOutSamples;
                        fade *= 1 - this.getCurveValue(progress, this.fadeOutCurve, true);
                    }

                    output[i] = sample * fade;

                    // Update progress
                    if (i % 10000 === 0) {
                        const progress = ((ch * length + i) / (numChannels * length)) * 100;
                        this.progressFill.style.width = progress + '%';
                    }
                }
            }

            this.progressFill.style.width = '100%';

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
        link.download = `${this.originalFileName}_faded.${extension}`;
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
    new AudioFader();
});
