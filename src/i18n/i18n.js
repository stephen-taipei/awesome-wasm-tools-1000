// Awesome WASM Tools 1000 - Internationalization (i18n) System

const translations = {
  'zh-TW': {
    subtitle: '純前端 WebAssembly 工具平台 | 無後端、完全離線',
    cat_image: '圖片處理',
    cat_audio: '音訊處理',
    cat_compress: '壓縮轉檔',
    cat_crypto: '加密解密',
    cat_text: '文本分析',
    cat_pdf: 'PDF 工具',
    cat_encode: '編碼工具',
    cat_calc: '數據計算',
    coming_soon: '即將推出...',
    footer_privacy: '所有檔案處理均在本地完成，不會上傳到伺服器',

    // IMG-001 specific
    img001_name: 'PNG 轉 JPG',
    img001_desc: '將 PNG 圖片轉換為 JPG 格式，支援品質調整',
    back: '返回',
    upload_title: '拖放 PNG 圖片到此處',
    upload_subtitle: '或點擊選擇檔案',
    upload_formats: '支援格式：PNG',
    settings: '輸出設定',
    quality: '品質',
    original: '原始圖片',
    converted: '轉換結果',
    file_size: '檔案大小',
    convert: '開始轉換',
    download: '下載 JPG',
    reset: '重置',
    converting: '轉換中...',
    convert_success: '轉換完成！',
    convert_error: '轉換失敗，請重試',
    no_file: '請先選擇 PNG 圖片',
    invalid_format: '請選擇 PNG 格式的圖片',
    reduction: '減少',

    // IMG-002 specific
    img002_name: 'JPG 轉 PNG',
    img002_desc: '將 JPG 圖片轉換為 PNG 格式，無損轉換',
    upload_title_jpg: '拖放 JPG/JPEG 圖片到此處',
    upload_formats_jpg: '支援格式：JPG, JPEG',
    output_format: '輸出格式',
    png_info: 'PNG 為無損格式，轉換後檔案可能變大，但畫質不會損失',
    download_png: '下載 PNG',
  },
  'en': {
    subtitle: 'Pure Frontend WebAssembly Tools Platform | No Backend, Fully Offline',
    cat_image: 'Image Processing',
    cat_audio: 'Audio Processing',
    cat_compress: 'Compression',
    cat_crypto: 'Encryption',
    cat_text: 'Text Analysis',
    cat_pdf: 'PDF Tools',
    cat_encode: 'Encoding Tools',
    cat_calc: 'Data Calculation',
    coming_soon: 'Coming soon...',
    footer_privacy: 'All file processing is done locally, nothing is uploaded to server',

    // IMG-001 specific
    img001_name: 'PNG to JPG',
    img001_desc: 'Convert PNG images to JPG format with quality adjustment',
    back: 'Back',
    upload_title: 'Drop PNG image here',
    upload_subtitle: 'or click to select file',
    upload_formats: 'Supported format: PNG',
    settings: 'Output Settings',
    quality: 'Quality',
    original: 'Original Image',
    converted: 'Converted Result',
    file_size: 'File Size',
    convert: 'Convert',
    download: 'Download JPG',
    reset: 'Reset',
    converting: 'Converting...',
    convert_success: 'Conversion complete!',
    convert_error: 'Conversion failed, please try again',
    no_file: 'Please select a PNG image first',
    invalid_format: 'Please select a PNG format image',
    reduction: 'reduced',

    // IMG-002 specific
    img002_name: 'JPG to PNG',
    img002_desc: 'Convert JPG images to PNG format, lossless conversion',
    upload_title_jpg: 'Drop JPG/JPEG image here',
    upload_formats_jpg: 'Supported formats: JPG, JPEG',
    output_format: 'Output Format',
    png_info: 'PNG is lossless format, file size may increase but image quality is preserved',
    download_png: 'Download PNG',
  }
};

// Get current language from localStorage or default to zh-TW
function getCurrentLanguage() {
  return localStorage.getItem('wasm-tools-lang') || 'zh-TW';
}

// Set language
function setLanguage(lang) {
  localStorage.setItem('wasm-tools-lang', lang);
  applyTranslations();
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations() {
  const lang = getCurrentLanguage();
  const t = translations[lang] || translations['zh-TW'];

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.textContent = t[key];
    }
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key]) {
      el.placeholder = t[key];
    }
  });
}

// Get translation by key
function t(key) {
  const lang = getCurrentLanguage();
  const trans = translations[lang] || translations['zh-TW'];
  return trans[key] || key;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
});

// Export for use in other modules
window.setLanguage = setLanguage;
window.t = t;
window.getCurrentLanguage = getCurrentLanguage;
window.applyTranslations = applyTranslations;

export { setLanguage, t, getCurrentLanguage, applyTranslations, translations };
