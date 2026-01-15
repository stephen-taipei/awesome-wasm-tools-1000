/**
 * TXT-012: Regex Builder Tool
 *
 * Visual regex builder with drag-and-drop interface.
 */

class RegexBuilder {
  constructor() {
    this.blocks = [];
    this.init();
  }

  init() {
    this.regexBlocks = document.getElementById('regexBlocks');
    this.addBlockBtn = document.getElementById('addBlockBtn');
    this.regexOutput = document.getElementById('regexOutput');
    this.copyRegexBtn = document.getElementById('copyRegexBtn');
    this.testInput = document.getElementById('testInput');
    this.testResult = document.getElementById('testResult');
    this.flagG = document.getElementById('flagG');
    this.flagI = document.getElementById('flagI');
    this.flagM = document.getElementById('flagM');
    this.flagS = document.getElementById('flagS');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
    this.updateRegex();
  }

  bindEvents() {
    this.addBlockBtn.addEventListener('click', () => this.addBlock());
    this.copyRegexBtn.addEventListener('click', () => this.copyRegex());
    this.testInput.addEventListener('input', () => this.runTest());

    [this.flagG, this.flagI, this.flagM, this.flagS].forEach(flag => {
      flag.addEventListener('change', () => {
        this.updateRegex();
        this.runTest();
      });
    });

    document.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.add;
        this.addQuickBlock(type);
      });
    });
  }

  addBlock(pattern = '', quantifier = '') {
    const id = Date.now();
    this.blocks.push({ id, pattern, quantifier });
    this.renderBlocks();
    this.updateRegex();
  }

  addQuickBlock(type) {
    const patterns = {
      digit: ['\\d', ''],
      word: ['\\w', ''],
      space: ['\\s', ''],
      any: ['.', ''],
      start: ['^', ''],
      end: ['$', ''],
      group: ['()', ''],
      or: ['|', ''],
      optional: ['', '?'],
      onemore: ['', '+'],
      zeromore: ['', '*']
    };

    const [pattern, quantifier] = patterns[type] || ['', ''];

    if (quantifier && this.blocks.length > 0) {
      // Apply quantifier to last block
      const lastBlock = this.blocks[this.blocks.length - 1];
      lastBlock.quantifier = quantifier;
      this.renderBlocks();
      this.updateRegex();
    } else {
      this.addBlock(pattern, quantifier);
    }
  }

  renderBlocks() {
    this.regexBlocks.innerHTML = this.blocks.map((block, index) => `
      <div class="regex-block" data-id="${block.id}">
        <span class="block-number">${index + 1}</span>
        <input type="text" class="block-pattern" value="${this.escapeHtml(block.pattern)}" placeholder="模式">
        <select class="block-quantifier">
          <option value="" ${block.quantifier === '' ? 'selected' : ''}>無</option>
          <option value="?" ${block.quantifier === '?' ? 'selected' : ''}>? (0或1)</option>
          <option value="*" ${block.quantifier === '*' ? 'selected' : ''}>* (0+)</option>
          <option value="+" ${block.quantifier === '+' ? 'selected' : ''}>+ (1+)</option>
          <option value="{n}" ${block.quantifier === '{n}' ? 'selected' : ''}>{n} (精確)</option>
          <option value="{n,}" ${block.quantifier === '{n,}' ? 'selected' : ''}>{n,} (最少)</option>
          <option value="{n,m}" ${block.quantifier === '{n,m}' ? 'selected' : ''}>{n,m} (範圍)</option>
        </select>
        <input type="text" class="block-quantifier-value" value="${block.quantifierValue || ''}" placeholder="數值" style="width: 60px; ${['', '?', '*', '+'].includes(block.quantifier) ? 'display:none' : ''}">
        <button class="btn btn-sm btn-danger block-remove">✕</button>
      </div>
    `).join('');

    // Rebind events
    this.regexBlocks.querySelectorAll('.block-pattern').forEach((input, i) => {
      input.addEventListener('input', (e) => {
        this.blocks[i].pattern = e.target.value;
        this.updateRegex();
      });
    });

    this.regexBlocks.querySelectorAll('.block-quantifier').forEach((select, i) => {
      select.addEventListener('change', (e) => {
        this.blocks[i].quantifier = e.target.value;
        const valueInput = e.target.nextElementSibling;
        valueInput.style.display = ['', '?', '*', '+'].includes(e.target.value) ? 'none' : 'inline-block';
        this.updateRegex();
      });
    });

    this.regexBlocks.querySelectorAll('.block-quantifier-value').forEach((input, i) => {
      input.addEventListener('input', (e) => {
        this.blocks[i].quantifierValue = e.target.value;
        this.updateRegex();
      });
    });

    this.regexBlocks.querySelectorAll('.block-remove').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        this.blocks.splice(i, 1);
        this.renderBlocks();
        this.updateRegex();
      });
    });
  }

  updateRegex() {
    const pattern = this.blocks.map(block => {
      let q = block.quantifier;
      if (q && block.quantifierValue) {
        q = q.replace('n,m', block.quantifierValue).replace('n,', block.quantifierValue + ',').replace('n', block.quantifierValue);
      }
      return block.pattern + q;
    }).join('');

    let flags = '';
    if (this.flagG.checked) flags += 'g';
    if (this.flagI.checked) flags += 'i';
    if (this.flagM.checked) flags += 'm';
    if (this.flagS.checked) flags += 's';

    this.regexOutput.textContent = `/${pattern}/${flags}`;
    this.runTest();
  }

  runTest() {
    const text = this.testInput.value;
    const regexText = this.regexOutput.textContent;

    if (!text || regexText === '//g') {
      this.testResult.innerHTML = '';
      return;
    }

    try {
      const match = regexText.match(/^\/(.*)\/([gimsy]*)$/);
      if (!match) throw new Error('Invalid regex');

      const regex = new RegExp(match[1], match[2]);
      const matches = text.match(regex);

      if (matches) {
        this.testResult.innerHTML = `<span class="text-success">找到 ${matches.length} 個匹配: ${matches.map(m => `"${this.escapeHtml(m)}"`).join(', ')}</span>`;
      } else {
        this.testResult.innerHTML = '<span class="text-warning">沒有匹配</span>';
      }
    } catch (e) {
      this.testResult.innerHTML = `<span class="text-danger">錯誤: ${e.message}</span>`;
    }
  }

  async copyRegex() {
    try {
      await navigator.clipboard.writeText(this.regexOutput.textContent);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
  window.regexBuilder = new RegexBuilder();
});

export default RegexBuilder;
