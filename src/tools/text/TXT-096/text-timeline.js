/**
 * TXT-096: Text Timeline
 *
 * Converts text to ASCII timeline.
 */

class TextTimeline {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.timelineStyle = document.getElementById('timelineStyle');
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
      this.showStatus('error', '請輸入事件');
      return;
    }

    const events = this.parseEvents(text);
    if (events.length === 0) {
      this.showStatus('error', '無法解析事件格式');
      return;
    }

    const style = this.timelineStyle.value;
    let result;

    switch (style) {
      case 'vertical':
        result = this.generateVertical(events);
        break;
      case 'horizontal':
        result = this.generateHorizontal(events);
        break;
      case 'alternating':
        result = this.generateAlternating(events);
        break;
    }

    this.outputText.textContent = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '生成完成');
  }

  parseEvents(text) {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const parts = line.split('|');
      if (parts.length >= 2) {
        return {
          date: parts[0].trim(),
          event: parts.slice(1).join('|').trim()
        };
      }
      return { date: '', event: line.trim() };
    });
  }

  generateVertical(events) {
    const lines = [];
    const maxDateLen = Math.max(...events.map(e => e.date.length));

    events.forEach((event, index) => {
      const datePad = event.date.padStart(maxDateLen);
      const isLast = index === events.length - 1;

      lines.push(`${datePad} ●━━ ${event.event}`);
      if (!isLast) {
        lines.push(' '.repeat(maxDateLen) + ' │');
        lines.push(' '.repeat(maxDateLen) + ' │');
      }
    });

    return lines.join('\n');
  }

  generateHorizontal(events) {
    const maxEventLen = Math.max(...events.map(e => e.event.length));
    const colWidth = Math.max(maxEventLen, 10) + 2;

    // Build timeline
    let dateLine = '';
    let pointLine = '';
    let lineLine = '';
    let eventLine = '';

    events.forEach((event, index) => {
      const isLast = index === events.length - 1;
      const center = Math.floor(colWidth / 2);

      // Date row
      const dateStr = event.date.padStart(center + Math.floor(event.date.length / 2)).padEnd(colWidth);
      dateLine += dateStr;

      // Point row
      const pointStr = ' '.repeat(center) + '●' + ' '.repeat(colWidth - center - 1);
      pointLine += pointStr;

      // Line row
      if (isLast) {
        lineLine += '━'.repeat(center) + '┛' + ' '.repeat(colWidth - center - 1);
      } else {
        lineLine += '━'.repeat(colWidth);
      }

      // Event row
      const eventStr = event.event.padStart(center + Math.floor(event.event.length / 2)).padEnd(colWidth);
      eventLine += eventStr;
    });

    return [dateLine, pointLine, lineLine, eventLine].join('\n');
  }

  generateAlternating(events) {
    const lines = [];
    const maxEventLen = Math.max(...events.map(e => e.event.length));
    const maxDateLen = Math.max(...events.map(e => e.date.length));
    const padding = maxEventLen + 4;

    events.forEach((event, index) => {
      const isEven = index % 2 === 0;
      const isLast = index === events.length - 1;

      if (isEven) {
        // Left side
        const eventPad = event.event.padStart(padding);
        const datePad = event.date.padStart(padding);
        lines.push(`${eventPad} ━━●`);
        lines.push(`${datePad}   │`);
      } else {
        // Right side
        lines.push(`                    ●━━ ${event.event}`);
        lines.push(`                    │   (${event.date})`);
      }

      if (!isLast) {
        lines.push('                    │');
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
  window.textTimeline = new TextTimeline();
});

export default TextTimeline;
