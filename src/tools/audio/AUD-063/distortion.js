/**
 * AUD-063 音頻失真 - Audio Distortion
 * 過載與破音效果處理器
 */

class AudioDistortion {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.fileName = '';
        this.distortionType = 'overdrive';
        this.outputFormat = 'wav';
        this.processedBlob = null;

        this.initElements();
        this.bindEvents();
        this.drawDistortionCurve();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.distortionPanel = document.getElementById('distortionPanel');
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

        this.driveSlider = document.getElementById('drive');
        this.toneSlider = document.getElementById('tone');
        this.levelSlider = document.getElementById('level');
        this.mixSlider = document.getElementById('mix');

        this.driveValue = document.getElementById('driveValue');
        this.toneValue = document.getElementById('toneValue');
        this.levelValue = document.getElementById('levelValue');
        this.mixValue = document.getElementById('mixValue');

        this.canvas = document.getElementById('distortionCanvas');
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

        // Distortion type buttons
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.distortionType = btn.dataset.type;
                this.drawDistortionCurve();
            });
        });

        // Sliders
        this.driveSlider.addEventListener('input', () => {
            this.driveValue.textContent = `${this.driveSlider.value}%`;
            this.drawDistortionCurve();
        });
        this.toneSlider.addEventListener('input', () => {
            this.toneValue.textContent = `${this.toneSlider.value}%`;
        });
        this.levelSlider.addEventListener('input', () => {
            this.levelValue.textContent = `${this.levelSlider.value}%`;
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
        this.distortionPanel.classList.add('show');
        this.visualizerSection.classList.add('show');
        this.outputSettings.classList.add('show');
        this.processBtn.classList.add('show');
        this.resultPanel.classList.remove('show');
    }

    drawDistortionCurve() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        const width = rect.width;
        const height = rect.height;
        const drive = parseInt(this.driveSlider.value) / 100;

        // Clear canvas
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.ctx.strokeStyle = 'rgba(220, 38, 38, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(width / 2, 0);
        this.ctx.lineTo(width / 2, height);
        this.ctx.moveTo(0, height / 2);
        this.ctx.lineTo(width, height / 2);
        this.ctx.stroke();

        // Draw distortion curve
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const input = (x / width) * 2 - 1; // -1 to 1
            const output = this.applyDistortionCurve(input, drive, this.distortionType);
            const y = height / 2 - (output * height / 2);

            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw linear reference
        this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, height);
        this.ctx.lineTo(width, 0);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    applyDistortionCurve(input, drive, type) {
        const gain = 1 + drive * 10;
        let output;

        switch (type) {
            case 'soft':
                // Soft clipping using tanh
                output = Math.tanh(input * gain) / Math.tanh(gain);
                break;

            case 'overdrive':
                // Asymmetric soft clipping
                const x = input * gain;
                if (x < -1) {
                    output = -2/3;
                } else if (x < 0) {
                    output = x - (x * x * x) / 3;
                } else if (x < 1) {
                    output = x - (x * x * x) / 3;
                } else {
                    output = 2/3;
                }
                output = output / (2/3);
                break;

            case 'hard':
                // Hard clipping
                const threshold = 1 / (1 + drive * 5);
                output = Math.max(-threshold, Math.min(threshold, input * gain));
                output = output / threshold;
                break;

            case 'fuzz':
                // Extreme distortion with asymmetric clipping
                const fuzzGain = 1 + drive * 20;
                const fuzzed = input * fuzzGain;
                if (fuzzed > 0) {
                    output = 1 - Math.exp(-fuzzed);
                } else {
                    output = -1 + Math.exp(fuzzed);
                }
                break;

            case 'bitcrush':
                // Bit reduction simulation
                const bits = Math.max(2, Math.floor(16 - drive * 14));
                const levels = Math.pow(2, bits);
                output = Math.round(input * gain * levels / 2) / (levels / 2);
                output = Math.max(-1, Math.min(1, output));
                break;

            default:
                output = input;
        }

        return Math.max(-1, Math.min(1, output));
    }

    async processAudio() {
        if (!this.audioBuffer) return;

        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        const drive = parseInt(this.driveSlider.value) / 100;
        const tone = parseInt(this.toneSlider.value) / 100;
        const level = parseInt(this.levelSlider.value) / 100;
        const mix = parseInt(this.mixSlider.value) / 100;

        try {
            const processedBuffer = await this.applyDistortion(
                this.audioBuffer,
                this.distortionType,
                drive,
                tone,
                level,
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

    async applyDistortion(buffer, type, drive, tone, level, mix) {
        const sampleRate = buffer.sampleRate;
        const channels = buffer.numberOfChannels;
        const length = buffer.length;

        const offlineCtx = new OfflineAudioContext(channels, length, sampleRate);
        const outputBuffer = offlineCtx.createBuffer(channels, length, sampleRate);

        const gain = 1 + drive * 10;
        const outputLevel = level * 2;

        // Tone filter coefficient (simple one-pole lowpass)
        const toneFreq = 1000 + tone * 10000;
        const toneCoeff = Math.exp(-2 * Math.PI * toneFreq / sampleRate);

        for (let channel = 0; channel < channels; channel++) {
            const input = buffer.getChannelData(channel);
            const output = outputBuffer.getChannelData(channel);

            let filterState = 0;

            for (let i = 0; i < length; i++) {
                // Update progress
                if (i % 50000 === 0) {
                    const progress = ((channel * length + i) / (channels * length)) * 100;
                    this.progressFill.style.width = `${progress}%`;
                    await new Promise(r => setTimeout(r, 0));
                }

                let sample = input[i];
                const drySample = sample;

                // Apply gain
                sample *= gain;

                // Apply distortion based on type
                switch (type) {
                    case 'soft':
                        sample = Math.tanh(sample);
                        break;

                    case 'overdrive':
                        if (sample < -1) {
                            sample = -2/3;
                        } else if (sample < 1) {
                            sample = sample - (sample * sample * sample) / 3;
                        } else {
                            sample = 2/3;
                        }
                        sample = sample * 1.5;
                        break;

                    case 'hard':
                        const threshold = 1 / (1 + drive * 5);
                        sample = Math.max(-threshold, Math.min(threshold, sample));
                        sample = sample / threshold;
                        break;

                    case 'fuzz':
                        if (sample > 0) {
                            sample = 1 - Math.exp(-sample * (1 + drive * 3));
                        } else {
                            sample = -1 + Math.exp(sample * (1 + drive * 3));
                        }
                        break;

                    case 'bitcrush':
                        const bits = Math.max(2, Math.floor(16 - drive * 14));
                        const levels = Math.pow(2, bits);
                        sample = Math.round(sample * levels / 2) / (levels / 2);

                        // Optional: sample rate reduction
                        if (drive > 0.5) {
                            const srReduction = Math.floor(1 + (drive - 0.5) * 10);
                            if (i % srReduction !== 0 && i > 0) {
                                sample = output[i - 1] / outputLevel; // Use previous sample
                            }
                        }
                        break;
                }

                // Apply tone filter (lowpass)
                filterState = sample + toneCoeff * (filterState - sample);
                sample = filterState;

                // Apply output level
                sample *= outputLevel;

                // Mix dry and wet
                sample = drySample * (1 - mix) + sample * mix;

                // Soft clip output
                sample = Math.tanh(sample);

                output[i] = sample;
            }
        }

        this.progressFill.style.width = '100%';
        return outputBuffer;
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
        const typeNames = {
            soft: '軟限幅',
            overdrive: '過載',
            hard: '硬限幅',
            fuzz: '模糊',
            bitcrush: '位元破碎'
        };
        this.resultInfo.textContent = `失真類型: ${typeNames[this.distortionType]} | 格式: ${this.outputFormat.toUpperCase()} | 大小: ${size} KB`;
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
        a.download = `${baseName}_distortion.${ext}`;
        a.click();

        URL.revokeObjectURL(url);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AudioDistortion();
});
