/**
 * TXT-097: Emoji Search
 *
 * Search and browse emoji characters.
 */

class EmojiSearch {
  constructor() {
    this.emojis = this.initEmojis();
    this.selected = [];
    this.currentCategory = 'all';
    this.init();
  }

  initEmojis() {
    return [
      // Smileys
      { emoji: '😀', name: 'grinning face', category: 'smileys', keywords: ['smile', 'happy', 'joy'] },
      { emoji: '😃', name: 'grinning face with big eyes', category: 'smileys', keywords: ['smile', 'happy'] },
      { emoji: '😄', name: 'grinning face with smiling eyes', category: 'smileys', keywords: ['smile', 'happy'] },
      { emoji: '😁', name: 'beaming face', category: 'smileys', keywords: ['smile', 'happy', 'grin'] },
      { emoji: '😅', name: 'grinning face with sweat', category: 'smileys', keywords: ['smile', 'sweat', 'nervous'] },
      { emoji: '😂', name: 'face with tears of joy', category: 'smileys', keywords: ['laugh', 'cry', 'happy'] },
      { emoji: '🤣', name: 'rolling on the floor laughing', category: 'smileys', keywords: ['laugh', 'rofl'] },
      { emoji: '😊', name: 'smiling face with smiling eyes', category: 'smileys', keywords: ['smile', 'blush', 'happy'] },
      { emoji: '😇', name: 'smiling face with halo', category: 'smileys', keywords: ['angel', 'innocent'] },
      { emoji: '🥰', name: 'smiling face with hearts', category: 'smileys', keywords: ['love', 'happy', 'adore'] },
      { emoji: '😍', name: 'smiling face with heart-eyes', category: 'smileys', keywords: ['love', 'heart', 'adore'] },
      { emoji: '😘', name: 'face blowing a kiss', category: 'smileys', keywords: ['kiss', 'love'] },
      { emoji: '😗', name: 'kissing face', category: 'smileys', keywords: ['kiss'] },
      { emoji: '😚', name: 'kissing face with closed eyes', category: 'smileys', keywords: ['kiss'] },
      { emoji: '😋', name: 'face savoring food', category: 'smileys', keywords: ['yummy', 'delicious', 'tongue'] },
      { emoji: '😛', name: 'face with tongue', category: 'smileys', keywords: ['tongue', 'playful'] },
      { emoji: '😜', name: 'winking face with tongue', category: 'smileys', keywords: ['tongue', 'wink', 'playful'] },
      { emoji: '🤪', name: 'zany face', category: 'smileys', keywords: ['crazy', 'wild'] },
      { emoji: '😎', name: 'smiling face with sunglasses', category: 'smileys', keywords: ['cool', 'sunglasses'] },
      { emoji: '🥳', name: 'partying face', category: 'smileys', keywords: ['party', 'celebrate'] },
      { emoji: '😢', name: 'crying face', category: 'smileys', keywords: ['sad', 'cry', 'tear'] },
      { emoji: '😭', name: 'loudly crying face', category: 'smileys', keywords: ['cry', 'sad', 'tears'] },
      { emoji: '😤', name: 'face with steam from nose', category: 'smileys', keywords: ['angry', 'frustrated'] },
      { emoji: '😠', name: 'angry face', category: 'smileys', keywords: ['angry', 'mad'] },
      { emoji: '😡', name: 'pouting face', category: 'smileys', keywords: ['angry', 'rage', 'mad'] },

      // People
      { emoji: '👋', name: 'waving hand', category: 'people', keywords: ['wave', 'hello', 'bye'] },
      { emoji: '🤚', name: 'raised back of hand', category: 'people', keywords: ['hand'] },
      { emoji: '✋', name: 'raised hand', category: 'people', keywords: ['hand', 'stop', 'high five'] },
      { emoji: '👌', name: 'OK hand', category: 'people', keywords: ['ok', 'okay', 'perfect'] },
      { emoji: '✌️', name: 'victory hand', category: 'people', keywords: ['peace', 'victory', 'two'] },
      { emoji: '🤞', name: 'crossed fingers', category: 'people', keywords: ['luck', 'hope'] },
      { emoji: '👍', name: 'thumbs up', category: 'people', keywords: ['good', 'like', 'approve'] },
      { emoji: '👎', name: 'thumbs down', category: 'people', keywords: ['bad', 'dislike', 'disapprove'] },
      { emoji: '👏', name: 'clapping hands', category: 'people', keywords: ['clap', 'applause', 'bravo'] },
      { emoji: '🙌', name: 'raising hands', category: 'people', keywords: ['celebrate', 'hooray'] },
      { emoji: '🤝', name: 'handshake', category: 'people', keywords: ['agreement', 'deal'] },
      { emoji: '🙏', name: 'folded hands', category: 'people', keywords: ['pray', 'please', 'thank'] },
      { emoji: '💪', name: 'flexed biceps', category: 'people', keywords: ['strong', 'muscle', 'power'] },

      // Animals
      { emoji: '🐶', name: 'dog face', category: 'animals', keywords: ['dog', 'puppy', 'pet'] },
      { emoji: '🐱', name: 'cat face', category: 'animals', keywords: ['cat', 'kitten', 'pet'] },
      { emoji: '🐭', name: 'mouse face', category: 'animals', keywords: ['mouse', 'rodent'] },
      { emoji: '🐹', name: 'hamster', category: 'animals', keywords: ['hamster', 'pet'] },
      { emoji: '🐰', name: 'rabbit face', category: 'animals', keywords: ['rabbit', 'bunny'] },
      { emoji: '🦊', name: 'fox', category: 'animals', keywords: ['fox'] },
      { emoji: '🐻', name: 'bear', category: 'animals', keywords: ['bear'] },
      { emoji: '🐼', name: 'panda', category: 'animals', keywords: ['panda', 'bear'] },
      { emoji: '🐨', name: 'koala', category: 'animals', keywords: ['koala'] },
      { emoji: '🐯', name: 'tiger face', category: 'animals', keywords: ['tiger'] },
      { emoji: '🦁', name: 'lion', category: 'animals', keywords: ['lion', 'king'] },
      { emoji: '🐮', name: 'cow face', category: 'animals', keywords: ['cow'] },
      { emoji: '🐷', name: 'pig face', category: 'animals', keywords: ['pig'] },
      { emoji: '🐸', name: 'frog', category: 'animals', keywords: ['frog'] },
      { emoji: '🐵', name: 'monkey face', category: 'animals', keywords: ['monkey'] },
      { emoji: '🐔', name: 'chicken', category: 'animals', keywords: ['chicken', 'bird'] },
      { emoji: '🐧', name: 'penguin', category: 'animals', keywords: ['penguin', 'bird'] },
      { emoji: '🐦', name: 'bird', category: 'animals', keywords: ['bird'] },
      { emoji: '🦋', name: 'butterfly', category: 'animals', keywords: ['butterfly', 'insect'] },
      { emoji: '🐝', name: 'honeybee', category: 'animals', keywords: ['bee', 'insect'] },

      // Food
      { emoji: '🍎', name: 'red apple', category: 'food', keywords: ['apple', 'fruit'] },
      { emoji: '🍊', name: 'tangerine', category: 'food', keywords: ['orange', 'fruit'] },
      { emoji: '🍋', name: 'lemon', category: 'food', keywords: ['lemon', 'fruit', 'sour'] },
      { emoji: '🍌', name: 'banana', category: 'food', keywords: ['banana', 'fruit'] },
      { emoji: '🍉', name: 'watermelon', category: 'food', keywords: ['watermelon', 'fruit'] },
      { emoji: '🍇', name: 'grapes', category: 'food', keywords: ['grape', 'fruit'] },
      { emoji: '🍓', name: 'strawberry', category: 'food', keywords: ['strawberry', 'fruit'] },
      { emoji: '🍕', name: 'pizza', category: 'food', keywords: ['pizza', 'food'] },
      { emoji: '🍔', name: 'hamburger', category: 'food', keywords: ['burger', 'food'] },
      { emoji: '🍟', name: 'french fries', category: 'food', keywords: ['fries', 'food'] },
      { emoji: '🍜', name: 'steaming bowl', category: 'food', keywords: ['noodles', 'ramen', 'food'] },
      { emoji: '🍣', name: 'sushi', category: 'food', keywords: ['sushi', 'food', 'japanese'] },
      { emoji: '🍦', name: 'soft ice cream', category: 'food', keywords: ['ice cream', 'dessert'] },
      { emoji: '🎂', name: 'birthday cake', category: 'food', keywords: ['cake', 'birthday', 'dessert'] },
      { emoji: '☕', name: 'hot beverage', category: 'food', keywords: ['coffee', 'tea', 'drink'] },

      // Travel
      { emoji: '🚗', name: 'automobile', category: 'travel', keywords: ['car', 'vehicle'] },
      { emoji: '🚕', name: 'taxi', category: 'travel', keywords: ['taxi', 'car'] },
      { emoji: '🚌', name: 'bus', category: 'travel', keywords: ['bus', 'vehicle'] },
      { emoji: '🚀', name: 'rocket', category: 'travel', keywords: ['rocket', 'space'] },
      { emoji: '✈️', name: 'airplane', category: 'travel', keywords: ['plane', 'travel', 'flight'] },
      { emoji: '🚂', name: 'locomotive', category: 'travel', keywords: ['train'] },
      { emoji: '🏠', name: 'house', category: 'travel', keywords: ['home', 'house'] },
      { emoji: '🏢', name: 'office building', category: 'travel', keywords: ['office', 'building', 'work'] },
      { emoji: '🌍', name: 'globe Europe-Africa', category: 'travel', keywords: ['earth', 'world', 'globe'] },
      { emoji: '🌙', name: 'crescent moon', category: 'travel', keywords: ['moon', 'night'] },
      { emoji: '⭐', name: 'star', category: 'travel', keywords: ['star'] },
      { emoji: '🌈', name: 'rainbow', category: 'travel', keywords: ['rainbow'] },

      // Activities
      { emoji: '⚽', name: 'soccer ball', category: 'activities', keywords: ['soccer', 'football', 'sport'] },
      { emoji: '🏀', name: 'basketball', category: 'activities', keywords: ['basketball', 'sport'] },
      { emoji: '🏈', name: 'american football', category: 'activities', keywords: ['football', 'sport'] },
      { emoji: '⚾', name: 'baseball', category: 'activities', keywords: ['baseball', 'sport'] },
      { emoji: '🎾', name: 'tennis', category: 'activities', keywords: ['tennis', 'sport'] },
      { emoji: '🎮', name: 'video game', category: 'activities', keywords: ['game', 'controller', 'play'] },
      { emoji: '🎬', name: 'clapper board', category: 'activities', keywords: ['movie', 'film'] },
      { emoji: '🎤', name: 'microphone', category: 'activities', keywords: ['mic', 'sing', 'karaoke'] },
      { emoji: '🎸', name: 'guitar', category: 'activities', keywords: ['guitar', 'music'] },
      { emoji: '🎹', name: 'musical keyboard', category: 'activities', keywords: ['piano', 'music'] },

      // Objects
      { emoji: '💻', name: 'laptop', category: 'objects', keywords: ['computer', 'laptop', 'work'] },
      { emoji: '📱', name: 'mobile phone', category: 'objects', keywords: ['phone', 'mobile', 'cell'] },
      { emoji: '📧', name: 'e-mail', category: 'objects', keywords: ['email', 'mail'] },
      { emoji: '📷', name: 'camera', category: 'objects', keywords: ['camera', 'photo'] },
      { emoji: '💡', name: 'light bulb', category: 'objects', keywords: ['idea', 'light'] },
      { emoji: '📚', name: 'books', category: 'objects', keywords: ['book', 'read', 'study'] },
      { emoji: '✏️', name: 'pencil', category: 'objects', keywords: ['pencil', 'write'] },
      { emoji: '🔑', name: 'key', category: 'objects', keywords: ['key', 'lock'] },
      { emoji: '🔒', name: 'locked', category: 'objects', keywords: ['lock', 'secure'] },
      { emoji: '💰', name: 'money bag', category: 'objects', keywords: ['money', 'rich'] },

      // Symbols
      { emoji: '❤️', name: 'red heart', category: 'symbols', keywords: ['heart', 'love'] },
      { emoji: '💔', name: 'broken heart', category: 'symbols', keywords: ['heart', 'broken', 'sad'] },
      { emoji: '💯', name: 'hundred points', category: 'symbols', keywords: ['100', 'perfect', 'score'] },
      { emoji: '✅', name: 'check mark button', category: 'symbols', keywords: ['check', 'done', 'yes'] },
      { emoji: '❌', name: 'cross mark', category: 'symbols', keywords: ['x', 'no', 'wrong'] },
      { emoji: '⭕', name: 'hollow red circle', category: 'symbols', keywords: ['circle', 'o'] },
      { emoji: '❓', name: 'question mark', category: 'symbols', keywords: ['question', 'what'] },
      { emoji: '❗', name: 'exclamation mark', category: 'symbols', keywords: ['exclamation', 'important'] },
      { emoji: '⚡', name: 'high voltage', category: 'symbols', keywords: ['lightning', 'electric', 'power'] },
      { emoji: '🔥', name: 'fire', category: 'symbols', keywords: ['fire', 'hot', 'lit'] },
      { emoji: '💥', name: 'collision', category: 'symbols', keywords: ['boom', 'explosion'] },
      { emoji: '✨', name: 'sparkles', category: 'symbols', keywords: ['sparkle', 'shine', 'magic'] }
    ];
  }

