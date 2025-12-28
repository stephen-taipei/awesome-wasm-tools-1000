/**
 * AUD-041 音頻BPM偵測 - Audio BPM Detector
 * Beat detection using onset detection and autocorrelation
 */

class BPMDetector {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.detectedBPM = 0;
        this.confidence = 0;
        this.beats = [];
        this.metronomeInterval = null;
        this.currentBeat = 0;

        this.canvas = document.getElementById('beatCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.processingPanel = document.getElementById('processingPanel');
        this.resultPanel = document.getElementById('resultPanel');
        this.metronomeBtn = document.getElementById('metronomeBtn');

        // Resize canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
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

        // Metronome button
        this.metronomeBtn.addEventListener('click', () => this.toggleMetronome());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width - 40;
        this.canvas.height = 100;
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

            // Show processing
            this.resultPanel.classList.remove('show');
            this.processingPanel.classList.add('show');

            // Decode audio
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Update file info
            this.updateFileInfo(file);
            this.fileInfo.classList.add('show');

            // Detect BPM
            await this.detectBPM();

            // Show results
            this.processingPanel.classList.remove('show');
            this.resultPanel.classList.add('show');

            // Draw beat visualization
            this.drawBeats();

        } catch (error) {
            console.error('Error loading audio:', error);
            this.processingPanel.classList.remove('show');
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

    async detectBPM() {
        return new Promise((resolve) => {
            // Get audio data (mono)
            const channelData = this.audioBuffer.getChannelData(0);
            const sampleRate = this.audioBuffer.sampleRate;

            // Step 1: Detect onsets using energy-based detection
            const onsets = this.detectOnsets(channelData, sampleRate);

            // Step 2: Calculate intervals between onsets
            const intervals = this.calculateIntervals(onsets, sampleRate);

            // Step 3: Find the most common interval using histogram
            const { bpm, confidence } = this.findBPM(intervals);

            this.detectedBPM = bpm;
            this.confidence = confidence;
            this.beats = onsets;

            // Update display
            this.updateResults();

            resolve();
        });
    }

    detectOnsets(channelData, sampleRate) {
        const onsets = [];
        const hopSize = Math.floor(sampleRate / 100); // 10ms hop
        const windowSize = hopSize * 2;
        const threshold = 1.5;
        const minInterval = Math.floor(sampleRate * 0.15); // Min 150ms between onsets

        let prevEnergy = 0;
        let lastOnset = -minInterval;

        for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
            // Calculate energy in window
            let energy = 0;
            for (let j = 0; j < windowSize; j++) {
                energy += channelData[i + j] * channelData[i + j];
            }
            energy /= windowSize;

            // Detect onset (energy spike)
            if (energy > prevEnergy * threshold && energy > 0.001 && (i - lastOnset) > minInterval) {
                onsets.push(i);
                lastOnset = i;
            }

            prevEnergy = energy * 0.9 + prevEnergy * 0.1; // Smooth
        }

        return onsets;
    }

    calculateIntervals(onsets, sampleRate) {
        const intervals = [];

        for (let i = 1; i < onsets.length; i++) {
            const interval = (onsets[i] - onsets[i - 1]) / sampleRate * 1000; // in ms

            // Only consider reasonable intervals (250ms to 2000ms = 30-240 BPM)
            if (interval >= 250 && interval <= 2000) {
                intervals.push(interval);
            }
        }

        return intervals;
    }

