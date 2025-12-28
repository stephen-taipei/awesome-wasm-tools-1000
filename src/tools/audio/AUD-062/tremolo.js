/**
 * AUD-062 音頻顫音 - Audio Tremolo
 * Amplitude modulation effect with various waveforms
 */

class AudioTremolo {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Tremolo parameters
        this.waveform = 'sine';   // sine, triangle, square, sawtooth
        this.rate = 50;           // LFO rate (0.1 Hz units, so 50 = 5.0 Hz)
        this.depth = 60;          // Modulation depth %
        this.stereoPhase = 0;     // Stereo phase offset degrees
        this.mix = 100;           // Effect mix %

        this.canvas = document.getElementById('tremoloCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.tremoloPanel = document.getElementById('tremoloPanel');
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

        // Waveform buttons
        document.querySelectorAll('.wave-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.waveform = btn.dataset.wave;
                if (this.audioBuffer) this.drawTremoloVisualization();
            });
        });

        // Control sliders
        document.getElementById('rate').addEventListener('input', (e) => {
            this.rate = parseInt(e.target.value);
            document.getElementById('rateValue').textContent = (this.rate / 10).toFixed(1) + ' Hz';
            if (this.audioBuffer) this.drawTremoloVisualization();
        });

        document.getElementById('depth').addEventListener('input', (e) => {
            this.depth = parseInt(e.target.value);
            document.getElementById('depthValue').textContent = this.depth + '%';
            if (this.audioBuffer) this.drawTremoloVisualization();
        });

        document.getElementById('stereoPhase').addEventListener('input', (e) => {
            this.stereoPhase = parseInt(e.target.value);
            document.getElementById('stereoPhaseValue').textContent = this.stereoPhase + '°';
            if (this.audioBuffer) this.drawTremoloVisualization();
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
            if (this.audioBuffer) this.drawTremoloVisualization();
        });
    }

    // Generate LFO waveform value
    getLfoValue(phase, waveform) {
        const normalizedPhase = phase % (2 * Math.PI);

        switch (waveform) {
            case 'sine':
                return Math.sin(phase);

            case 'triangle':
                if (normalizedPhase < Math.PI) {
                    return -1 + (2 * normalizedPhase / Math.PI);
                } else {
                    return 3 - (2 * normalizedPhase / Math.PI);
                }

            case 'square':
                return normalizedPhase < Math.PI ? 1 : -1;

            case 'sawtooth':
                return -1 + (normalizedPhase / Math.PI);

            default:
                return Math.sin(phase);
        }
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
            this.tremoloPanel.classList.add('show');
            this.visualizerSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawTremoloVisualization();

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

    drawTremoloVisualization() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 100;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw waveform
        const lfoRate = this.rate / 10;
        const period = width / 3;  // 3 cycles
        const amplitude = (this.depth / 100) * 35;
        const stereoOffset = (this.stereoPhase / 180) * Math.PI;

        // Draw left channel (or mono)
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const phase = (x / period) * Math.PI * 2;
            const lfoValue = this.getLfoValue(phase, this.waveform);
            const y = centerY - lfoValue * amplitude;

            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw right channel if stereo phase is set
        if (this.stereoPhase > 0) {
            this.ctx.strokeStyle = '#fecaca';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            for (let x = 0; x < width; x++) {
                const phase = (x / period) * Math.PI * 2 + stereoOffset;
                const lfoValue = this.getLfoValue(phase, this.waveform);
                const y = centerY - lfoValue * amplitude;

                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }

        // Draw center line
        this.ctx.strokeStyle = '#4b5563';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(width, centerY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw labels
        this.ctx.fillStyle = '#f87171';
        this.ctx.font = '11px sans-serif';
        const waveLabels = {
            sine: 'Sine', triangle: 'Triangle', square: 'Square', sawtooth: 'Sawtooth'
        };
        this.ctx.fillText(waveLabels[this.waveform], 10, 15);
        this.ctx.fillText(`${(this.rate / 10).toFixed(1)} Hz`, width - 60, 15);
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

            // Force stereo output if stereo phase is set
            const outputChannels = this.stereoPhase > 0 ? 2 : numChannels;

            this.processedBuffer = this.audioContext.createBuffer(
                outputChannels,
                length,
                sampleRate
            );

            // Parameters
            const lfoRate = this.rate / 10;
            const lfoOmega = 2 * Math.PI * lfoRate / sampleRate;
            const depthRatio = this.depth / 100;
            const mixRatio = this.mix / 100;
            const stereoOffset = (this.stereoPhase / 180) * Math.PI;

            // Get input
            const inputL = this.audioBuffer.getChannelData(0);
            const inputR = numChannels > 1 ? this.audioBuffer.getChannelData(1) : inputL;

            // Get output
            const outputL = this.processedBuffer.getChannelData(0);
            const outputR = outputChannels > 1 ? this.processedBuffer.getChannelData(1) : null;

            for (let i = 0; i < length; i++) {
                // Calculate LFO values
                const phaseL = lfoOmega * i;
                const phaseR = phaseL + stereoOffset;

                const lfoL = this.getLfoValue(phaseL, this.waveform);
                const lfoR = this.getLfoValue(phaseR, this.waveform);

                // Calculate modulation gain (0 to 1)
                // LFO ranges from -1 to 1, we want gain to range from (1-depth) to 1
                const gainL = 1 - depthRatio * (1 - lfoL) / 2;
                const gainR = 1 - depthRatio * (1 - lfoR) / 2;

                // Apply tremolo and mix
                if (outputChannels === 1) {
                    const wet = inputL[i] * gainL;
                    outputL[i] = inputL[i] * (1 - mixRatio) + wet * mixRatio;
                } else {
                    const wetL = inputL[i] * gainL;
                    const wetR = inputR[i] * gainR;

                    outputL[i] = inputL[i] * (1 - mixRatio) + wetL * mixRatio;
                    outputR[i] = inputR[i] * (1 - mixRatio) + wetR * mixRatio;
                }

                // Progress
                if (i % 50000 === 0) {
                    this.progressFill.style.width = (i / length * 100) + '%';
                }
            }

            const processingTime = ((performance.now() - startTime) / 1000).toFixed(2);
            this.progressFill.style.width = '100%';

            // Get waveform name
            const waveLabels = {
                sine: '正弦波', triangle: '三角波', square: '方波', sawtooth: '鋸齒波'
            };

            // Update results
            document.getElementById('resultInfo').textContent =
                `波形: ${waveLabels[this.waveform]} | 速率: ${(this.rate / 10).toFixed(1)}Hz | 深度: ${this.depth}% | 處理時間: ${processingTime}秒`;

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
        link.download = `${this.originalFileName}_tremolo.${extension}`;
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
    new AudioTremolo();
});
