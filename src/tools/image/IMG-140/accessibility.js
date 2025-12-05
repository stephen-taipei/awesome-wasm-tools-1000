/**
 * IMG-140 無障礙色彩檢查工具
 * Accessibility Color Checker Tool
 */

class AccessibilityChecker {
  constructor() {
    this.fgColor = '#000000';
    this.bgColor = '#FFFFFF';

    // 常用色票
    this.presetColors = [
      '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
      '#FF0000', '#FF6600', '#FFCC00', '#00FF00', '#00FFFF', '#0000FF',
      '#6600FF', '#FF00FF', '#FF6699', '#663300', '#006600', '#003366'
    ];

    this.initElements();
    this.bindEvents();
    this.initSwatches();
    this.updateAll();
  }

  initElements() {
    // Color pickers
    this.fgColorPicker = document.getElementById('fgColorPicker');
    this.bgColorPicker = document.getElementById('bgColorPicker');
    this.fgHexInput = document.getElementById('fgHex');
    this.bgHexInput = document.getElementById('bgHex');
    this.fgRgbInput = document.getElementById('fgRgb');
    this.bgRgbInput = document.getElementById('bgRgb');
    this.fgPreview = document.getElementById('fgPreview');
    this.bgPreview = document.getElementById('bgPreview');

    // Swatches
    this.fgSwatches = document.getElementById('fgSwatches');
    this.bgSwatches = document.getElementById('bgSwatches');

    // Preview
    this.previewBox = document.getElementById('previewBox');
    this.sampleTexts = document.querySelectorAll('.sample-text');

    // Results
    this.contrastRatio = document.getElementById('contrastRatio');
    this.contrastRatioLarge = document.getElementById('contrastRatioLarge');
    this.normalBadge = document.getElementById('normalBadge');
    this.largeBadge = document.getElementById('largeBadge');
    this.normalAA = document.getElementById('normalAA');
    this.normalAAA = document.getElementById('normalAAA');
    this.largeAA = document.getElementById('largeAA');
    this.largeAAA = document.getElementById('largeAAA');

    // Details
    this.fgLuminance = document.getElementById('fgLuminance');
    this.bgLuminance = document.getElementById('bgLuminance');
    this.fgMarker = document.getElementById('fgMarker');
    this.bgMarker = document.getElementById('bgMarker');
    this.contrastValue = document.getElementById('contrastValue');
    this.fgHsl = document.getElementById('fgHsl');
    this.bgHsl = document.getElementById('bgHsl');
    this.luminanceDiff = document.getElementById('luminanceDiff');

    // Suggestions
    this.suggestionsSection = document.getElementById('suggestionsSection');
    this.suggestionList = document.getElementById('suggestionList');

    // Buttons
    this.swapBtn = document.getElementById('swapBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Foreground color events
    this.fgColorPicker.addEventListener('input', (e) => {
      this.fgColor = e.target.value;
      this.fgHexInput.value = this.fgColor.toUpperCase();
      this.updateAll();
    });

    this.fgHexInput.addEventListener('change', (e) => {
      const hex = this.validateHex(e.target.value);
      if (hex) {
        this.fgColor = hex;
        this.fgColorPicker.value = hex;
        this.fgHexInput.value = hex.toUpperCase();
        this.updateAll();
      }
    });

    // Background color events
    this.bgColorPicker.addEventListener('input', (e) => {
      this.bgColor = e.target.value;
      this.bgHexInput.value = this.bgColor.toUpperCase();
      this.updateAll();
    });

    this.bgHexInput.addEventListener('change', (e) => {
      const hex = this.validateHex(e.target.value);
      if (hex) {
        this.bgColor = hex;
        this.bgColorPicker.value = hex;
        this.bgHexInput.value = hex.toUpperCase();
        this.updateAll();
      }
    });

    // Button events
    this.swapBtn.addEventListener('click', () => this.swapColors());
    this.copyBtn.addEventListener('click', () => this.copyReport());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  initSwatches() {
    // Create foreground swatches
    this.fgSwatches.innerHTML = '';
    this.presetColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', () => {
        this.fgColor = color;
        this.fgColorPicker.value = color;
        this.fgHexInput.value = color.toUpperCase();
        this.updateAll();
      });
      this.fgSwatches.appendChild(swatch);
    });

    // Create background swatches
    this.bgSwatches.innerHTML = '';
    this.presetColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', () => {
        this.bgColor = color;
        this.bgColorPicker.value = color;
        this.bgHexInput.value = color.toUpperCase();
        this.updateAll();
      });
      this.bgSwatches.appendChild(swatch);
    });
  }

  validateHex(hex) {
    hex = hex.trim();
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }

    // Support 3-digit hex
    if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }

    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      return hex;
    }
    return null;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  // Calculate relative luminance (WCAG 2.1)
  getLuminance(hex) {
    const rgb = this.hexToRgb(hex);
    const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255];

    const linearRGB = sRGB.map(value => {
      if (value <= 0.03928) {
        return value / 12.92;
      }
      return Math.pow((value + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * linearRGB[0] + 0.7152 * linearRGB[1] + 0.0722 * linearRGB[2];
  }

  // Calculate contrast ratio
  getContrastRatio(hex1, hex2) {
    const l1 = this.getLuminance(hex1);
    const l2 = this.getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  updateAll() {
    this.updatePreview();
    this.updateResults();
    this.updateDetails();
    this.generateSuggestions();
  }

  updatePreview() {
    // Update preview box
    this.previewBox.style.backgroundColor = this.bgColor;
    this.previewBox.style.color = this.fgColor;

    // Update sample texts
    this.sampleTexts.forEach(el => {
      el.style.color = this.fgColor;
      el.style.backgroundColor = this.bgColor;
    });

    // Update RGB displays
    const fgRgb = this.hexToRgb(this.fgColor);
    const bgRgb = this.hexToRgb(this.bgColor);
    this.fgRgbInput.value = `rgb(${fgRgb.r}, ${fgRgb.g}, ${fgRgb.b})`;
    this.bgRgbInput.value = `rgb(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`;

    // Update color previews
    this.fgPreview.style.backgroundColor = this.fgColor;
    this.bgPreview.style.backgroundColor = this.bgColor;
  }

  updateResults() {
    const ratio = this.getContrastRatio(this.fgColor, this.bgColor);
    const ratioStr = ratio.toFixed(2) + ':1';

    this.contrastRatio.textContent = ratioStr;
    this.contrastRatioLarge.textContent = ratioStr;

    // WCAG levels for normal text
    // AA: 4.5:1, AAA: 7:1
    const normalAAPassed = ratio >= 4.5;
    const normalAAAPassed = ratio >= 7;

    // WCAG levels for large text (18pt+ or 14pt+ bold)
    // AA: 3:1, AAA: 4.5:1
    const largeAAPassed = ratio >= 3;
    const largeAAAPassed = ratio >= 4.5;

    // Update badges
    this.normalBadge.textContent = normalAAPassed ? '通過' : '不通過';
    this.normalBadge.className = `result-badge ${normalAAPassed ? 'badge-pass' : 'badge-fail'}`;

    this.largeBadge.textContent = largeAAPassed ? '通過' : '不通過';
    this.largeBadge.className = `result-badge ${largeAAPassed ? 'badge-pass' : 'badge-fail'}`;

    // Update WCAG level indicators
    this.updateWcagLevel(this.normalAA, normalAAPassed);
    this.updateWcagLevel(this.normalAAA, normalAAAPassed);
    this.updateWcagLevel(this.largeAA, largeAAPassed);
    this.updateWcagLevel(this.largeAAA, largeAAAPassed);
  }

  updateWcagLevel(element, passed) {
    element.className = `wcag-level ${passed ? 'pass' : 'fail'}`;
    element.querySelector('.level-status').textContent = passed ? '✓' : '✗';
  }

  updateDetails() {
    const fgL = this.getLuminance(this.fgColor);
    const bgL = this.getLuminance(this.bgColor);
    const ratio = this.getContrastRatio(this.fgColor, this.bgColor);

    // Luminance values
    this.fgLuminance.textContent = fgL.toFixed(3);
    this.bgLuminance.textContent = bgL.toFixed(3);

    // Luminance markers (position as percentage)
    this.fgMarker.style.left = `${fgL * 100}%`;
    this.bgMarker.style.left = `${bgL * 100}%`;

    // Contrast
    this.contrastValue.textContent = ratio.toFixed(2) + ':1';

    // HSL values
    const fgRgb = this.hexToRgb(this.fgColor);
    const bgRgb = this.hexToRgb(this.bgColor);
    const fgHsl = this.rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
    const bgHsl = this.rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b);

    this.fgHsl.textContent = `hsl(${fgHsl.h}, ${fgHsl.s}%, ${fgHsl.l}%)`;
    this.bgHsl.textContent = `hsl(${bgHsl.h}, ${bgHsl.s}%, ${bgHsl.l}%)`;

    // Luminance difference
    this.luminanceDiff.textContent = Math.abs(fgL - bgL).toFixed(3);
  }

  generateSuggestions() {
    const currentRatio = this.getContrastRatio(this.fgColor, this.bgColor);

    // 如果已經通過 AAA，不需要建議
    if (currentRatio >= 7) {
      this.suggestionsSection.style.display = 'none';
      return;
    }

    this.suggestionsSection.style.display = 'block';
    this.suggestionList.innerHTML = '';

    // 生成建議色彩（調整前景色亮度）
    const suggestions = this.findBetterColors(this.fgColor, this.bgColor);

    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';

      const colorPreview = document.createElement('div');
      colorPreview.className = 'suggestion-color';
      colorPreview.style.backgroundColor = suggestion.color;

      const info = document.createElement('div');
      info.className = 'suggestion-info';

      const hex = document.createElement('div');
      hex.className = 'suggestion-hex';
      hex.textContent = suggestion.color.toUpperCase();

      const ratio = document.createElement('div');
      ratio.className = 'suggestion-ratio';
      ratio.textContent = `對比度: ${suggestion.ratio.toFixed(2)}:1`;

      info.appendChild(hex);
      info.appendChild(ratio);

      item.appendChild(colorPreview);
      item.appendChild(info);

      item.addEventListener('click', () => {
        this.fgColor = suggestion.color;
        this.fgColorPicker.value = suggestion.color;
        this.fgHexInput.value = suggestion.color.toUpperCase();
        this.updateAll();
        this.showStatus(`已套用建議色彩 ${suggestion.color}`, 'success');
      });

      this.suggestionList.appendChild(item);
    });
  }

  findBetterColors(fgColor, bgColor) {
    const suggestions = [];
    const fgRgb = this.hexToRgb(fgColor);
    const fgHsl = this.rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
    const bgL = this.getLuminance(bgColor);

    // 根據背景亮度決定方向
    const targetDark = bgL > 0.5;

    // 調整亮度尋找符合 AA 和 AAA 的顏色
    for (let l = targetDark ? 0 : 100; targetDark ? l <= 50 : l >= 50; l += targetDark ? 5 : -5) {
      const newColor = this.hslToHex(fgHsl.h, fgHsl.s, l);
      const ratio = this.getContrastRatio(newColor, bgColor);

      if (ratio >= 4.5 && suggestions.length < 6) {
        // 避免重複
        if (!suggestions.find(s => s.color === newColor)) {
          suggestions.push({ color: newColor, ratio });
        }
      }
    }

    // 如果原色調找不到，嘗試純黑或純白
    if (suggestions.length < 3) {
      const blackRatio = this.getContrastRatio('#000000', bgColor);
      const whiteRatio = this.getContrastRatio('#FFFFFF', bgColor);

      if (blackRatio >= 4.5 && !suggestions.find(s => s.color === '#000000')) {
        suggestions.push({ color: '#000000', ratio: blackRatio });
      }
      if (whiteRatio >= 4.5 && !suggestions.find(s => s.color === '#ffffff')) {
        suggestions.push({ color: '#FFFFFF', ratio: whiteRatio });
      }
    }

    return suggestions.slice(0, 6);
  }

  hslToHex(h, s, l) {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  swapColors() {
    const temp = this.fgColor;
    this.fgColor = this.bgColor;
    this.bgColor = temp;

    this.fgColorPicker.value = this.fgColor;
    this.bgColorPicker.value = this.bgColor;
    this.fgHexInput.value = this.fgColor.toUpperCase();
    this.bgHexInput.value = this.bgColor.toUpperCase();

    this.updateAll();
    this.showStatus('顏色已交換', 'success');
  }

  copyReport() {
    const ratio = this.getContrastRatio(this.fgColor, this.bgColor);
    const fgRgb = this.hexToRgb(this.fgColor);
    const bgRgb = this.hexToRgb(this.bgColor);

    const report = `無障礙色彩檢查報告
========================
前景色: ${this.fgColor.toUpperCase()} / rgb(${fgRgb.r}, ${fgRgb.g}, ${fgRgb.b})
背景色: ${this.bgColor.toUpperCase()} / rgb(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})

對比度: ${ratio.toFixed(2)}:1

WCAG 2.1 合規性:
- 一般文字 AA (4.5:1): ${ratio >= 4.5 ? '通過' : '不通過'}
- 一般文字 AAA (7:1): ${ratio >= 7 ? '通過' : '不通過'}
- 大型文字 AA (3:1): ${ratio >= 3 ? '通過' : '不通過'}
- 大型文字 AAA (4.5:1): ${ratio >= 4.5 ? '通過' : '不通過'}

Generated by IMG-140 無障礙色彩檢查工具`;

    navigator.clipboard.writeText(report).then(() => {
      this.showStatus('報告已複製到剪貼簿', 'success');
    }).catch(() => {
      this.showStatus('複製失敗', 'error');
    });
  }

  reset() {
    this.fgColor = '#000000';
    this.bgColor = '#FFFFFF';

    this.fgColorPicker.value = this.fgColor;
    this.bgColorPicker.value = this.bgColor;
    this.fgHexInput.value = this.fgColor;
    this.bgHexInput.value = this.bgColor;

    this.updateAll();
    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new AccessibilityChecker();
});
