/**
 * AUD-059 音頻鎡射 - Audio Flanger
 * Creates jet plane sweeping effect using short modulated delay
 */

class AudioFlanger {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Flanger parameters
        this.rate = 25;           // LFO rate (0.01 Hz units, so 25 = 0.25 Hz)
        this.depth = 60;          // Modulation depth %
        this.delay = 5;           // Base delay ms
        this.feedback = 50;       // Feedback % (can be negative)
        this.mix = 50;            // Dry/wet mix %
        this.stereo = 90;         // Stereo phase offset degrees

        // Presets
        this.presets = {
            subtle: { rate: 15, depth: 30, delay: 3, feedback: 25, mix: 40, stereo: 45 },
            classic: { rate: 25, depth: 60, delay: 5, feedback: 50, mix: 50, stereo: 90 },
            jet: { rate: 10, depth: 90, delay: 8, feedback: 75, mix: 60, stereo: 120 },
            metallic: { rate: 50, depth: 80, delay: 2, feedback: 85, mix: 50, stereo: 180 }
        };

        this.canvas = document.getElementById('flangerCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.flangerPanel = document.getElementById('flangerPanel');
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
        document.getElementById('rate').addEventListener('input', (e) => {
            this.rate = parseInt(e.target.value);
            document.getElementById('rateValue').textContent = (this.rate / 100).toFixed(2) + ' Hz';
            if (this.audioBuffer) this.drawFlangerVisualization();
        });

        document.getElementById('depth').addEventListener('input', (e) => {
            this.depth = parseInt(e.target.value);
            document.getElementById('depthValue').textContent = this.depth + '%';
            if (this.audioBuffer) this.drawFlangerVisualization();
        });

        document.getElementById('delay').addEventListener('input', (e) => {
            this.delay = parseInt(e.target.value);
            document.getElementById('delayValue').textContent = this.delay + ' ms';
        });

        document.getElementById('feedback').addEventListener('input', (e) => {
            this.feedback = parseInt(e.target.value);
            document.getElementById('feedbackValue').textContent = this.feedback + '%';
        });

        document.getElementById('mix').addEventListener('input', (e) => {
            this.mix = parseInt(e.target.value);
            document.getElementById('mixValue').textContent = this.mix + '%';
        });

        document.getElementById('stereo').addEventListener('input', (e) => {
            this.stereo = parseInt(e.target.value);
            document.getElementById('stereoValue').textContent = this.stereo + '°';
            if (this.audioBuffer) this.drawFlangerVisualization();
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
            if (this.audioBuffer) this.drawFlangerVisualization();
        });
    }

    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        this.rate = preset.rate;
        this.depth = preset.depth;
        this.delay = preset.delay;
        this.feedback = preset.feedback;
        this.mix = preset.mix;
        this.stereo = preset.stereo;

        // Update sliders
        document.getElementById('rate').value = this.rate;
        document.getElementById('rateValue').textContent = (this.rate / 100).toFixed(2) + ' Hz';

        document.getElementById('depth').value = this.depth;
        document.getElementById('depthValue').textContent = this.depth + '%';

        document.getElementById('delay').value = this.delay;
        document.getElementById('delayValue').textContent = this.delay + ' ms';

        document.getElementById('feedback').value = this.feedback;
        document.getElementById('feedbackValue').textContent = this.feedback + '%';

        document.getElementById('mix').value = this.mix;
        document.getElementById('mixValue').textContent = this.mix + '%';

        document.getElementById('stereo').value = this.stereo;
        document.getElementById('stereoValue').textContent = this.stereo + '°';

        if (this.audioBuffer) this.drawFlangerVisualization();
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
            this.flangerPanel.classList.add('show');
            this.visualizerSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawFlangerVisualization();

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

    drawFlangerVisualization() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 100;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw LFO wave and stereo offset
        const lfoRate = this.rate / 100;  // Hz
        const amplitude = (this.depth / 100) * 35;
        const period = width / (lfoRate * 4);  // Show 4 cycles
        const stereoOffset = (this.stereo / 180) * Math.PI;

