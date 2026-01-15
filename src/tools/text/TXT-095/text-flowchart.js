/**
 * TXT-095: Text Flowchart
 *
 * Converts text to ASCII flowchart.
 */

class TextFlowchart {
  constructor() {
    this.boxStyles = {
      unicode: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        arrowDown: '↓',
        arrowRight: '→'
      },
      ascii: {
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+',
        horizontal: '-',
        vertical: '|',
        arrowDown: 'v',
        arrowRight: '>'
      },
      simple: {
        topLeft: '#',
        topRight: '#',
        bottomLeft: '#',
        bottomRight: '#',
        horizontal: '#',
        vertical: '#',
        arrowDown: 'v',
        arrowRight: '>'
      }
    };

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.flowDirection = document.getElementById('flowDirection');
    this.boxStyle = document.getElementById('boxStyle');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  generate() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入步驟');
      return;
    }

    const steps = text.split('\n').filter(line => line.trim());
    const style = this.boxStyles[this.boxStyle.value];
    const direction = this.flowDirection.value;

    let result;
    if (direction === 'vertical') {
      result = this.generateVertical(steps, style);
    } else {
      result = this.generateHorizontal(steps, style);
    }

    this.outputText.textContent = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '生成完成');
  }

  generateVertical(steps, style) {
    const maxLength = Math.max(...steps.map(s => s.length));
    const boxWidth = maxLength + 4;
    const lines = [];

    steps.forEach((step, index) => {
      // Top border
      lines.push(style.topLeft + style.horizontal.repeat(boxWidth) + style.topRight);

      // Content with padding
      const padding = boxWidth - step.length;
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      lines.push(style.vertical + ' '.repeat(leftPad) + step + ' '.repeat(rightPad) + style.vertical);

      // Bottom border
      lines.push(style.bottomLeft + style.horizontal.repeat(boxWidth) + style.bottomRight);

      // Arrow (except for last step)
      if (index < steps.length - 1) {
        const arrowPad = Math.floor(boxWidth / 2);
        lines.push(' '.repeat(arrowPad) + style.arrowDown);
        lines.push(' '.repeat(arrowPad) + style.vertical);
        lines.push(' '.repeat(arrowPad) + style.arrowDown);
      }
    });

    return lines.join('\n');
  }

  generateHorizontal(steps, style) {
    const maxLength = Math.max(...steps.map(s => s.length));
    const boxWidth = maxLength + 2;
    const lines = ['', '', ''];

    steps.forEach((step, index) => {
      const padding = boxWidth - step.length;
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;

      lines[0] += style.topLeft + style.horizontal.repeat(boxWidth) + style.topRight;
      lines[1] += style.vertical + ' '.repeat(leftPad) + step + ' '.repeat(rightPad) + style.vertical;
      lines[2] += style.bottomLeft + style.horizontal.repeat(boxWidth) + style.bottomRight;

      if (index < steps.length - 1) {
        lines[0] += '   ';
        lines[1] += style.horizontal + style.arrowRight + style.horizontal;
        lines[2] += '   ';
      }
    });

    return lines.join('\n');
  }

  clear() {
    this.inputText.value = '';
    this.outputText.textContent = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.outputText.textContent;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
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
  window.textFlowchart = new TextFlowchart();
});

export default TextFlowchart;
