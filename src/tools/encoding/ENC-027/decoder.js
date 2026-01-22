/**
 * ENC-027: Morse Code Decoder
 */
class MorseDecoder {
  constructor() {
    this.morseToChar = {
      '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F', '--.': 'G', '....': 'H',
      '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P',
      '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
      '-.--': 'Y', '--..': 'Z', '-----': '0', '.----': '1', '..---': '2', '...--': '3', '....-': '4',
      '.....': '5', '-....': '6', '--...': '7', '---..': '8', '----.': '9', '.-.-.-': '.', '--..--': ',',
      '..--..': '?', '.----.': "'", '-.-.--': '!', '-..-.': '/', '-.--.': '(', '-.--.-': ')', '.-...': '&',
      '---...': ':', '-.-.-.': ';', '-...-': '=', '.-.-.': '+', '-....-': '-', '..--.-': '_', '.-..-.': '"',
      '...-..-': '$', '.--.-.': '@', '/': ' '
    };
    this.init();
  }
  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.decodeBtn = document.getElementById('decodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.inputText.addEventListener('input', () => this.decode());
    this.decodeBtn.addEventListener('click', () => this.decode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }
  decode() {
    const morse = this.inputText.value.trim();
    if (!morse) { this.resultArea.style.display = 'none'; return; }
    const words = morse.split(' / ');
    const result = words.map(word => {
      return word.split(' ').map(code => this.morseToChar[code] || '?').join('');
    }).join(' ');
    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '解碼完成！');
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
document.addEventListener('DOMContentLoaded', () => { window.morseDecoder = new MorseDecoder(); });
export default MorseDecoder;
