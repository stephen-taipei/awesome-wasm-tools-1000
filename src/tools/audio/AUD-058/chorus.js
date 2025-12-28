/**
 * AUD-058 音頻合唱 - Audio Chorus
 * Creates rich, full chorus effect using modulated delay lines
 */

class AudioChorus {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Chorus parameters
        this.voices = 3;          // Number of voices
        this.rate = 15;           // LFO rate (0.1 Hz units, so 15 = 1.5 Hz)
        this.depth = 40;          // Modulation depth %
        this.delay = 20;          // Base delay ms
        this.mix = 50;            // Dry/wet mix %
        this.feedback = 20;       // Feedback %

        // Presets
        this.presets = {
            subtle: { voices: 2, rate: 10, depth: 20, delay: 15, mix: 30, feedback: 10 },
            standard: { voices: 3, rate: 15, depth: 40, delay: 20, mix: 50, feedback: 20 },
            rich: { voices: 4, rate: 20, depth: 60, delay: 25, mix: 60, feedback: 30 },
            deep: { voices: 6, rate: 8, depth: 80, delay: 35, mix: 70, feedback: 40 }
        };

        this.canvas = document.getElementById('chorusCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.chorusPanel = document.getElementById('chorusPanel');
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
        document.getElementById('voices').addEventListener('input', (e) => {
            this.voices = parseInt(e.target.value);
            document.getElementById('voicesValue').textContent = this.voices;
            if (this.audioBuffer) this.drawChorusVisualization();
        });

        document.getElementById('rate').addEventListener('input', (e) => {
            this.rate = parseInt(e.target.value);
            document.getElementById('rateValue').textContent = (this.rate / 10).toFixed(1) + ' Hz';
            if (this.audioBuffer) this.drawChorusVisualization();
        });

        document.getElementById('depth').addEventListener('input', (e) => {
            this.depth = parseInt(e.target.value);
            document.getElementById('depthValue').textContent = this.depth + '%';
            if (this.audioBuffer) this.drawChorusVisualization();
        });

        document.getElementById('delay').addEventListener('input', (e) => {
            this.delay = parseInt(e.target.value);
            document.getElementById('delayValue').textContent = this.delay + ' ms';
        });

        document.getElementById('mix').addEventListener('input', (e) => {
            this.mix = parseInt(e.target.value);
            document.getElementById('mixValue').textContent = this.mix + '%';
        });

        document.getElementById('feedback').addEventListener('input', (e) => {
            this.feedback = parseInt(e.target.value);
            document.getElementById('feedbackValue').textContent = this.feedback + '%';
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
            if (this.audioBuffer) this.drawChorusVisualization();
        });
    }

    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        this.voices = preset.voices;
        this.rate = preset.rate;
        this.depth = preset.depth;
        this.delay = preset.delay;
        this.mix = preset.mix;
        this.feedback = preset.feedback;

        // Update sliders
        document.getElementById('voices').value = this.voices;
        document.getElementById('voicesValue').textContent = this.voices;

        document.getElementById('rate').value = this.rate;
        document.getElementById('rateValue').textContent = (this.rate / 10).toFixed(1) + ' Hz';

        document.getElementById('depth').value = this.depth;
        document.getElementById('depthValue').textContent = this.depth + '%';

        document.getElementById('delay').value = this.delay;
        document.getElementById('delayValue').textContent = this.delay + ' ms';

        document.getElementById('mix').value = this.mix;
        document.getElementById('mixValue').textContent = this.mix + '%';

        document.getElementById('feedback').value = this.feedback;
        document.getElementById('feedbackValue').textContent = this.feedback + '%';

        if (this.audioBuffer) this.drawChorusVisualization();
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
            this.chorusPanel.classList.add('show');
            this.visualizerSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawChorusVisualization();

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

    drawChorusVisualization() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 100;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw LFO waves for each voice
        const lfoRate = this.rate / 10;  // Hz
        const amplitude = (this.depth / 100) * 30;
        const period = width / (lfoRate * 2);  // 2 cycles visible

        const colors = [
            '#10b981', '#34d399', '#6ee7b7',
            '#059669', '#047857', '#065f46'
        ];

        // Draw each voice's LFO
        for (let v = 0; v < this.voices; v++) {
            const phaseOffset = (v / this.voices) * Math.PI * 2;
            const color = colors[v % colors.length];

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            for (let x = 0; x < width; x++) {
                const t = (x / period) * Math.PI * 2 + phaseOffset;
                const y = centerY + Math.sin(t) * amplitude;

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
        this.ctx.fillStyle = '#34d399';
        this.ctx.font = '11px sans-serif';
        this.ctx.fillText(`${this.voices} Voices`, 10, 15);
        this.ctx.fillText(`${(this.rate / 10).toFixed(1)} Hz`, width - 50, 15);
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
            const lfoRate = this.rate / 10;  // Hz
            const lfoOmega = 2 * Math.PI * lfoRate / sampleRate;
            const depthSamples = (this.depth / 100) * (this.delay / 1000) * sampleRate;
            const baseDelaySamples = Math.floor(this.delay * sampleRate / 1000);
            const maxDelaySamples = baseDelaySamples + Math.ceil(depthSamples) + 10;
            const wetGain = this.mix / 100;
            const dryGain = 1 - wetGain;
            const feedbackGain = this.feedback / 100;

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                // Create delay lines for each voice
                const delayLines = [];
                const lfoPhases = [];

                for (let v = 0; v < this.voices; v++) {
                    delayLines.push(new Float32Array(maxDelaySamples));
                    lfoPhases.push((v / this.voices) * Math.PI * 2);
                }

                let writeIndex = 0;

                for (let i = 0; i < length; i++) {
                    let wetSum = 0;

                    // Process each voice
                    for (let v = 0; v < this.voices; v++) {
                        // Calculate modulated delay
                        const lfoValue = Math.sin(lfoOmega * i + lfoPhases[v]);
                        const modulatedDelay = baseDelaySamples + lfoValue * depthSamples;

                        // Read from delay line with linear interpolation
                        const readPos = writeIndex - modulatedDelay;
                        const readIndex = ((Math.floor(readPos) % maxDelaySamples) + maxDelaySamples) % maxDelaySamples;
                        const readIndexNext = (readIndex + 1) % maxDelaySamples;
                        const frac = readPos - Math.floor(readPos);

                        const sample1 = delayLines[v][readIndex];
                        const sample2 = delayLines[v][readIndexNext];
                        const interpolated = sample1 + (sample2 - sample1) * frac;

                        wetSum += interpolated;

                        // Write to delay line (input + feedback)
                        delayLines[v][writeIndex] = input[i] + interpolated * feedbackGain;
                    }

                    // Average wet signal
                    wetSum /= this.voices;

                    // Mix dry and wet
                    const mixed = input[i] * dryGain + wetSum * wetGain;

                    // Soft clip
                    output[i] = Math.tanh(mixed);

                    // Advance write index
                    writeIndex = (writeIndex + 1) % maxDelaySamples;

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
                    subtle: '輕微', standard: '標準', rich: '豐富', deep: '深厚'
                };
                modeName = labels[btn.dataset.mode] || modeName;
            });

            // Update results
            document.getElementById('resultInfo').textContent =
                `模式: ${modeName} | 聲部: ${this.voices} | 速率: ${(this.rate / 10).toFixed(1)}Hz | 處理時間: ${processingTime}秒`;

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
        link.download = `${this.originalFileName}_chorus.${extension}`;
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
    new AudioChorus();
});
