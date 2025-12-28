/**
 * AUD-052 音頻壓縮器 - Audio Compressor
 * Dynamic range compression with various presets
 */

class AudioCompressor {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        // Compressor parameters
        this.threshold = -24;   // dB
        this.ratio = 4;         // n:1
        this.attack = 10;       // ms
        this.release = 100;     // ms
        this.knee = 10;         // dB
        this.makeup = 0;        // dB

        // Presets
        this.presets = {
            gentle: { threshold: -30, ratio: 2, attack: 30, release: 200, knee: 20, makeup: 3 },
            standard: { threshold: -24, ratio: 4, attack: 10, release: 100, knee: 10, makeup: 6 },
            punch: { threshold: -20, ratio: 6, attack: 1, release: 50, knee: 5, makeup: 8 },
            vocal: { threshold: -18, ratio: 3, attack: 5, release: 80, knee: 15, makeup: 4 },
            broadcast: { threshold: -12, ratio: 8, attack: 3, release: 150, knee: 8, makeup: 10 },
            mastering: { threshold: -6, ratio: 2, attack: 20, release: 300, knee: 6, makeup: 2 }
        };

        // Analysis data
        this.originalPeak = 0;
        this.compressedPeak = 0;
        this.avgGainReduction = 0;

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoPanel = document.getElementById('infoPanel');
        this.compressorPanel = document.getElementById('compressorPanel');
        this.meterSection = document.getElementById('meterSection');
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
            this.updatePresetButtons();
        });

        document.getElementById('ratio').addEventListener('input', (e) => {
            this.ratio = parseInt(e.target.value);
            document.getElementById('ratioValue').textContent = this.ratio + ':1';
            this.updatePresetButtons();
        });

        document.getElementById('attack').addEventListener('input', (e) => {
            this.attack = parseInt(e.target.value);
            document.getElementById('attackValue').textContent = this.attack + ' ms';
            this.updatePresetButtons();
        });

        document.getElementById('release').addEventListener('input', (e) => {
            this.release = parseInt(e.target.value);
            document.getElementById('releaseValue').textContent = this.release + ' ms';
            this.updatePresetButtons();
        });

        document.getElementById('knee').addEventListener('input', (e) => {
            this.knee = parseInt(e.target.value);
            document.getElementById('kneeValue').textContent = this.knee + ' dB';
            this.updatePresetButtons();
        });

        document.getElementById('makeup').addEventListener('input', (e) => {
            this.makeup = parseInt(e.target.value);
            document.getElementById('makeupValue').textContent = this.makeup + ' dB';
            this.updatePresetButtons();
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyPreset(btn.dataset.preset);
            });
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
    }

    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        this.threshold = preset.threshold;
        this.ratio = preset.ratio;
        this.attack = preset.attack;
        this.release = preset.release;
        this.knee = preset.knee;
        this.makeup = preset.makeup;

        // Update UI
        document.getElementById('threshold').value = this.threshold;
        document.getElementById('thresholdValue').textContent = this.threshold + ' dB';

        document.getElementById('ratio').value = this.ratio;
        document.getElementById('ratioValue').textContent = this.ratio + ':1';

        document.getElementById('attack').value = this.attack;
        document.getElementById('attackValue').textContent = this.attack + ' ms';

        document.getElementById('release').value = this.release;
        document.getElementById('releaseValue').textContent = this.release + ' ms';

        document.getElementById('knee').value = this.knee;
        document.getElementById('kneeValue').textContent = this.knee + ' dB';

        document.getElementById('makeup').value = this.makeup;
        document.getElementById('makeupValue').textContent = this.makeup + ' dB';

        this.updatePresetButtons();
    }

    updatePresetButtons() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            const preset = this.presets[btn.dataset.preset];
            const isMatch = preset &&
                preset.threshold === this.threshold &&
                preset.ratio === this.ratio &&
                preset.attack === this.attack &&
                preset.release === this.release &&
                preset.knee === this.knee &&
                preset.makeup === this.makeup;
            btn.classList.toggle('active', isMatch);
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
            this.analyzeOriginal();

            // Show panels
            this.infoPanel.classList.add('show');
            this.compressorPanel.classList.add('show');
            this.meterSection.classList.add('show');
            this.outputSettings.classList.add('show');
            this.processBtn.classList.add('show');
            this.resultPanel.classList.remove('show');

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

    analyzeOriginal() {
        const data = this.audioBuffer.getChannelData(0);
        let maxAbs = 0;

        for (let i = 0; i < data.length; i++) {
            maxAbs = Math.max(maxAbs, Math.abs(data[i]));
        }

        this.originalPeak = maxAbs;
        const peakDb = 20 * Math.log10(maxAbs);

        // Update meter
        const meterPercent = Math.min(100, (peakDb + 60) / 60 * 100);
        document.getElementById('originalMeter').style.height = meterPercent + '%';
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
            const makeupLinear = Math.pow(10, this.makeup / 20);
            const kneeLinear = this.knee;

            let totalGainReduction = 0;
            let grCount = 0;

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                let envelope = 0;

                for (let i = 0; i < length; i++) {
                    const inputSample = input[i];
                    const inputAbs = Math.abs(inputSample);
                    const inputDb = inputAbs > 0 ? 20 * Math.log10(inputAbs) : -100;

                    // Envelope follower
                    const coeff = inputAbs > envelope ? attackCoeff : releaseCoeff;
                    envelope = coeff * envelope + (1 - coeff) * inputAbs;

                    // Calculate gain reduction
                    let gainDb = 0;

                    if (kneeLinear > 0) {
                        // Soft knee
                        const lowerBound = this.threshold - kneeLinear / 2;
                        const upperBound = this.threshold + kneeLinear / 2;

                        if (inputDb > upperBound) {
                            gainDb = (inputDb - this.threshold) * (1 - 1 / this.ratio);
                        } else if (inputDb > lowerBound) {
                            const x = inputDb - lowerBound;
                            gainDb = (1 / this.ratio - 1) * Math.pow(x, 2) / (2 * kneeLinear);
                        }
                    } else {
                        // Hard knee
                        if (inputDb > this.threshold) {
                            gainDb = (inputDb - this.threshold) * (1 - 1 / this.ratio);
                        }
                    }

                    // Apply gain reduction
                    const gainLinear = Math.pow(10, -gainDb / 20);
                    output[i] = inputSample * gainLinear * makeupLinear;

                    // Track gain reduction
                    if (gainDb > 0) {
                        totalGainReduction += gainDb;
                        grCount++;
                    }

                    // Progress update
                    if (i % 50000 === 0) {
                        const progress = ((ch + i / length) / numChannels) * 100;
                        this.progressFill.style.width = progress + '%';
                    }
                }
            }

            // Calculate stats
            this.avgGainReduction = grCount > 0 ? totalGainReduction / grCount : 0;

            // Analyze processed buffer
            let maxAbs = 0;
            const processedData = this.processedBuffer.getChannelData(0);
            for (let i = 0; i < processedData.length; i++) {
                maxAbs = Math.max(maxAbs, Math.abs(processedData[i]));
            }
            this.compressedPeak = maxAbs;

            // Update meters
            const compressedDb = 20 * Math.log10(maxAbs);
            const meterPercent = Math.min(100, (compressedDb + 60) / 60 * 100);
            document.getElementById('compressedMeter').style.height = meterPercent + '%';

            const grPercent = Math.min(50, this.avgGainReduction / 24 * 50);
            document.getElementById('grMeter').style.width = grPercent + '%';
            document.getElementById('grValue').textContent = '-' + this.avgGainReduction.toFixed(1) + ' dB';

            // Calculate dynamic range
            const originalDR = this.calculateDynamicRange(this.audioBuffer.getChannelData(0));
            const compressedDR = this.calculateDynamicRange(processedData);

            this.progressFill.style.width = '100%';

            // Update result
            document.getElementById('originalDR').textContent = originalDR.toFixed(1) + ' dB';
            document.getElementById('compressedDR').textContent = compressedDR.toFixed(1) + ' dB';
            document.getElementById('avgGR').textContent = '-' + this.avgGainReduction.toFixed(1) + ' dB';

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

    calculateDynamicRange(data) {
        // Find peak and RMS
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
        link.download = `${this.originalFileName}_compressed.${extension}`;
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
    new AudioCompressor();
});
