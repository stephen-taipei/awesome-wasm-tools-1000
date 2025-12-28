/**
 * AUD-057 音頻混響 - Audio Reverb
 * Algorithmic reverb using Schroeder-style comb and allpass filters
 */

class AudioReverb {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Reverb parameters
        this.decayTime = 2000;    // ms
        this.preDelay = 20;       // ms
        this.mix = 35;            // %
        this.damping = 50;        // %
        this.diffusion = 70;      // %
        this.roomSize = 50;       // %

        // Presets
        this.presets = {
            room: { decayTime: 800, preDelay: 10, mix: 25, damping: 60, diffusion: 80, roomSize: 30 },
            hall: { decayTime: 2000, preDelay: 20, mix: 35, damping: 50, diffusion: 70, roomSize: 50 },
            church: { decayTime: 4000, preDelay: 40, mix: 45, damping: 40, diffusion: 80, roomSize: 80 },
            plate: { decayTime: 1500, preDelay: 5, mix: 40, damping: 30, diffusion: 90, roomSize: 40 },
            spring: { decayTime: 1200, preDelay: 15, mix: 30, damping: 70, diffusion: 50, roomSize: 25 },
            cave: { decayTime: 6000, preDelay: 60, mix: 50, damping: 25, diffusion: 60, roomSize: 100 }
        };

