/**
 * TXT-094: Text Tree Diagram
 *
 * Converts indented text to tree structure diagram.
 */

class TextTree {
  constructor() {
    this.styles = {
      ascii: {
        branch: '|-- ',
        lastBranch: '`-- ',
        pipe: '|   ',
        space: '    '
      },
      unicode: {
        branch: '├── ',
        lastBranch: '└── ',
        pipe: '│   ',
        space: '    '
      },
      simple: {
        branch: '+-- ',
        lastBranch: '+-- ',
        pipe: '|   ',
        space: '    '
      }
    };

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.treeStyle = document.getElementById('treeStyle');
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
      this.showStatus('error', '請輸入文字');
      return;
    }

    const lines = text.split('\n').filter(line => line.trim());
    const nodes = this.parseIndentation(lines);
    const style = this.styles[this.treeStyle.value];
    const tree = this.buildTree(nodes, style);

    this.outputText.textContent = tree;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '生成完成');
  }

  parseIndentation(lines) {
    return lines.map(line => {
      const match = line.match(/^(\s*)/);
      const indent = match ? match[1].replace(/\t/g, '  ').length : 0;
      const level = Math.floor(indent / 2);
      const content = line.trim();
      return { level, content };
    });
  }

  buildTree(nodes, style) {
    if (nodes.length === 0) return '';

    const result = [];
    const stack = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nextNode = nodes[i + 1];
      const isLast = !nextNode || nextNode.level <= node.level;

      // Build prefix based on parent levels
      let prefix = '';
      for (let j = 0; j < node.level; j++) {
        const parentIsLast = this.isParentLast(nodes, i, j);
        prefix += parentIsLast ? style.space : style.pipe;
      }

      if (node.level === 0) {
        result.push(node.content);
      } else {
        const branch = this.isLastAtLevel(nodes, i) ? style.lastBranch : style.branch;
        result.push(prefix + branch + node.content);
      }
    }

    return result.join('\n');
  }

  isLastAtLevel(nodes, index) {
    const currentLevel = nodes[index].level;
    for (let i = index + 1; i < nodes.length; i++) {
      if (nodes[i].level < currentLevel) return true;
      if (nodes[i].level === currentLevel) return false;
    }
    return true;
  }

  isParentLast(nodes, index, level) {
    // Find parent at specified level
    let parentIndex = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (nodes[i].level === level) {
        parentIndex = i;
        break;
      }
      if (nodes[i].level < level) break;
    }

    if (parentIndex === -1) return true;
    return this.isLastAtLevel(nodes, parentIndex);
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
  window.textTree = new TextTree();
});

export default TextTree;
