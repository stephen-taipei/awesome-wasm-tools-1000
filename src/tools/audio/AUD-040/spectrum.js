/**
 * AUD-040 音頻頻譜分析 - Audio Spectrum Analyzer
 * FFT-based frequency analysis with real-time visualization
 */

class SpectrumAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.sourceNode = null;
        this.audioBuffer = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = 0;
        this.pauseTime = 0;
        this.animationId = null;
        this.currentView = 'spectrum';
        this.spectrogramData = [];
        this.spectrogramMaxRows = 200;

        this.canvas = document.getElementById('spectrumCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.playbackControls = document.getElementById('playbackControls');
        this.visualizerContainer = document.getElementById('visualizerContainer');
        this.peakDisplay = document.getElementById('peakDisplay');

        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');

        this.fftSizeSelect = document.getElementById('fftSize');
        this.freqScaleSelect = document.getElementById('freqScale');
        this.smoothingSlider = document.getElementById('smoothing');
        this.displayModeSelect = document.getElementById('displayMode');

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

        // Playback controls
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());

        // Settings
        this.fftSizeSelect.addEventListener('change', () => this.updateAnalyserSettings());
        this.smoothingSlider.addEventListener('input', (e) => {
            document.getElementById('smoothingValue').textContent = parseFloat(e.target.value).toFixed(2);
            this.updateAnalyserSettings();
        });

        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                if (this.currentView === 'spectrogram') {
                    this.spectrogramData = [];
                }
            });
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width - 40;
        this.canvas.height = 300;
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

            // Stop current playback
            this.stop();

            // Decode audio
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Update file info
            this.updateFileInfo(file);

            // Show panels
            this.fileInfo.classList.add('show');
            this.settingsPanel.classList.add('show');
            this.playbackControls.style.display = 'flex';
            this.visualizerContainer.classList.add('show');
            this.peakDisplay.style.display = 'block';

            // Setup analyser
            this.setupAnalyser();

            // Enable play button
            this.playBtn.disabled = false;

        } catch (error) {
            console.error('Error loading audio:', error);
            alert('無法載入音頻文件: ' + error.message);
        }
    }

    updateFileInfo(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileDuration').textContent = this.formatTime(this.audioBuffer.duration);
        document.getElementById('fileSampleRate').textContent = this.audioBuffer.sampleRate + ' Hz';
        document.getElementById('fileChannels').textContent = this.audioBuffer.numberOfChannels === 2 ? '立體聲' : '單聲道';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    setupAnalyser() {
        this.analyser = this.audioContext.createAnalyser();
        this.updateAnalyserSettings();
    }

    updateAnalyserSettings() {
        if (!this.analyser) return;

        this.analyser.fftSize = parseInt(this.fftSizeSelect.value);
        this.analyser.smoothingTimeConstant = parseFloat(this.smoothingSlider.value);
    }

    play() {
        if (!this.audioBuffer) return;

        if (this.isPaused) {
            // Resume from pause
            this.audioContext.resume();
            this.isPaused = false;
            this.startTime = this.audioContext.currentTime - this.pauseTime;
        } else {
            // Create new source
            if (this.sourceNode) {
                this.sourceNode.disconnect();
            }

            this.sourceNode = this.audioContext.createBufferSource();
            this.sourceNode.buffer = this.audioBuffer;
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            this.sourceNode.onended = () => {
                if (!this.isPaused) {
                    this.stop();
                }
            };

            this.sourceNode.start(0);
            this.startTime = this.audioContext.currentTime;
        }

        this.isPlaying = true;
        this.playBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.stopBtn.disabled = false;

        this.startVisualization();
    }

    pause() {
        if (!this.isPlaying) return;

        this.audioContext.suspend();
        this.isPaused = true;
        this.isPlaying = false;
        this.pauseTime = this.audioContext.currentTime - this.startTime;

        this.playBtn.disabled = false;
        this.pauseBtn.disabled = true;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    stop() {
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
            } catch (e) {}
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        this.isPlaying = false;
        this.isPaused = false;
        this.pauseTime = 0;

        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.playBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.stopBtn.disabled = true;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Clear canvas
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.spectrogramData = [];
    }

    startVisualization() {
        const draw = () => {
            if (!this.isPlaying) return;

            this.animationId = requestAnimationFrame(draw);

            if (this.currentView === 'spectrum') {
                this.drawSpectrum();
            } else {
                this.drawSpectrogram();
            }

            this.updateInfo();
        };

        draw();
    }

    drawSpectrum() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        const width = this.canvas.width;
        const height = this.canvas.height;
        const displayMode = this.displayModeSelect.value;
        const freqScale = this.freqScaleSelect.value;

        // Clear canvas
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.drawGrid();

        if (displayMode === 'line') {
            this.drawLine(dataArray, bufferLength, width, height, freqScale);
        } else {
            this.drawBars(dataArray, bufferLength, width, height, freqScale, displayMode === 'gradient');
        }
    }

    drawGrid() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
        this.ctx.lineWidth = 1;

        // Horizontal lines (dB levels)
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Vertical lines (frequency)
        for (let i = 0; i <= 10; i++) {
            const x = (width / 10) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
    }

    drawBars(dataArray, bufferLength, width, height, freqScale, useGradient) {
        const barCount = Math.min(bufferLength, 256);
        const barWidth = width / barCount;
        const sampleRate = this.audioContext.sampleRate;
        const maxFreq = sampleRate / 2;

        for (let i = 0; i < barCount; i++) {
            let index;
            if (freqScale === 'log') {
                // Logarithmic scale
                const minLog = Math.log10(20);
                const maxLog = Math.log10(maxFreq);
                const logFreq = minLog + (i / barCount) * (maxLog - minLog);
                const freq = Math.pow(10, logFreq);
                index = Math.floor((freq / maxFreq) * bufferLength);
            } else {
                index = Math.floor((i / barCount) * bufferLength);
            }

            index = Math.min(index, bufferLength - 1);
            const value = dataArray[index];
            const barHeight = (value / 255) * height;

            const x = i * barWidth;
            const y = height - barHeight;

            if (useGradient) {
                const gradient = this.ctx.createLinearGradient(x, height, x, y);
                gradient.addColorStop(0, '#8b5cf6');
                gradient.addColorStop(0.5, '#a78bfa');
                gradient.addColorStop(1, '#c4b5fd');
                this.ctx.fillStyle = gradient;
            } else {
                // Color based on frequency
                const hue = 260 + (i / barCount) * 60;
                this.ctx.fillStyle = `hsl(${hue}, 70%, ${50 + (value / 255) * 30}%)`;
            }

            this.ctx.fillRect(x, y, barWidth - 1, barHeight);
        }
    }

    drawLine(dataArray, bufferLength, width, height, freqScale) {
        const sampleRate = this.audioContext.sampleRate;
        const maxFreq = sampleRate / 2;
        const points = Math.min(bufferLength, 512);

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#a78bfa';
        this.ctx.lineWidth = 2;

        for (let i = 0; i < points; i++) {
            let index;
            if (freqScale === 'log') {
                const minLog = Math.log10(20);
                const maxLog = Math.log10(maxFreq);
                const logFreq = minLog + (i / points) * (maxLog - minLog);
                const freq = Math.pow(10, logFreq);
                index = Math.floor((freq / maxFreq) * bufferLength);
            } else {
                index = Math.floor((i / points) * bufferLength);
            }

            index = Math.min(index, bufferLength - 1);
            const value = dataArray[index];

            const x = (i / points) * width;
            const y = height - (value / 255) * height;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();

        // Fill area under line
        this.ctx.lineTo(width, height);
        this.ctx.lineTo(0, height);
        this.ctx.closePath();

        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.05)');
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    drawSpectrogram() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        const width = this.canvas.width;
        const height = this.canvas.height;

        // Add current frame to spectrogram data
        this.spectrogramData.push(new Uint8Array(dataArray));

        if (this.spectrogramData.length > this.spectrogramMaxRows) {
            this.spectrogramData.shift();
        }

        // Clear canvas
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw spectrogram
        const rowHeight = height / this.spectrogramMaxRows;
        const colWidth = width / bufferLength;

        for (let row = 0; row < this.spectrogramData.length; row++) {
            const data = this.spectrogramData[row];
            const y = height - (row + 1) * rowHeight;

            for (let col = 0; col < bufferLength; col++) {
                const value = data[col];
                const intensity = value / 255;

                // Purple-based colormap
                const r = Math.floor(intensity * 139);
                const g = Math.floor(intensity * 92);
                const b = Math.floor(intensity * 246);

                this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                this.ctx.fillRect(col * colWidth, y, colWidth + 1, rowHeight + 1);
            }
        }
    }

    updateInfo() {
        const bufferLength = this.analyser.frequencyBinCount;
        const freqData = new Uint8Array(bufferLength);
        const timeData = new Uint8Array(bufferLength);

        this.analyser.getByteFrequencyData(freqData);
        this.analyser.getByteTimeDomainData(timeData);

        const sampleRate = this.audioContext.sampleRate;
        const binWidth = sampleRate / (2 * bufferLength);

        // Find dominant frequency
        let maxValue = 0;
        let maxIndex = 0;
        for (let i = 0; i < bufferLength; i++) {
            if (freqData[i] > maxValue) {
                maxValue = freqData[i];
                maxIndex = i;
            }
        }
        const dominantFreq = maxIndex * binWidth;
        document.getElementById('dominantFreq').textContent = this.formatFreq(dominantFreq);
        document.getElementById('peakFreq').textContent = this.formatFreq(dominantFreq);

        // Calculate RMS
        let rmsSum = 0;
        for (let i = 0; i < bufferLength; i++) {
            const normalized = (timeData[i] - 128) / 128;
            rmsSum += normalized * normalized;
        }
        const rms = Math.sqrt(rmsSum / bufferLength);
        const rmsDb = 20 * Math.log10(rms + 0.0001);
        document.getElementById('rmsLevel').textContent = rmsDb.toFixed(1) + ' dB';

        // Calculate spectral centroid
        let weightedSum = 0;
        let totalWeight = 0;
        for (let i = 0; i < bufferLength; i++) {
            const freq = i * binWidth;
            weightedSum += freq * freqData[i];
            totalWeight += freqData[i];
        }
        const centroid = totalWeight > 0 ? weightedSum / totalWeight : 0;
        document.getElementById('spectralCentroid').textContent = this.formatFreq(centroid);

        // Update peak list
        this.updatePeakList(freqData, bufferLength, binWidth);
    }

    updatePeakList(freqData, bufferLength, binWidth) {
        // Find peaks
        const peaks = [];
        for (let i = 2; i < bufferLength - 2; i++) {
            if (freqData[i] > freqData[i-1] &&
                freqData[i] > freqData[i+1] &&
                freqData[i] > freqData[i-2] &&
                freqData[i] > freqData[i+2] &&
                freqData[i] > 30) {
                peaks.push({
                    freq: i * binWidth,
                    value: freqData[i]
                });
            }
        }

        // Sort by value and take top 8
        peaks.sort((a, b) => b.value - a.value);
        const topPeaks = peaks.slice(0, 8);

        // Update display
        const peakList = document.getElementById('peakList');
        peakList.innerHTML = topPeaks.map(peak => {
            const db = 20 * Math.log10(peak.value / 255 + 0.0001);
            return `
                <div class="peak-item">
                    <div class="peak-freq">${this.formatFreq(peak.freq)}</div>
                    <div class="peak-db">${db.toFixed(1)} dB</div>
                </div>
            `;
        }).join('');
    }

    formatFreq(freq) {
        if (freq >= 1000) {
            return (freq / 1000).toFixed(2) + ' kHz';
        }
        return freq.toFixed(0) + ' Hz';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new SpectrumAnalyzer();
});
