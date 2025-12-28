/**
 * AUD-042 音頻波形顯示 - Audio Waveform Viewer
 * Interactive waveform visualization with zoom and export
 */

class WaveformViewer {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.currentChannel = 'stereo';
        this.zoom = 1;
        this.waveformColor = '#14b8a6';
        this.displayMode = 'normal';

        this.canvas = document.getElementById('waveformCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.rulerCanvas = document.getElementById('rulerCanvas');
        this.rulerCtx = this.rulerCanvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.controlsPanel = document.getElementById('controlsPanel');
        this.waveformContainer = document.getElementById('waveformContainer');
        this.waveformScroll = document.getElementById('waveformScroll');
        this.cursorInfo = document.getElementById('cursorInfo');
        this.exportSection = document.getElementById('exportSection');

        this.zoomSlider = document.getElementById('zoomSlider');
        this.displayModeSelect = document.getElementById('displayMode');
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

        // Zoom slider
        this.zoomSlider.addEventListener('input', (e) => {
            this.zoom = parseFloat(e.target.value);
            document.getElementById('zoomValue').textContent = this.zoom + 'x';
            this.drawWaveform();
        });

        // Display mode
        this.displayModeSelect.addEventListener('change', (e) => {
            this.displayMode = e.target.value;
            this.drawWaveform();
        });

        // Color options
        document.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                e.target.classList.add('active');
                this.waveformColor = e.target.dataset.color;
                this.drawWaveform();
            });
        });

        // Channel tabs
        document.querySelectorAll('.channel-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentChannel = e.target.dataset.channel;
                this.drawWaveform();
            });
        });

        // Canvas mouse events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.cursorInfo.classList.remove('show');
        });

        // Export buttons
        document.getElementById('exportPng').addEventListener('click', () => this.exportPng());
        document.getElementById('exportSvg').addEventListener('click', () => this.exportSvg());
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

            // Decode audio
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Update file info
            this.updateFileInfo(file);

            // Show panels
            this.fileInfo.classList.add('show');
            this.controlsPanel.classList.add('show');
            this.waveformContainer.classList.add('show');
            this.exportSection.classList.add('show');

            // Update channel tabs visibility
            const channelTabs = document.getElementById('channelTabs');
            if (this.audioBuffer.numberOfChannels === 1) {
                channelTabs.style.display = 'none';
                this.currentChannel = 'stereo';
            } else {
                channelTabs.style.display = 'flex';
            }

            // Calculate and display audio info
            this.calculateAudioInfo();

            // Draw waveform
            this.drawWaveform();

        } catch (error) {
            console.error('Error loading audio:', error);
            alert('無法載入音頻文件: ' + error.message);
        }
    }

    updateFileInfo(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileDuration').textContent = this.formatTime(this.audioBuffer.duration);
        document.getElementById('fileSampleRate').textContent = this.audioBuffer.sampleRate + ' Hz';
        document.getElementById('fileChannels').textContent =
            this.audioBuffer.numberOfChannels === 2 ? '立體聲' : '單聲道';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(2);
        return `${mins}:${secs.padStart(5, '0')}`;
    }

    calculateAudioInfo() {
        const channelData = this.audioBuffer.getChannelData(0);
        const length = channelData.length;

        // Peak amplitude
        let peak = 0;
        for (let i = 0; i < length; i++) {
            const abs = Math.abs(channelData[i]);
            if (abs > peak) peak = abs;
        }
        document.getElementById('peakAmplitude').textContent = peak.toFixed(4);

        // RMS level
        let rmsSum = 0;
        for (let i = 0; i < length; i++) {
            rmsSum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(rmsSum / length);
        const rmsDb = 20 * Math.log10(rms + 0.0001);
        document.getElementById('rmsLevel').textContent = rmsDb.toFixed(1) + ' dB';

        // Dynamic range (peak to RMS ratio)
        const dynamicRange = 20 * Math.log10(peak / (rms + 0.0001));
        document.getElementById('dynamicRange').textContent = dynamicRange.toFixed(1) + ' dB';

        // Zero crossing rate
        let zeroCrossings = 0;
        for (let i = 1; i < length; i++) {
            if ((channelData[i-1] >= 0 && channelData[i] < 0) ||
                (channelData[i-1] < 0 && channelData[i] >= 0)) {
                zeroCrossings++;
            }
        }
        const zcr = zeroCrossings / (length / this.audioBuffer.sampleRate);
        document.getElementById('zeroCrossing').textContent = Math.round(zcr) + ' Hz';
    }

    drawWaveform() {
        if (!this.audioBuffer) return;

        const baseWidth = this.waveformScroll.clientWidth - 10;
        const width = baseWidth * this.zoom;
        const height = 200;

        this.canvas.width = width;
        this.canvas.height = height;

        // Clear canvas
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw center line
        this.ctx.strokeStyle = 'rgba(20, 184, 166, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, height / 2);
        this.ctx.lineTo(width, height / 2);
        this.ctx.stroke();

        // Get channel data
        const leftChannel = this.audioBuffer.getChannelData(0);
        const rightChannel = this.audioBuffer.numberOfChannels > 1
            ? this.audioBuffer.getChannelData(1)
            : leftChannel;

        switch (this.displayMode) {
            case 'normal':
                this.drawNormalWaveform(leftChannel, rightChannel, width, height);
                break;
            case 'mirror':
                this.drawMirrorWaveform(leftChannel, rightChannel, width, height);
                break;
            case 'bars':
                this.drawBarsWaveform(leftChannel, rightChannel, width, height);
                break;
        }

        // Draw time ruler
        this.drawTimeRuler(width);
    }

    drawNormalWaveform(leftChannel, rightChannel, width, height) {
        const samplesPerPixel = Math.floor(leftChannel.length / width);

        if (this.currentChannel === 'stereo' && this.audioBuffer.numberOfChannels > 1) {
            // Draw both channels
            const halfHeight = height / 2;

            // Left channel (top half)
            this.drawChannelWaveform(leftChannel, samplesPerPixel, width, halfHeight, 0);

            // Right channel (bottom half)
            this.drawChannelWaveform(rightChannel, samplesPerPixel, width, halfHeight, halfHeight);
        } else {
            // Single channel
            const data = this.currentChannel === 'right' ? rightChannel : leftChannel;
            this.drawChannelWaveform(data, samplesPerPixel, width, height, 0);
        }
    }

    drawChannelWaveform(data, samplesPerPixel, width, height, yOffset) {
        const centerY = yOffset + height / 2;

        this.ctx.fillStyle = this.waveformColor;
        this.ctx.strokeStyle = this.waveformColor;
        this.ctx.lineWidth = 1;

        for (let x = 0; x < width; x++) {
            const start = x * samplesPerPixel;
            let min = 0, max = 0;

            for (let i = 0; i < samplesPerPixel; i++) {
                const sample = data[start + i] || 0;
                if (sample < min) min = sample;
                if (sample > max) max = sample;
            }

            const minY = centerY - (min * height / 2);
            const maxY = centerY - (max * height / 2);

            this.ctx.beginPath();
            this.ctx.moveTo(x, minY);
            this.ctx.lineTo(x, maxY);
            this.ctx.stroke();
        }
    }

    drawMirrorWaveform(leftChannel, rightChannel, width, height) {
        const samplesPerPixel = Math.floor(leftChannel.length / width);
        const data = this.currentChannel === 'right' ? rightChannel : leftChannel;
        const centerY = height / 2;

        // Create gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, this.waveformColor + '80');
        gradient.addColorStop(0.5, this.waveformColor);
        gradient.addColorStop(1, this.waveformColor + '80');

        this.ctx.fillStyle = gradient;

        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);

        // Top half
        for (let x = 0; x < width; x++) {
            const start = x * samplesPerPixel;
            let max = 0;

            for (let i = 0; i < samplesPerPixel; i++) {
                const sample = Math.abs(data[start + i] || 0);
                if (sample > max) max = sample;
            }

            const y = centerY - (max * height / 2);
            this.ctx.lineTo(x, y);
        }

        // Bottom half (mirror)
        for (let x = width - 1; x >= 0; x--) {
            const start = x * samplesPerPixel;
            let max = 0;

            for (let i = 0; i < samplesPerPixel; i++) {
                const sample = Math.abs(data[start + i] || 0);
                if (sample > max) max = sample;
            }

            const y = centerY + (max * height / 2);
            this.ctx.lineTo(x, y);
        }

        this.ctx.closePath();
        this.ctx.fill();
    }

    drawBarsWaveform(leftChannel, rightChannel, width, height) {
        const barCount = Math.min(200 * this.zoom, width);
        const barWidth = width / barCount - 1;
        const samplesPerBar = Math.floor(leftChannel.length / barCount);
        const data = this.currentChannel === 'right' ? rightChannel : leftChannel;
        const centerY = height / 2;

        for (let i = 0; i < barCount; i++) {
            const start = i * samplesPerBar;
            let max = 0;

            for (let j = 0; j < samplesPerBar; j++) {
                const sample = Math.abs(data[start + j] || 0);
                if (sample > max) max = sample;
            }

            const barHeight = max * height;
            const x = i * (barWidth + 1);
            const y = centerY - barHeight / 2;

            // Create gradient for bar
            const gradient = this.ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, this.waveformColor);
            gradient.addColorStop(0.5, this.waveformColor + 'cc');
            gradient.addColorStop(1, this.waveformColor);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, barWidth, barHeight);
        }
    }

    drawTimeRuler(width) {
        this.rulerCanvas.width = width;
        this.rulerCanvas.height = 30;

        this.rulerCtx.fillStyle = 'rgba(20, 184, 166, 0.1)';
        this.rulerCtx.fillRect(0, 0, width, 30);

        const duration = this.audioBuffer.duration;
        const pixelsPerSecond = width / duration;

        // Determine tick interval
        let tickInterval = 1; // seconds
        if (pixelsPerSecond < 10) tickInterval = 10;
        else if (pixelsPerSecond < 20) tickInterval = 5;
        else if (pixelsPerSecond < 50) tickInterval = 2;
        else if (pixelsPerSecond > 200) tickInterval = 0.5;

        this.rulerCtx.strokeStyle = 'rgba(20, 184, 166, 0.5)';
        this.rulerCtx.fillStyle = '#5eead4';
        this.rulerCtx.font = '10px sans-serif';
        this.rulerCtx.textAlign = 'center';

        for (let t = 0; t <= duration; t += tickInterval) {
            const x = (t / duration) * width;

            // Tick mark
            this.rulerCtx.beginPath();
            this.rulerCtx.moveTo(x, 0);
            this.rulerCtx.lineTo(x, 8);
            this.rulerCtx.stroke();

            // Time label
            const label = this.formatTimeShort(t);
            this.rulerCtx.fillText(label, x, 22);
        }
    }

    formatTimeShort(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    handleMouseMove(e) {
        if (!this.audioBuffer) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + this.waveformScroll.scrollLeft;
        const canvasWidth = this.canvas.width;

        // Calculate time position
        const timeRatio = x / canvasWidth;
        const time = timeRatio * this.audioBuffer.duration;

        // Calculate sample index
        const sampleIndex = Math.floor(timeRatio * this.audioBuffer.getChannelData(0).length);

        // Get amplitude at position
        const leftChannel = this.audioBuffer.getChannelData(0);
        const amplitude = leftChannel[sampleIndex] || 0;

        // Update cursor info
        document.getElementById('cursorTime').textContent = this.formatTime(time);
        document.getElementById('cursorAmplitude').textContent = amplitude.toFixed(4);
        document.getElementById('cursorSample').textContent = sampleIndex.toLocaleString();

        this.cursorInfo.classList.add('show');
    }

    exportPng() {
        // Create a temporary canvas with white background
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.canvas.width;
        exportCanvas.height = this.canvas.height;
        const exportCtx = exportCanvas.getContext('2d');

        // Draw background
        exportCtx.fillStyle = '#0f172a';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Draw waveform
        exportCtx.drawImage(this.canvas, 0, 0);

        // Download
        const link = document.createElement('a');
        link.download = 'waveform.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }

    exportSvg() {
        if (!this.audioBuffer) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const data = this.audioBuffer.getChannelData(0);
        const samplesPerPixel = Math.floor(data.length / width);
        const centerY = height / 2;

        // Build SVG path
        let pathData = `M 0 ${centerY}`;

        for (let x = 0; x < width; x++) {
            const start = x * samplesPerPixel;
            let max = 0;

            for (let i = 0; i < samplesPerPixel; i++) {
                const sample = Math.abs(data[start + i] || 0);
                if (sample > max) max = sample;
            }

            const y = centerY - (max * height / 2);
            pathData += ` L ${x} ${y}`;
        }

        // Mirror path for bottom
        for (let x = width - 1; x >= 0; x--) {
            const start = x * samplesPerPixel;
            let max = 0;

            for (let i = 0; i < samplesPerPixel; i++) {
                const sample = Math.abs(data[start + i] || 0);
                if (sample > max) max = sample;
            }

            const y = centerY + (max * height / 2);
            pathData += ` L ${x} ${y}`;
        }

        pathData += ' Z';

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#0f172a"/>
    <path d="${pathData}" fill="${this.waveformColor}" opacity="0.8"/>
</svg>`;

        // Download
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = 'waveform.svg';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new WaveformViewer();
});
