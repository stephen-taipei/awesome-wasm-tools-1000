/**
 * AUD-047 音頻合併 - Audio Merger
 * Merge multiple audio files into one
 */

class AudioMerger {
    constructor() {
        this.audioContext = null;
        this.tracks = [];
        this.processedBuffer = null;
        this.crossfadeDuration = 0;
        this.outputFormat = 'wav';
        this.draggedItem = null;

        this.canvas = document.getElementById('timelineCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.tracksPanel = document.getElementById('tracksPanel');
        this.tracksList = document.getElementById('tracksList');
        this.previewSection = document.getElementById('previewSection');
        this.outputSettings = document.getElementById('outputSettings');
        this.processBtn = document.getElementById('processBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.resultPanel = document.getElementById('resultPanel');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.addMoreBtn = document.getElementById('addMoreBtn');
    }

    bindEvents() {
        // Upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

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
                this.handleFiles(e.dataTransfer.files);
            }
        });

        // Add more button
        this.addMoreBtn.addEventListener('click', () => this.fileInput.click());

        // Crossfade slider
        document.getElementById('crossfade').addEventListener('input', (e) => {
            this.crossfadeDuration = parseFloat(e.target.value);
            document.getElementById('crossfadeValue').textContent = this.crossfadeDuration.toFixed(1) + ' 秒';
            this.updatePreview();
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
            if (this.tracks.length > 0) this.drawTimeline();
        });
    }

    async handleFiles(files) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        for (const file of files) {
            if (!file.type.startsWith('audio/')) continue;

            try {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = await this.audioContext.decodeAudioData(arrayBuffer);

                this.tracks.push({
                    name: file.name,
                    buffer: buffer,
                    duration: buffer.duration,
                    sampleRate: buffer.sampleRate,
                    channels: buffer.numberOfChannels
                });
            } catch (error) {
                console.error('Error loading:', file.name, error);
            }
        }

        if (this.tracks.length > 0) {
            this.showPanels();
            this.updateTracksList();
            this.updatePreview();
        }
    }

    showPanels() {
        this.tracksPanel.classList.add('show');
        this.previewSection.classList.add('show');
        this.outputSettings.classList.add('show');
        this.processBtn.classList.add('show');
        this.resultPanel.classList.remove('show');
    }

    updateTracksList() {
        this.tracksList.innerHTML = this.tracks.map((track, i) => `
            <div class="track-item" draggable="true" data-index="${i}">
                <div class="track-number">${i + 1}</div>
                <div class="track-info">
                    <div class="track-name">${track.name}</div>
                    <div class="track-details">
                        時長: ${this.formatTime(track.duration)} |
                        ${track.sampleRate} Hz |
                        ${track.channels === 2 ? '立體聲' : '單聲道'}
                    </div>
                </div>
                <div class="track-controls">
                    <button class="track-btn move-btn" onclick="merger.moveTrack(${i}, -1)">⬆️</button>
                    <button class="track-btn move-btn" onclick="merger.moveTrack(${i}, 1)">⬇️</button>
                    <button class="track-btn remove-btn" onclick="merger.removeTrack(${i})">✕</button>
                </div>
            </div>
        `).join('');

        // Add drag events
        this.tracksList.querySelectorAll('.track-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('drop', (e) => this.handleDrop(e));
        });

        this.updateTotalDuration();
    }

    handleDragStart(e) {
        this.draggedItem = e.target;
        e.target.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.tracksList.querySelectorAll('.track-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        const item = e.target.closest('.track-item');
        if (item && item !== this.draggedItem) {
            this.tracksList.querySelectorAll('.track-item').forEach(i => {
                i.classList.remove('drag-over');
            });
            item.classList.add('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const targetItem = e.target.closest('.track-item');
        if (!targetItem || targetItem === this.draggedItem) return;

        const fromIndex = parseInt(this.draggedItem.dataset.index);
        const toIndex = parseInt(targetItem.dataset.index);

        const track = this.tracks.splice(fromIndex, 1)[0];
        this.tracks.splice(toIndex, 0, track);

        this.updateTracksList();
        this.updatePreview();
    }

    moveTrack(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.tracks.length) return;

        const track = this.tracks.splice(index, 1)[0];
        this.tracks.splice(newIndex, 0, track);

        this.updateTracksList();
        this.updatePreview();
    }

    removeTrack(index) {
        this.tracks.splice(index, 1);

        if (this.tracks.length === 0) {
            this.tracksPanel.classList.remove('show');
            this.previewSection.classList.remove('show');
            this.outputSettings.classList.remove('show');
            this.processBtn.classList.remove('show');
        } else {
            this.updateTracksList();
            this.updatePreview();
        }
    }

    updateTotalDuration() {
        let total = 0;
        for (const track of this.tracks) {
            total += track.duration;
        }
        // Account for crossfade overlap
        if (this.tracks.length > 1) {
            total -= this.crossfadeDuration * (this.tracks.length - 1);
        }
        total = Math.max(0, total);
        document.getElementById('totalDuration').textContent = this.formatTime(total);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    updatePreview() {
        this.updateTotalDuration();
        this.drawTimeline();
    }

    drawTimeline() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 60;

        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        if (this.tracks.length === 0) return;

        // Calculate total duration
        let totalDuration = 0;
        for (const track of this.tracks) {
            totalDuration += track.duration;
        }
        if (this.tracks.length > 1) {
            totalDuration -= this.crossfadeDuration * (this.tracks.length - 1);
        }
        totalDuration = Math.max(0.1, totalDuration);

        // Draw tracks
        const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
        let currentTime = 0;

        this.tracks.forEach((track, i) => {
            const startX = (currentTime / totalDuration) * width;
            const trackWidth = (track.duration / totalDuration) * width;

            // Draw track block
            this.ctx.fillStyle = colors[i % colors.length];
            this.ctx.fillRect(startX, 10, trackWidth, height - 20);

            // Draw track name
            this.ctx.fillStyle = '#0f172a';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            const label = track.name.length > 15 ? track.name.substring(0, 12) + '...' : track.name;
            if (trackWidth > 50) {
                this.ctx.fillText(label, startX + trackWidth / 2, height / 2);
            }

            currentTime += track.duration - this.crossfadeDuration;
        });

        // Draw crossfade markers
        if (this.crossfadeDuration > 0) {
            currentTime = 0;
            this.ctx.fillStyle = 'rgba(250, 204, 21, 0.5)';

            for (let i = 0; i < this.tracks.length - 1; i++) {
                currentTime += this.tracks[i].duration - this.crossfadeDuration;
                const x = (currentTime / totalDuration) * width;
                const fadeWidth = (this.crossfadeDuration / totalDuration) * width;

                this.ctx.fillRect(x, 5, fadeWidth, height - 10);
            }
        }
    }

    async processAudio() {
        if (this.tracks.length < 2) {
            alert('請至少添加 2 個音頻文件');
            return;
        }

        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        try {
            // Find the highest sample rate and use stereo
            const targetSampleRate = Math.max(...this.tracks.map(t => t.sampleRate));
            const targetChannels = 2;

            // Calculate total length
            let totalSamples = 0;
            for (const track of this.tracks) {
                totalSamples += Math.floor(track.duration * targetSampleRate);
            }
            if (this.tracks.length > 1) {
                totalSamples -= Math.floor(this.crossfadeDuration * targetSampleRate) * (this.tracks.length - 1);
            }
            totalSamples = Math.max(1, totalSamples);

            // Create output buffer
            this.processedBuffer = this.audioContext.createBuffer(
                targetChannels,
                totalSamples,
                targetSampleRate
            );

            const outputLeft = this.processedBuffer.getChannelData(0);
            const outputRight = this.processedBuffer.getChannelData(1);

            let currentSample = 0;
            const crossfadeSamples = Math.floor(this.crossfadeDuration * targetSampleRate);

            for (let t = 0; t < this.tracks.length; t++) {
                const track = this.tracks[t];
                const trackSamples = Math.floor(track.duration * targetSampleRate);

                // Resample if necessary
                const inputLeft = track.buffer.getChannelData(0);
                const inputRight = track.channels > 1 ? track.buffer.getChannelData(1) : inputLeft;
                const ratio = track.sampleRate / targetSampleRate;

                for (let i = 0; i < trackSamples; i++) {
                    const inputIndex = Math.min(Math.floor(i * ratio), inputLeft.length - 1);
                    let sampleL = inputLeft[inputIndex];
                    let sampleR = inputRight[inputIndex];

                    // Apply crossfade
                    if (t > 0 && i < crossfadeSamples) {
                        // Fade in
                        const fadeIn = i / crossfadeSamples;
                        sampleL *= fadeIn;
                        sampleR *= fadeIn;
                    }

                    if (t < this.tracks.length - 1 && i >= trackSamples - crossfadeSamples) {
                        // Fade out
                        const fadeOut = (trackSamples - i) / crossfadeSamples;
                        sampleL *= fadeOut;
                        sampleR *= fadeOut;
                    }

                    const outputIndex = currentSample + i;
                    if (outputIndex < totalSamples) {
                        outputLeft[outputIndex] += sampleL;
                        outputRight[outputIndex] += sampleR;
                    }

                    // Update progress
                    if (i % 10000 === 0) {
                        const progress = ((t * trackSamples + i) / (this.tracks.length * trackSamples)) * 100;
                        this.progressFill.style.width = progress + '%';
                    }
                }

                currentSample += trackSamples - crossfadeSamples;
            }

            // Normalize to prevent clipping
            let maxSample = 0;
            for (let i = 0; i < totalSamples; i++) {
                maxSample = Math.max(maxSample, Math.abs(outputLeft[i]), Math.abs(outputRight[i]));
            }
            if (maxSample > 1) {
                const scale = 0.99 / maxSample;
                for (let i = 0; i < totalSamples; i++) {
                    outputLeft[i] *= scale;
                    outputRight[i] *= scale;
                }
            }

            this.progressFill.style.width = '100%';

            // Update result info
            document.getElementById('resultInfo').textContent =
                `${this.tracks.length} 個音頻已合併 | 總時長: ${this.formatTime(this.processedBuffer.duration)}`;

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
        link.download = `merged_audio.${extension}`;
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
let merger;
document.addEventListener('DOMContentLoaded', () => {
    merger = new AudioMerger();
});
