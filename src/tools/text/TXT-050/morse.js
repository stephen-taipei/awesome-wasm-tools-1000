/**
 * TXT-050: Morse Code Converter
 *
 * Converts text to/from Morse code with audio playback.
 */

class MorseConverter {
  constructor() {
    this.morseMap = {
      'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.',
      'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
      'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
      'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
      'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--',
      'Z': '--..',
      '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
      '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
      '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
      '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
      ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
      '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
    };

    this.reverseMorseMap = {};
    for (const [char, morse] of Object.entries(this.morseMap)) {
      this.reverseMorseMap[morse] = char;
    }

    this.audioContext = null;
    this.isPlaying = false;

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.charSeparator = document.getElementById('charSeparator');
    this.wordSeparator = document.getElementById('wordSeparator');
    this.toMorseBtn = document.getElementById('toMorseBtn');
    this.toTextBtn = document.getElementById('toTextBtn');
    this.playBtn = document.getElementById('playBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.currentMorse = '';

    this.bindEvents();
  }

  bindEvents() {
    this.toMorseBtn.addEventListener('click', () => this.toMorse());
    this.toTextBtn.addEventListener('click', () => this.toText());
    this.playBtn.addEventListener('click', () => this.play());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  toMorse() {
    const text = this.inputText.value.toUpperCase();
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const charSep = this.charSeparator.value;
    const wordSep = this.wordSeparator.value;

    const words = text.split(/\s+/);
    const morseWords = [];

    for (const word of words) {
      const morseChars = [];
      for (const char of word) {
        if (this.morseMap[char]) {
          morseChars.push(this.morseMap[char]);
        }
      }
      if (morseChars.length > 0) {
        morseWords.push(morseChars.join(charSep));
      }
    }

    const morse = morseWords.join(wordSep);
    this.currentMorse = morse;

    this.outputText.textContent = morse;
    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
    this.playBtn.style.display = 'inline-flex';
    this.showStatus('success', '轉換成功');
  }

  toText() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入摩斯電碼');
      return;
    }

    // Detect separators
    let wordSep = ' / ';
    let charSep = ' ';

    if (input.includes(' | ')) {
      wordSep = ' | ';
    } else if (input.includes('  ')) {
      wordSep = '  ';
    }

    if (input.includes('/') && !input.includes(' / ')) {
      charSep = '/';
    } else if (input.includes('|') && !input.includes(' | ')) {
      charSep = '|';
    }

    const words = input.split(wordSep);
    const textWords = [];

    for (const word of words) {
      const morseChars = word.split(charSep).filter(c => c.trim());
      let textWord = '';

      for (const morse of morseChars) {
        const char = this.reverseMorseMap[morse.trim()];
        if (char) {
          textWord += char;
        } else {
          textWord += '?';
        }
      }

      if (textWord) {
        textWords.push(textWord);
      }
    }

    const text = textWords.join(' ');
    this.currentMorse = '';

    this.outputText.textContent = text;
    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
    this.playBtn.style.display = 'none';
    this.showStatus('success', '轉換成功');
  }

  async play() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.playBtn.querySelector('span:last-child').textContent = '播放';
      return;
    }

    if (!this.currentMorse) {
      this.showStatus('error', '沒有摩斯電碼可播放');
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    this.isPlaying = true;
    this.playBtn.querySelector('span:last-child').textContent = '停止';

    const dotDuration = 80; // ms
    const dashDuration = dotDuration * 3;
    const symbolGap = dotDuration;
    const charGap = dotDuration * 3;
    const wordGap = dotDuration * 7;
    const frequency = 600; // Hz

    const playTone = (duration) => {
      return new Promise((resolve) => {
        if (!this.isPlaying) {
          resolve();
          return;
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);

        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          resolve();
        }, duration);
      });
    };

    const pause = (duration) => {
      return new Promise((resolve) => {
        setTimeout(resolve, duration);
      });
    };

    // Parse morse and play
    for (let i = 0; i < this.currentMorse.length && this.isPlaying; i++) {
      const char = this.currentMorse[i];

      if (char === '.') {
        await playTone(dotDuration);
        await pause(symbolGap);
      } else if (char === '-') {
        await playTone(dashDuration);
        await pause(symbolGap);
      } else if (char === ' ') {
        // Check for word separator
        if (this.currentMorse.substring(i, i + 3) === ' / ') {
          await pause(wordGap);
          i += 2;
        } else {
          await pause(charGap);
        }
      } else if (char === '/') {
        await pause(wordGap);
      }
    }

    this.isPlaying = false;
    this.playBtn.querySelector('span:last-child').textContent = '播放';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.textContent);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.inputText.value = '';
    this.outputText.textContent = '';
    this.resultArea.style.display = 'none';
    this.copyBtn.style.display = 'none';
    this.playBtn.style.display = 'none';
    this.currentMorse = '';
    this.isPlaying = false;
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.morseConverter = new MorseConverter();
});

export default MorseConverter;
