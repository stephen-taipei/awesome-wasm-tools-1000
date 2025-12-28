/**
 * AUD-061 音頻相位器 - Audio Phaser
 * Creates sweeping phase effect using allpass filter chain
 */

class AudioPhaser {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Phaser parameters
        this.stages = 6;          // Number of allpass stages (2, 4, 6, 8, 10, 12)
        this.rate = 20;           // LFO rate (0.01 Hz units, so 20 = 0.2 Hz)
        this.depth = 70;          // Sweep depth %
        this.feedback = 40;       // Feedback %
        this.mix = 50;            // Dry/wet mix %
        this.centerFreq = 800;    // Center frequency Hz

        // Presets
        this.presets = {
            subtle: { stages: 4, rate: 15, depth: 40, feedback: 20, mix: 40, centerFreq: 600 },
            classic: { stages: 6, rate: 20, depth: 70, feedback: 40, mix: 50, centerFreq: 800 },
            deep: { stages: 8, rate: 10, depth: 90, feedback: 60, mix: 60, centerFreq: 1000 },
            space: { stages: 12, rate: 5, depth: 100, feedback: 80, mix: 70, centerFreq: 1200 }
        };

        this.canvas = document.getElementById('phaserCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.phaserPanel = document.getElementById('phaserPanel');
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
                this.applyPreset(btn.dataset.mode);
            });
        });

        // Control sliders
        document.getElementById('stages').addEventListener('input', (e) => {
            this.stages = parseInt(e.target.value);
            document.getElementById('stagesValue').textContent = this.stages;
            if (this.audioBuffer) this.drawPhaserVisualization();
        });

        document.getElementById('rate').addEventListener('input', (e) => {
            this.rate = parseInt(e.target.value);
            document.getElementById('rateValue').textContent = (this.rate / 100).toFixed(2) + ' Hz';
            if (this.audioBuffer) this.drawPhaserVisualization();
        });

        document.getElementById('depth').addEventListener('input', (e) => {
            this.depth = parseInt(e.target.value);
            document.getElementById('depthValue').textContent = this.depth + '%';
            if (this.audioBuffer) this.drawPhaserVisualization();
        });

        document.getElementById('feedback').addEventListener('input', (e) => {
            this.feedback = parseInt(e.target.value);
            document.getElementById('feedbackValue').textContent = this.feedback + '%';
        });

        document.getElementById('mix').addEventListener('input', (e) => {
            this.mix = parseInt(e.target.value);
            document.getElementById('mixValue').textContent = this.mix + '%';
        });

        document.getElementById('centerFreq').addEventListener('input', (e) => {
            this.centerFreq = parseInt(e.target.value);
            document.getElementById('centerFreqValue').textContent = this.centerFreq + ' Hz';
            if (this.audioBuffer) this.drawPhaserVisualization();
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
            if (this.audioBuffer) this.drawPhaserVisualization();
        });
    }

    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        this.stages = preset.stages;
        this.rate = preset.rate;
        this.depth = preset.depth;
        this.feedback = preset.feedback;
        this.mix = preset.mix;
        this.centerFreq = preset.centerFreq;

        // Update sliders
        document.getElementById('stages').value = this.stages;
        document.getElementById('stagesValue').textContent = this.stages;

        document.getElementById('rate').value = this.rate;
        document.getElementById('rateValue').textContent = (this.rate / 100).toFixed(2) + ' Hz';

        document.getElementById('depth').value = this.depth;
        document.getElementById('depthValue').textContent = this.depth + '%';

        document.getElementById('feedback').value = this.feedback;
        document.getElementById('feedbackValue').textContent = this.feedback + '%';

        document.getElementById('mix').value = this.mix;
        document.getElementById('mixValue').textContent = this.mix + '%';

        document.getElementById('centerFreq').value = this.centerFreq;
        document.getElementById('centerFreqValue').textContent = this.centerFreq + ' Hz';

        if (this.audioBuffer) this.drawPhaserVisualization();
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
            this.phaserPanel.classList.add('show');
            this.visualizerSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawPhaserVisualization();

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

    drawPhaserVisualization() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 100;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw phase shift visualization
        const lfoRate = this.rate / 100;
        const period = width / 2;  // 2 cycles
        const depthRatio = this.depth / 100;

        // Draw multiple phase lines representing stages
        const colors = ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc'];

        for (let s = 0; s < Math.min(this.stages, 4); s++) {
            const phaseOffset = (s / this.stages) * Math.PI;
            const amplitude = 20 + s * 5;

            this.ctx.strokeStyle = colors[s % colors.length];
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 1 - s * 0.15;
            this.ctx.beginPath();

            for (let x = 0; x < width; x++) {
                const t = (x / period) * Math.PI * 2 + phaseOffset;
                const modulation = Math.sin(t) * depthRatio;
                const y = centerY + modulation * amplitude;

                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1;

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
        this.ctx.fillStyle = '#22d3ee';
        this.ctx.font = '11px sans-serif';
        this.ctx.fillText(`${this.stages} Stages`, 10, 15);
        this.ctx.fillText(`${(this.rate / 100).toFixed(2)} Hz`, width / 2 - 25, 15);
        this.ctx.fillText(`${this.centerFreq} Hz`, width - 70, 15);
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
            const lfoRate = this.rate / 100;
            const lfoOmega = 2 * Math.PI * lfoRate / sampleRate;
            const depthRatio = this.depth / 100;
            const feedbackGain = this.feedback / 100;
            const wetGain = this.mix / 100;
            const dryGain = 1 - wetGain;

            // Frequency range for sweep
            const minFreq = this.centerFreq * 0.25;
            const maxFreq = this.centerFreq * 4;

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                // Allpass filter states for each stage
                const allpassStates = [];
                for (let s = 0; s < this.stages; s++) {
                    allpassStates.push({ x1: 0, x2: 0, y1: 0, y2: 0 });
                }

                let feedbackSample = 0;

                for (let i = 0; i < length; i++) {
                    // Calculate LFO value (0 to 1)
                    const lfoValue = (Math.sin(lfoOmega * i) + 1) / 2;

                    // Calculate sweep frequency
                    const sweepPos = lfoValue * depthRatio + (1 - depthRatio) / 2;
                    const sweepFreq = minFreq + sweepPos * (maxFreq - minFreq);

                    // Calculate allpass coefficient
                    const tanArg = Math.PI * sweepFreq / sampleRate;
                    const allpassCoeff = (1 - tanArg) / (1 + tanArg);

                    // Input with feedback
                    let sample = input[i] + feedbackSample * feedbackGain;

                    // Process through allpass chain
                    for (let s = 0; s < this.stages; s++) {
                        const state = allpassStates[s];

                        // First order allpass filter
                        const allpassOut = allpassCoeff * (sample - state.y1) + state.x1;

                        state.x1 = sample;
                        state.y1 = allpassOut;

                        sample = allpassOut;
                    }

                    // Store for feedback
                    feedbackSample = sample;

                    // Mix dry and wet
                    const mixed = input[i] * dryGain + sample * wetGain;

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
            let modeName = '自訂';
            document.querySelectorAll('.mode-btn.active').forEach(btn => {
                const labels = {
                    subtle: '輕微', classic: '經典', deep: '深厚', space: '太空'
                };
                modeName = labels[btn.dataset.mode] || modeName;
            });

            // Update results
            document.getElementById('resultInfo').textContent =
                `模式: ${modeName} | ${this.stages}級 | 速率: ${(this.rate / 100).toFixed(2)}Hz | 處理時間: ${processingTime}秒`;

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
        link.download = `${this.originalFileName}_phaser.${extension}`;
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
    new AudioPhaser();
});
