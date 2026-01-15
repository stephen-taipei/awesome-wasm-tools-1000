/**
 * TXT-023: Pinyin Converter
 *
 * Converts Chinese characters to Pinyin.
 */

class PinyinConverter {
  constructor() {
    // Common character to pinyin mapping (subset)
    this.pinyinMap = {
      '中': 'zhong1', '國': 'guo2', '人': 'ren2', '民': 'min2', '大': 'da4', '學': 'xue2',
      '我': 'wo3', '你': 'ni3', '他': 'ta1', '她': 'ta1', '它': 'ta1', '們': 'men5',
      '的': 'de5', '是': 'shi4', '在': 'zai4', '有': 'you3', '不': 'bu4', '了': 'le5',
      '這': 'zhe4', '那': 'na4', '和': 'he2', '就': 'jiu4', '也': 'ye3', '都': 'dou1',
      '上': 'shang4', '下': 'xia4', '來': 'lai2', '去': 'qu4', '出': 'chu1', '入': 'ru4',
      '天': 'tian1', '地': 'di4', '日': 'ri4', '月': 'yue4', '年': 'nian2', '時': 'shi2',
      '好': 'hao3', '想': 'xiang3', '要': 'yao4', '能': 'neng2', '會': 'hui4', '可': 'ke3',
      '一': 'yi1', '二': 'er4', '三': 'san1', '四': 'si4', '五': 'wu3', '六': 'liu4',
      '七': 'qi1', '八': 'ba1', '九': 'jiu3', '十': 'shi2', '百': 'bai3', '千': 'qian1',
      '萬': 'wan4', '什': 'shen2', '麼': 'me5', '為': 'wei4', '因': 'yin1', '所': 'suo3',
      '以': 'yi3', '從': 'cong2', '到': 'dao4', '說': 'shuo1', '話': 'hua4', '看': 'kan4',
      '見': 'jian4', '聽': 'ting1', '寫': 'xie3', '讀': 'du2', '吃': 'chi1', '喝': 'he1',
      '走': 'zou3', '跑': 'pao3', '做': 'zuo4', '作': 'zuo4', '用': 'yong4', '開': 'kai1',
      '關': 'guan1', '門': 'men2', '家': 'jia1', '愛': 'ai4', '心': 'xin1', '手': 'shou3',
      '頭': 'tou2', '口': 'kou3', '眼': 'yan3', '耳': 'er3', '身': 'shen1', '體': 'ti3',
      '水': 'shui3', '火': 'huo3', '山': 'shan1', '海': 'hai3', '花': 'hua1', '草': 'cao3',
      '樹': 'shu4', '書': 'shu1', '字': 'zi4', '文': 'wen2', '言': 'yan2', '語': 'yu3',
      '電': 'dian4', '腦': 'nao3', '機': 'ji1', '車': 'che1', '路': 'lu4', '飛': 'fei1',
      '雲': 'yun2', '風': 'feng1', '雨': 'yu3', '雪': 'xue3', '東': 'dong1', '西': 'xi1',
      '南': 'nan2', '北': 'bei3', '前': 'qian2', '後': 'hou4', '左': 'zuo3', '右': 'you4',
      '多': 'duo1', '少': 'shao3', '長': 'chang2', '短': 'duan3', '高': 'gao1', '低': 'di1',
      '新': 'xin1', '舊': 'jiu4', '老': 'lao3', '少': 'shao4', '生': 'sheng1', '死': 'si3',
      '明': 'ming2', '白': 'bai2', '黑': 'hei1', '紅': 'hong2', '黃': 'huang2', '綠': 'lv4'
    };

    // Tone marks
    this.toneMarks = {
      'a': ['ā', 'á', 'ǎ', 'à', 'a'],
      'e': ['ē', 'é', 'ě', 'è', 'e'],
      'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
      'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
      'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
      'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü']
    };

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.pinyinDisplay = document.getElementById('pinyinDisplay');
    this.toneStyle = document.getElementById('toneStyle');
    this.separator = document.getElementById('separator');
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

  addToneMark(pinyin, tone) {
    // Find the vowel to add tone mark
    const vowelOrder = ['a', 'e', 'o', 'iu', 'ui', 'i', 'u', 'v'];

    for (const vowel of vowelOrder) {
      if (vowel.length === 2) {
        // Special case for iu and ui - mark the second vowel
        if (pinyin.includes(vowel)) {
          const char = vowel[1];
          return pinyin.replace(char, this.toneMarks[char][tone - 1]);
        }
      } else {
        if (pinyin.includes(vowel)) {
          return pinyin.replace(vowel, this.toneMarks[vowel][tone - 1]);
        }
      }
    }
    return pinyin;
  }

  formatPinyin(pinyinWithTone, style) {
    const match = pinyinWithTone.match(/^([a-z]+)(\d)$/);
    if (!match) return pinyinWithTone;

    const [, pinyin, tone] = match;
    const toneNum = parseInt(tone);

    switch (style) {
      case 'number':
        return pinyinWithTone;
      case 'mark':
        return this.addToneMark(pinyin, toneNum);
      case 'none':
        return pinyin;
      default:
        return pinyinWithTone;
    }
  }

  convert() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const style = this.toneStyle.value;
    const sep = this.separator.value;

    const result = [];
    const display = [];

    for (const char of text) {
      if (this.pinyinMap[char]) {
        const formatted = this.formatPinyin(this.pinyinMap[char], style);
        result.push(formatted);
        display.push(`<ruby>${char}<rt>${formatted}</rt></ruby>`);
      } else if (/[\u4e00-\u9fa5]/.test(char)) {
        // Unknown Chinese character
        result.push(char);
        display.push(char);
      } else {
        result.push(char);
        display.push(char);
      }
    }

    this.pinyinDisplay.innerHTML = display.join('');
    this.outputText.value = result.join(sep);

    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.value);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.pinyinDisplay.innerHTML = '';
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
  window.pinyinConverter = new PinyinConverter();
});

export default PinyinConverter;
