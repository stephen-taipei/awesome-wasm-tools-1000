/**
 * AUD-054 音頻擴展器 - Audio Expander
 * Increases dynamic range by reducing quiet parts
 */

class AudioExpander {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Expander parameters
        this.threshold = -30;   // dB
        this.ratio = 2;         // 1:n
        this.attack = 10;       // ms
        this.release = 100;     // ms

        // Analysis
        this.originalDR = 0;
        this.expandedDR = 0;

        this.canvas = document.getElementById('expanderCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.expanderPanel = document.getElementById('expanderPanel');
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

        // Control sliders
        document.getElementById('threshold').addEventListener('input', (e) => {
            this.threshold = parseInt(e.target.value);
            document.getElementById('thresholdValue').textContent = this.threshold + ' dB';
            this.drawCurve();
        });

        document.getElementById('ratio').addEventListener('input', (e) => {
            this.ratio = parseFloat(e.target.value);
            document.getElementById('ratioValue').textContent = '1:' + this.ratio;
            this.drawCurve();
        });

        document.getElementById('attack').addEventListener('input', (e) => {
            this.attack = parseInt(e.target.value);
            document.getElementById('attackValue').textContent = this.attack + ' ms';
        });

        document.getElementById('release').addEventListener('input', (e) => {
            this.release = parseInt(e.target.value);
            document.getElementById('releaseValue').textContent = this.release + ' ms';
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
            this.drawCurve();
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
            this.originalDR = this.calculateDynamicRange(this.audioBuffer.getChannelData(0));

            // Show panels
            this.infoPanel.classList.add('show');
            this.expanderPanel.classList.add('show');
            this.visualizerSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawCurve();

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

    calculateDynamicRange(data) {
        let peak = 0;
        let sumSquares = 0;

        for (let i = 0; i < data.length; i++) {
            peak = Math.max(peak, Math.abs(data[i]));
            sumSquares += data[i] * data[i];
        }

        const rms = Math.sqrt(sumSquares / data.length);
        const peakDb = 20 * Math.log10(peak || 0.001);
        const rmsDb = 20 * Math.log10(rms || 0.001);

        return peakDb - rmsDb;
    }

    drawCurve() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 150;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 30;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= 6; i++) {
            const x = padding + (width - 2 * padding) * i / 6;
            const y = padding + (height - 2 * padding) * i / 6;

            this.ctx.beginPath();
            this.ctx.moveTo(x, padding);
            this.ctx.lineTo(x, height - padding);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(width - padding, y);
            this.ctx.stroke();
        }

        // Draw 1:1 line (reference)
        this.ctx.strokeStyle = '#94a3b8';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(padding, height - padding);
        this.ctx.lineTo(width - padding, padding);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw expander curve
        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        const thresholdNorm = (this.threshold + 60) / 60; // Normalize -60 to 0 dB

        for (let i = 0; i <= 100; i++) {
            const inputNorm = i / 100;
            const inputDb = -60 + inputNorm * 60;
            let outputDb;

            if (inputDb < this.threshold) {
                // Below threshold - expand (reduce gain)
                const diff = this.threshold - inputDb;
                const expansion = diff * (this.ratio - 1) / this.ratio;
                outputDb = inputDb - expansion;
            } else {
                // Above threshold - no change
                outputDb = inputDb;
            }

            const outputNorm = (outputDb + 60) / 60;
            outputNorm = Math.max(0, Math.min(1, outputNorm));

            const x = padding + inputNorm * (width - 2 * padding);
            const y = height - padding - outputNorm * (height - 2 * padding);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();

        // Draw threshold line
        const thresholdX = padding + thresholdNorm * (width - 2 * padding);
        this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(thresholdX, padding);
        this.ctx.lineTo(thresholdX, height - padding);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Labels
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('輸入 (dB)', width / 2, height - 5);

        this.ctx.save();
        this.ctx.translate(10, height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('輸出 (dB)', 0, 0);
        this.ctx.restore();

        // dB labels
        this.ctx.fillStyle = '#64748b';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('-60', padding - 5, height - padding);
        this.ctx.fillText('0', padding - 5, padding + 5);
        this.ctx.textAlign = 'center';
        this.ctx.fillText('-60', padding, height - padding + 15);
        this.ctx.fillText('0', width - padding, height - padding + 15);
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
            const thresholdLinear = Math.pow(10, this.threshold / 20);
            const attackCoeff = Math.exp(-1 / (this.attack * sampleRate / 1000));
            const releaseCoeff = Math.exp(-1 / (this.release * sampleRate / 1000));

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                let envelope = 0;

                for (let i = 0; i < length; i++) {
                    const inputSample = input[i];
                    const inputAbs = Math.abs(inputSample);

                    // Envelope follower
                    const coeff = inputAbs > envelope ? attackCoeff : releaseCoeff;
                    envelope = coeff * envelope + (1 - coeff) * inputAbs;

                    // Calculate gain
                    let gain = 1;

                    if (envelope < thresholdLinear && envelope > 0) {
                        // Below threshold - apply expansion
                        const envelopeDb = 20 * Math.log10(envelope);
                        const diff = this.threshold - envelopeDb;
                        const expansion = diff * (this.ratio - 1) / this.ratio;
                        const gainDb = -expansion;
                        gain = Math.pow(10, gainDb / 20);
                    }

                    // Apply gain
                    output[i] = inputSample * gain;

                    // Progress update
                    if (i % 50000 === 0) {
                        const progress = ((ch + i / length) / numChannels) * 100;
                        this.progressFill.style.width = progress + '%';
                    }
                }
            }

            // Normalize to prevent clipping
            let maxAbs = 0;
            for (let ch = 0; ch < numChannels; ch++) {
                const data = this.processedBuffer.getChannelData(ch);
                for (let i = 0; i < length; i++) {
                    maxAbs = Math.max(maxAbs, Math.abs(data[i]));
                }
            }
            if (maxAbs > 0.99) {
                const scale = 0.99 / maxAbs;
                for (let ch = 0; ch < numChannels; ch++) {
                    const data = this.processedBuffer.getChannelData(ch);
                    for (let i = 0; i < length; i++) {
                        data[i] *= scale;
                    }
                }
            }

            this.expandedDR = this.calculateDynamicRange(this.processedBuffer.getChannelData(0));
            this.progressFill.style.width = '100%';

            // Update result
            document.getElementById('originalDR').textContent = this.originalDR.toFixed(1) + ' dB';
            document.getElementById('expandedDR').textContent = this.expandedDR.toFixed(1) + ' dB';
            document.getElementById('drIncrease').textContent =
                '+' + (this.expandedDR - this.originalDR).toFixed(1) + ' dB';

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
        link.download = `${this.originalFileName}_expanded.${extension}`;
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
    new AudioExpander();
});
