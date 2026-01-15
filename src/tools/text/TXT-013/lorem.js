/**
 * TXT-013: Lorem Ipsum Generator
 *
 * Generates Lorem Ipsum placeholder text.
 */

class LoremIpsumGenerator {
  constructor() {
    this.words = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
      'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
      'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
      'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
      'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
      'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
      'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
      'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'perspiciatis', 'unde',
      'omnis', 'iste', 'natus', 'error', 'voluptatem', 'accusantium', 'doloremque',
      'laudantium', 'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo',
      'inventore', 'veritatis', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta',
      'explicabo', 'nemo', 'ipsam', 'quia', 'voluptas', 'aspernatur', 'aut', 'odit',
      'fugit', 'consequuntur', 'magni', 'dolores', 'eos', 'ratione', 'sequi', 'nesciunt',
      'neque', 'porro', 'quisquam', 'dolorem', 'adipisci', 'numquam', 'eius', 'modi',
      'tempora', 'magnam', 'quaerat'
    ];

    this.init();
  }

  init() {
    this.generateType = document.getElementById('generateType');
    this.count = document.getElementById('count');
    this.startLorem = document.getElementById('startLorem');
    this.generateBtn = document.getElementById('generateBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.outputText = document.getElementById('outputText');
    this.wordCount = document.getElementById('wordCount');
    this.charCount = document.getElementById('charCount');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  randomWord() {
    return this.words[Math.floor(Math.random() * this.words.length)];
  }

  generateWords(count) {
    const words = [];
    for (let i = 0; i < count; i++) {
      words.push(this.randomWord());
    }
    return words;
  }

  generateSentence(wordCount = null) {
    const count = wordCount || Math.floor(Math.random() * 10) + 5;
    const words = this.generateWords(count);
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return words.join(' ') + '.';
  }

  generateParagraph() {
    const sentenceCount = Math.floor(Math.random() * 4) + 3;
    const sentences = [];
    for (let i = 0; i < sentenceCount; i++) {
      sentences.push(this.generateSentence());
    }
    return sentences.join(' ');
  }

  generate() {
    const type = this.generateType.value;
    const num = parseInt(this.count.value) || 5;
    const startWithLorem = this.startLorem.checked;

    let result = '';

    switch (type) {
      case 'paragraphs':
        const paragraphs = [];
        for (let i = 0; i < num; i++) {
          paragraphs.push(this.generateParagraph());
        }
        if (startWithLorem && paragraphs.length > 0) {
          paragraphs[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
            paragraphs[0].split('. ').slice(1).join('. ');
        }
        result = paragraphs.join('\n\n');
        break;

      case 'sentences':
        const sentences = [];
        for (let i = 0; i < num; i++) {
          sentences.push(this.generateSentence());
        }
        if (startWithLorem && sentences.length > 0) {
          sentences[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
        }
        result = sentences.join(' ');
        break;

      case 'words':
        const words = this.generateWords(num);
        if (startWithLorem && words.length >= 2) {
          words[0] = 'lorem';
          words[1] = 'ipsum';
        }
        result = words.join(' ');
        break;
    }

    this.outputText.innerHTML = result.split('\n\n').map(p => `<p>${p}</p>`).join('');

    const totalWords = result.split(/\s+/).length;
    const totalChars = result.length;

    this.wordCount.textContent = totalWords;
    this.charCount.textContent = totalChars;

    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
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
    this.outputText.innerHTML = '';
    this.resultArea.style.display = 'none';
    this.copyBtn.style.display = 'none';
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
  window.loremGenerator = new LoremIpsumGenerator();
});

export default LoremIpsumGenerator;
