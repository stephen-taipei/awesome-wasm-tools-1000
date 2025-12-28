/**
 * AUD-056 音頻延遲 - Audio Delay
 * Echo/Delay effect with feedback and damping
 */

class AudioDelay {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Delay parameters
        this.delayType = 'simple';  // simple, ping-pong, multi-tap
        this.delayTime = 300;       // ms
        this.feedback = 40;         // %
        this.mix = 50;              // %
        this.damping = 30;          // %

        this.canvas = document.getElementById('delayCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.delayPanel = document.getElementById('delayPanel');
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

        // Delay type buttons
        document.querySelectorAll('.delay-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.delay-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.delayType = btn.dataset.type;
                if (this.audioBuffer) this.drawDelayVisualization();
            });
        });

        // Control sliders
        document.getElementById('delayTime').addEventListener('input', (e) => {
            this.delayTime = parseInt(e.target.value);
            document.getElementById('delayTimeValue').textContent = this.delayTime + ' ms';
            if (this.audioBuffer) this.drawDelayVisualization();
        });

        document.getElementById('feedback').addEventListener('input', (e) => {
            this.feedback = parseInt(e.target.value);
            document.getElementById('feedbackValue').textContent = this.feedback + '%';
            if (this.audioBuffer) this.drawDelayVisualization();
        });

        document.getElementById('mix').addEventListener('input', (e) => {
            this.mix = parseInt(e.target.value);
            document.getElementById('mixValue').textContent = this.mix + '%';
        });

        document.getElementById('damping').addEventListener('input', (e) => {
            this.damping = parseInt(e.target.value);
            document.getElementById('dampingValue').textContent = this.damping + '%';
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
            if (this.audioBuffer) this.drawDelayVisualization();
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
            this.delayPanel.classList.add('show');
            this.visualizerSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawDelayVisualization();

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

    drawDelayVisualization() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 100;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw delay taps visualization
        const maxTaps = 6;
        const feedbackRatio = this.feedback / 100;
        const delayPixels = Math.min((this.delayTime / 2000) * (width * 0.8), width * 0.8 / maxTaps);

        // Original signal
        this.ctx.fillStyle = '#7dd3fc';
        this.ctx.fillRect(20, centerY - 30, 10, 60);

        // Draw delay taps
        let amplitude = 1;
        const startX = 40;

        for (let i = 0; i < maxTaps && amplitude > 0.05; i++) {
            amplitude *= feedbackRatio;
            const x = startX + (i + 1) * delayPixels;
            const barHeight = 60 * amplitude;

            if (x > width - 20) break;

            // Different colors for different delay types
            if (this.delayType === 'ping-pong') {
                this.ctx.fillStyle = i % 2 === 0 ? '#0ea5e9' : '#38bdf8';
            } else if (this.delayType === 'multi-tap') {
                const hue = 195 + i * 15;
                this.ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
            } else {
                this.ctx.fillStyle = `rgba(14, 165, 233, ${0.8 - i * 0.1})`;
            }

            this.ctx.fillRect(x, centerY - barHeight / 2, 8, barHeight);

            // Draw connection line
            this.ctx.strokeStyle = 'rgba(125, 211, 252, 0.3)';
            this.ctx.beginPath();
            if (i === 0) {
                this.ctx.moveTo(30, centerY);
            } else {
                this.ctx.moveTo(x - delayPixels + 8, centerY);
            }
            this.ctx.lineTo(x, centerY);
            this.ctx.stroke();
        }

        // Draw delay type label
        this.ctx.fillStyle = '#7dd3fc';
        this.ctx.font = '12px sans-serif';
        const typeLabels = {
            'simple': 'Simple Delay',
            'ping-pong': 'Ping Pong (L/R)',
            'multi-tap': 'Multi-Tap'
        };
        this.ctx.fillText(typeLabels[this.delayType], width - 100, 20);
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

            // Calculate delay samples
            const delaySamples = Math.floor(this.delayTime * sampleRate / 1000);
            const feedbackGain = this.feedback / 100;
            const wetGain = this.mix / 100;
            const dryGain = 1 - wetGain;
            const dampingCoeff = this.damping / 100;

            // For stereo output (ping-pong needs stereo)
            const outputChannels = this.delayType === 'ping-pong' ? 2 : numChannels;

            this.processedBuffer = this.audioContext.createBuffer(
                outputChannels,
                length,
                sampleRate
            );

            if (this.delayType === 'simple') {
                await this.processSimpleDelay(delaySamples, feedbackGain, wetGain, dryGain, dampingCoeff);
            } else if (this.delayType === 'ping-pong') {
                await this.processPingPongDelay(delaySamples, feedbackGain, wetGain, dryGain, dampingCoeff);
            } else {
                await this.processMultiTapDelay(delaySamples, feedbackGain, wetGain, dryGain, dampingCoeff);
            }

            const processingTime = ((performance.now() - startTime) / 1000).toFixed(2);
            this.progressFill.style.width = '100%';

            // Update results
            document.getElementById('resultInfo').textContent =
                `延遲: ${this.delayTime}ms | 反饋: ${this.feedback}% | 混合: ${this.mix}% | 處理時間: ${processingTime}秒`;

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

    async processSimpleDelay(delaySamples, feedbackGain, wetGain, dryGain, dampingCoeff) {
        const numChannels = this.audioBuffer.numberOfChannels;
        const length = this.audioBuffer.length;

        for (let ch = 0; ch < numChannels; ch++) {
            const input = this.audioBuffer.getChannelData(ch);
            const output = this.processedBuffer.getChannelData(ch);

            // Delay buffer
            const delayBuffer = new Float32Array(delaySamples);
            let writePos = 0;
            let prevFiltered = 0;

            for (let i = 0; i < length; i++) {
                // Read from delay buffer
                const delayed = delayBuffer[writePos];

                // Apply damping (simple low-pass filter)
                const filtered = delayed * (1 - dampingCoeff) + prevFiltered * dampingCoeff;
                prevFiltered = filtered;

                // Write to delay buffer with feedback
                delayBuffer[writePos] = input[i] + filtered * feedbackGain;

                // Mix dry and wet
                const sample = input[i] * dryGain + filtered * wetGain;

                // Soft clip
                output[i] = Math.tanh(sample);

                // Advance write position
                writePos = (writePos + 1) % delaySamples;

                // Progress
                if (i % 50000 === 0) {
                    const progress = ((ch + i / length) / numChannels) * 100;
                    this.progressFill.style.width = progress + '%';
                }
            }
        }
    }

    async processPingPongDelay(delaySamples, feedbackGain, wetGain, dryGain, dampingCoeff) {
        const input = this.audioBuffer.getChannelData(0);
        const inputR = this.audioBuffer.numberOfChannels > 1 ?
            this.audioBuffer.getChannelData(1) : input;
        const length = this.audioBuffer.length;

        const outputL = this.processedBuffer.getChannelData(0);
        const outputR = this.processedBuffer.getChannelData(1);

        // Two delay buffers for ping-pong
        const delayBufferL = new Float32Array(delaySamples);
        const delayBufferR = new Float32Array(delaySamples);
        let writePos = 0;
        let prevFilteredL = 0;
        let prevFilteredR = 0;

        for (let i = 0; i < length; i++) {
            // Read from delay buffers
            const delayedL = delayBufferL[writePos];
            const delayedR = delayBufferR[writePos];

            // Apply damping
            const filteredL = delayedL * (1 - dampingCoeff) + prevFilteredL * dampingCoeff;
            const filteredR = delayedR * (1 - dampingCoeff) + prevFilteredR * dampingCoeff;
            prevFilteredL = filteredL;
            prevFilteredR = filteredR;

            // Ping-pong: Left delays to Right, Right delays to Left
            delayBufferL[writePos] = input[i] + filteredR * feedbackGain;
            delayBufferR[writePos] = inputR[i] + filteredL * feedbackGain;

            // Mix
            const sampleL = input[i] * dryGain + filteredL * wetGain;
            const sampleR = inputR[i] * dryGain + filteredR * wetGain;

            // Soft clip
            outputL[i] = Math.tanh(sampleL);
            outputR[i] = Math.tanh(sampleR);

            writePos = (writePos + 1) % delaySamples;

            if (i % 50000 === 0) {
                this.progressFill.style.width = (i / length * 100) + '%';
            }
        }
    }

    async processMultiTapDelay(delaySamples, feedbackGain, wetGain, dryGain, dampingCoeff) {
        const numChannels = this.audioBuffer.numberOfChannels;
        const length = this.audioBuffer.length;

        // Multi-tap: 4 taps at different intervals
        const tapRatios = [0.25, 0.5, 0.75, 1.0];
        const tapGains = [0.7, 0.5, 0.35, 0.25];

        for (let ch = 0; ch < numChannels; ch++) {
            const input = this.audioBuffer.getChannelData(ch);
            const output = this.processedBuffer.getChannelData(ch);

            // Main delay buffer (longest tap)
            const delayBuffer = new Float32Array(delaySamples);
            let writePos = 0;
            let prevFiltered = 0;

            for (let i = 0; i < length; i++) {
                // Sum all taps
                let wetSum = 0;

                for (let t = 0; t < tapRatios.length; t++) {
                    const tapDelay = Math.floor(delaySamples * tapRatios[t]);
                    const readPos = (writePos - tapDelay + delaySamples) % delaySamples;
                    wetSum += delayBuffer[readPos] * tapGains[t];
                }

                // Apply damping
                const filtered = wetSum * (1 - dampingCoeff) + prevFiltered * dampingCoeff;
                prevFiltered = filtered;

                // Write to delay buffer with feedback
                delayBuffer[writePos] = input[i] + filtered * feedbackGain;

                // Mix
                const sample = input[i] * dryGain + filtered * wetGain;

                // Soft clip
                output[i] = Math.tanh(sample);

                writePos = (writePos + 1) % delaySamples;

                if (i % 50000 === 0) {
                    const progress = ((ch + i / length) / numChannels) * 100;
                    this.progressFill.style.width = progress + '%';
                }
            }
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
        link.download = `${this.originalFileName}_delay.${extension}`;
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
    new AudioDelay();
});