    findBPM(intervals) {
        if (intervals.length < 5) {
            return { bpm: 120, confidence: 0 }; // Default if not enough data
        }

        // Create histogram of intervals (binned by 10ms)
        const histogram = {};
        const binSize = 10;

        for (const interval of intervals) {
            const bin = Math.round(interval / binSize) * binSize;
            histogram[bin] = (histogram[bin] || 0) + 1;
        }

        // Find the most common interval
        let maxCount = 0;
        let bestInterval = 500; // Default 120 BPM

        for (const [interval, count] of Object.entries(histogram)) {
            if (count > maxCount) {
                maxCount = count;
                bestInterval = parseFloat(interval);
            }
        }

        // Also check half and double intervals
        const halfInterval = bestInterval / 2;
        const doubleInterval = bestInterval * 2;

        let halfCount = 0;
        let doubleCount = 0;

        for (const [interval, count] of Object.entries(histogram)) {
            const i = parseFloat(interval);
            if (Math.abs(i - halfInterval) < 20) halfCount += count;
            if (Math.abs(i - doubleInterval) < 40) doubleCount += count;
        }

        // Prefer half interval if it has significant support
        if (halfCount > maxCount * 0.7 && halfInterval >= 250) {
            bestInterval = halfInterval;
            maxCount = halfCount;
        }

        // Calculate BPM
        const bpm = Math.round(60000 / bestInterval);

        // Calculate confidence (0-100)
        const totalIntervals = intervals.length;
        const confidence = Math.min(100, Math.round((maxCount / totalIntervals) * 100 * 2));

        // Normalize BPM to common range (60-180)
        let normalizedBPM = bpm;
        if (bpm < 60) normalizedBPM = bpm * 2;
        if (bpm > 180) normalizedBPM = bpm / 2;

        return { bpm: normalizedBPM, confidence };
    }

    updateResults() {
        // Update BPM display
        document.getElementById('bpmValue').textContent = this.detectedBPM;

        // Update confidence
        document.getElementById('confidenceValue').textContent = this.confidence + '%';
        document.getElementById('confidenceFill').style.width = this.confidence + '%';

        // Update tempo classification
        document.querySelectorAll('.tempo-item').forEach(item => {
            const min = parseInt(item.dataset.min);
            const max = parseInt(item.dataset.max);
            item.classList.toggle('active', this.detectedBPM >= min && this.detectedBPM < max);
        });

        // Update analysis details
        const beatDuration = Math.round(60000 / this.detectedBPM);
        document.getElementById('beatDuration').textContent = beatDuration + ' ms';
        document.getElementById('barDuration').textContent = ((beatDuration * 4) / 1000).toFixed(2) + ' s';
        document.getElementById('beatCount').textContent = this.beats.length;
        document.getElementById('halfBpm').textContent = Math.round(this.detectedBPM / 2);
        document.getElementById('doubleBpm').textContent = Math.round(this.detectedBPM * 2);
    }

    drawBeats() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const sampleRate = this.audioBuffer.sampleRate;
        const duration = this.audioBuffer.duration;

        // Clear canvas
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw waveform outline
        const channelData = this.audioBuffer.getChannelData(0);
        const samplesPerPixel = Math.floor(channelData.length / width);

        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const startSample = x * samplesPerPixel;
            let max = 0;

            for (let i = 0; i < samplesPerPixel; i++) {
                const sample = Math.abs(channelData[startSample + i] || 0);
                if (sample > max) max = sample;
            }

            const y = (height / 2) - (max * height / 2);
            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();

        // Draw beats as vertical lines
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 2;

        for (const beat of this.beats) {
            const x = (beat / channelData.length) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        // Draw beat markers
        this.ctx.fillStyle = '#ef4444';
        for (const beat of this.beats) {
            const x = (beat / channelData.length) * width;
            this.ctx.beginPath();
            this.ctx.arc(x, 10, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    toggleMetronome() {
        if (this.metronomeInterval) {
            this.stopMetronome();
        } else {
            this.startMetronome();
        }
    }

    startMetronome() {
        if (!this.detectedBPM) return;

        this.metronomeBtn.textContent = '停止節拍';
        this.metronomeBtn.classList.add('active');

        // Create click sound
        const clickOsc = () => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.frequency.value = this.currentBeat === 0 ? 880 : 440;
            gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

            osc.start();
            osc.stop(this.audioContext.currentTime + 0.05);
        };

        const interval = 60000 / this.detectedBPM;
        this.currentBeat = 0;

        // Initial beat
        clickOsc();
        this.updateBeatIndicator();

        this.metronomeInterval = setInterval(() => {
            this.currentBeat = (this.currentBeat + 1) % 4;
            clickOsc();
            this.updateBeatIndicator();
        }, interval);
    }

    stopMetronome() {
        if (this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            this.metronomeInterval = null;
        }

        this.metronomeBtn.textContent = '開始節拍';
        this.metronomeBtn.classList.remove('active');

        document.querySelectorAll('.beat-dot').forEach(dot => {
            dot.classList.remove('active');
        });
    }

    updateBeatIndicator() {
        document.querySelectorAll('.beat-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentBeat);
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new BPMDetector();
});
