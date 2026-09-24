import '../styles/tool-safety.css';

/** Progressive enhancement; does not read files or collect user content. */
function enhance() {
  const main = document.querySelector('main');
  if (main) {
    main.id ||= 'main'; main.tabIndex = -1;
    const skip = document.createElement('a'); skip.className = 'skip-link'; skip.href = `#${main.id}`;
    skip.textContent = '跳至工具內容 / Skip to tool'; document.body.prepend(skip);
    const notice = document.createElement('details'); notice.className = 'audit-notice';
    const summary = document.createElement('summary'); summary.textContent = '待功能驗證 · 使用前請先以測試資料確認結果';
    const detail = document.createElement('p');
    detail.textContent = '頁面載入不等於結果正確。重要資料請保留備份；部分工具會向第三方載入套件，本站不保證所有工具完全離線。Page loading does not certify output correctness. Keep backups; some tools load third-party dependencies.';
    notice.append(summary,detail); main.prepend(notice);
  }
  document.querySelectorAll('.upload-area,.drop-zone,#uploadArea,#dropZone').forEach(el => {
    if (el.matches('button,input,label') || el.querySelector('input:not([type="hidden"])')) return;
    el.setAttribute('role','button'); el.tabIndex = 0;
    el.addEventListener('keydown',event => { if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el.click(); } });
  });
  document.querySelectorAll('.status-message').forEach(el => { el.setAttribute('role','status'); el.setAttribute('aria-live','polite'); });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',enhance,{once:true}); else enhance();
