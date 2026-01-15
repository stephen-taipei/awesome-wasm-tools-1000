/**
 * TXT-021: Traditional/Simplified Chinese Converter
 *
 * Converts between Traditional and Simplified Chinese.
 */

class ChineseConverter {
  constructor() {
    // Common character mappings (Traditional -> Simplified)
    this.t2sMap = {
      '國': '国', '語': '语', '學': '学', '書': '书', '會': '会', '時': '时', '電': '电',
      '話': '话', '開': '开', '門': '门', '問': '问', '間': '间', '關': '关', '機': '机',
      '東': '东', '車': '车', '長': '长', '張': '张', '見': '见', '觀': '观', '親': '亲',
      '對': '对', '將': '将', '專': '专', '業': '业', '樂': '乐', '術': '术', '數': '数',
      '實': '实', '現': '现', '發': '发', '經': '经', '濟': '济', '農': '农', '區': '区',
      '設': '设', '計': '计', '認': '认', '識': '识', '記': '记', '論': '论', '說': '说',
      '讀': '读', '買': '买', '賣': '卖', '貨': '货', '員': '员', '團': '团', '圖': '图',
      '個': '个', '這': '这', '還': '还', '過': '过', '進': '进', '運': '运', '動': '动',
      '頭': '头', '無': '无', '與': '与', '給': '给', '結': '结', '級': '级', '統': '统',
      '處': '处', '辦': '办', '廣': '广', '應': '应', '點': '点', '義': '义', '議': '议',
      '導': '导', '報': '报', '場': '场', '產': '产', '總': '总', '體': '体', '質': '质',
      '當': '当', '傳': '传', '師': '师', '從': '从', '優': '优', '條': '条', '華': '华',
      '達': '达', '邊': '边', '調': '调', '滿': '满', '雙': '双', '難': '难', '響': '响',
      '離': '离', '類': '类', '顯': '显', '願': '愿', '飛': '飞', '馬': '马', '驗': '验',
      '麗': '丽', '讓': '让', '變': '变', '辭': '辞', '護': '护', '藝': '艺', '藥': '药',
      '營': '营', '衛': '卫', '裝': '装', '複': '复', '規': '规', '視': '视', '覺': '觉',
      '聯': '联', '職': '职', '紀': '纪', '獨': '独', '環': '环', '舊': '旧', '網': '网',
      '節': '节', '築': '筑', '簡': '简', '線': '线', '紅': '红', '練': '练', '組': '组',
      '終': '终', '繼': '继', '續': '续', '維': '维', '績': '绩', '織': '织', '繁': '繁',
      '轉': '转', '輸': '输', '軍': '军', '農': '农', '適': '适', '選': '选', '邊': '边',
      '鄉': '乡', '鐵': '铁', '錢': '钱', '銀': '银', '開': '开', '門': '门', '閱': '阅',
      '陸': '陆', '陽': '阳', '際': '际', '隊': '队', '雲': '云', '電': '电', '須': '须',
      '預': '预', '頭': '头', '題': '题', '風': '风', '飯': '饭', '館': '馆', '驗': '验',
      '體': '体', '齊': '齐', '齡': '龄'
    };

    // Build reverse map (Simplified -> Traditional)
    this.s2tMap = {};
    for (const [trad, simp] of Object.entries(this.t2sMap)) {
      this.s2tMap[simp] = trad;
    }

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.toSimplifiedBtn = document.getElementById('toSimplifiedBtn');
    this.toTraditionalBtn = document.getElementById('toTraditionalBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.convertedCount = document.getElementById('convertedCount');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.toSimplifiedBtn.addEventListener('click', () => this.convert('simplified'));
    this.toTraditionalBtn.addEventListener('click', () => this.convert('traditional'));
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  convert(direction) {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const map = direction === 'simplified' ? this.t2sMap : this.s2tMap;
    let result = '';
    let count = 0;

    for (const char of text) {
      if (map[char]) {
        result += map[char];
        count++;
      } else {
        result += char;
      }
    }

    this.outputText.value = result;
    this.convertedCount.textContent = count;
    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';

    const label = direction === 'simplified' ? '簡體' : '繁體';
    this.showStatus('success', `已轉換為${label}，共 ${count} 個字元`);
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
  window.chineseConverter = new ChineseConverter();
});

export default ChineseConverter;
