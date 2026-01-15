/**
 * TXT-100: Special Character Input
 *
 * Easy input for special characters and symbols.
 */

class SpecialChars {
  constructor() {
    this.categories = {
      punctuation: {
        name: '標點符號',
        chars: [
          { char: '…', name: 'Ellipsis' },
          { char: '—', name: 'Em Dash' },
          { char: '–', name: 'En Dash' },
          { char: '•', name: 'Bullet' },
          { char: '·', name: 'Middle Dot' },
          { char: '§', name: 'Section' },
          { char: '¶', name: 'Pilcrow' },
          { char: '†', name: 'Dagger' },
          { char: '‡', name: 'Double Dagger' },
          { char: '※', name: 'Reference Mark' },
          { char: '「', name: 'Left Corner Bracket' },
          { char: '」', name: 'Right Corner Bracket' },
          { char: '『', name: 'Left White Corner Bracket' },
          { char: '』', name: 'Right White Corner Bracket' },
          { char: '【', name: 'Left Black Lenticular Bracket' },
          { char: '】', name: 'Right Black Lenticular Bracket' },
          { char: '〈', name: 'Left Angle Bracket' },
          { char: '〉', name: 'Right Angle Bracket' },
          { char: '《', name: 'Left Double Angle Bracket' },
          { char: '》', name: 'Right Double Angle Bracket' },
          { char: '"', name: 'Left Double Quotation' },
          { char: '"', name: 'Right Double Quotation' },
          { char: ''', name: 'Left Single Quotation' },
          { char: ''', name: 'Right Single Quotation' }
        ]
      },
      currency: {
        name: '貨幣符號',
        chars: [
          { char: '$', name: 'Dollar' },
          { char: '€', name: 'Euro' },
          { char: '£', name: 'Pound' },
          { char: '¥', name: 'Yen' },
          { char: '₩', name: 'Won' },
          { char: '₽', name: 'Ruble' },
          { char: '₹', name: 'Rupee' },
          { char: '₿', name: 'Bitcoin' },
          { char: '¢', name: 'Cent' },
          { char: '₱', name: 'Peso' },
          { char: '₫', name: 'Dong' },
          { char: '₴', name: 'Hryvnia' },
          { char: '₺', name: 'Turkish Lira' },
          { char: '฿', name: 'Baht' },
          { char: '₭', name: 'Kip' }
        ]
      },
      math: {
        name: '數學符號',
        chars: [
          { char: '±', name: 'Plus-Minus' },
          { char: '×', name: 'Multiplication' },
          { char: '÷', name: 'Division' },
          { char: '≠', name: 'Not Equal' },
          { char: '≈', name: 'Approximately' },
          { char: '≤', name: 'Less Than or Equal' },
          { char: '≥', name: 'Greater Than or Equal' },
          { char: '∞', name: 'Infinity' },
          { char: '∑', name: 'Summation' },
          { char: '∏', name: 'Product' },
          { char: '√', name: 'Square Root' },
          { char: '∫', name: 'Integral' },
          { char: '∂', name: 'Partial Derivative' },
          { char: '∇', name: 'Nabla' },
          { char: '∈', name: 'Element Of' },
          { char: '∉', name: 'Not Element Of' },
          { char: '⊂', name: 'Subset' },
          { char: '⊃', name: 'Superset' },
          { char: '∪', name: 'Union' },
          { char: '∩', name: 'Intersection' },
          { char: '∧', name: 'Logical And' },
          { char: '∨', name: 'Logical Or' },
          { char: '¬', name: 'Not' },
          { char: '∀', name: 'For All' },
          { char: '∃', name: 'Exists' },
          { char: '°', name: 'Degree' },
          { char: '′', name: 'Prime' },
          { char: '″', name: 'Double Prime' },
          { char: 'π', name: 'Pi' },
          { char: '⊥', name: 'Perpendicular' }
        ]
      },
      arrows: {
        name: '箭頭符號',
        chars: [
          { char: '←', name: 'Left Arrow' },
          { char: '→', name: 'Right Arrow' },
          { char: '↑', name: 'Up Arrow' },
          { char: '↓', name: 'Down Arrow' },
          { char: '↔', name: 'Left Right Arrow' },
          { char: '↕', name: 'Up Down Arrow' },
          { char: '↖', name: 'North West Arrow' },
          { char: '↗', name: 'North East Arrow' },
          { char: '↘', name: 'South East Arrow' },
          { char: '↙', name: 'South West Arrow' },
          { char: '⇐', name: 'Left Double Arrow' },
          { char: '⇒', name: 'Right Double Arrow' },
          { char: '⇑', name: 'Up Double Arrow' },
          { char: '⇓', name: 'Down Double Arrow' },
          { char: '⇔', name: 'Left Right Double Arrow' },
          { char: '⟵', name: 'Long Left Arrow' },
          { char: '⟶', name: 'Long Right Arrow' },
          { char: '⟷', name: 'Long Left Right Arrow' },
          { char: '↩', name: 'Left Arrow with Hook' },
          { char: '↪', name: 'Right Arrow with Hook' },
          { char: '↻', name: 'Clockwise Arrow' },
          { char: '↺', name: 'Counterclockwise Arrow' }
        ]
      },
      greek: {
        name: '希臘字母',
        chars: [
          { char: 'α', name: 'Alpha' },
          { char: 'β', name: 'Beta' },
          { char: 'γ', name: 'Gamma' },
          { char: 'δ', name: 'Delta' },
          { char: 'ε', name: 'Epsilon' },
          { char: 'ζ', name: 'Zeta' },
          { char: 'η', name: 'Eta' },
          { char: 'θ', name: 'Theta' },
          { char: 'ι', name: 'Iota' },
          { char: 'κ', name: 'Kappa' },
          { char: 'λ', name: 'Lambda' },
          { char: 'μ', name: 'Mu' },
          { char: 'ν', name: 'Nu' },
          { char: 'ξ', name: 'Xi' },
          { char: 'ο', name: 'Omicron' },
          { char: 'π', name: 'Pi' },
          { char: 'ρ', name: 'Rho' },
          { char: 'σ', name: 'Sigma' },
          { char: 'τ', name: 'Tau' },
          { char: 'υ', name: 'Upsilon' },
          { char: 'φ', name: 'Phi' },
          { char: 'χ', name: 'Chi' },
          { char: 'ψ', name: 'Psi' },
          { char: 'ω', name: 'Omega' },
          { char: 'Α', name: 'Alpha (Upper)' },
          { char: 'Β', name: 'Beta (Upper)' },
          { char: 'Γ', name: 'Gamma (Upper)' },
          { char: 'Δ', name: 'Delta (Upper)' },
          { char: 'Σ', name: 'Sigma (Upper)' },
          { char: 'Ω', name: 'Omega (Upper)' }
        ]
      },
      boxes: {
        name: '框線符號',
        chars: [
          { char: '─', name: 'Horizontal' },
          { char: '│', name: 'Vertical' },
          { char: '┌', name: 'Top Left' },
          { char: '┐', name: 'Top Right' },
          { char: '└', name: 'Bottom Left' },
          { char: '┘', name: 'Bottom Right' },
          { char: '├', name: 'Left T' },
          { char: '┤', name: 'Right T' },
          { char: '┬', name: 'Top T' },
          { char: '┴', name: 'Bottom T' },
          { char: '┼', name: 'Cross' },
          { char: '═', name: 'Double Horizontal' },
          { char: '║', name: 'Double Vertical' },
          { char: '╔', name: 'Double Top Left' },
          { char: '╗', name: 'Double Top Right' },
          { char: '╚', name: 'Double Bottom Left' },
          { char: '╝', name: 'Double Bottom Right' },
          { char: '╠', name: 'Double Left T' },
          { char: '╣', name: 'Double Right T' },
          { char: '╦', name: 'Double Top T' },
          { char: '╩', name: 'Double Bottom T' },
          { char: '╬', name: 'Double Cross' },
          { char: '░', name: 'Light Shade' },
          { char: '▒', name: 'Medium Shade' },
          { char: '▓', name: 'Dark Shade' },
          { char: '█', name: 'Full Block' }
        ]
      },
      shapes: {
        name: '幾何形狀',
        chars: [
          { char: '■', name: 'Black Square' },
          { char: '□', name: 'White Square' },
          { char: '▪', name: 'Small Black Square' },
          { char: '▫', name: 'Small White Square' },
          { char: '●', name: 'Black Circle' },
          { char: '○', name: 'White Circle' },
          { char: '◆', name: 'Black Diamond' },
          { char: '◇', name: 'White Diamond' },
          { char: '▲', name: 'Black Up Triangle' },
          { char: '△', name: 'White Up Triangle' },
          { char: '▼', name: 'Black Down Triangle' },
          { char: '▽', name: 'White Down Triangle' },
          { char: '◀', name: 'Black Left Triangle' },
          { char: '◁', name: 'White Left Triangle' },
          { char: '▶', name: 'Black Right Triangle' },
          { char: '▷', name: 'White Right Triangle' },
          { char: '★', name: 'Black Star' },
          { char: '☆', name: 'White Star' },
          { char: '♠', name: 'Spade' },
          { char: '♣', name: 'Club' },
          { char: '♥', name: 'Heart' },
          { char: '♦', name: 'Diamond' }
        ]
      },
      misc: {
        name: '其他符號',
        chars: [
          { char: '©', name: 'Copyright' },
          { char: '®', name: 'Registered' },
          { char: '™', name: 'Trademark' },
          { char: '℃', name: 'Celsius' },
          { char: '℉', name: 'Fahrenheit' },
          { char: '№', name: 'Number Sign' },
          { char: '℡', name: 'Telephone' },
          { char: '✓', name: 'Check Mark' },
          { char: '✗', name: 'X Mark' },
          { char: '✔', name: 'Heavy Check Mark' },
          { char: '✘', name: 'Heavy X Mark' },
          { char: '♪', name: 'Eighth Note' },
          { char: '♫', name: 'Beamed Notes' },
          { char: '♭', name: 'Flat' },
          { char: '♯', name: 'Sharp' },
          { char: '☀', name: 'Sun' },
          { char: '☁', name: 'Cloud' },
          { char: '☂', name: 'Umbrella' },
          { char: '☃', name: 'Snowman' },
          { char: '☎', name: 'Telephone' },
          { char: '✉', name: 'Envelope' },
          { char: '✂', name: 'Scissors' },
          { char: '✏', name: 'Pencil' },
          { char: '✒', name: 'Pen' },
          { char: '☮', name: 'Peace' },
          { char: '☯', name: 'Yin Yang' },
          { char: '♿', name: 'Wheelchair' },
          { char: '⚠', name: 'Warning' },
          { char: '⚡', name: 'Lightning' },
          { char: '⌘', name: 'Command' }
        ]
      }
    };

    this.currentCategory = 'punctuation';
    this.init();
  }

