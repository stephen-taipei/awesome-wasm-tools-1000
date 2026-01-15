/**
 * CRY-037: Passphrase Generator
 * Generates memorable passphrases using word lists.
 */

class PassphraseGenerator {
  constructor() { this.wordLists = {}; this.init(); }

  async init() {
    this.loadWordLists();
    this.wordCount = document.getElementById('wordCount');
    this.separator = document.getElementById('separator');
    this.capitalize = document.getElementById('capitalize');
    this.addNumber = document.getElementById('addNumber');
    this.addSymbol = document.getElementById('addSymbol');
    this.wordList = document.getElementById('wordList');
    this.generateBtn = document.getElementById('generateBtn');
    this.generateMultiBtn = document.getElementById('generateMultiBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.passphraseResult = document.getElementById('passphraseResult');
    this.strengthInfo = document.getElementById('strengthInfo');
    this.entropyBits = document.getElementById('entropyBits');
    this.totalLength = document.getElementById('totalLength');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
    this.generate();
  }

  loadWordLists() {
    // EFF word list (subset for demo - full list has 7776 words)
    this.wordLists.eff = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
      'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
      'action', 'actor', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult',
      'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent', 'agree',
      'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert', 'alien',
      'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter', 'always', 'amateur',
      'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
      'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety', 'any',
      'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic', 'area', 'arena',
      'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow',
      'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar',
      'barely', 'bargain', 'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty',
      'cabin', 'cable', 'cactus', 'cage', 'cake', 'call', 'calm', 'camera', 'camp', 'canal',
      'cancel', 'candle', 'candy', 'cannon', 'canvas', 'canyon', 'capable', 'capital', 'captain', 'car',
      'carbon', 'card', 'cargo', 'carpet', 'carry', 'cart', 'case', 'cash', 'casino', 'castle',
      'damage', 'damp', 'dance', 'danger', 'daring', 'dash', 'daughter', 'dawn', 'day', 'deal',
      'debate', 'debris', 'decade', 'december', 'decide', 'decline', 'decorate', 'decrease', 'deer', 'defense',
      'define', 'defy', 'degree', 'delay', 'deliver', 'demand', 'demise', 'denial', 'dentist', 'deny',
      'eagle', 'early', 'earn', 'earth', 'easily', 'east', 'easy', 'echo', 'ecology', 'economy',
      'edge', 'edit', 'educate', 'effort', 'egg', 'eight', 'either', 'elbow', 'elder', 'electric',
      'fabric', 'face', 'faculty', 'fade', 'faint', 'faith', 'fall', 'false', 'fame', 'family',
      'famous', 'fan', 'fancy', 'fantasy', 'farm', 'fashion', 'fat', 'fatal', 'father', 'fatigue',
      'galaxy', 'gallery', 'game', 'gap', 'garage', 'garbage', 'garden', 'garlic', 'garment', 'gas',
      'gasp', 'gate', 'gather', 'gauge', 'gaze', 'general', 'genius', 'genre', 'gentle', 'genuine',
      'habit', 'hair', 'half', 'hammer', 'hamster', 'hand', 'happy', 'harbor', 'hard', 'harsh',
      'harvest', 'hat', 'have', 'hawk', 'hazard', 'head', 'health', 'heart', 'heavy', 'hedgehog',
      'ice', 'icon', 'idea', 'identify', 'idle', 'ignore', 'illegal', 'illness', 'image', 'imitate',
      'immense', 'immune', 'impact', 'impose', 'improve', 'impulse', 'inch', 'include', 'income', 'increase',
      'jacket', 'jaguar', 'jar', 'jazz', 'jealous', 'jeans', 'jelly', 'jewel', 'job', 'join',
      'joke', 'journey', 'joy', 'judge', 'juice', 'jump', 'jungle', 'junior', 'junk', 'just',
      'kangaroo', 'keen', 'keep', 'ketchup', 'key', 'kick', 'kid', 'kidney', 'kind', 'kingdom',
      'kiss', 'kit', 'kitchen', 'kite', 'kitten', 'kiwi', 'knee', 'knife', 'knock', 'know',
      'lab', 'label', 'labor', 'ladder', 'lady', 'lake', 'lamp', 'language', 'laptop', 'large',
      'later', 'latin', 'laugh', 'laundry', 'lava', 'law', 'lawn', 'lawsuit', 'layer', 'lazy',
      'machine', 'mad', 'magic', 'magnet', 'maid', 'mail', 'main', 'major', 'make', 'mammal',
      'man', 'manage', 'mandate', 'mango', 'mansion', 'manual', 'maple', 'marble', 'march', 'margin',
      'nation', 'nature', 'near', 'neck', 'need', 'negative', 'neglect', 'neither', 'nephew', 'nerve',
      'nest', 'net', 'network', 'neutral', 'never', 'news', 'next', 'nice', 'night', 'noble',
      'oak', 'obey', 'object', 'oblige', 'obscure', 'observe', 'obtain', 'obvious', 'occur', 'ocean',
      'october', 'odor', 'off', 'offer', 'office', 'often', 'oil', 'okay', 'old', 'olive',
      'olympic', 'omit', 'once', 'one', 'onion', 'online', 'only', 'open', 'opera', 'opinion',
      'pact', 'paddle', 'page', 'pair', 'palace', 'palm', 'panda', 'panel', 'panic', 'panther',
      'paper', 'parade', 'parent', 'park', 'parrot', 'party', 'pass', 'patch', 'path', 'patient',
      'quality', 'quantum', 'quarter', 'question', 'quick', 'quit', 'quiz', 'quote', 'rabbit', 'raccoon',
      'race', 'rack', 'radar', 'radio', 'rail', 'rain', 'raise', 'rally', 'ramp', 'ranch',
      'random', 'range', 'rapid', 'rare', 'rate', 'rather', 'raven', 'raw', 'razor', 'ready',
      'saddle', 'sadness', 'safe', 'sail', 'salad', 'salmon', 'salon', 'salt', 'salute', 'same',
      'sample', 'sand', 'satisfy', 'satoshi', 'sauce', 'sausage', 'save', 'say', 'scale', 'scan',
      'table', 'tackle', 'tag', 'tail', 'talent', 'talk', 'tank', 'tape', 'target', 'task',
      'taste', 'tattoo', 'taxi', 'teach', 'team', 'tell', 'ten', 'tenant', 'tennis', 'tent',
      'ugly', 'umbrella', 'unable', 'unaware', 'uncle', 'uncover', 'under', 'undo', 'unfair', 'unfold',
      'unhappy', 'uniform', 'unique', 'unit', 'universe', 'unknown', 'unlock', 'until', 'unusual', 'unveil',
      'vacant', 'vacuum', 'vague', 'valid', 'valley', 'valve', 'van', 'vanish', 'vapor', 'various',
      'vast', 'vault', 'vehicle', 'velvet', 'vendor', 'venture', 'venue', 'verb', 'verify', 'version',
      'wage', 'wagon', 'wait', 'walk', 'wall', 'walnut', 'want', 'warfare', 'warm', 'warrior',
      'wash', 'wasp', 'waste', 'water', 'wave', 'way', 'wealth', 'weapon', 'wear', 'weasel',
      'yard', 'year', 'yellow', 'you', 'young', 'youth', 'zebra', 'zero', 'zone', 'zoo',
      'cloud', 'clown', 'club', 'clump', 'cluster', 'clutch', 'coach', 'coast', 'coconut', 'code',
      'coffee', 'coil', 'coin', 'collect', 'color', 'column', 'combine', 'come', 'comfort', 'comic',
      'common', 'company', 'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider', 'control', 'convince',
      'dragon', 'drama', 'drastic', 'draw', 'dream', 'dress', 'drift', 'drill', 'drink', 'drip',
      'drive', 'drop', 'drum', 'dry', 'duck', 'dumb', 'dune', 'during', 'dust', 'dutch',
      'flower', 'fluid', 'flush', 'fly', 'foam', 'focus', 'fog', 'foil', 'fold', 'follow',
      'food', 'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum', 'forward', 'fossil',
      'glare', 'glass', 'glide', 'glimpse', 'globe', 'gloom', 'glory', 'glove', 'glow', 'glue',
      'goat', 'goddess', 'gold', 'good', 'goose', 'gorilla', 'gospel', 'gossip', 'govern', 'gown',
      'horse', 'hospital', 'host', 'hotel', 'hour', 'hover', 'hub', 'huge', 'human', 'humble',
      'humor', 'hundred', 'hungry', 'hunt', 'hurdle', 'hurry', 'hurt', 'husband', 'hybrid', 'ice'
    ];

    this.wordLists.diceware = this.wordLists.eff;
    this.wordLists.simple = [
      'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'garden', 'harbor', 'island', 'jungle',
      'kingdom', 'laptop', 'mountain', 'nature', 'ocean', 'palace', 'queen', 'river', 'sunset', 'thunder',
      'umbrella', 'valley', 'winter', 'yellow', 'zebra', 'ancient', 'bridge', 'castle', 'diamond', 'energy',
      'falcon', 'golden', 'heaven', 'igloo', 'jasper', 'knight', 'legend', 'magic', 'ninja', 'oracle',
      'phoenix', 'quest', 'rainbow', 'shadow', 'temple', 'unicorn', 'viking', 'wizard', 'xenon', 'youth'
    ];
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.generateMultiBtn.addEventListener('click', () => this.generateMultiple(5));
    this.copyBtn.addEventListener('click', () => this.copyResult());
    [this.wordCount, this.separator, this.wordList].forEach(el => el.addEventListener('change', () => this.generate()));
    [this.capitalize, this.addNumber, this.addSymbol].forEach(el => el.addEventListener('change', () => this.generate()));
  }