        // Draw left channel LFO (orange)
        this.ctx.strokeStyle = '#f97316';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const t = (x / period) * Math.PI * 2;
            const y = centerY + Math.sin(t) * amplitude;

            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw right channel LFO (lighter orange, with phase offset)
        if (this.stereo > 0) {
            this.ctx.strokeStyle = '#fed7aa';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            for (let x = 0; x < width; x++) {
                const t = (x / period) * Math.PI * 2 + stereoOffset;
                const y = centerY + Math.sin(t) * amplitude;

                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }

        // Draw feedback indicator
        const fbHeight = Math.abs(this.feedback) * 0.4;
        const fbColor = this.feedback >= 0 ? '#10b981' : '#ef4444';
        this.ctx.fillStyle = fbColor;
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillRect(width - 40, centerY - fbHeight / 2, 30, fbHeight);
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
        this.ctx.fillStyle = '#fb923c';
        this.ctx.font = '11px sans-serif';
        this.ctx.fillText(`Rate: ${(this.rate / 100).toFixed(2)} Hz`, 10, 15);
        this.ctx.fillText(`Stereo: ${this.stereo}°`, width / 2 - 30, 15);
        this.ctx.fillText(`FB: ${this.feedback}%`, width - 60, 15);
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

            // Force stereo output for stereo flanger
            const outputChannels = 2;

            this.processedBuffer = this.audioContext.createBuffer(
                outputChannels,
                length,
                sampleRate
            );

            // Parameters
            const lfoRate = this.rate / 100;  // Hz
            const lfoOmega = 2 * Math.PI * lfoRate / sampleRate;
            const baseDelaySamples = Math.floor(this.delay * sampleRate / 1000);
            const depthSamples = (this.depth / 100) * baseDelaySamples;
            const maxDelaySamples = baseDelaySamples + Math.ceil(depthSamples) + 10;
            const feedbackGain = this.feedback / 100;
            const wetGain = this.mix / 100;
            const dryGain = 1 - wetGain;
            const stereoOffset = (this.stereo / 180) * Math.PI;

            // Get input channels
            const inputL = this.audioBuffer.getChannelData(0);
            const inputR = numChannels > 1 ? this.audioBuffer.getChannelData(1) : inputL;
            const outputL = this.processedBuffer.getChannelData(0);
            const outputR = this.processedBuffer.getChannelData(1);

            // Create delay lines
            const delayLineL = new Float32Array(maxDelaySamples);
            const delayLineR = new Float32Array(maxDelaySamples);
            let writeIndex = 0;

            for (let i = 0; i < length; i++) {
                // Calculate modulated delays for left and right
                const lfoL = Math.sin(lfoOmega * i);
                const lfoR = Math.sin(lfoOmega * i + stereoOffset);

                const modulatedDelayL = baseDelaySamples + lfoL * depthSamples;
                const modulatedDelayR = baseDelaySamples + lfoR * depthSamples;

                // Read from delay lines with linear interpolation
                const readDelayed = (delayLine, modulatedDelay) => {
                    const readPos = writeIndex - modulatedDelay;
                    const readIndex = ((Math.floor(readPos) % maxDelaySamples) + maxDelaySamples) % maxDelaySamples;
                    const readIndexNext = (readIndex + 1) % maxDelaySamples;
                    const frac = readPos - Math.floor(readPos);

                    return delayLine[readIndex] + (delayLine[readIndexNext] - delayLine[readIndex]) * frac;
                };

                const delayedL = readDelayed(delayLineL, modulatedDelayL);
                const delayedR = readDelayed(delayLineR, modulatedDelayR);

                // Write to delay lines (input + feedback)
                delayLineL[writeIndex] = inputL[i] + delayedL * feedbackGain;
                delayLineR[writeIndex] = inputR[i] + delayedR * feedbackGain;

                // Mix dry and wet
                const mixedL = inputL[i] * dryGain + delayedL * wetGain;
                const mixedR = inputR[i] * dryGain + delayedR * wetGain;

                // Soft clip
                outputL[i] = Math.tanh(mixedL);
                outputR[i] = Math.tanh(mixedR);

                // Advance write index
                writeIndex = (writeIndex + 1) % maxDelaySamples;

                // Progress
                if (i % 50000 === 0) {
                    this.progressFill.style.width = (i / length * 100) + '%';
                }
            }

            const processingTime = ((performance.now() - startTime) / 1000).toFixed(2);
            this.progressFill.style.width = '100%';

            // Find mode name
            let modeName = '自訂';
            document.querySelectorAll('.mode-btn.active').forEach(btn => {
                const labels = {
                    subtle: '輕微', classic: '經典', jet: '噴射機', metallic: '金屬'
                };
                modeName = labels[btn.dataset.mode] || modeName;
            });

            // Update results
            document.getElementById('resultInfo').textContent =
                `模式: ${modeName} | 速率: ${(this.rate / 100).toFixed(2)}Hz | 反饋: ${this.feedback}% | 處理時間: ${processingTime}秒`;

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
        link.download = `${this.originalFileName}_flanger.${extension}`;
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
    new AudioFlanger();
});
