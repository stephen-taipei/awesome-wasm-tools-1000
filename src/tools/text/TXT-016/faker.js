/**
 * TXT-016: Fake Data Generator
 *
 * Generates various types of fake data for testing.
 */

class FakeDataGenerator {
  constructor() {
    this.domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'example.com'];
    this.companies = ['科技', '數位', '網路', '雲端', '智能', '創新', '全球', '未來'];
    this.companyTypes = ['股份有限公司', '有限公司', 'Inc.', 'Corp.', 'LLC'];
    this.streets = ['中山路', '忠孝東路', '信義路', '和平東路', '民生東路', '復興南路', '敦化南路'];
    this.cities = ['台北市', '新北市', '台中市', '高雄市', '台南市', '桃園市'];

    this.init();
  }

  init() {
    this.dataType = document.getElementById('dataType');
    this.count = document.getElementById('count');
    this.format = document.getElementById('format');
    this.generateBtn = document.getElementById('generateBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.outputText = document.getElementById('outputText');
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

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomString(length, chars = 'abcdefghijklmnopqrstuvwxyz') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  generateEmail() {
    const name = this.randomString(this.randomInt(5, 10));
    const domain = this.random(this.domains);
    return `${name}@${domain}`;
  }

  generatePhone() {
    return `09${this.randomInt(10000000, 99999999)}`;
  }

  generateAddress() {
    const city = this.random(this.cities);
    const street = this.random(this.streets);
    const num = this.randomInt(1, 500);
    return `${city}${street}${num}號`;
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  generateIP() {
    return `${this.randomInt(1, 255)}.${this.randomInt(0, 255)}.${this.randomInt(0, 255)}.${this.randomInt(1, 254)}`;
  }

  generateMAC() {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      mac += this.randomString(2, hex);
      if (i < 5) mac += ':';
    }
    return mac;
  }

  generateDate() {
    const start = new Date(2000, 0, 1);
    const end = new Date();
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  }

  generateCreditCard() {
    // Generate fake credit card (Luhn valid but not real)
    let num = '4' + this.randomString(14, '0123456789');
    // Add Luhn check digit
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let digit = parseInt(num[i]);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return num + checkDigit;
  }

  generateCompany() {
    return this.random(this.companies) + this.random(this.companies) + this.random(this.companyTypes);
  }

  generateUsername() {
    const adjectives = ['cool', 'super', 'mega', 'ultra', 'pro', 'elite', 'dark', 'light'];
    const nouns = ['ninja', 'dragon', 'wolf', 'tiger', 'eagle', 'phoenix', 'knight', 'wizard'];
    return this.random(adjectives) + this.random(nouns) + this.randomInt(1, 999);
  }

  generatePassword() {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const all = lower + upper + numbers + special;
    let password = this.randomString(1, lower) + this.randomString(1, upper) +
      this.randomString(1, numbers) + this.randomString(1, special);
    password += this.randomString(this.randomInt(8, 12), all);
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  generateColor() {
    return '#' + this.randomString(6, '0123456789ABCDEF');
  }

  generateOne(type) {
    const generators = {
      email: () => this.generateEmail(),
      phone: () => this.generatePhone(),
      address: () => this.generateAddress(),
      uuid: () => this.generateUUID(),
      ip: () => this.generateIP(),
      mac: () => this.generateMAC(),
      date: () => this.generateDate(),
      creditcard: () => this.generateCreditCard(),
      company: () => this.generateCompany(),
      username: () => this.generateUsername(),
      password: () => this.generatePassword(),
      color: () => this.generateColor()
    };
    return generators[type]();
  }

  generate() {
    const type = this.dataType.value;
    const num = parseInt(this.count.value) || 10;
    const fmt = this.format.value;

    const data = [];
    for (let i = 0; i < num; i++) {
      data.push(this.generateOne(type));
    }

    let result;
    switch (fmt) {
      case 'json':
        result = JSON.stringify(data, null, 2);
        break;
      case 'csv':
        result = type + '\n' + data.join('\n');
        break;
      default:
        result = data.join('\n');
    }

    this.outputText.value = result;
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
  window.fakeDataGenerator = new FakeDataGenerator();
});

export default FakeDataGenerator;
