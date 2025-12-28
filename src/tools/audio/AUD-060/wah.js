/**
 * AUD-060 音頻哇音 - Audio Wah
 * Classic wah effect using swept bandpass filter
 */

class AudioWah {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Wah parameters
        this.mode = 'auto';       // auto, envelope, slow, fast
        this.rate = 30;           // LFO rate (0.1 Hz units, so 30 = 3.0 Hz)
        this.depth = 70;          // Sweep depth %
        this.lowFreq = 300;       // Low frequency Hz
        this.highFreq = 2500;     // High frequency Hz
        this.resonance = 8;       // Filter Q
        this.mix = 60;            // Dry/wet mix %

        // Presets
        this.presets = {
            auto: { rate: 30, depth: 70, lowFreq: 300, highFreq: 2500, resonance: 8, mix: 60 },
            envelope: { rate: 10, depth: 90, lowFreq: 200, highFreq: 3000, resonance: 12, mix: 70 },
            slow: { rate: 8, depth: 80, lowFreq: 250, highFreq: 2000, resonance: 6, mix: 50 },
            fast: { rate: 80, depth: 60, lowFreq: 400, highFreq: 2800, resonance: 10, mix: 65 }
        };

        this.canvas = document.getElementById('wahCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.wahPanel = document.getElementById('wahPanel');
        this.visualizerSection = document.getElementById('visualizerSection');
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

        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
                this.applyPreset(btn.dataset.mode);
            });
        });

        // Control sliders
        document.getElementById('rate').addEventListener('input', (e) => {
            this.rate = parseInt(e.target.value);
            document.getElementById('rateValue').textContent = (this.rate / 10).toFixed(1) + ' Hz';
            if (this.audioBuffer) this.drawWahVisualization();
        });

        document.getElementById('depth').addEventListener('input', (e) => {
            this.depth = parseInt(e.target.value);
            document.getElementById('depthValue').textContent = this.depth + '%';
            if (this.audioBuffer) this.drawWahVisualization();
        });

        document.getElementById('lowFreq').addEventListener('input', (e) => {
            this.lowFreq = parseInt(e.target.value);
            document.getElementById('lowFreqValue').textContent = this.lowFreq + ' Hz';
            if (this.audioBuffer) this.drawWahVisualization();
        });

        document.getElementById('highFreq').addEventListener('input', (e) => {
            this.highFreq = parseInt(e.target.value);
            document.getElementById('highFreqValue').textContent = this.highFreq + ' Hz';
            if (this.audioBuffer) this.drawWahVisualization();
        });

        document.getElementById('resonance').addEventListener('input', (e) => {
            this.resonance = parseInt(e.target.value);
            document.getElementById('resonanceValue').textContent = this.resonance;
        });

        document.getElementById('mix').addEventListener('input', (e) => {
            this.mix = parseInt(e.target.value);
            document.getElementById('mixValue').textContent = this.mix + '%';
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
            if (this.audioBuffer) this.drawWahVisualization();
        });
    }

    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        this.rate = preset.rate;
        this.depth = preset.depth;
        this.lowFreq = preset.lowFreq;
        this.highFreq = preset.highFreq;
        this.resonance = preset.resonance;
        this.mix = preset.mix;

        // Update sliders
        document.getElementById('rate').value = this.rate;
        document.getElementById('rateValue').textContent = (this.rate / 10).toFixed(1) + ' Hz';

        document.getElementById('depth').value = this.depth;
        document.getElementById('depthValue').textContent = this.depth + '%';

        document.getElementById('lowFreq').value = this.lowFreq;
        document.getElementById('lowFreqValue').textContent = this.lowFreq + ' Hz';

        document.getElementById('highFreq').value = this.highFreq;
        document.getElementById('highFreqValue').textContent = this.highFreq + ' Hz';

        document.getElementById('resonance').value = this.resonance;
        document.getElementById('resonanceValue').textContent = this.resonance;

        document.getElementById('mix').value = this.mix;
        document.getElementById('mixValue').textContent = this.mix + '%';

        if (this.audioBuffer) this.drawWahVisualization();
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
            this.wahPanel.classList.add('show');
            this.visualizerSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawWahVisualization();

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

    drawWahVisualization() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 100;

        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw frequency range visualization
        const logLow = Math.log10(this.lowFreq);
        const logHigh = Math.log10(this.highFreq);
        const freqRange = logHigh - logLow;

        // Draw LFO sweep pattern
        const lfoRate = this.rate / 10;
        const period = width / (lfoRate * 2);  // 2 cycles
        const depthRatio = this.depth / 100;

        // Draw frequency range band
        const lowY = height - 10;
        const highY = 10;

        this.ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
        this.ctx.fillRect(0, highY, width, lowY - highY);

        // Draw sweep line
        this.ctx.strokeStyle = '#ec4899';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const t = (x / period) * Math.PI * 2;
            const lfoValue = (Math.sin(t) + 1) / 2;  // 0 to 1
            const sweepPos = lfoValue * depthRatio + (1 - depthRatio) / 2;
            const y = lowY - sweepPos * (lowY - highY);

            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw frequency labels
        this.ctx.fillStyle = '#f472b6';
        this.ctx.font = '11px sans-serif';
        this.ctx.fillText(`${this.highFreq} Hz`, 10, 20);
        this.ctx.fillText(`${this.lowFreq} Hz`, 10, height - 5);

        // Draw mode indicator
        const modeLabels = {
            auto: 'Auto Wah',
            envelope: 'Envelope',
            slow: 'Slow Sweep',
            fast: 'Fast Sweep'
        };
        this.ctx.fillText(modeLabels[this.mode], width - 80, 15);
    }

    // Calculate bandpass filter coefficients
    calculateBandpassCoeffs(centerFreq, Q, sampleRate) {
        const omega = 2 * Math.PI * centerFreq / sampleRate;
        const sin = Math.sin(omega);
        const cos = Math.cos(omega);
        const alpha = sin / (2 * Q);

        const b0 = alpha;
        const b1 = 0;
        const b2 = -alpha;
        const a0 = 1 + alpha;
        const a1 = -2 * cos;
        const a2 = 1 - alpha;

        return {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0
        };
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

            // Parameters
            const lfoRate = this.rate / 10;
            const lfoOmega = 2 * Math.PI * lfoRate / sampleRate;
            const depthRatio = this.depth / 100;
            const wetGain = this.mix / 100;
            const dryGain = 1 - wetGain;
            const Q = this.resonance;

            // Frequency range (use log scale for natural sweep)
            const logLow = Math.log(this.lowFreq);
            const logHigh = Math.log(this.highFreq);

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                // Filter state
                let x1 = 0, x2 = 0;
                let y1 = 0, y2 = 0;

                // Envelope follower for envelope mode
                let envelope = 0;
                const attackCoeff = Math.exp(-1 / (0.001 * sampleRate));
                const releaseCoeff = Math.exp(-1 / (0.1 * sampleRate));

                for (let i = 0; i < length; i++) {
                    const inputSample = input[i];

                    // Determine sweep position based on mode
                    let sweepPos;

                    if (this.mode === 'envelope') {
                        // Envelope follower
                        const inputAbs = Math.abs(inputSample);
                        if (inputAbs > envelope) {
                            envelope = attackCoeff * envelope + (1 - attackCoeff) * inputAbs;
                        } else {
                            envelope = releaseCoeff * envelope;
                        }
                        sweepPos = Math.min(envelope * 10, 1);  // Scale envelope
                    } else {
                        // LFO-based sweep
                        const lfoValue = (Math.sin(lfoOmega * i) + 1) / 2;  // 0 to 1
                        sweepPos = lfoValue * depthRatio + (1 - depthRatio) / 2;
                    }

                    // Calculate center frequency (log scale interpolation)
                    const logFreq = logLow + sweepPos * (logHigh - logLow);
                    const centerFreq = Math.exp(logFreq);

                    // Calculate filter coefficients
                    const coeffs = this.calculateBandpassCoeffs(centerFreq, Q, sampleRate);

                    // Apply filter (direct form II)
                    const filtered = coeffs.b0 * inputSample + coeffs.b1 * x1 + coeffs.b2 * x2
                                   - coeffs.a1 * y1 - coeffs.a2 * y2;

                    // Update state
                    x2 = x1;
                    x1 = inputSample;
                    y2 = y1;
                    y1 = filtered;

                    // Mix dry and wet
                    const mixed = inputSample * dryGain + filtered * wetGain * 2;  // Boost wet signal

                    // Soft clip
                    output[i] = Math.tanh(mixed);

                    // Progress
                    if (i % 50000 === 0) {
                        const progress = ((ch + i / length) / numChannels) * 100;
                        this.progressFill.style.width = progress + '%';
                    }
                }
            }

            const processingTime = ((performance.now() - startTime) / 1000).toFixed(2);
            this.progressFill.style.width = '100%';

            // Find mode name
            const modeLabels = {
                auto: '自動哇音', envelope: '包絡跟隨', slow: '慢速掃頻', fast: '快速掃頻'
            };
            const modeName = modeLabels[this.mode] || '自訂';

            // Update results
            document.getElementById('resultInfo').textContent =
                `模式: ${modeName} | 頻率: ${this.lowFreq}-${this.highFreq}Hz | Q: ${this.resonance} | 處理時間: ${processingTime}秒`;

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
        link.download = `${this.originalFileName}_wah.${extension}`;
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
    new AudioWah();
});
