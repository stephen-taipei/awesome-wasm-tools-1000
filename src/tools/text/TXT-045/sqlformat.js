/**
 * TXT-045: SQL Formatter
 *
 * Formats SQL queries with proper indentation.
 */

class SQLFormatter {
  constructor() {
    this.keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
      'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'COLUMN',
      'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'CROSS', 'ON',
      'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC',
      'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT',
      'AS', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'EXISTS', 'ANY', 'SOME',
      'TRUNCATE', 'CASCADE', 'CONSTRAINT', 'DEFAULT',
      'IF', 'ELSE', 'BEGIN', 'END', 'DECLARE', 'EXEC', 'EXECUTE',
      'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'SAVEPOINT',
      'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER',
      'DATABASE', 'SCHEMA', 'USE'
    ];

    this.newlineKeywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR',
      'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
      'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET',
      'UNION', 'UNION ALL',
      'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
      'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE'
    ];

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.indentSize = document.getElementById('indentSize');
    this.uppercaseKeywords = document.getElementById('uppercaseKeywords');
    this.formatBtn = document.getElementById('formatBtn');
    this.minifyBtn = document.getElementById('minifyBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.formatBtn.addEventListener('click', () => this.format());
    this.minifyBtn.addEventListener('click', () => this.minify());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  getIndent() {
    const size = this.indentSize.value;
    if (size === 'tab') return '\t';
    return ' '.repeat(parseInt(size));
  }

  tokenize(sql) {
    const tokens = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let commentType = '';

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1] || '';

      // Handle comments
      if (!inString && !inComment) {
        if (char === '-' && nextChar === '-') {
          if (current.trim()) tokens.push(current.trim());
          current = '';
          inComment = true;
          commentType = 'line';
          current = '--';
          i++;
          continue;
        }
        if (char === '/' && nextChar === '*') {
          if (current.trim()) tokens.push(current.trim());
          current = '';
          inComment = true;
          commentType = 'block';
          current = '/*';
          i++;
          continue;
        }
      }

      if (inComment) {
        current += char;
        if (commentType === 'line' && char === '\n') {
          tokens.push(current);
          current = '';
          inComment = false;
        } else if (commentType === 'block' && char === '/' && sql[i - 1] === '*') {
          tokens.push(current);
          current = '';
          inComment = false;
        }
        continue;
      }

      // Handle strings
      if (!inString && (char === "'" || char === '"')) {
        if (current.trim()) tokens.push(current.trim());
        current = char;
        inString = true;
        stringChar = char;
        continue;
      }

      if (inString) {
        current += char;
        if (char === stringChar && sql[i - 1] !== '\\') {
          tokens.push(current);
          current = '';
          inString = false;
        }
        continue;
      }

      // Handle special characters
      if (',();'.includes(char)) {
        if (current.trim()) tokens.push(current.trim());
        tokens.push(char);
        current = '';
        continue;
      }

      // Handle whitespace
      if (/\s/.test(char)) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current.trim()) tokens.push(current.trim());

    return tokens;
  }

  format() {
    const sql = this.inputText.value;
    if (!sql.trim()) {
      this.showStatus('error', '請輸入 SQL');
      return;
    }

    try {
      const tokens = this.tokenize(sql);
      const indent = this.getIndent();
      const uppercase = this.uppercaseKeywords.checked;

      let result = '';
      let depth = 0;

      for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        const upperToken = token.toUpperCase();
        const prevToken = (tokens[i - 1] || '').toUpperCase();
        const nextToken = (tokens[i + 1] || '').toUpperCase();

        // Check for compound keywords
        let compound = '';
        if (this.newlineKeywords.includes(`${upperToken} ${nextToken}`)) {
          compound = `${upperToken} ${nextToken}`;
        }

        // Process keyword case
        if (this.keywords.includes(upperToken)) {
          token = uppercase ? upperToken : token.toLowerCase();
        }

        // Handle parentheses
        if (token === '(') {
          result += ' (';
          depth++;
          continue;
        }
        if (token === ')') {
          depth = Math.max(0, depth - 1);
          result += ')';
          continue;
        }

        // Handle commas
        if (token === ',') {
          result += ',\n' + indent.repeat(depth + 1);
          continue;
        }

        // Handle semicolon
        if (token === ';') {
          result += ';\n\n';
          depth = 0;
          continue;
        }

        // Handle newline keywords
        if (this.newlineKeywords.includes(upperToken) || compound) {
          if (result && !result.endsWith('\n')) {
            result += '\n';
          }

          if (['AND', 'OR'].includes(upperToken)) {
            result += indent + token + ' ';
          } else if (compound) {
            result += (uppercase ? compound : compound.toLowerCase()) + '\n' + indent;
            i++; // Skip next token
          } else {
            result += token + '\n' + indent;
          }
          continue;
        }

        // Regular token
        if (result && !result.endsWith('\n') && !result.endsWith(' ') && !result.endsWith('(')) {
          result += ' ';
        }
        result += token;
      }

      this.outputText.textContent = result.trim();
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', '格式化成功');
    } catch (e) {
      this.showStatus('error', `格式化錯誤: ${e.message}`);
    }
  }

  minify() {
    const sql = this.inputText.value;
    if (!sql.trim()) {
      this.showStatus('error', '請輸入 SQL');
      return;
    }

    try {
      const tokens = this.tokenize(sql);
      let result = '';

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Skip line comments
        if (token.startsWith('--')) continue;

        // Skip block comments
        if (token.startsWith('/*')) continue;

        if (',;'.includes(token)) {
          result += token + ' ';
        } else if (token === '(') {
          result = result.trimEnd() + '(';
        } else if (token === ')') {
          result = result.trimEnd() + ') ';
        } else {
          result += token + ' ';
        }
      }

      this.outputText.textContent = result.trim();
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', '壓縮成功');
    } catch (e) {
      this.showStatus('error', `壓縮錯誤: ${e.message}`);
    }
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
  window.sqlFormatter = new SQLFormatter();
});

export default SQLFormatter;
