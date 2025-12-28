/**
 * AUD-055 音頻門限器 - Noise Gate
 * Silences audio below threshold with attack/hold/release envelope
 */

class NoiseGate {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Gate parameters
        this.threshold = -40;   // dB
        this.attack = 1;        // ms
        this.hold = 50;         // ms
        this.release = 100;     // ms
        this.range = -80;       // dB (attenuation when closed)

        // Statistics
        this.openSamples = 0;
        this.closedSamples = 0;

        this.canvas = document.getElementById('gateCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.gatePanel = document.getElementById('gatePanel');
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
            if (this.audioBuffer) this.drawGateVisualization();
        });

        document.getElementById('attack').addEventListener('input', (e) => {
            this.attack = parseInt(e.target.value);
            document.getElementById('attackValue').textContent = this.attack + ' ms';
        });

        document.getElementById('hold').addEventListener('input', (e) => {
            this.hold = parseInt(e.target.value);
            document.getElementById('holdValue').textContent = this.hold + ' ms';
        });

        document.getElementById('release').addEventListener('input', (e) => {
            this.release = parseInt(e.target.value);
            document.getElementById('releaseValue').textContent = this.release + ' ms';
        });

        document.getElementById('range').addEventListener('input', (e) => {
            this.range = parseInt(e.target.value);
            document.getElementById('rangeValue').textContent = this.range + ' dB';
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
            if (this.audioBuffer) this.drawGateVisualization();
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
            this.gatePanel.classList.add('show');
            this.visualizerSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawGateVisualization();

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

    drawGateVisualization() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 100;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const data = this.audioBuffer.getChannelData(0);
        const thresholdLinear = Math.pow(10, this.threshold / 20);

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw waveform with gate status
        const step = Math.ceil(data.length / width);

        for (let i = 0; i < width; i++) {
            let max = 0;

            for (let j = 0; j < step; j++) {
                const idx = i * step + j;
                if (idx < data.length) {
                    max = Math.max(max, Math.abs(data[idx]));
                }
            }

            const barHeight = max * (height - 20);
            const y = height / 2 - barHeight / 2;

            // Color based on gate status
            if (max > thresholdLinear) {
                this.ctx.fillStyle = '#a78bfa'; // Open - purple
            } else {
                this.ctx.fillStyle = '#374151'; // Closed - gray
            }

            this.ctx.fillRect(i, y, 1, barHeight);
        }

        // Draw threshold line
        const thresholdY = height / 2 - thresholdLinear * (height - 20) / 2;
        const thresholdY2 = height / 2 + thresholdLinear * (height - 20) / 2;

        this.ctx.strokeStyle = '#c4b5fd';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, thresholdY);
        this.ctx.lineTo(width, thresholdY);
        this.ctx.moveTo(0, thresholdY2);
        this.ctx.lineTo(width, thresholdY2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
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
            const thresholdLinear = Math.pow(10, this.threshold / 20);
            const rangeLinear = Math.pow(10, this.range / 20);
            const attackSamples = Math.floor(this.attack * sampleRate / 1000);
            const holdSamples = Math.floor(this.hold * sampleRate / 1000);
            const releaseSamples = Math.floor(this.release * sampleRate / 1000);

            this.openSamples = 0;
            this.closedSamples = 0;

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                let gateOpen = false;
                let holdCounter = 0;
                let envelope = rangeLinear;

                for (let i = 0; i < length; i++) {
                    const inputAbs = Math.abs(input[i]);

                    // Gate logic
                    if (inputAbs > thresholdLinear) {
                        gateOpen = true;
                        holdCounter = holdSamples;
                    } else if (holdCounter > 0) {
                        holdCounter--;
                    } else {
                        gateOpen = false;
                    }

                    // Calculate target gain
                    const targetGain = gateOpen ? 1 : rangeLinear;

                    // Apply envelope
                    if (targetGain > envelope) {
                        // Attack
                        const attackStep = (1 - rangeLinear) / Math.max(attackSamples, 1);
                        envelope = Math.min(targetGain, envelope + attackStep);
                    } else {
                        // Release
                        const releaseStep = (1 - rangeLinear) / Math.max(releaseSamples, 1);
                        envelope = Math.max(targetGain, envelope - releaseStep);
                    }

                    // Apply gain
                    output[i] = input[i] * envelope;

                    // Statistics
                    if (envelope > 0.5) {
                        this.openSamples++;
                    } else {
                        this.closedSamples++;
                    }

                    // Progress update
                    if (i % 50000 === 0) {
                        const progress = ((ch + i / length) / numChannels) * 100;
                        this.progressFill.style.width = progress + '%';
                    }
                }
            }

            const processingTime = ((performance.now() - startTime) / 1000).toFixed(2);
            this.progressFill.style.width = '100%';

            // Update results
            const totalSamples = this.openSamples + this.closedSamples;
            document.getElementById('openPercent').textContent =
                ((this.openSamples / totalSamples) * 100).toFixed(1) + '%';
            document.getElementById('closedPercent').textContent =
                ((this.closedSamples / totalSamples) * 100).toFixed(1) + '%';
            document.getElementById('processingTime').textContent = processingTime + ' 秒';

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
        link.download = `${this.originalFileName}_gated.${extension}`;
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
    new NoiseGate();
});
