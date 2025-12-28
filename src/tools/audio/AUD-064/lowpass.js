/**
 * AUD-064 音頻低通濾波 - Audio Lowpass Filter
 * 削減高頻保留低頻
 */

class AudioLowpassFilter {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.fileName = '';
        this.slope = 12;
        this.outputFormat = 'wav';
        this.processedBlob = null;

        this.initElements();
        this.bindEvents();
        this.drawFilterResponse();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.filterPanel = document.getElementById('filterPanel');
        this.visualizerSection = document.getElementById('visualizerSection');
        this.outputSettings = document.getElementById('outputSettings');
        this.processBtn = document.getElementById('processBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.resultPanel = document.getElementById('resultPanel');

        this.fileNameEl = document.getElementById('fileName');
        this.durationEl = document.getElementById('duration');
        this.sampleRateEl = document.getElementById('sampleRate');
        this.resultInfo = document.getElementById('resultInfo');

        this.cutoffSlider = document.getElementById('cutoff');
        this.resonanceSlider = document.getElementById('resonance');
        this.mixSlider = document.getElementById('mix');

        this.cutoffValue = document.getElementById('cutoffValue');
        this.resonanceValue = document.getElementById('resonanceValue');
        this.mixValue = document.getElementById('mixValue');

        this.canvas = document.getElementById('filterCanvas');
        this.ctx = this.canvas.getContext('2d');
    }

