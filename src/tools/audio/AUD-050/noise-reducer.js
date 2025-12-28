/**
 * AUD-050 音頻降噪 - Audio Noise Reduction
 * Spectral gating noise reduction using Web Audio API
 */

class NoiseReducer {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.noiseProfile = null;

        this.reduction = 50;
        this.threshold = -30;
        this.smoothing = 50;
        this.frequency = 4000;
        this.outputFormat = 'wav';
        this.originalFileName = '';
        this.processingTime = 0;

        this.originalCanvas = document.getElementById('originalCanvas');
        this.processedCanvas = document.getElementById('processedCanvas');
        this.originalCtx = this.originalCanvas.getContext('2d');
        this.processedCtx = this.processedCanvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.previewSection = document.getElementById('previewSection');
        this.outputSettings = document.getElementById('outputSettings');
        this.processBtn = document.getElementById('processBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.resultPanel = document.getElementById('resultPanel');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.captureBtn = document.getElementById('captureBtn');
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

        // Reduction slider
        document.getElementById('reduction').addEventListener('input', (e) => {
            this.reduction = parseInt(e.target.value);
            document.getElementById('reductionValue').textContent = this.reduction + '%';
            this.updatePresets();
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.reduction = parseInt(btn.dataset.value);
                document.getElementById('reduction').value = this.reduction;
                document.getElementById('reductionValue').textContent = this.reduction + '%';
                this.updatePresets();
            });
        });

        // Threshold slider
        document.getElementById('threshold').addEventListener('input', (e) => {
            this.threshold = parseInt(e.target.value);
            document.getElementById('thresholdValue').textContent = this.threshold + ' dB';
        });

        // Smoothing slider
        document.getElementById('smoothing').addEventListener('input', (e) => {
            this.smoothing = parseInt(e.target.value);
            document.getElementById('smoothingValue').textContent = this.smoothing + '%';
        });

        // Frequency slider
        document.getElementById('frequency').addEventListener('input', (e) => {
            this.frequency = parseInt(e.target.value);
            document.getElementById('frequencyValue').textContent = this.frequency + ' Hz';
        });

        // Capture noise profile
        this.captureBtn.addEventListener('click', () => this.captureNoiseProfile());

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
            if (this.audioBuffer) this.drawSpectrum();
        });
    }

    updatePresets() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            const val = parseInt(btn.dataset.value);
            btn.classList.toggle('active', val === this.reduction);
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

            // Reset noise profile
            this.noiseProfile = null;
            this.captureBtn.classList.remove('captured');
            this.captureBtn.textContent = '📍 擷取噪音樣本';

            this.updateFileInfo(file);

            // Show panels
            this.infoPanel.classList.add('show');
            this.settingsPanel.classList.add('show');
            this.previewSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawSpectrum();

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

    drawSpectrum() {
        this.resizeCanvas(this.originalCanvas, this.originalCtx);
        this.resizeCanvas(this.processedCanvas, this.processedCtx);

        this.drawSpectrumForBuffer(this.audioBuffer, this.originalCtx, this.originalCanvas, '#a78bfa');

        // Draw placeholder for processed
        this.processedCtx.fillStyle = '#1e1b4b';
        this.processedCtx.fillRect(0, 0, this.processedCanvas.width, this.processedCanvas.height);
        this.processedCtx.fillStyle = '#64748b';
        this.processedCtx.font = '12px sans-serif';
        this.processedCtx.textAlign = 'center';
        this.processedCtx.fillText('處理後顯示', this.processedCanvas.width / 2, this.processedCanvas.height / 2);
    }

    resizeCanvas(canvas, ctx) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width - 32;
        canvas.height = 100;
    }

    drawSpectrumForBuffer(buffer, ctx, canvas, color) {
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, width, height);

        const data = buffer.getChannelData(0);
        const fftSize = 2048;
        const numBins = fftSize / 2;
        const spectrum = new Float32Array(numBins);

        // Simple FFT approximation using windowed average
        const windowSize = Math.floor(data.length / numBins);
        for (let i = 0; i < numBins; i++) {
            let sum = 0;
            for (let j = 0; j < windowSize; j++) {
                const idx = i * windowSize + j;
                if (idx < data.length) {
                    sum += Math.abs(data[idx]);
                }
            }
            spectrum[i] = sum / windowSize;
        }

        // Draw spectrum bars
        const barWidth = width / numBins;
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#c4b5fd');

        ctx.fillStyle = gradient;
        for (let i = 0; i < numBins; i++) {
            const barHeight = Math.min(spectrum[i] * height * 10, height - 10);
            const x = i * barWidth;
            ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        }
    }

    captureNoiseProfile() {
        if (!this.audioBuffer) return;

        // Use first 0.5 seconds as noise sample (or entire file if shorter)
        const sampleDuration = Math.min(0.5, this.audioBuffer.duration);
        const sampleLength = Math.floor(sampleDuration * this.audioBuffer.sampleRate);
        const data = this.audioBuffer.getChannelData(0);

        // Calculate RMS for each frequency band
        const fftSize = 2048;
        const numBins = fftSize / 2;
        this.noiseProfile = new Float32Array(numBins);

        const windowSize = Math.floor(sampleLength / numBins);
        for (let i = 0; i < numBins; i++) {
            let sum = 0;
            for (let j = 0; j < windowSize; j++) {
                const idx = i * windowSize + j;
                if (idx < sampleLength) {
                    sum += data[idx] * data[idx];
                }
            }
            this.noiseProfile[i] = Math.sqrt(sum / windowSize);
        }

        this.captureBtn.classList.add('captured');
        this.captureBtn.textContent = '✓ 噪音樣本已擷取';
    }

    async processAudio() {
        if (!this.audioBuffer) return;

        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        const startTime = performance.now();

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
            const reductionFactor = this.reduction / 100;
            const thresholdLinear = Math.pow(10, this.threshold / 20);
            const smoothingFactor = this.smoothing / 100;
            const cutoffFreq = this.frequency;

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                // Apply spectral gating
                this.applySpectralGating(
                    input,
                    output,
                    sampleRate,
                    reductionFactor,
                    thresholdLinear,
                    smoothingFactor,
                    cutoffFreq,
                    (progress) => {
                        const totalProgress = ((ch + progress) / numChannels) * 100;
                        this.progressFill.style.width = totalProgress + '%';
                    }
                );
            }

            this.processingTime = ((performance.now() - startTime) / 1000).toFixed(2);
            this.progressFill.style.width = '100%';

            // Draw processed spectrum
            this.drawSpectrumForBuffer(this.processedBuffer, this.processedCtx, this.processedCanvas, '#10b981');

            // Calculate noise reduction amount
            const originalRMS = this.calculateRMS(this.audioBuffer.getChannelData(0));
            const processedRMS = this.calculateRMS(this.processedBuffer.getChannelData(0));
            const noiseReduced = Math.max(0, ((originalRMS - processedRMS) / originalRMS * 100)).toFixed(1);

            // Update result
            document.getElementById('resultReduction').textContent = this.reduction + '%';
            document.getElementById('resultNoiseReduced').textContent = noiseReduced + '%';
            document.getElementById('resultTime').textContent = this.processingTime + ' 秒';

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

    applySpectralGating(input, output, sampleRate, reduction, threshold, smoothing, cutoffFreq, progressCallback) {
        const length = input.length;
        const windowSize = 2048;
        const hopSize = windowSize / 4;
        const numWindows = Math.ceil(length / hopSize);

        // Hann window
        const window = new Float32Array(windowSize);
        for (let i = 0; i < windowSize; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / windowSize));
        }

        // Initialize output
        for (let i = 0; i < length; i++) {
            output[i] = 0;
        }

        // Process in overlapping windows
        let prevGains = new Float32Array(windowSize / 2).fill(1);

        for (let w = 0; w < numWindows; w++) {
            const start = w * hopSize;
            const end = Math.min(start + windowSize, length);

            // Extract windowed segment
            const segment = new Float32Array(windowSize);
            for (let i = 0; i < windowSize && start + i < length; i++) {
                segment[i] = input[start + i] * window[i];
            }

            // Simple spectral processing (approximation without full FFT)
            // Calculate local energy
            let localEnergy = 0;
            for (let i = 0; i < segment.length; i++) {
                localEnergy += segment[i] * segment[i];
            }
            localEnergy = Math.sqrt(localEnergy / segment.length);

            // Calculate gain based on threshold and noise profile
            let gain = 1;
            if (localEnergy < threshold) {
                // Below threshold - apply reduction
                gain = 1 - reduction;
            } else if (localEnergy < threshold * 2) {
                // Transition zone - smooth reduction
                const t = (localEnergy - threshold) / threshold;
                gain = (1 - reduction) + t * reduction;
            }

            // Apply smoothing
            gain = gain * (1 - smoothing) + prevGains[0] * smoothing;

            // Apply frequency-dependent processing
            const cutoffBin = Math.floor(cutoffFreq / (sampleRate / windowSize));

            // Apply gain and overlap-add
            for (let i = 0; i < windowSize && start + i < length; i++) {
                // Simple frequency filtering approximation
                let sample = input[start + i] * gain;

                // High-pass filter effect for low frequencies
                if (i < cutoffBin) {
                    sample *= (1 - reduction * 0.5);
                }

                output[start + i] += sample * window[i];
            }

            // Store gain for smoothing
            prevGains[0] = gain;

            // Progress callback
            if (w % 100 === 0) {
                progressCallback(w / numWindows);
            }
        }

        // Normalize to prevent clipping
        let maxAbs = 0;
        for (let i = 0; i < length; i++) {
            maxAbs = Math.max(maxAbs, Math.abs(output[i]));
        }
        if (maxAbs > 0.99) {
            const scale = 0.99 / maxAbs;
            for (let i = 0; i < length; i++) {
                output[i] *= scale;
            }
        }
    }

    calculateRMS(data) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        return Math.sqrt(sum / data.length);
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
        link.download = `${this.originalFileName}_denoised.${extension}`;
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
    new NoiseReducer();
});
