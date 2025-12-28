/**
 * AUD-045 音頻靜音移除 - Silence Remover
 * Detect and remove/shorten silence regions
 */

class SilenceRemover {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.silenceRegions = [];
        this.threshold = -40;
        this.minSilenceDuration = 500;
        this.mode = 'remove';
        this.keepSilence = 200;
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
        this.settingsPanel = document.getElementById('settingsPanel');
        this.analysisPanel = document.getElementById('analysisPanel');
        this.outputSettings = document.getElementById('outputSettings');
        this.processBtn = document.getElementById('processBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.resultPanel = document.getElementById('resultPanel');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.shortenSettings = document.getElementById('shortenSettings');
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

        // Threshold slider
        document.getElementById('threshold').addEventListener('input', (e) => {
            this.threshold = parseInt(e.target.value);
            document.getElementById('thresholdValue').textContent = this.threshold + ' dB';
            if (this.audioBuffer) this.analyzeSilence();
        });

        // Min silence slider
        document.getElementById('minSilence').addEventListener('input', (e) => {
            this.minSilenceDuration = parseInt(e.target.value);
            document.getElementById('minSilenceValue').textContent = this.minSilenceDuration + ' ms';
            if (this.audioBuffer) this.analyzeSilence();
        });

        // Keep silence slider
        document.getElementById('keepSilence').addEventListener('input', (e) => {
            this.keepSilence = parseInt(e.target.value);
            document.getElementById('keepSilenceValue').textContent = this.keepSilence + ' ms';
            if (this.audioBuffer) this.updateStats();
        });

        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;

                // Show/hide shorten settings
                this.shortenSettings.style.display = this.mode === 'shorten' ? 'block' : 'none';

                if (this.audioBuffer) this.updateStats();
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

        // Resize canvas
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

            // Show panels
            this.fileInfo.classList.add('show');
            this.settingsPanel.classList.add('show');
            this.analysisPanel.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            // Analyze silence
            this.analyzeSilence();

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

    analyzeSilence() {
        const channelData = this.audioBuffer.getChannelData(0);
        const sampleRate = this.audioBuffer.sampleRate;
        const length = channelData.length;

        // Convert threshold from dB to linear
        const thresholdLinear = Math.pow(10, this.threshold / 20);

        // Window size for RMS calculation (10ms)
        const windowSize = Math.floor(sampleRate * 0.01);
        const minSilenceSamples = Math.floor((this.minSilenceDuration / 1000) * sampleRate);

        this.silenceRegions = [];
        let silenceStart = null;

        for (let i = 0; i < length; i += windowSize) {
            // Calculate RMS for window
            let rms = 0;
            const end = Math.min(i + windowSize, length);
            for (let j = i; j < end; j++) {
                rms += channelData[j] * channelData[j];
            }
            rms = Math.sqrt(rms / (end - i));

            const isSilent = rms < thresholdLinear;

            if (isSilent && silenceStart === null) {
                silenceStart = i;
            } else if (!isSilent && silenceStart !== null) {
                const silenceDuration = i - silenceStart;
                if (silenceDuration >= minSilenceSamples) {
                    this.silenceRegions.push({
                        start: silenceStart,
                        end: i,
                        duration: silenceDuration / sampleRate
                    });
                }
                silenceStart = null;
            }
        }

        // Handle trailing silence
        if (silenceStart !== null) {
            const silenceDuration = length - silenceStart;
            if (silenceDuration >= minSilenceSamples) {
                this.silenceRegions.push({
                    start: silenceStart,
                    end: length,
                    duration: silenceDuration / sampleRate
                });
            }
        }

        this.updateStats();
        this.drawWaveform();
    }

    updateStats() {
        const sampleRate = this.audioBuffer.sampleRate;
        const totalDuration = this.audioBuffer.duration;

        // Calculate total silence
        let totalSilence = 0;
        for (const region of this.silenceRegions) {
            totalSilence += region.duration;
        }

        // Calculate output duration based on mode
        let outputDuration;
        if (this.mode === 'remove') {
            outputDuration = totalDuration - totalSilence;
        } else {
            // Shorten mode
            const keepDuration = this.keepSilence / 1000;
            let removedTime = 0;
            for (const region of this.silenceRegions) {
                if (region.duration > keepDuration) {
                    removedTime += region.duration - keepDuration;
                }
            }
            outputDuration = totalDuration - removedTime;
        }

        const savedTime = totalDuration - outputDuration;
        const savedPercent = ((savedTime / totalDuration) * 100).toFixed(1);

        // Update display
        document.getElementById('silenceCount').textContent = this.silenceRegions.length + ' 個';
        document.getElementById('totalSilence').textContent = this.formatTime(totalSilence);
        document.getElementById('outputDuration').textContent = this.formatTime(outputDuration);
        document.getElementById('savedTime').textContent = `${this.formatTime(savedTime)} (${savedPercent}%)`;
    }

    drawWaveform() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 100;

        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Get audio data
        const channelData = this.audioBuffer.getChannelData(0);
        const samplesPerPixel = Math.floor(channelData.length / width);
        const centerY = height / 2;

        // Draw silence regions
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        for (const region of this.silenceRegions) {
            const x = (region.start / channelData.length) * width;
            const w = ((region.end - region.start) / channelData.length) * width;
            this.ctx.fillRect(x, 0, w, height);
        }

        // Draw waveform
        for (let x = 0; x < width; x++) {
            const start = x * samplesPerPixel;
            let max = 0;

            for (let i = 0; i < samplesPerPixel; i++) {
                const sample = Math.abs(channelData[start + i] || 0);
                if (sample > max) max = sample;
            }

            const barHeight = max * height * 0.9;

            // Check if in silence region
            const samplePos = start;
            let inSilence = false;
            for (const region of this.silenceRegions) {
                if (samplePos >= region.start && samplePos < region.end) {
                    inSilence = true;
                    break;
                }
            }

            this.ctx.fillStyle = inSilence ? '#ef4444' : '#06b6d4';
            this.ctx.fillRect(x, centerY - barHeight / 2, 1, barHeight);
        }

        // Draw threshold line (visualization)
        const thresholdLinear = Math.pow(10, this.threshold / 20);
        const thresholdY = height * (1 - thresholdLinear) / 2;
        this.ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, thresholdY);
        this.ctx.lineTo(width, thresholdY);
        this.ctx.moveTo(0, height - thresholdY);
        this.ctx.lineTo(width, height - thresholdY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    async processAudio() {
        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        try {
            const numChannels = this.audioBuffer.numberOfChannels;
            const sampleRate = this.audioBuffer.sampleRate;
            const originalLength = this.audioBuffer.length;
            const keepSamples = Math.floor((this.keepSilence / 1000) * sampleRate);

            // Build list of regions to keep
            const keepRegions = [];
            let lastEnd = 0;

            for (const silence of this.silenceRegions) {
                // Add region before silence
                if (silence.start > lastEnd) {
                    keepRegions.push({
                        start: lastEnd,
                        end: silence.start,
                        type: 'audio'
                    });
                }

                // Add shortened silence if in shorten mode
                if (this.mode === 'shorten') {
                    const silenceLength = silence.end - silence.start;
                    if (silenceLength > keepSamples) {
                        keepRegions.push({
                            start: silence.start,
                            end: silence.start + keepSamples,
                            type: 'silence'
                        });
                    } else {
                        keepRegions.push({
                            start: silence.start,
                            end: silence.end,
                            type: 'silence'
                        });
                    }
                }

                lastEnd = silence.end;
            }

            // Add remaining audio after last silence
            if (lastEnd < originalLength) {
                keepRegions.push({
                    start: lastEnd,
                    end: originalLength,
                    type: 'audio'
                });
            }

            // Calculate output length
            let outputLength = 0;
            for (const region of keepRegions) {
                outputLength += region.end - region.start;
            }

            // Create output buffer
            this.processedBuffer = this.audioContext.createBuffer(
                numChannels,
                outputLength,
                sampleRate
            );

            // Copy audio data
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);
                let outputIndex = 0;

                for (const region of keepRegions) {
                    for (let i = region.start; i < region.end; i++) {
                        output[outputIndex++] = input[i];

                        // Update progress
                        if (outputIndex % 10000 === 0) {
                            const progress = ((ch * outputLength + outputIndex) / (numChannels * outputLength)) * 100;
                            this.progressFill.style.width = progress + '%';
                        }
                    }
                }
            }

            this.progressFill.style.width = '100%';

            // Calculate stats for result
            const originalDuration = this.audioBuffer.duration;
            const newDuration = this.processedBuffer.duration;
            const savedTime = originalDuration - newDuration;
            const savedPercent = ((savedTime / originalDuration) * 100).toFixed(1);

            document.getElementById('resultStats').textContent =
                `原始: ${this.formatTime(originalDuration)} → 處理後: ${this.formatTime(newDuration)} (節省 ${savedPercent}%)`;

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
        link.download = `${this.originalFileName}_trimmed.${extension}`;
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
    new SilenceRemover();
});