    bindEvents() {
        // Upload area events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
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
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('audio/')) {
                this.loadAudioFile(file);
            }
        });
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.loadAudioFile(file);
        });

        // Slope buttons
        document.querySelectorAll('.slope-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.slope-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.slope = parseInt(btn.dataset.slope);
                this.drawFilterResponse();
            });
        });

        // Sliders
        this.cutoffSlider.addEventListener('input', () => {
            const freq = parseInt(this.cutoffSlider.value);
            this.cutoffValue.textContent = freq >= 1000
                ? `${(freq / 1000).toFixed(1)} kHz`
                : `${freq} Hz`;
            this.drawFilterResponse();
        });
        this.resonanceSlider.addEventListener('input', () => {
            this.resonanceValue.textContent = `${this.resonanceSlider.value}%`;
            this.drawFilterResponse();
        });
        this.mixSlider.addEventListener('input', () => {
            this.mixValue.textContent = `${this.mixSlider.value}%`;
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
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadResult());
    }

    async loadAudioFile(file) {
        this.fileName = file.name;
        this.fileNameEl.textContent = file.name;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            const duration = this.audioBuffer.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            this.durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            this.sampleRateEl.textContent = `${this.audioBuffer.sampleRate} Hz`;

            this.showPanels();
        } catch (error) {
            alert('無法載入音頻文件: ' + error.message);
        }
    }

    showPanels() {
        this.infoPanel.classList.add('show');
        this.filterPanel.classList.add('show');
        this.visualizerSection.classList.add('show');
        this.outputSettings.classList.add('show');
        this.processBtn.classList.add('show');
        this.resultPanel.classList.remove('show');
    }

    drawFilterResponse() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        const width = rect.width;
        const height = rect.height;
        const cutoff = parseInt(this.cutoffSlider.value);
        const resonance = parseInt(this.resonanceSlider.value) / 100;
        const sampleRate = this.audioBuffer ? this.audioBuffer.sampleRate : 44100;

        // Clear canvas
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
        this.ctx.lineWidth = 1;

        // Frequency grid (logarithmic)
        const freqs = [100, 1000, 10000];
        freqs.forEach(freq => {
            const x = this.freqToX(freq, width);
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();

            this.ctx.fillStyle = '#64748b';
            this.ctx.font = '10px sans-serif';
            const label = freq >= 1000 ? `${freq/1000}k` : freq;
            this.ctx.fillText(`${label}`, x + 2, height - 5);
        });

        // dB grid
        const dBLevels = [0, -12, -24, -48];
        dBLevels.forEach(dB => {
            const y = this.dBToY(dB, height);
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();

            this.ctx.fillStyle = '#64748b';
            this.ctx.fillText(`${dB}dB`, 5, y - 3);
        });

        // Draw filter response curve
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        const order = this.slope / 6;
        const Q = 0.707 + resonance * 10;

        for (let x = 0; x < width; x++) {
            const freq = this.xToFreq(x, width);
            const magnitude = this.calculateMagnitude(freq, cutoff, order, Q, sampleRate);
            const dB = 20 * Math.log10(Math.max(magnitude, 0.0001));
            const y = this.dBToY(dB, height);

            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw cutoff frequency marker
        const cutoffX = this.freqToX(cutoff, width);
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(cutoffX, 0);
        this.ctx.lineTo(cutoffX, height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Cutoff label
        this.ctx.fillStyle = '#ef4444';
        const cutoffLabel = cutoff >= 1000 ? `${(cutoff/1000).toFixed(1)}kHz` : `${cutoff}Hz`;
        this.ctx.fillText(cutoffLabel, cutoffX + 5, 15);
    }

    freqToX(freq, width) {
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);
        return ((Math.log10(freq) - minLog) / (maxLog - minLog)) * width;
    }

    xToFreq(x, width) {
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);
        return Math.pow(10, minLog + (x / width) * (maxLog - minLog));
    }

    dBToY(dB, height) {
        // -60dB to +12dB range
        const minDB = -60;
        const maxDB = 12;
        return ((maxDB - dB) / (maxDB - minDB)) * height;
    }

    calculateMagnitude(freq, cutoff, order, Q, sampleRate) {
        // Butterworth lowpass response with optional resonance
        const ratio = freq / cutoff;

        if (order === 1) {
            // First order (6 dB/oct)
            return 1 / Math.sqrt(1 + ratio * ratio);
        } else {
            // Higher orders with resonance
            const resonancePeak = ratio > 0.5 && ratio < 2 ?
                1 + Q * Math.exp(-Math.pow(Math.log(ratio), 2) * 2) : 1;

            const butterworth = 1 / Math.pow(1 + Math.pow(ratio, 2 * order), 0.5);
            return butterworth * resonancePeak;
        }
    }

    async processAudio() {
        if (!this.audioBuffer) return;

        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        const cutoff = parseInt(this.cutoffSlider.value);
        const resonance = parseInt(this.resonanceSlider.value) / 100;
        const mix = parseInt(this.mixSlider.value) / 100;

        try {
            const processedBuffer = await this.applyLowpass(
                this.audioBuffer,
                cutoff,
                resonance,
                this.slope,
                mix
            );

            if (this.outputFormat === 'wav') {
                this.processedBlob = this.encodeWAV(processedBuffer);
            } else {
                this.processedBlob = await this.encodeMP3(processedBuffer);
            }

            this.showResult();
        } catch (error) {
            alert('處理失敗: ' + error.message);
        }

        this.processBtn.disabled = false;
    }

    async applyLowpass(buffer, cutoff, resonance, slope, mix) {
        const sampleRate = buffer.sampleRate;
        const channels = buffer.numberOfChannels;
        const length = buffer.length;

        const offlineCtx = new OfflineAudioContext(channels, length, sampleRate);
        const outputBuffer = offlineCtx.createBuffer(channels, length, sampleRate);

        const order = slope / 6;
        const Q = 0.707 + resonance * 10;

        for (let channel = 0; channel < channels; channel++) {
            const input = buffer.getChannelData(channel);
            const output = outputBuffer.getChannelData(channel);

            // Create filter states for cascaded biquads
            const numBiquads = Math.ceil(order / 2);
            const filterStates = [];

            for (let i = 0; i < numBiquads; i++) {
                filterStates.push({
                    x1: 0, x2: 0,
                    y1: 0, y2: 0
                });
            }

            // Calculate biquad coefficients
            const coeffs = this.calculateBiquadCoeffs(cutoff, Q, sampleRate);

            for (let i = 0; i < length; i++) {
                // Update progress
                if (i % 50000 === 0) {
                    const progress = ((channel * length + i) / (channels * length)) * 100;
                    this.progressFill.style.width = `${progress}%`;
                    await new Promise(r => setTimeout(r, 0));
                }

                let sample = input[i];
                const drySample = sample;

                // Apply cascaded biquad filters
                for (let stage = 0; stage < numBiquads; stage++) {
                    const state = filterStates[stage];

                    // Biquad difference equation
                    const x0 = sample;
                    const y0 = coeffs.b0 * x0 + coeffs.b1 * state.x1 + coeffs.b2 * state.x2
                              - coeffs.a1 * state.y1 - coeffs.a2 * state.y2;

                    // Update state
                    state.x2 = state.x1;
                    state.x1 = x0;
                    state.y2 = state.y1;
                    state.y1 = y0;

                    sample = y0;
                }

                // Mix dry and wet
                sample = drySample * (1 - mix) + sample * mix;

                // Soft clip
                sample = Math.tanh(sample);

                output[i] = sample;
            }
        }

        this.progressFill.style.width = '100%';
        return outputBuffer;
    }

    calculateBiquadCoeffs(cutoff, Q, sampleRate) {
        // Lowpass biquad filter coefficients
        const omega = 2 * Math.PI * cutoff / sampleRate;
        const sinOmega = Math.sin(omega);
        const cosOmega = Math.cos(omega);
        const alpha = sinOmega / (2 * Q);

        const b0 = (1 - cosOmega) / 2;
        const b1 = 1 - cosOmega;
        const b2 = (1 - cosOmega) / 2;
        const a0 = 1 + alpha;
        const a1 = -2 * cosOmega;
        const a2 = 1 - alpha;

        return {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0
        };
    }

    encodeWAV(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const bitsPerSample = 16;
        const length = buffer.length;

        const dataLength = length * numChannels * (bitsPerSample / 8);
        const bufferLength = 44 + dataLength;
        const arrayBuffer = new ArrayBuffer(bufferLength);
        const view = new DataView(arrayBuffer);

        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, bufferLength - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
        view.setUint16(32, numChannels * (bitsPerSample / 8), true);
        view.setUint16(34, bitsPerSample, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);

        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        let offset = 44;
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

    async encodeMP3(buffer) {
        return new Promise((resolve) => {
            const numChannels = buffer.numberOfChannels;
            const sampleRate = buffer.sampleRate;
            const samples = buffer.length;

            const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 192);
            const mp3Data = [];

            const left = new Int16Array(samples);
            const right = numChannels > 1 ? new Int16Array(samples) : null;

            const leftFloat = buffer.getChannelData(0);
            const rightFloat = numChannels > 1 ? buffer.getChannelData(1) : null;

            for (let i = 0; i < samples; i++) {
                let s = leftFloat[i];
                s = Math.max(-1, Math.min(1, s));
                left[i] = s < 0 ? s * 32768 : s * 32767;

                if (right && rightFloat) {
                    s = rightFloat[i];
                    s = Math.max(-1, Math.min(1, s));
                    right[i] = s < 0 ? s * 32768 : s * 32767;
                }
            }

            const blockSize = 1152;
            for (let i = 0; i < samples; i += blockSize) {
                const leftChunk = left.subarray(i, i + blockSize);
                const rightChunk = right ? right.subarray(i, i + blockSize) : leftChunk;

                const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                if (mp3buf.length > 0) {
                    mp3Data.push(mp3buf);
                }
            }

            const mp3buf = mp3encoder.flush();
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }

            resolve(new Blob(mp3Data, { type: 'audio/mp3' }));
        });
    }

    showResult() {
        const size = (this.processedBlob.size / 1024).toFixed(1);
        const cutoff = parseInt(this.cutoffSlider.value);
        const cutoffStr = cutoff >= 1000 ? `${(cutoff/1000).toFixed(1)} kHz` : `${cutoff} Hz`;
        this.resultInfo.textContent = `截止頻率: ${cutoffStr} | 斜率: ${this.slope} dB/oct | 格式: ${this.outputFormat.toUpperCase()} | 大小: ${size} KB`;
        this.resultPanel.classList.add('show');
        this.progressBar.classList.remove('show');
    }

    downloadResult() {
        if (!this.processedBlob) return;

        const baseName = this.fileName.replace(/\.[^/.]+$/, '');
        const ext = this.outputFormat;
        const url = URL.createObjectURL(this.processedBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_lowpass.${ext}`;
        a.click();

        URL.revokeObjectURL(url);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AudioLowpassFilter();
});