  init() {
    this.searchInput = document.getElementById('searchInput');
    this.emojiGrid = document.getElementById('emojiGrid');
    this.resultCount = document.getElementById('resultCount');
    this.categoryButtons = document.getElementById('categoryButtons');
    this.selectedEmoji = document.getElementById('selectedEmoji');
    this.selectedDisplay = document.getElementById('selectedDisplay');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearSelectedBtn = document.getElementById('clearSelectedBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
    this.displayEmojis(this.emojis);
  }

  bindEvents() {
    this.searchInput.addEventListener('input', () => this.search());
    this.categoryButtons.addEventListener('click', (e) => {
      if (e.target.classList.contains('category-btn')) {
        this.selectCategory(e.target);
      }
    });
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearSelectedBtn.addEventListener('click', () => this.clearSelected());
  }

  search() {
    const query = this.searchInput.value.toLowerCase().trim();
    let filtered = this.emojis;

    if (this.currentCategory !== 'all') {
      filtered = filtered.filter(e => e.category === this.currentCategory);
    }

    if (query) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.keywords.some(k => k.toLowerCase().includes(query))
      );
    }

    this.displayEmojis(filtered);
  }

  selectCategory(button) {
    this.categoryButtons.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    this.currentCategory = button.dataset.category;
    this.search();
  }

  displayEmojis(emojis) {
    this.emojiGrid.innerHTML = '';
    this.resultCount.textContent = emojis.length;

    emojis.forEach(item => {
      const div = document.createElement('div');
      div.className = 'emoji-item';
      div.textContent = item.emoji;
      div.title = item.name;
      div.addEventListener('click', () => this.addEmoji(item.emoji));
      this.emojiGrid.appendChild(div);
    });
  }

  addEmoji(emoji) {
    this.selected.push(emoji);
    this.updateSelected();
    this.showStatus('success', `已加入 ${emoji}`);
  }

  updateSelected() {
    if (this.selected.length > 0) {
      this.selectedEmoji.style.display = 'block';
      this.selectedDisplay.textContent = this.selected.join(' ');
    } else {
      this.selectedEmoji.style.display = 'none';
    }
  }

  clearSelected() {
    this.selected = [];
    this.updateSelected();
  }

  async copy() {
    const text = this.selected.join('');
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
  window.emojiSearch = new EmojiSearch();
});

export default EmojiSearch;
