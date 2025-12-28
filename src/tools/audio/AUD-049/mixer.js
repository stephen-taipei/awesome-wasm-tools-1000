/**
 * AUD-049 音頻混音 - Audio Mixer
 * Mix multiple audio tracks with volume and pan controls
 */

class AudioMixer {
    constructor() {
        this.audioContext = null;
        this.tracks = [];
        this.masterVolume = 1.0;
        this.outputFormat = 'wav';
        this.isPlaying = false;
        this.playbackNodes = [];
        this.startTime = 0;
        this.pauseTime = 0;
        this.mixedBuffer = null;

        this.canvas = document.getElementById('mixCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.mixerPanel = document.getElementById('mixerPanel');
        this.tracksContainer = document.getElementById('tracksContainer');
        this.previewSection = document.getElementById('previewSection');
        this.outputSettings = document.getElementById('outputSettings');
        this.processBtn = document.getElementById('processBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.resultPanel = document.getElementById('resultPanel');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.playBtn = document.getElementById('playBtn');
        this.timeDisplay = document.getElementById('timeDisplay');
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

        // Add track button
        document.getElementById('addTrackBtn').addEventListener('click', () => {
            this.fileInput.click();
        });

        // Master volume
        document.getElementById('masterVolume').addEventListener('input', (e) => {
            this.masterVolume = parseInt(e.target.value) / 100;
            document.getElementById('masterValue').textContent = e.target.value + '%';
        });

        // Format buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.outputFormat = btn.dataset.format;
            });
        });

        // Play button
        this.playBtn.addEventListener('click', () => this.togglePlayback());

        // Process button
        this.processBtn.addEventListener('click', () => this.processMix());

        // Download button
        this.downloadBtn.addEventListener('click', () => this.downloadMix());

        // Resize
        window.addEventListener('resize', () => {
            if (this.tracks.length > 0) this.drawMixPreview();
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
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

                const track = {
                    id: Date.now() + Math.random(),
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    buffer: audioBuffer,
                    volume: 1.0,
                    pan: 0,
                    muted: false,
                    solo: false
                };

                this.tracks.push(track);
            } catch (error) {
                console.error('Error loading audio:', error);
                alert(`無法載入 ${file.name}: ${error.message}`);
            }
        }

        if (this.tracks.length > 0) {
            this.updateUI();
        }
    }

    updateUI() {
        this.mixerPanel.classList.add('show');
        this.previewSection.classList.add('show');
        this.outputSettings.classList.add('show');
        this.processBtn.classList.add('show');
        this.resultPanel.classList.remove('show');

        this.renderTracks();
        this.drawMixPreview();
        this.updateTimeDisplay();
    }

    renderTracks() {
        const container = this.tracksContainer;
        const addBtn = document.getElementById('addTrackBtn');

        // Remove existing track elements
        container.querySelectorAll('.track-channel').forEach(el => el.remove());

        this.tracks.forEach((track, index) => {
            const trackEl = document.createElement('div');
            trackEl.className = 'track-channel';
            trackEl.dataset.id = track.id;

            trackEl.innerHTML = `
                <div class="track-header">
                    <span class="track-number">${index + 1}</span>
                    <button class="track-remove" data-id="${track.id}">×</button>
                </div>
                <div class="track-name">${this.truncateName(track.name)}</div>
                <div class="track-meter">
                    <div class="meter-fill" id="meter-${track.id}" style="height: 0%"></div>
                </div>
                <div class="volume-slider">
                    <label>音量</label>
                    <input type="range" min="0" max="150" value="${track.volume * 100}"
                           data-id="${track.id}" class="volume-input">
                    <span class="volume-value">${Math.round(track.volume * 100)}%</span>
                </div>
                <div class="pan-control">
                    <label>平衡</label>
                    <input type="range" min="-100" max="100" value="${track.pan * 100}"
                           data-id="${track.id}" class="pan-input">
                    <span class="pan-value">${this.formatPan(track.pan)}</span>
                </div>
                <div class="mute-solo">
                    <button class="mute-btn ${track.muted ? 'active' : ''}" data-id="${track.id}">M</button>
                    <button class="solo-btn ${track.solo ? 'active' : ''}" data-id="${track.id}">S</button>
                </div>
            `;

            container.insertBefore(trackEl, addBtn);

            // Volume input
            trackEl.querySelector('.volume-input').addEventListener('input', (e) => {
                const t = this.tracks.find(t => t.id == e.target.dataset.id);
                if (t) {
                    t.volume = parseInt(e.target.value) / 100;
                    e.target.nextElementSibling.textContent = e.target.value + '%';
                }
            });

            // Pan input
            trackEl.querySelector('.pan-input').addEventListener('input', (e) => {
                const t = this.tracks.find(t => t.id == e.target.dataset.id);
                if (t) {
                    t.pan = parseInt(e.target.value) / 100;
                    e.target.nextElementSibling.textContent = this.formatPan(t.pan);
                }
            });

            // Remove button
            trackEl.querySelector('.track-remove').addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.tracks = this.tracks.filter(t => t.id != id);
                this.updateUI();
            });

            // Mute button
            trackEl.querySelector('.mute-btn').addEventListener('click', (e) => {
                const t = this.tracks.find(t => t.id == e.target.dataset.id);
                if (t) {
                    t.muted = !t.muted;
                    e.target.classList.toggle('active', t.muted);
                }
            });

            // Solo button
            trackEl.querySelector('.solo-btn').addEventListener('click', (e) => {
                const t = this.tracks.find(t => t.id == e.target.dataset.id);
                if (t) {
                    t.solo = !t.solo;
                    e.target.classList.toggle('active', t.solo);
                }
            });
        });
    }

    truncateName(name) {
        return name.length > 15 ? name.substring(0, 12) + '...' : name;
    }

    formatPan(pan) {
        if (pan === 0) return 'C';
        if (pan < 0) return `L${Math.abs(Math.round(pan * 100))}`;
        return `R${Math.round(pan * 100)}`;
    }

    getMaxDuration() {
        return Math.max(...this.tracks.map(t => t.buffer.duration));
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    updateTimeDisplay() {
        const duration = this.getMaxDuration();
        this.timeDisplay.textContent = `0:00 / ${this.formatTime(duration)}`;
    }

    drawMixPreview() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 48;
        this.canvas.height = 80;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const duration = this.getMaxDuration();

        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);

        // Draw each track as a colored bar
        const trackHeight = (height - 20) / this.tracks.length;
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

        this.tracks.forEach((track, i) => {
            const y = 10 + i * trackHeight;
            const w = (track.buffer.duration / duration) * width;

            const gradient = this.ctx.createLinearGradient(0, y, 0, y + trackHeight - 4);
            gradient.addColorStop(0, colors[i % colors.length]);
            gradient.addColorStop(1, colors[(i + 1) % colors.length]);

            this.ctx.fillStyle = track.muted ? 'rgba(100, 100, 100, 0.5)' : gradient;
            this.ctx.fillRect(0, y, w, trackHeight - 4);

            // Draw track number
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 10px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`${i + 1}`, 4, y + (trackHeight - 4) / 2);
        });
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback();
        }
    }

    startPlayback() {
        if (this.tracks.length === 0) return;

        this.isPlaying = true;
        this.playBtn.textContent = '⏹ 停止';
        this.startTime = this.audioContext.currentTime - this.pauseTime;

        const hasSolo = this.tracks.some(t => t.solo);

        this.tracks.forEach(track => {
            const shouldPlay = hasSolo ? track.solo : !track.muted;
            if (!shouldPlay) return;

            const source = this.audioContext.createBufferSource();
            source.buffer = track.buffer;

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = track.volume * this.masterVolume;

            const panNode = this.audioContext.createStereoPanner();
            panNode.pan.value = track.pan;

            source.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(this.audioContext.destination);

            source.start(0, this.pauseTime);
            this.playbackNodes.push({ source, gainNode, panNode, track });
        });

        // Update time display
        this.updatePlaybackTime();
    }

    updatePlaybackTime() {
        if (!this.isPlaying) return;

        const elapsed = this.audioContext.currentTime - this.startTime;
        const duration = this.getMaxDuration();

        if (elapsed >= duration) {
            this.stopPlayback();
            this.pauseTime = 0;
            return;
        }

        this.timeDisplay.textContent = `${this.formatTime(elapsed)} / ${this.formatTime(duration)}`;

        // Update meters
        this.playbackNodes.forEach(node => {
            const meter = document.getElementById(`meter-${node.track.id}`);
            if (meter) {
                const level = 30 + Math.random() * 50 * node.track.volume;
                meter.style.height = level + '%';
            }
        });

        requestAnimationFrame(() => this.updatePlaybackTime());
    }

    stopPlayback() {
        this.isPlaying = false;
        this.playBtn.textContent = '▶ 播放';
        this.pauseTime = this.audioContext.currentTime - this.startTime;

        this.playbackNodes.forEach(node => {
            try {
                node.source.stop();
            } catch (e) {}
        });
        this.playbackNodes = [];

        // Reset meters
        this.tracks.forEach(track => {
            const meter = document.getElementById(`meter-${track.id}`);
            if (meter) meter.style.height = '0%';
        });
    }

    async processMix() {
        if (this.tracks.length === 0) return;

        this.stopPlayback();
        this.processBtn.disabled = true;
        this.progressBar.classList.add('show');
        this.resultPanel.classList.remove('show');

        try {
            const sampleRate = this.tracks[0].buffer.sampleRate;
            const duration = this.getMaxDuration();
            const length = Math.ceil(duration * sampleRate);

            // Create stereo output buffer
            this.mixedBuffer = this.audioContext.createBuffer(2, length, sampleRate);
            const leftChannel = this.mixedBuffer.getChannelData(0);
            const rightChannel = this.mixedBuffer.getChannelData(1);

            const hasSolo = this.tracks.some(t => t.solo);

            // Mix tracks
            this.tracks.forEach((track, trackIndex) => {
                const shouldMix = hasSolo ? track.solo : !track.muted;
                if (!shouldMix) return;

                const numChannels = track.buffer.numberOfChannels;
                const trackLength = track.buffer.length;
                const trackLeft = track.buffer.getChannelData(0);
                const trackRight = numChannels > 1 ? track.buffer.getChannelData(1) : trackLeft;

                // Calculate stereo pan coefficients
                const pan = track.pan;
                const leftGain = track.volume * (pan <= 0 ? 1 : 1 - pan);
                const rightGain = track.volume * (pan >= 0 ? 1 : 1 + pan);

                for (let i = 0; i < trackLength; i++) {
                    leftChannel[i] += trackLeft[i] * leftGain * this.masterVolume;
                    rightChannel[i] += trackRight[i] * rightGain * this.masterVolume;

                    if (i % 50000 === 0) {
                        const progress = ((trackIndex / this.tracks.length) + (i / trackLength / this.tracks.length)) * 100;
                        this.progressFill.style.width = progress + '%';
                    }
                }
            });

            // Soft clip to prevent harsh clipping
            for (let i = 0; i < length; i++) {
                leftChannel[i] = this.softClip(leftChannel[i]);
                rightChannel[i] = this.softClip(rightChannel[i]);
            }

            this.progressFill.style.width = '100%';

            // Update result info
            document.getElementById('resultInfo').textContent =
                `${this.tracks.length} 個音軌混合 | 時長: ${this.formatTime(duration)}`;

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

    softClip(sample) {
        if (sample > 1) return 1 - Math.exp(1 - sample);
        if (sample < -1) return -1 + Math.exp(1 + sample);
        return sample;
    }

    downloadMix() {
        if (!this.mixedBuffer) return;

        let blob;
        let extension;

        if (this.outputFormat === 'mp3') {
            blob = this.encodeMP3(this.mixedBuffer);
            extension = 'mp3';
        } else {
            blob = this.encodeWAV(this.mixedBuffer);
            extension = 'wav';
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mixed_audio.${extension}`;
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
    new AudioMixer();
});
