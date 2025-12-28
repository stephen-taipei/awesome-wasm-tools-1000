/**
 * AUD-051 音頻均衡器 - Audio Equalizer
 * 10-band graphic equalizer with presets
 */

class AudioEqualizer {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // 10-band frequencies (Hz)
        this.bands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        this.gains = new Array(10).fill(0); // -12 to +12 dB

        // Presets
        this.presets = {
            flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            bass: [8, 7, 5, 2, 0, 0, 0, 0, 0, 0],
            treble: [0, 0, 0, 0, 0, 2, 4, 6, 8, 9],
            vocal: [-2, -1, 0, 2, 5, 5, 4, 2, 0, -1],
            rock: [5, 4, 2, 0, -1, 0, 2, 4, 5, 5],
            pop: [1, 3, 5, 4, 2, 0, 1, 2, 3, 3],
            jazz: [3, 2, 0, 1, -1, -1, 0, 2, 3, 4],
            classical: [4, 3, 2, 1, 0, 0, 0, 2, 3, 4]
        };

        this.canvas = document.getElementById('spectrumCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.initEQSliders();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.eqPanel = document.getElementById('eqPanel');
        this.visualizerSection = document.getElementById('visualizerSection');
        this.outputSettings = document.getElementById('outputSettings');
        this.processBtn = document.getElementById('processBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.resultPanel = document.getElementById('resultPanel');
        this.downloadBtn = document.getElementById('downloadBtn');
    }

    initEQSliders() {
        const container = document.getElementById('eqSliders');
        container.innerHTML = '';

        this.bands.forEach((freq, index) => {
            const bandEl = document.createElement('div');
            bandEl.className = 'eq-band';

            const label = freq >= 1000 ? `${freq / 1000}k` : freq;

            bandEl.innerHTML = `
                <span class="band-value" id="bandValue${index}">0 dB</span>
                <div class="band-slider">
                    <div class="zero-line"></div>
                    <input type="range" min="-12" max="12" value="0"
                           data-band="${index}" id="band${index}">
                </div>
                <span class="band-label">${label} Hz</span>
            `;

            container.appendChild(bandEl);
        });
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

        // EQ sliders
        this.bands.forEach((_, index) => {
            const slider = document.getElementById(`band${index}`);
            slider.addEventListener('input', (e) => {
                this.gains[index] = parseInt(e.target.value);
                document.getElementById(`bandValue${index}`).textContent =
                    (this.gains[index] > 0 ? '+' : '') + this.gains[index] + ' dB';
                this.updatePresetButtons();
                if (this.audioBuffer) this.drawEQCurve();
            });
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.applyPreset('flat');
        });

        // Invert button
        document.getElementById('invertBtn').addEventListener('click', () => {
            this.gains = this.gains.map(g => -g);
            this.updateSliders();
            this.updatePresetButtons();
            if (this.audioBuffer) this.drawEQCurve();
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyPreset(btn.dataset.preset);
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

        // Resize
        window.addEventListener('resize', () => {
            if (this.audioBuffer) this.drawEQCurve();
        });
    }

    applyPreset(presetName) {
        if (this.presets[presetName]) {
            this.gains = [...this.presets[presetName]];
            this.updateSliders();
            this.updatePresetButtons();
            if (this.audioBuffer) this.drawEQCurve();
        }
    }

    updateSliders() {
        this.bands.forEach((_, index) => {
            const slider = document.getElementById(`band${index}`);
            slider.value = this.gains[index];
            document.getElementById(`bandValue${index}`).textContent =
                (this.gains[index] > 0 ? '+' : '') + this.gains[index] + ' dB';
        });
    }

    updatePresetButtons() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            const preset = this.presets[btn.dataset.preset];
            const isMatch = preset && preset.every((v, i) => v === this.gains[i]);
            btn.classList.toggle('active', isMatch);
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
            this.infoPanel.classList.add('show');
            this.eqPanel.classList.add('show');
            this.visualizerSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawEQCurve();

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

    drawEQCurve() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 120;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 20;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.ctx.strokeStyle = 'rgba(251, 146, 60, 0.2)';
        this.ctx.lineWidth = 1;

        // Horizontal lines
        for (let i = 0; i <= 4; i++) {
            const y = padding + (height - 2 * padding) * i / 4;
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(width - padding, y);
            this.ctx.stroke();
        }

        // Draw center line (0 dB)
        this.ctx.strokeStyle = 'rgba(251, 146, 60, 0.5)';
        this.ctx.beginPath();
        this.ctx.moveTo(padding, height / 2);
        this.ctx.lineTo(width - padding, height / 2);
        this.ctx.stroke();

        // Draw EQ curve
        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#f97316');
        gradient.addColorStop(0.5, '#fb923c');
        gradient.addColorStop(1, '#fdba74');

        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        // Use logarithmic scale for frequency
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);

        for (let x = padding; x < width - padding; x++) {
            const t = (x - padding) / (width - 2 * padding);
            const logFreq = minLog + t * (maxLog - minLog);
            const freq = Math.pow(10, logFreq);

            // Interpolate gain for this frequency
            const gain = this.interpolateGain(freq);
            const y = height / 2 - (gain / 12) * (height / 2 - padding);

            if (x === padding) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();

        // Draw band markers
        this.ctx.fillStyle = '#fb923c';
        this.bands.forEach((freq, i) => {
            const logFreq = Math.log10(freq);
            const t = (logFreq - minLog) / (maxLog - minLog);
            const x = padding + t * (width - 2 * padding);
            const gain = this.gains[i];
            const y = height / 2 - (gain / 12) * (height / 2 - padding);

            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Labels
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('+12 dB', 4, padding + 5);
        this.ctx.fillText('0 dB', 4, height / 2 + 3);
        this.ctx.fillText('-12 dB', 4, height - padding);
    }

    interpolateGain(freq) {
        // Find surrounding bands
        for (let i = 0; i < this.bands.length - 1; i++) {
            if (freq <= this.bands[i + 1]) {
                if (freq <= this.bands[0]) return this.gains[0];

                const t = (Math.log10(freq) - Math.log10(this.bands[i])) /
                         (Math.log10(this.bands[i + 1]) - Math.log10(this.bands[i]));
                return this.gains[i] + t * (this.gains[i + 1] - this.gains[i]);
            }
        }
        return this.gains[this.gains.length - 1];
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

            // Create biquad filter coefficients for each band
            const filters = this.bands.map((freq, i) => {
                return this.calculateBiquadCoeffs(freq, this.gains[i], sampleRate);
            });

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                // Apply all EQ bands
                this.applyEQ(input, output, filters, (progress) => {
                    const totalProgress = ((ch + progress) / numChannels) * 100;
                    this.progressFill.style.width = totalProgress + '%';
                });
            }

            this.progressFill.style.width = '100%';

            // Calculate active bands info
            const activeBands = this.gains.filter(g => g !== 0).length;

            document.getElementById('resultInfo').textContent =
                `${activeBands} 個頻段調整 | 時長: ${this.formatTime(this.audioBuffer.duration)}`;

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

    calculateBiquadCoeffs(freq, gainDb, sampleRate) {
        // Peaking EQ filter coefficients
        const A = Math.pow(10, gainDb / 40);
        const omega = 2 * Math.PI * freq / sampleRate;
        const sin = Math.sin(omega);
        const cos = Math.cos(omega);
        const Q = 1.4; // Bandwidth
        const alpha = sin / (2 * Q);

        const b0 = 1 + alpha * A;
        const b1 = -2 * cos;
        const b2 = 1 - alpha * A;
        const a0 = 1 + alpha / A;
        const a1 = -2 * cos;
        const a2 = 1 - alpha / A;

        return {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0
        };
    }

    applyEQ(input, output, filters, progressCallback) {
        const length = input.length;

        // Copy input to output first
        for (let i = 0; i < length; i++) {
            output[i] = input[i];
        }

        // Apply each filter
        filters.forEach((coeffs, filterIndex) => {
            // Skip if gain is 0
            if (this.gains[filterIndex] === 0) return;

            let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
            const temp = new Float32Array(length);

            for (let i = 0; i < length; i++) {
                const x0 = output[i];
                const y0 = coeffs.b0 * x0 + coeffs.b1 * x1 + coeffs.b2 * x2
                         - coeffs.a1 * y1 - coeffs.a2 * y2;

                x2 = x1;
                x1 = x0;
                y2 = y1;
                y1 = y0;

                temp[i] = y0;
            }

            // Copy back
            for (let i = 0; i < length; i++) {
                output[i] = temp[i];
            }

            progressCallback(filterIndex / filters.length);
        });

        // Soft clip to prevent distortion
        for (let i = 0; i < length; i++) {
            if (output[i] > 1) output[i] = 1 - Math.exp(1 - output[i]);
            else if (output[i] < -1) output[i] = -1 + Math.exp(1 + output[i]);
        }

        progressCallback(1);
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
        link.download = `${this.originalFileName}_eq.${extension}`;
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
    new AudioEqualizer();
});