        this.canvas = document.getElementById('reverbCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.reverbPanel = document.getElementById('reverbPanel');
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

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyPreset(btn.dataset.preset);
            });
        });

        // Control sliders
        document.getElementById('decayTime').addEventListener('input', (e) => {
            this.decayTime = parseInt(e.target.value);
            document.getElementById('decayTimeValue').textContent = (this.decayTime / 1000).toFixed(1) + ' s';
            if (this.audioBuffer) this.drawReverbVisualization();
        });

        document.getElementById('preDelay').addEventListener('input', (e) => {
            this.preDelay = parseInt(e.target.value);
            document.getElementById('preDelayValue').textContent = this.preDelay + ' ms';
            if (this.audioBuffer) this.drawReverbVisualization();
        });

        document.getElementById('mix').addEventListener('input', (e) => {
            this.mix = parseInt(e.target.value);
            document.getElementById('mixValue').textContent = this.mix + '%';
        });

        document.getElementById('damping').addEventListener('input', (e) => {
            this.damping = parseInt(e.target.value);
            document.getElementById('dampingValue').textContent = this.damping + '%';
        });

        document.getElementById('diffusion').addEventListener('input', (e) => {
            this.diffusion = parseInt(e.target.value);
            document.getElementById('diffusionValue').textContent = this.diffusion + '%';
        });

        document.getElementById('roomSize').addEventListener('input', (e) => {
            this.roomSize = parseInt(e.target.value);
            document.getElementById('roomSizeValue').textContent = this.roomSize + '%';
            if (this.audioBuffer) this.drawReverbVisualization();
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
            if (this.audioBuffer) this.drawReverbVisualization();
        });
    }

    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        this.decayTime = preset.decayTime;
        this.preDelay = preset.preDelay;
        this.mix = preset.mix;
        this.damping = preset.damping;
        this.diffusion = preset.diffusion;
        this.roomSize = preset.roomSize;

        // Update sliders
        document.getElementById('decayTime').value = this.decayTime;
        document.getElementById('decayTimeValue').textContent = (this.decayTime / 1000).toFixed(1) + ' s';

        document.getElementById('preDelay').value = this.preDelay;
        document.getElementById('preDelayValue').textContent = this.preDelay + ' ms';

        document.getElementById('mix').value = this.mix;
        document.getElementById('mixValue').textContent = this.mix + '%';

        document.getElementById('damping').value = this.damping;
        document.getElementById('dampingValue').textContent = this.damping + '%';

        document.getElementById('diffusion').value = this.diffusion;
        document.getElementById('diffusionValue').textContent = this.diffusion + '%';

        document.getElementById('roomSize').value = this.roomSize;
        document.getElementById('roomSizeValue').textContent = this.roomSize + '%';

        if (this.audioBuffer) this.drawReverbVisualization();
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
            this.reverbPanel.classList.add('show');
            this.visualizerSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

            this.drawReverbVisualization();

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

    drawReverbVisualization() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 100;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw impulse response visualization
        const decaySeconds = this.decayTime / 1000;
        const preDelaySeconds = this.preDelay / 1000;
        const totalTime = preDelaySeconds + decaySeconds;
        const pixelsPerSecond = (width - 60) / totalTime;

        // Draw time axis
        this.ctx.strokeStyle = '#4b5563';
        this.ctx.beginPath();
        this.ctx.moveTo(30, centerY);
        this.ctx.lineTo(width - 20, centerY);
        this.ctx.stroke();

        // Draw direct signal
        this.ctx.fillStyle = '#a855f7';
        this.ctx.fillRect(30, centerY - 35, 4, 70);

        // Draw pre-delay marker
        const preDelayX = 30 + preDelaySeconds * pixelsPerSecond;
        if (preDelaySeconds > 0) {
            this.ctx.strokeStyle = '#c084fc';
            this.ctx.setLineDash([3, 3]);
            this.ctx.beginPath();
            this.ctx.moveTo(preDelayX, 10);
            this.ctx.lineTo(preDelayX, height - 10);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw early reflections
        const numEarlyReflections = Math.floor(this.diffusion / 10) + 3;
        const earlySpan = Math.min(0.1, decaySeconds * 0.15);

        for (let i = 0; i < numEarlyReflections; i++) {
            const t = preDelaySeconds + (i + 1) * earlySpan / numEarlyReflections;
            const x = 30 + t * pixelsPerSecond;
            const amplitude = 0.7 - i * 0.08;
            const barHeight = amplitude * 60;

            this.ctx.fillStyle = `rgba(168, 85, 247, ${0.8 - i * 0.1})`;
            this.ctx.fillRect(x, centerY - barHeight / 2, 3, barHeight);
        }

        // Draw decay tail
        const tailStart = preDelaySeconds + earlySpan;
        const tailSamples = 50;
        const roomScale = 0.5 + (this.roomSize / 100) * 0.5;

        this.ctx.beginPath();
        this.ctx.moveTo(30 + tailStart * pixelsPerSecond, centerY);

        for (let i = 0; i < tailSamples; i++) {
            const t = tailStart + (i / tailSamples) * (decaySeconds - earlySpan);
            const x = 30 + t * pixelsPerSecond;
            const decay = Math.exp(-3 * (t - tailStart) / (decaySeconds * roomScale));
            const noise = (Math.random() - 0.5) * 0.3;
            const y = centerY - (decay + noise * decay) * 30;

            this.ctx.lineTo(x, y);
        }

        // Mirror for bottom
        for (let i = tailSamples - 1; i >= 0; i--) {
            const t = tailStart + (i / tailSamples) * (decaySeconds - earlySpan);
            const x = 30 + t * pixelsPerSecond;
            const decay = Math.exp(-3 * (t - tailStart) / (decaySeconds * roomScale));
            const noise = (Math.random() - 0.5) * 0.3;
            const y = centerY + (decay + noise * decay) * 30;

            this.ctx.lineTo(x, y);
        }

        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
        this.ctx.fill();

        // Labels
        this.ctx.fillStyle = '#c084fc';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText('Direct', 30, height - 5);
        this.ctx.fillText('Early', preDelayX + 10, 15);
        this.ctx.fillText('Tail', width - 50, 15);
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

            // Add extra samples for reverb tail
            const tailSamples = Math.floor(this.decayTime * sampleRate / 1000);
            const outputLength = length + tailSamples;

            this.processedBuffer = this.audioContext.createBuffer(
                numChannels,
                outputLength,
                sampleRate
            );

            // Process parameters
            const preDelaySamples = Math.floor(this.preDelay * sampleRate / 1000);
            const wetGain = this.mix / 100;
            const dryGain = 1 - wetGain;
            const dampingCoeff = this.damping / 100;
            const diffusionCoeff = this.diffusion / 100;
            const roomScale = 0.3 + (this.roomSize / 100) * 0.7;

            // Create reverb processors for each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                // Create comb filters (parallel)
                const combDelays = [
                    Math.floor(1557 * roomScale),
                    Math.floor(1617 * roomScale),
                    Math.floor(1491 * roomScale),
                    Math.floor(1422 * roomScale),
                    Math.floor(1277 * roomScale),
                    Math.floor(1356 * roomScale),
                    Math.floor(1188 * roomScale),
                    Math.floor(1116 * roomScale)
                ];

                const combBuffers = combDelays.map(d => new Float32Array(d));
                const combIndexes = new Array(8).fill(0);
                const combFilters = new Array(8).fill(0);

                // Comb filter feedback based on decay time
                const combFeedback = Math.pow(0.001, 1 / (this.decayTime / 1000 * sampleRate / combDelays[0]));

                // Create allpass filters (serial)
                const allpassDelays = [
                    Math.floor(225 * roomScale),
                    Math.floor(556 * roomScale),
                    Math.floor(441 * roomScale),
                    Math.floor(341 * roomScale)
                ];

                const allpassBuffers = allpassDelays.map(d => new Float32Array(d));
                const allpassIndexes = new Array(4).fill(0);
                const allpassCoeff = 0.5 * diffusionCoeff;

                // Pre-delay buffer
                const preDelayBuffer = new Float32Array(Math.max(preDelaySamples, 1));
                let preDelayIndex = 0;

                // Process each sample
                for (let i = 0; i < outputLength; i++) {
                    // Get input (with pre-delay)
                    let inputSample = i < length ? input[i] : 0;

                    // Pre-delay
                    const delayed = preDelayBuffer[preDelayIndex];
                    preDelayBuffer[preDelayIndex] = inputSample;
                    preDelayIndex = (preDelayIndex + 1) % preDelayBuffer.length;

                    // Parallel comb filters
                    let combSum = 0;
                    for (let c = 0; c < 8; c++) {
                        const bufLen = combBuffers[c].length;
                        const bufOut = combBuffers[c][combIndexes[c]];

                        // Apply damping (low-pass filter)
                        combFilters[c] = bufOut * (1 - dampingCoeff) + combFilters[c] * dampingCoeff;

                        // Write to buffer with feedback
                        combBuffers[c][combIndexes[c]] = delayed + combFilters[c] * combFeedback;
                        combIndexes[c] = (combIndexes[c] + 1) % bufLen;

                        combSum += bufOut;
                    }

                    // Average comb outputs
                    let wetSample = combSum / 8;

                    // Serial allpass filters
                    for (let a = 0; a < 4; a++) {
                        const bufLen = allpassBuffers[a].length;
                        const bufOut = allpassBuffers[a][allpassIndexes[a]];

                        allpassBuffers[a][allpassIndexes[a]] = wetSample + bufOut * allpassCoeff;
                        wetSample = bufOut - wetSample * allpassCoeff;

                        allpassIndexes[a] = (allpassIndexes[a] + 1) % bufLen;
                    }

                    // Mix dry and wet
                    const drySample = i < length ? input[i] : 0;
                    const mixed = drySample * dryGain + wetSample * wetGain;

                    // Soft clip
                    output[i] = Math.tanh(mixed);

                    // Progress
                    if (i % 50000 === 0) {
                        const progress = ((ch + i / outputLength) / numChannels) * 100;
                        this.progressFill.style.width = progress + '%';
                    }
                }
            }

            const processingTime = ((performance.now() - startTime) / 1000).toFixed(2);
            this.progressFill.style.width = '100%';

            // Find preset name
            let presetName = '自訂';
            document.querySelectorAll('.preset-btn.active').forEach(btn => {
                const labels = {
                    room: '小房間', hall: '音樂廳', church: '教堂',
                    plate: '鐵板', spring: '彈簧', cave: '洞穴'
                };
                presetName = labels[btn.dataset.preset] || presetName;
            });

            // Update results
            document.getElementById('resultInfo').textContent =
                `預設: ${presetName} | 混響: ${(this.decayTime / 1000).toFixed(1)}s | 混合: ${this.mix}% | 處理時間: ${processingTime}秒`;

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
        link.download = `${this.originalFileName}_reverb.${extension}`;
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
    new AudioReverb();
});
