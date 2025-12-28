/**
 * AUD-053 音頻限制器 - Audio Limiter
 * Brick-wall limiter with lookahead
 */

class AudioLimiter {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Limiter parameters
        this.ceiling = -0.3;    // dB
        this.threshold = -6;    // dB
        this.release = 100;     // ms
        this.lookahead = 5;     // ms

        // Analysis
        this.originalPeakDb = 0;
        this.limitedPeakDb = 0;
        this.maxGainReduction = 0;
        this.limitedSamples = 0;

        this.canvas = document.getElementById('limiterCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.limiterPanel = document.getElementById('limiterPanel');
        this.meterSection = document.getElementById('meterSection');
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

        // Control sliders
        document.getElementById('ceiling').addEventListener('input', (e) => {
            this.ceiling = parseFloat(e.target.value);
            document.getElementById('ceilingValue').textContent = this.ceiling.toFixed(1) + ' dB';
        });

        document.getElementById('threshold').addEventListener('input', (e) => {
            this.threshold = parseFloat(e.target.value);
            document.getElementById('thresholdValue').textContent = this.threshold.toFixed(1) + ' dB';
        });

        document.getElementById('release').addEventListener('input', (e) => {
            this.release = parseInt(e.target.value);
            document.getElementById('releaseValue').textContent = this.release + ' ms';
        });

        document.getElementById('lookahead').addEventListener('input', (e) => {
            this.lookahead = parseFloat(e.target.value);
            document.getElementById('lookaheadValue').textContent = this.lookahead.toFixed(1) + ' ms';
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
            this.analyzeOriginal();

            // Show panels
            this.infoPanel.classList.add('show');
            this.limiterPanel.classList.add('show');
            this.meterSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawWaveform();

        } catch (error) {
            console.error('Error loading audio:', error);
            alert('無法載入音頻文件: ' + error.message);
        }
    }

    updateFileInfo(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('duration').textContent = this.formatTime(this.audioBuffer.duration);
        document.getElementById('sampleRate').textContent = this.audioBuffer.sampleRate + ' Hz';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(2);
        return `${mins}:${secs.padStart(5, '0')}`;
    }

    analyzeOriginal() {
        const data = this.audioBuffer.getChannelData(0);
        let maxAbs = 0;

        for (let i = 0; i < data.length; i++) {
            maxAbs = Math.max(maxAbs, Math.abs(data[i]));
        }

        this.originalPeakDb = 20 * Math.log10(maxAbs || 0.001);
        document.getElementById('originalPeak').textContent = this.originalPeakDb.toFixed(1) + ' dB';
    }

    drawWaveform() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 40;
        this.canvas.height = 120;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const data = this.audioBuffer.getChannelData(0);

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw threshold line
        const thresholdY = height / 2 - (Math.pow(10, this.threshold / 20) * height / 2);
        const thresholdY2 = height / 2 + (Math.pow(10, this.threshold / 20) * height / 2);

        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        this.ctx.fillRect(0, 0, width, thresholdY);
        this.ctx.fillRect(0, thresholdY2, width, height - thresholdY2);

        // Draw center line
        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, height / 2);
        this.ctx.lineTo(width, height / 2);
        this.ctx.stroke();