  getRandomWord(words) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return words[array[0] % words.length];
  }

  getRandomNumber() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] % 900 + 100).toString(); // 100-999
  }

  getRandomSymbol() {
    const symbols = '!@#$%^&*';
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return symbols[array[0] % symbols.length];
  }

  generatePassphrase() {
    const words = this.wordLists[this.wordList.value] || this.wordLists.eff;
    const count = parseInt(this.wordCount.value);
    const sep = this.separator.value;
    const cap = this.capitalize.checked;

    let passphrase = [];
    for (let i = 0; i < count; i++) {
      let word = this.getRandomWord(words);
      if (cap) word = word.charAt(0).toUpperCase() + word.slice(1);
      passphrase.push(word);
    }

    let result = passphrase.join(sep);

    if (this.addNumber.checked) {
      result += this.getRandomNumber();
    }
    if (this.addSymbol.checked) {
      result += this.getRandomSymbol();
    }

    return result;
  }

  generate() {
    const passphrase = this.generatePassphrase();
    this.passphraseResult.value = passphrase;

    const words = this.wordLists[this.wordList.value] || this.wordLists.eff;
    const count = parseInt(this.wordCount.value);
    let entropy = count * Math.log2(words.length);
    if (this.addNumber.checked) entropy += Math.log2(900);
    if (this.addSymbol.checked) entropy += Math.log2(8);

    this.entropyBits.textContent = `${entropy.toFixed(1)} bits`;
    this.totalLength.textContent = `${passphrase.length} 字元`;
    this.strengthInfo.style.display = 'block';
  }

  generateMultiple(count) {
    const passphrases = [];
    for (let i = 0; i < count; i++) {
      passphrases.push(this.generatePassphrase());
    }
    this.passphraseResult.value = passphrases.join('\n');

    const words = this.wordLists[this.wordList.value] || this.wordLists.eff;
    const wordCount = parseInt(this.wordCount.value);
    let entropy = wordCount * Math.log2(words.length);
    if (this.addNumber.checked) entropy += Math.log2(900);
    if (this.addSymbol.checked) entropy += Math.log2(8);

    this.entropyBits.textContent = `${entropy.toFixed(1)} bits (每組)`;
    this.totalLength.textContent = `${passphrases[0].length} 字元 (約)`;
    this.strengthInfo.style.display = 'block';
    this.showStatus('success', `已生成 ${count} 組短語`);
  }

  copyResult() {
    if (this.passphraseResult.value) {
      navigator.clipboard.writeText(this.passphraseResult.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => { window.passphraseGenerator = new PassphraseGenerator(); });
export default PassphraseGenerator;
