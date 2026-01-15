/**
 * TXT-015: Name Generator
 *
 * Generates random names in various languages.
 */

class NameGenerator {
  constructor() {
    this.data = {
      chinese: {
        surnames: ['王', '李', '張', '劉', '陳', '楊', '黃', '趙', '周', '吳', '徐', '孫', '馬', '朱', '胡', '郭', '何', '林', '羅', '高'],
        maleNames: ['偉', '強', '磊', '軍', '勇', '明', '傑', '浩', '宇', '志', '俊', '濤', '文', '建', '斌', '輝', '鵬', '飛', '華', '龍'],
        femaleNames: ['芳', '娜', '敏', '靜', '麗', '霞', '秀', '玲', '桂', '英', '華', '慧', '巧', '美', '雪', '雅', '欣', '怡', '婷', '夢']
      },
      english: {
        surnames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson'],
        maleNames: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald'],
        femaleNames: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra']
      },
      japanese: {
        surnames: ['佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本'],
        maleNames: ['太郎', '一郎', '健太', '翔', '大輔', '拓也', '直樹', '雄一', '誠', '浩二', '隆', '和也', '修', '博', '哲也'],
        femaleNames: ['花子', '優子', '美咲', '愛', '陽子', '真由美', '恵子', '裕子', '久美子', '明美', '由美', '幸子', '智子', '洋子', '和子']
      },
      korean: {
        surnames: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'],
        maleNames: ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '지후', '준서', '준우', '현우', '도현', '건우', '우진'],
        femaleNames: ['서연', '서윤', '지우', '서현', '민서', '하은', '하윤', '윤서', '지유', '채원', '수아', '지아', '지윤', '다은', '은서']
      }
    };

    this.init();
  }

  init() {
    this.nameType = document.getElementById('nameType');
    this.gender = document.getElementById('gender');
    this.count = document.getElementById('count');
    this.generateBtn = document.getElementById('generateBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.nameList = document.getElementById('nameList');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  generateName(type, gender) {
    const data = this.data[type];
    const surname = this.random(data.surnames);

    let givenName;
    if (gender === 'male') {
      givenName = this.random(data.maleNames);
    } else if (gender === 'female') {
      givenName = this.random(data.femaleNames);
    } else {
      givenName = Math.random() > 0.5
        ? this.random(data.maleNames)
        : this.random(data.femaleNames);
    }

    // Format based on type
    if (type === 'chinese' || type === 'korean') {
      return surname + givenName;
    } else if (type === 'japanese') {
      return surname + ' ' + givenName;
    } else {
      return givenName + ' ' + surname;
    }
  }

  generate() {
    const type = this.nameType.value;
    const gender = this.gender.value;
    const num = parseInt(this.count.value) || 10;

    const names = [];
    for (let i = 0; i < num; i++) {
      names.push(this.generateName(type, gender));
    }

    this.nameList.innerHTML = names.map((name, i) =>
      `<div class="name-item"><span class="name-number">${i + 1}.</span> ${name}</div>`
    ).join('');

    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
  }

  async copy() {
    const names = Array.from(this.nameList.querySelectorAll('.name-item'))
      .map(el => el.textContent.replace(/^\d+\.\s*/, ''));
    try {
      await navigator.clipboard.writeText(names.join('\n'));
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.nameList.innerHTML = '';
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
  window.nameGenerator = new NameGenerator();
});

export default NameGenerator;
