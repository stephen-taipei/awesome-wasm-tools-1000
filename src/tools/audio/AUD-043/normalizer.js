/**
 * AUD-043 音頻音量正常化 - Audio Normalizer
 * Peak, RMS, and LUFS normalization
 */

class AudioNormalizer {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.processedBuffer = null;
        this.mode = 'peak';
        this.targetLevel = -1;
        this.outputFormat = 'wav';
        this.originalFileName = '';

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.analysisPanel = document.getElementById('analysisPanel');
        this.processBtn = document.getElementById('processBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.resultPanel = document.getElementById('resultPanel');
        this.downloadBtn = document.getElementById('downloadBtn');

        this.targetLevelSlider = document.getElementById('targetLevel');
        this.targetValueDisplay = document.getElementById('targetValue');
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

        // Mode selector
        document.querySelectorAll('.mode-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.mode-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                this.mode = option.dataset.mode;
                option.querySelector('input').checked = true;

                // Update target level label based on mode
                if (this.mode === 'lufs') {
                    this.targetLevelSlider.min = -24;
                    this.targetLevelSlider.max = -9;
                    this.targetLevelSlider.value = -14;
                    this.targetLevel = -14;
                    this.targetValueDisplay.textContent = '-14.0 LUFS';
                } else {
                    this.targetLevelSlider.min = -24;
                    this.targetLevelSlider.max = 0;
                    this.targetLevelSlider.value = -1;
                    this.targetLevel = -1;
                    this.targetValueDisplay.textContent = '-1.0 dB';
                }

                if (this.audioBuffer) {
                    this.analyzeAudio();
                }
            });
        });

        // Target level slider
        this.targetLevelSlider.addEventListener('input', (e) => {
            this.targetLevel = parseFloat(e.target.value);
            const unit = this.mode === 'lufs' ? 'LUFS' : 'dB';
            this.targetValueDisplay.textContent = `${this.targetLevel.toFixed(1)} ${unit}`;

            if (this.audioBuffer) {
                this.analyzeAudio();
            }
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

    async handleFile(file) {
        if (!file || !file.type.startsWith('audio/')) {
            alert('請選擇有效的音頻文件');
            return;
        }

        try {
            // Initialize audio context
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            this.originalFileName = file.name.replace(/\.[^/.]+$/, '');

            // Decode audio
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Update file info
            this.updateFileInfo(file);

            // Show panels
            this.fileInfo.classList.add('show');
            this.settingsPanel.classList.add('show');
            this.analysisPanel.classList.add('show');
            this.processBtn.style.display = 'block';
            this.resultPanel.classList.remove('show');

            // Analyze audio
            this.analyzeAudio();

        } catch (error) {
            console.error('Error loading audio:', error);
            alert('無法載入音頻文件: ' + error.message);
        }
    }

    updateFileInfo(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileDuration').textContent = this.formatTime(this.audioBuffer.duration);
        document.getElementById('fileSampleRate').textContent = this.audioBuffer.sampleRate + ' Hz';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    analyzeAudio() {
        const channelData = this.audioBuffer.getChannelData(0);
        const length = channelData.length;

        // Calculate peak
        let peak = 0;
        for (let i = 0; i < length; i++) {
            const abs = Math.abs(channelData[i]);
            if (abs > peak) peak = abs;
        }
        const peakDb = 20 * Math.log10(peak + 0.0001);

        // Calculate RMS
        let rmsSum = 0;
        for (let i = 0; i < length; i++) {
            rmsSum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(rmsSum / length);
        const rmsDb = 20 * Math.log10(rms + 0.0001);

        // Calculate LUFS (simplified K-weighted)
        const lufs = this.calculateLUFS(channelData, this.audioBuffer.sampleRate);

        // Determine current level based on mode
        let currentLevel;
        switch (this.mode) {
            case 'peak':
                currentLevel = peakDb;
                break;
            case 'rms':
                currentLevel = rmsDb;
                break;
            case 'lufs':
                currentLevel = lufs;
                break;
        }

        // Calculate gain to apply
        const gainDb = this.targetLevel - currentLevel;
        const gainLinear = Math.pow(10, gainDb / 20);

        // Calculate predicted after values
        const peakAfterDb = peakDb + gainDb;
        const rmsAfterDb = rmsDb + gainDb;

        // Update display
        document.getElementById('peakBefore').textContent = peakDb.toFixed(1) + ' dB';
        document.getElementById('peakAfter').textContent = peakAfterDb.toFixed(1) + ' dB';
        document.getElementById('rmsBefore').textContent = rmsDb.toFixed(1) + ' dB';
        document.getElementById('rmsAfter').textContent = rmsAfterDb.toFixed(1) + ' dB';
        document.getElementById('gainApplied').textContent = (gainDb >= 0 ? '+' : '') + gainDb.toFixed(1) + ' dB';
        document.getElementById('dynamicRange').textContent = (peakDb - rmsDb).toFixed(1) + ' dB';

        // Update meters
        const meterBefore = document.getElementById('meterBefore');
        const meterAfter = document.getElementById('meterAfter');

        const beforeWidth = Math.max(0, ((peakDb + 60) / 60) * 100);
        const afterWidth = Math.max(0, ((peakAfterDb + 60) / 60) * 100);

        meterBefore.style.width = beforeWidth + '%';
        meterAfter.style.width = Math.min(100, afterWidth) + '%';
    }

    calculateLUFS(channelData, sampleRate) {
        // Simplified LUFS calculation (not ITU-R BS.1770 compliant, but reasonable approximation)
        // Apply K-weighting filter (simplified)
        const blockSize = Math.floor(sampleRate * 0.4); // 400ms blocks
        const overlap = Math.floor(blockSize * 0.75);
        const step = blockSize - overlap;

        let sumSquares = 0;
        let blockCount = 0;

        for (let i = 0; i < channelData.length - blockSize; i += step) {
            let blockSum = 0;
            for (let j = 0; j < blockSize; j++) {
                blockSum += channelData[i + j] * channelData[i + j];
            }
            sumSquares += blockSum / blockSize;
            blockCount++;
        }

        if (blockCount === 0) return -70;

        const meanSquare = sumSquares / blockCount;
        const lufs = -0.691 + 10 * Math.log10(meanSquare + 0.0000001);

        return lufs;
    }

    async processAudio() {
        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        try {
            // Calculate gain
            const channelData = this.audioBuffer.getChannelData(0);
            const length = channelData.length;

            let currentLevel;
            switch (this.mode) {
                case 'peak':
                    let peak = 0;
                    for (let i = 0; i < length; i++) {
                        const abs = Math.abs(channelData[i]);
                        if (abs > peak) peak = abs;
                    }
                    currentLevel = 20 * Math.log10(peak + 0.0001);
                    break;
                case 'rms':
                    let rmsSum = 0;
                    for (let i = 0; i < length; i++) {
                        rmsSum += channelData[i] * channelData[i];
                    }
                    const rms = Math.sqrt(rmsSum / length);
                    currentLevel = 20 * Math.log10(rms + 0.0001);
                    break;
                case 'lufs':
                    currentLevel = this.calculateLUFS(channelData, this.audioBuffer.sampleRate);
                    break;
            }

            const gainDb = this.targetLevel - currentLevel;
            const gainLinear = Math.pow(10, gainDb / 20);

            // Create output buffer
            const numChannels = this.audioBuffer.numberOfChannels;
            const sampleRate = this.audioBuffer.sampleRate;
            this.processedBuffer = this.audioContext.createBuffer(
                numChannels,
                length,
                sampleRate
            );

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const input = this.audioBuffer.getChannelData(ch);
                const output = this.processedBuffer.getChannelData(ch);

                for (let i = 0; i < length; i++) {
                    // Apply gain with soft clipping
                    let sample = input[i] * gainLinear;

                    // Soft clip to prevent harsh clipping
                    if (sample > 1) {
                        sample = 1 - Math.exp(1 - sample);
                    } else if (sample < -1) {
                        sample = -1 + Math.exp(-1 - sample);
                    }

                    output[i] = sample;

                    // Update progress
                    if (i % 10000 === 0) {
                        const progress = ((ch * length + i) / (numChannels * length)) * 100;
                        this.progressFill.style.width = progress + '%';
                    }
                }
            }

            this.progressFill.style.width = '100%';

            // Show result
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
        link.download = `${this.originalFileName}_normalized.${extension}`;
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

        // WAV header
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

        // Audio data
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
    new AudioNormalizer();
});
