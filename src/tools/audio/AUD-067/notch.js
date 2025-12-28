/**
 * AUD-067 音頻帶阻濾波 - Audio Notch Filter
 * 削減特定頻率（陷波濾波器）
 */

class AudioNotchFilter {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.fileName = '';
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

        this.notchFreqSlider = document.getElementById('notchFreq');
        this.qSlider = document.getElementById('qValue');
        this.depthSlider = document.getElementById('depth');
        this.mixSlider = document.getElementById('mix');

        this.notchFreqValue = document.getElementById('notchFreqValue');
        this.qValueDisplay = document.getElementById('qValueDisplay');
        this.depthValue = document.getElementById('depthValue');
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

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const freq = parseInt(btn.dataset.freq);
                this.notchFreqSlider.value = freq;
                this.updateNotchFreqDisplay();
                this.drawFilterResponse();
            });
        });

        // Sliders
        this.notchFreqSlider.addEventListener('input', () => {
            this.updateNotchFreqDisplay();
            this.updatePresetButtons();
            this.drawFilterResponse();
        });
        this.qSlider.addEventListener('input', () => {
            const q = parseInt(this.qSlider.value) / 10;
            this.qValueDisplay.textContent = q.toFixed(1);
            this.drawFilterResponse();
        });
        this.depthSlider.addEventListener('input', () => {
            this.depthValue.textContent = `${this.depthSlider.value}%`;
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

    updateNotchFreqDisplay() {
        const freq = parseInt(this.notchFreqSlider.value);
        this.notchFreqValue.textContent = freq >= 1000
            ? `${(freq / 1000).toFixed(1)} kHz`
            : `${freq} Hz`;
    }

    updatePresetButtons() {
        const freq = parseInt(this.notchFreqSlider.value);
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.freq) === freq) {
                btn.classList.add('active');
            }
        });
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
        const notchFreq = parseInt(this.notchFreqSlider.value);
        const Q = parseInt(this.qSlider.value) / 10;
        const depth = parseInt(this.depthSlider.value) / 100;
        const sampleRate = this.audioBuffer ? this.audioBuffer.sampleRate : 44100;

        // Clear canvas
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
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
        this.ctx.strokeStyle = '#f59e0b';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const freq = this.xToFreq(x, width);
            const magnitude = this.calculateNotchMagnitude(freq, notchFreq, Q, depth, sampleRate);
            const dB = 20 * Math.log10(Math.max(magnitude, 0.0001));
            const y = this.dBToY(dB, height);

            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw notch frequency marker
        const notchX = this.freqToX(notchFreq, width);
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(notchX, 0);
        this.ctx.lineTo(notchX, height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Notch frequency label
        this.ctx.fillStyle = '#ef4444';
        const notchLabel = notchFreq >= 1000 ? `${(notchFreq/1000).toFixed(1)}kHz` : `${notchFreq}Hz`;
        this.ctx.fillText(notchLabel, notchX + 5, 15);
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
        const minDB = -60;
        const maxDB = 6;
        return ((maxDB - dB) / (maxDB - minDB)) * height;
    }

    calculateNotchMagnitude(freq, notchFreq, Q, depth, sampleRate) {
        // Notch filter magnitude response
        const ratio = freq / notchFreq;
        const bandwidth = 1 / Q;

        // Second-order notch response
        const numeratorReal = 1 - ratio * ratio;
        const numeratorImag = 0;
        const denominatorReal = 1 - ratio * ratio;
        const denominatorImag = bandwidth * ratio;

        const numMag = Math.sqrt(numeratorReal * numeratorReal + numeratorImag * numeratorImag);
        const denMag = Math.sqrt(denominatorReal * denominatorReal + denominatorImag * denominatorImag);

        const fullNotch = numMag / denMag;
        // Apply depth (blend between full notch and unity)
        return 1 - depth * (1 - fullNotch);
    }

    async processAudio() {
        if (!this.audioBuffer) return;

        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        const notchFreq = parseInt(this.notchFreqSlider.value);
        const Q = parseInt(this.qSlider.value) / 10;
        const depth = parseInt(this.depthSlider.value) / 100;
        const mix = parseInt(this.mixSlider.value) / 100;

        try {
            const processedBuffer = await this.applyNotch(
                this.audioBuffer,
                notchFreq,
                Q,
                depth,
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

    async applyNotch(buffer, notchFreq, Q, depth, mix) {
        const sampleRate = buffer.sampleRate;
        const channels = buffer.numberOfChannels;
        const length = buffer.length;

        const offlineCtx = new OfflineAudioContext(channels, length, sampleRate);
        const outputBuffer = offlineCtx.createBuffer(channels, length, sampleRate);

        // Calculate notch biquad coefficients
        const coeffs = this.calculateBiquadCoeffs(notchFreq, Q, sampleRate);

        for (let channel = 0; channel < channels; channel++) {
            const input = buffer.getChannelData(channel);
            const output = outputBuffer.getChannelData(channel);

            // Filter state
            let x1 = 0, x2 = 0;
            let y1 = 0, y2 = 0;

            for (let i = 0; i < length; i++) {
                // Update progress
                if (i % 50000 === 0) {
                    const progress = ((channel * length + i) / (channels * length)) * 100;
                    this.progressFill.style.width = `${progress}%`;
                    await new Promise(r => setTimeout(r, 0));
                }

                const drySample = input[i];

                // Biquad difference equation
                const x0 = drySample;
                const y0 = coeffs.b0 * x0 + coeffs.b1 * x1 + coeffs.b2 * x2
                          - coeffs.a1 * y1 - coeffs.a2 * y2;

                // Update state
                x2 = x1;
                x1 = x0;
                y2 = y1;
                y1 = y0;

                // Apply depth (blend between filtered and dry)
                const wetSample = drySample * (1 - depth) + y0 * depth;

                // Mix dry and wet
                let sample = drySample * (1 - mix) + wetSample * mix;

                // Soft clip
                sample = Math.tanh(sample);

                output[i] = sample;
            }
        }

        this.progressFill.style.width = '100%';
        return outputBuffer;
    }

    calculateBiquadCoeffs(notchFreq, Q, sampleRate) {
        // Notch biquad filter coefficients
        const omega = 2 * Math.PI * notchFreq / sampleRate;
        const sinOmega = Math.sin(omega);
        const cosOmega = Math.cos(omega);
        const alpha = sinOmega / (2 * Q);

        const b0 = 1;
        const b1 = -2 * cosOmega;
        const b2 = 1;
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
        const notchFreq = parseInt(this.notchFreqSlider.value);
        const notchStr = notchFreq >= 1000 ? `${(notchFreq/1000).toFixed(1)} kHz` : `${notchFreq} Hz`;
        const Q = (parseInt(this.qSlider.value) / 10).toFixed(1);
        this.resultInfo.textContent = `陷波頻率: ${notchStr} | Q 值: ${Q} | 格式: ${this.outputFormat.toUpperCase()} | 大小: ${size} KB`;
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
        a.download = `${baseName}_notch.${ext}`;
        a.click();

        URL.revokeObjectURL(url);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AudioNotchFilter();
});