  init() {
    this.charGrid = document.getElementById('charGrid');
    this.outputText = document.getElementById('outputText');
    this.categoryButtons = document.getElementById('categoryButtons');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.charInfo = document.getElementById('charInfo');
    this.infoChar = document.getElementById('infoChar');
    this.infoUnicode = document.getElementById('infoUnicode');
    this.infoHtml = document.getElementById('infoHtml');
    this.infoName = document.getElementById('infoName');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
    this.displayCategory('punctuation');
  }

  bindEvents() {
    this.categoryButtons.addEventListener('click', (e) => {
      if (e.target.classList.contains('category-btn')) {
        this.selectCategory(e.target);
      }
    });
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  selectCategory(button) {
    this.categoryButtons.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    this.currentCategory = button.dataset.category;
    this.displayCategory(this.currentCategory);
  }

  displayCategory(category) {
    const chars = this.categories[category].chars;
    this.charGrid.innerHTML = '';

    chars.forEach(item => {
      const div = document.createElement('div');
      div.className = 'char-item';
      div.textContent = item.char;
      div.title = item.name;
      div.addEventListener('click', () => this.addChar(item));
      div.addEventListener('mouseenter', () => this.showCharInfo(item));
      this.charGrid.appendChild(div);
    });
  }

  addChar(item) {
    this.outputText.value += item.char;
    this.showStatus('success', `已加入 ${item.char}`);
  }

  showCharInfo(item) {
    this.charInfo.style.display = 'block';
    this.infoChar.textContent = item.char;
    this.infoUnicode.textContent = 'U+' + item.char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    this.infoHtml.textContent = '&#' + item.char.codePointAt(0) + ';';
    this.infoName.textContent = item.name;
  }

  clear() {
    this.outputText.value = '';
  }

  async copy() {
    const text = this.outputText.value;
    if (!text) {
      this.showStatus('error', '沒有可複製的內容');
      return;
    }

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
  window.specialChars = new SpecialChars();
});

export default SpecialChars;
