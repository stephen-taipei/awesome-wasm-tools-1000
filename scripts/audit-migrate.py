"""One-time, reviewed migration for the 2026-09-24 audit branch; not a build hook."""
from pathlib import Path
import json, re
root=Path.cwd()
def edit(name, transform):
    p=root/name
    p.write_text(transform(p.read_text()),encoding='utf-8')

def migrate():
    registry=root/'docs/unavailable-implementations.json'
    registry.parent.mkdir(exist_ok=True)
    records=json.loads(registry.read_text()) if registry.exists() else []
    pattern=re.compile(r'Placeholder - actual|模擬處理 - 實際|處理完成（模擬）|real QR codes require proper encoding|(?:Simulate (?:OGG|Opus|M4A|MP3)|MP3 encoding simulation)|Use deflate compression as|simulating LZMA|ZipCrypto simulation',re.I)
    for p in (root/'src/tools').rglob('*.js'):
        source=p.read_text()
        if pattern.search(source):
            records.append({'path':str(p.relative_to(root)),'evidence':[line.strip() for line in source.splitlines() if pattern.search(line)]})
            p.write_text("// AUDIT_UNAVAILABLE: legacy implementation did not perform the advertised operation.\n// See docs/AUDIT-2026-09-24.md; original code remains in Git history.\nimport { showUnavailable } from '../../../utils/tool-unavailable.js';\nshowUnavailable();\n")
    assert len(records)==187, f'Unexpected incomplete implementation count: {len(records)}'
    registry.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    edit('src/tools/text/TXT-100/special-chars.js',lambda s:s.replace("{ char: ''', name: 'Left Single Quotation' }","{ char: '‘', name: 'Left Single Quotation' }").replace("{ char: ''', name: 'Right Single Quotation' }","{ char: '’', name: 'Right Single Quotation' }"))
    edit('src/tools/calculation/CAL-130/workflow.js',lambda s:s.replace('"`','`').replace('`"','`'))
    p=root/'src/tools/calculation/CAL-001/calculator.js';s=p.read_text()
    start=s.index('function evalSafe(');end=s.index('function addToHistory(',start)
    s="import { evaluateExpression } from '../../../utils/expression.js';\n"+s[:start]+"function evalSafe(expr) { return evaluateExpression(String(expr)); }\n\n"+s[end:]
    s=s.replace('item.innerHTML = `<span>${expr}</span><span>= ${result}</span>`;',"const label = document.createElement('span'); label.textContent = expr;\n    const value = document.createElement('span'); value.textContent = `= ${result}`;\n    item.append(label, value);")
    s=s.replace('history.insertBefore(item, history.firstChild);','history.insertBefore(item, history.firstChild);\n    while (history.children.length > 50) history.lastElementChild.remove();');p.write_text(s)
    p=root/'src/tools/calculation/CAL-126/spreadsheet.js';s=p.read_text()
    s="import { createSheetEvaluator, csvCell } from '../../../utils/spreadsheet.js';\n"+s
    s=s.replace('function evaluateSheet() {','function evaluateSheet() {\n    const evaluator = createSheetEvaluator(sheetData);').replace('evaluateFormula(raw.substring(1))','evaluator.cell(id)')
    start=s.index('function evaluateFormula(');end=s.index('function exportCSV()',start);s=s[:start]+s[end:]
    s=s.replace('row.push(val);','row.push(csvCell(val));').replace('a.click();','document.body.append(a); a.click(); a.remove();\n    setTimeout(() => URL.revokeObjectURL(url), 1000);')
    s+='\nObject.assign(window, { exportCSV, resetSheet });\n';p.write_text(s)
    p=root/'src/tools/calculation/CAL-129/calculator.js';s=p.read_text()
    s="import { evaluateExpression } from '../../../utils/expression.js';\n"+s
    start=s.index('function loadKeyMap()');end=s.index('function init()',start)
    s=s[:start]+'''function loadKeyMap() {
    try {
        const parsed = JSON.parse(localStorage.getItem('cal-129-keymap') || 'null');
        if (parsed && Object.keys(defaultKeyMap).every(k => typeof parsed[k] === 'string' && parsed[k].length <= 32)) return Object.fromEntries(Object.keys(defaultKeyMap).map(k => [k, parsed[k]]));
    } catch { /* Storage can be blocked or malformed. */ }
    return { ...defaultKeyMap };
}
function saveKeyMap() { try { localStorage.setItem('cal-129-keymap', JSON.stringify(keyMap)); } catch {} }

'''+s[end:]
    s=s.replace("new Function('return ' + evalString)()",'evaluateExpression(evalString)').replace("document.querySelectorAll('.btn')","document.querySelectorAll('.btn[data-action]')")
    s=s.replace('function executeAction(action) {',"function executeAction(action) {\n    if (!Object.hasOwn(defaultKeyMap, action)) return;\n    if (currentExpression === 'Error') currentExpression = '';")
    s=s.replace('keyMap[key].toLowerCase() === e.key.toLowerCase()',"keyMap[key].toLowerCase() === (e.key === ' ' ? 'Space' : e.key).toLowerCase()");p.write_text(s)
    for tool,script in [('CAL-126','spreadsheet.js'),('CAL-129','calculator.js')]:
        edit(f'src/tools/calculation/{tool}/index.html',lambda s:s.replace(f'<script src="{script}"',f'<script type="module" src="{script}"'))
    p=root/'src/tools/image/IMG-003/converter.js';s=p.read_text()
    start=s.index('  async convertLossless()');end=s.index('\n}\n\n// Initialize',start)
    s=s[:start]+'''  async convertLossless() {
    this.invalidateResult();
    this.showStatus('error', 'Canvas does not guarantee lossless WebP. Use PNG or lossy WebP. / 此編碼器不保證 WebP 無損輸出。');
  }
'''+s[end:]
    s=s.replace('this.outputType = e.target.value;','this.outputType = e.target.value;\n      this.invalidateResult();')
    s=s.replace('this.compression = type;','this.compression = type;\n    this.invalidateResult();')
    s=s.replace("this.config.outputExtension = 'webp';","this.config.outputExtension = 'webp';\n      this.config.fillBackground = null;\n      this.config.showQuality = true;");p.write_text(s)
    edit('src/tools/image/IMG-003/index.html',lambda s:s.replace('onclick="setCompression(\'lossless\')"','disabled title="Canvas does not guarantee lossless WebP encoding" onclick="setCompression(\'lossless\')"'))
    p=root/'src/tools/image/IMG-005/converter.js';s=p.read_text()
    start=s.index('  updateBrowserBadges()');end=s.index('  initAvifControls()',start)
    s=s[:start]+'''  updateBrowserBadges() {
    for (const id of ['chromeSupport','firefoxSupport','safariSupport','edgeSupport']) document.getElementById(id)?.classList.remove('supported');
  }

'''+s[end:]
    s=s.replace('this.outputType = e.target.value;','this.outputType = e.target.value;\n      this.invalidateResult();')
    s=s.replace('請使用 Chrome 85+ 或 Firefox 93+','圖片解碼支援不代表瀏覽器提供 AVIF 編碼器');p.write_text(s)
    p=root/'src/i18n/i18n.js';s=p.read_text()
    s=re.sub(r"(avif_(?:encode_)?not_supported: )'[^']*'",lambda m:m[1]+"'AVIF encoder unavailable; decoding support does not imply encoding support. / 瀏覽器未提供 AVIF 編碼器。'",s)
    s=s.replace('純前端 WebAssembly 工具平台 | 無後端、完全離線','瀏覽器工具集合 | 部分功能使用外部套件，請保留原始檔').replace('WebAssembly-powered frontend tools | No backend, fully offline','Browser tools | Some tools need external assets; keep your originals')
    start=s.index('// Get current language from localStorage')
    s=s[:start]+'''let currentLanguage = 'zh-TW';
try { if (localStorage.getItem('wasm-tools-lang') === 'en') currentLanguage = 'en'; } catch {}
function getCurrentLanguage() { return currentLanguage; }
function setLanguage(lang) {
  if (!Object.hasOwn(translations, lang)) return;
  currentLanguage = lang;
  try { localStorage.setItem('wasm-tools-lang', lang); } catch {}
  applyTranslations();
}
function applyTranslations() {
  const values = translations[currentLanguage];
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll('[data-i18n]').forEach(el => { const value = values[el.getAttribute('data-i18n')]; if (value) el.textContent = value; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const value = values[el.getAttribute('data-i18n-placeholder')]; if (value) el.placeholder = value; });
  document.querySelectorAll('.lang-btn').forEach(el => { const active = (el.getAttribute('onclick') || '').includes("'" + currentLanguage + "'"); el.setAttribute('aria-pressed', String(active)); });
}
function t(key) { return translations[currentLanguage][key] || translations['zh-TW'][key] || key; }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyTranslations, { once: true }); else applyTranslations();
Object.assign(window, { setLanguage, t, getCurrentLanguage, applyTranslations });
export { setLanguage, t, getCurrentLanguage, applyTranslations, translations };
''';p.write_text(s)
    with (root/'src/styles/global.css').open('a') as f:
        f.write('\n/* Shared accessibility and availability. */\n.skip-link{position:fixed;left:1rem;top:-8rem;z-index:9999;padding:1rem;background:#fff;color:#111}.skip-link:focus{top:1rem}.audit-notice,.audit-blocked{margin:1rem auto;padding:1.25rem;border:1px solid #697887;border-radius:12px;max-width:70rem;font:14px/1.8 system-ui}.audit-notice summary{cursor:pointer}.audit-blocked{margin:3rem auto}.audit-blocked h1{overflow-wrap:anywhere}:focus-visible{outline:3px solid #76dfcb;outline-offset:3px}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}\n')
    with (root/'.gitignore').open('a') as f:
        f.write('\n/public/tools.json\n/public/catalog/\n/audit-results/\n/playwright-report/\n/test-results/\n')
    pkg=json.loads((root/'package.json').read_text())
    pkg['description']='Browser utility collection with generated inventory and explicit validation status'
    pkg['engines']={'node':'>=22.12.0'}
    pkg['scripts'].update({'generate:catalog':'node scripts/catalog.mjs','test':'node --experimental-vm-modules --test tests/*.test.mjs','typecheck':'tsc --noEmit','check:dist':'node scripts/validate-dist.mjs','test:e2e':'playwright test','check':'npm test && npm run typecheck && npm run build && npm run check:dist'})
    (root/'package.json').write_text(json.dumps(pkg,indent=2)+'\n')
    lock=json.loads((root/'package-lock.json').read_text());lock['packages']['']['engines']=pkg['engines'];(root/'package-lock.json').write_text(json.dumps(lock,indent=2)+'\n')
    print('Applied reviewed audit migration; disabled implementations:',len(records))
if __name__=='__main__': migrate()