        // Draw threshold lines
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, thresholdY);
        this.ctx.lineTo(width, thresholdY);
        this.ctx.moveTo(0, thresholdY2);
        this.ctx.lineTo(width, thresholdY2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw waveform
        const step = Math.ceil(data.length / width);
        this.ctx.strokeStyle = '#fca5a5';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        for (let i = 0; i < width; i++) {
            let min = 1, max = -1;

            for (let j = 0; j < step; j++) {
                const idx = i * step + j;
                if (idx < data.length) {
                    min = Math.min(min, data[idx]);
                    max = Math.max(max, data[idx]);
                }
            }

            const y1 = height / 2 - max * height / 2;
            const y2 = height / 2 - min * height / 2;

            if (i === 0) {
                this.ctx.moveTo(i, y1);
            }
            this.ctx.lineTo(i, y1);
            this.ctx.lineTo(i, y2);
        }

        this.ctx.stroke();
    }

    async processAudio() {
        if (!this.audioBuffer) return;

        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        try {
            const numChannels = this.audioBuffer.numberOfChannels;
            const sampleRate = this.audioBuffer.sampleRate;
            const length = this.audioBuffer.length;

            this.processedBuffer = this.audioContext.createBuffer(
                numChannels,
                length,
                sampleRate
            );

            // Convert parameters
            const ceilingLinear = Math.pow(10, this.ceiling / 20);
            const thresholdLinear = Math.pow(10, this.threshold / 20);
            const releaseCoeff = Math.exp(-1 / (this.release * sampleRate / 1000));
            const lookaheadSamples = Math.floor(this.lookahead * sampleRate / 1000);

            this.maxGainReduction = 0;
            this.limitedSamples = 0;
            let maxOutputLevel = 0;

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                // Lookahead buffer
                const lookBuffer = new Float32Array(lookaheadSamples);
                let lookIndex = 0;

                // Gain envelope
                let gainEnvelope = 1;

                for (let i = 0; i < length; i++) {
                    const inputSample = input[i];

                    // Store in lookahead buffer
                    lookBuffer[lookIndex] = inputSample;
                    lookIndex = (lookIndex + 1) % lookaheadSamples;

                    // Find peak in lookahead window
                    let peakLevel = 0;
                    for (let j = 0; j < lookaheadSamples; j++) {
                        peakLevel = Math.max(peakLevel, Math.abs(lookBuffer[j]));
                    }

                    // Also consider current sample
                    peakLevel = Math.max(peakLevel, Math.abs(inputSample));

                    // Calculate target gain
                    let targetGain = 1;
                    if (peakLevel > thresholdLinear) {
                        // Calculate gain needed to bring peak to ceiling
                        targetGain = ceilingLinear / peakLevel;
                        this.limitedSamples++;
                    }

                    // Apply envelope (attack is instant, release is smooth)
                    if (targetGain < gainEnvelope) {
                        // Attack - instant
                        gainEnvelope = targetGain;
                    } else {
                        // Release - smooth
                        gainEnvelope = releaseCoeff * gainEnvelope + (1 - releaseCoeff) * targetGain;
                    }

                    // Track max gain reduction
                    const grDb = 20 * Math.log10(gainEnvelope);
                    this.maxGainReduction = Math.min(this.maxGainReduction, grDb);

                    // Apply gain
                    const outputSample = inputSample * gainEnvelope;
                    output[i] = outputSample;

                    // Track max output
                    maxOutputLevel = Math.max(maxOutputLevel, Math.abs(outputSample));

                    // Progress update
                    if (i % 50000 === 0) {
                        const progress = ((ch + i / length) / numChannels) * 100;
                        this.progressFill.style.width = progress + '%';
                    }
                }
            }

            this.limitedPeakDb = 20 * Math.log10(maxOutputLevel || 0.001);
            this.progressFill.style.width = '100%';

            // Update stats
            document.getElementById('limitedPeak').textContent = this.limitedPeakDb.toFixed(1) + ' dB';
            document.getElementById('maxGR').textContent = this.maxGainReduction.toFixed(1) + ' dB';

            // Update result
            document.getElementById('resultOrigPeak').textContent = this.originalPeakDb.toFixed(1) + ' dB';
            document.getElementById('resultNewPeak').textContent = this.limitedPeakDb.toFixed(1) + ' dB';
            document.getElementById('resultLimited').textContent =
                ((this.limitedSamples / this.audioBuffer.length) * 100).toFixed(2) + '%';

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
        link.download = `${this.originalFileName}_limited.${extension}`;
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
    new AudioLimiter();
});
