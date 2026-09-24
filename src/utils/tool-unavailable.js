/** Fail closed when a legacy source page is served without the build transform. */
export function showUnavailable() {
  function show() {
    document.querySelectorAll('input,textarea,select,button').forEach(node => { node.disabled = true; });
    const notice = document.createElement('section');
    notice.className = 'audit-blocked'; notice.dataset.toolStatus = 'blocked'; notice.setAttribute('role','alert');
    const heading = document.createElement('h1'); heading.textContent = '功能未完成 / Tool unavailable';
    const detail = document.createElement('p');
    detail.textContent = '此實作不符合宣稱功能，處理與下載已停用。This implementation does not perform the advertised operation. Processing and downloads are disabled.';
    notice.append(heading,detail); document.body.prepend(notice);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',show,{once:true}); else show();
}
