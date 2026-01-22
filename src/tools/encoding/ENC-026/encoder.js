/**
 * ENC-026: Morse Code Encoder
 */
class MorseEncoder {
  constructor() {
    this.morseCode = {
      'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
      'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
      'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
      'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
      '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '.': '.-.-.-', ',': '--..--',
      '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...',
      ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
      '$': '...-..-', '@': '.--.-.', ' ': '/'
    };
    this.init();
  }
  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.encodeBtn = document.getElementById('encodeBtn');
    this.playBtn = document.getElementById('playBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.inputText.addEventListener('input', () => this.encode());
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.playBtn.addEventListener('click', () => this.play());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }
  encode() {
    const text = this.inputText.value.toUpperCase();
    if (!text) { this.resultArea.style.display = 'none'; return; }
    const result = text.split('').map(char => this.morseCode[char] || char).join(' ');
    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '編碼完成！');
  }
  async play() {
    const morse = this.outputText.value;
    if (!morse) return;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const dot = 0.1, dash = 0.3, gap = 0.1, letterGap = 0.3, wordGap = 0.7;
    let time = audioContext.currentTime;
    for (const char of morse) {
      if (char === '.') {
        this.playTone(audioContext, time, dot);
        time += dot + gap;
      } else if (char === '-') {
        this.playTone(audioContext, time, dash);
        time += dash + gap;
      } else if (char === ' ') {
        time += letterGap;
      } else if (char === '/') {
        time += wordGap;
      }
    }
  }
  playTone(ctx, time, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    osc.start(time);
    osc.stop(time + duration);
  }
  clear() { this.inputText.value = ''; this.outputText.value = ''; this.resultArea.style.display = 'none'; }
  async copy() {
    try { await navigator.clipboard.writeText(this.outputText.value); this.showStatus('success', '已複製！'); }
    catch (e) { this.showStatus('error', '複製失敗'); }
  }
  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}
document.addEventListener('DOMContentLoaded', () => { window.morseEncoder = new MorseEncoder(); });
export default MorseEncoder;
