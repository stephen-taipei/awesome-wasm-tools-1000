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

    // IMG-003 specific
    img003_name: 'WebP 轉換器',
    img003_desc: 'WebP 與 PNG/JPG 格式互轉，支援品質調整',
    conversion_direction: '轉換方向',
    to_webp_desc: '轉換為 WebP 格式，檔案更小',
    from_webp_desc: '轉換為通用格式',
    upload_title_webp_in: '拖放 PNG/JPG 圖片到此處',
    upload_formats_webp_in: '支援格式：PNG, JPG, JPEG',
    upload_title_webp_out: '拖放 WebP 圖片到此處',
    upload_formats_webp_out: '支援格式：WebP',
    compression_type: '壓縮模式',
    lossy: '有損壓縮',
    lossless: '無損壓縮',
    webp_lossy_info: '有損壓縮可大幅減少檔案大小，適合網頁使用',
    webp_lossless_info: '無損壓縮保持原始畫質，檔案較大',
    webp_out_info: '轉換為通用格式以獲得更好的相容性',
    download_webp: '下載 WebP',

    // IMG-004 specific
    img004_name: 'HEIC/HEIF 轉換器',
    img004_desc: '將 iPhone HEIC/HEIF 照片轉換為 JPG/PNG 格式',
    heic_explanation: 'HEIC (High Efficiency Image Container) 是 Apple 從 iOS 11 開始使用的預設照片格式，比 JPEG 壓縮率更高但相容性較差。本工具可將其轉換為通用格式。',
    upload_title_heic: '拖放 HEIC/HEIF 圖片到此處',
    upload_formats_heic: '支援格式：HEIC, HEIF（支援批量轉換）',
    selected_files: '已選擇',
    files: '個檔案',
    heic_convert_info: 'HEIC 轉換需要載入 WASM 模組，首次使用可能需要幾秒鐘',
    invalid_format_heic: '請選擇 HEIC/HEIF 格式的圖片',

    // IMG-005 specific
    img005_name: 'AVIF 轉換器',
    img005_desc: 'AVIF 次世代圖片格式轉換，壓縮率比 WebP 更高',
    avif_explanation: 'AVIF (AV1 Image File Format) 是基於 AV1 視訊編碼的次世代圖片格式。相同品質下，檔案大小比 JPEG 小 50%、比 WebP 小 20%，支援 HDR 和透明度。',
    to_avif_desc: '轉換為 AVIF，檔案最小',
    from_avif_desc: '轉換為通用格式',
    upload_title_avif_in: '拖放 PNG/JPG/WebP 圖片到此處',
    upload_formats_avif_in: '支援格式：PNG, JPG, WebP',
    upload_title_avif_out: '拖放 AVIF 圖片到此處',
    upload_formats_avif_out: '支援格式：AVIF',
    avif_quality_info: 'AVIF 在較低品質設定下仍能保持良好畫質，建議使用 60-80%',
    avif_out_info: '轉換為通用格式以獲得更好的相容性',
    avif_not_supported: '您的瀏覽器不支援 AVIF 編碼，請使用 Chrome 85+ 或 Firefox 93+',
    avif_encode_not_supported: '您的瀏覽器不支援 AVIF 編碼，請使用 Chrome 85+ 或 Firefox 93+',
    download_avif: '下載 AVIF',
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

    // IMG-003 specific
    img003_name: 'WebP Converter',
    img003_desc: 'Convert between WebP and PNG/JPG formats with quality control',
    conversion_direction: 'Conversion Direction',
    to_webp_desc: 'Convert to WebP for smaller file size',
    from_webp_desc: 'Convert to universal format',
    upload_title_webp_in: 'Drop PNG/JPG image here',
    upload_formats_webp_in: 'Supported formats: PNG, JPG, JPEG',
    upload_title_webp_out: 'Drop WebP image here',
    upload_formats_webp_out: 'Supported format: WebP',
    compression_type: 'Compression Mode',
    lossy: 'Lossy',
    lossless: 'Lossless',
    webp_lossy_info: 'Lossy compression significantly reduces file size, ideal for web use',
    webp_lossless_info: 'Lossless compression preserves original quality, larger file size',
    webp_out_info: 'Convert to universal format for better compatibility',
    download_webp: 'Download WebP',

    // IMG-004 specific
    img004_name: 'HEIC/HEIF Converter',
    img004_desc: 'Convert iPhone HEIC/HEIF photos to JPG/PNG format',
    heic_explanation: 'HEIC (High Efficiency Image Container) is the default photo format used by Apple since iOS 11. It offers better compression than JPEG but has limited compatibility. This tool converts it to universal formats.',
    upload_title_heic: 'Drop HEIC/HEIF images here',
    upload_formats_heic: 'Supported formats: HEIC, HEIF (batch conversion supported)',
    selected_files: 'Selected',
    files: 'files',
    heic_convert_info: 'HEIC conversion requires loading WASM module, first use may take a few seconds',
    invalid_format_heic: 'Please select HEIC/HEIF format images',

    // IMG-005 specific
    img005_name: 'AVIF Converter',
    img005_desc: 'AVIF next-gen image format conversion, better compression than WebP',
    avif_explanation: 'AVIF (AV1 Image File Format) is a next-gen image format based on AV1 video codec. At same quality, file size is 50% smaller than JPEG, 20% smaller than WebP, with HDR and transparency support.',
    to_avif_desc: 'Convert to AVIF for smallest file size',
    from_avif_desc: 'Convert to universal format',
    upload_title_avif_in: 'Drop PNG/JPG/WebP image here',
    upload_formats_avif_in: 'Supported formats: PNG, JPG, WebP',
    upload_title_avif_out: 'Drop AVIF image here',
    upload_formats_avif_out: 'Supported format: AVIF',
    avif_quality_info: 'AVIF maintains good quality at lower settings, recommended 60-80%',
    avif_out_info: 'Convert to universal format for better compatibility',
    avif_not_supported: 'Your browser does not support AVIF encoding, please use Chrome 85+ or Firefox 93+',
    avif_encode_not_supported: 'Your browser does not support AVIF encoding, please use Chrome 85+ or Firefox 93+',
    download_avif: 'Download AVIF',
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
