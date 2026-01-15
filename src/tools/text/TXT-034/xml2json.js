/**
 * TXT-034: XML to JSON Converter
 *
 * Converts XML format to JSON format.
 */

class XMLToJSON {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.convertBtn = document.getElementById('convertBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convert());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  xmlToJson(xml) {
    const result = {};

    // Handle attributes
    if (xml.attributes && xml.attributes.length > 0) {
      result['@attributes'] = {};
      for (const attr of xml.attributes) {
        result['@attributes'][attr.name] = attr.value;
      }
    }

    // Handle child nodes
    if (xml.hasChildNodes()) {
      for (const child of xml.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent.trim();
          if (text) {
            if (xml.childNodes.length === 1) {
              return text;
            }
            result['#text'] = text;
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const childJson = this.xmlToJson(child);

          if (result[child.nodeName]) {
            // Convert to array if multiple same-named elements
            if (!Array.isArray(result[child.nodeName])) {
              result[child.nodeName] = [result[child.nodeName]];
            }
            result[child.nodeName].push(childJson);
          } else {
            result[child.nodeName] = childJson;
          }
        } else if (child.nodeType === Node.CDATA_SECTION_NODE) {
          result['#cdata'] = child.textContent;
        }
      }
    }

    return Object.keys(result).length === 0 ? '' : result;
  }

  convert() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入 XML');
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/xml');
      const parseError = doc.querySelector('parsererror');

      if (parseError) {
        throw new Error(parseError.textContent);
      }

      const json = {};
      json[doc.documentElement.nodeName] = this.xmlToJson(doc.documentElement);

      this.outputText.textContent = JSON.stringify(json, null, 2);
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', '轉換成功');
    } catch (e) {
      this.showStatus('error', `XML 解析錯誤: ${e.message}`);
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
  window.xmlToJson = new XMLToJSON();
});

export default XMLToJSON;
