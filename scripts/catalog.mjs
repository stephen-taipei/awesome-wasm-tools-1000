import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const categories = {
  image: ['圖片處理','Image'], audio: ['音訊處理','Audio'], compress: ['壓縮與封裝','Archives'],
  crypto: ['加密與雜湊','Cryptography'], text: ['文字工具','Text'], pdf: ['PDF 文件','PDF'],
  encoding: ['編碼轉換','Encoding'], calculator: ['數學與統計','Math & statistics'], calculation: ['進階計算','Advanced calculators']
};
export function elements(node,result=[]) { if(node.tagName) result.push(node); for(const child of node.childNodes||[]) elements(child,result); return result; }
export function attr(node,key) { return node.attrs?.find(a=>a.name===key)?.value; }
export function text(node) { return node?.nodeName==='#text'?node.value:(node?.childNodes||[]).map(text).join(''); }
export function escapeHtml(value) { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function localFile(url,from,projectRoot=root) {
  if(!url||/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url))return null;
  const pathname=decodeURIComponent(url.split(/[?#]/)[0]);
  const target=pathname.startsWith('/')?path.join(projectRoot,pathname):path.resolve(path.dirname(from),pathname);
  if(fs.existsSync(target))return target;
  const publicTarget=path.join(projectRoot,'public',pathname);
  return pathname.startsWith('/')&&fs.existsSync(publicTarget)?publicTarget:target;
}
export function getTools(projectRoot=root) {
  const tools=[];
  for(const category of Object.keys(categories)) {
    const dir=path.join(projectRoot,'src/tools',category);if(!fs.existsSync(dir))continue;
    for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true}))) {
      if(!entry.isDirectory())continue;
      const file=path.join(dir,entry.name,'index.html');if(!fs.existsSync(file))continue;
      const nodes=elements(parse(fs.readFileSync(file,'utf8')));
      const title=text(nodes.find(n=>n.tagName==='h1'))||text(nodes.find(n=>n.tagName==='title'));
      const description=nodes.find(n=>n.tagName==='meta'&&attr(n,'name')==='description');
      const reasons=[];let network=false;
      for(const node of nodes) {
        const url=attr(node,'src')??(node.tagName==='link'?attr(node,'href'):null);if(!url)continue;
        if(/^(?:https?:)?\/\//.test(url))network=true;
        const asset=localFile(url,file,projectRoot);
        if(asset&&!fs.existsSync(asset))reasons.push(`Missing asset: ${url}`);
        if(node.tagName==='script'&&asset&&fs.existsSync(asset)) {
          const source=fs.readFileSync(asset,'utf8');
          if(source.includes('AUDIT_UNAVAILABLE'))reasons.push('Implementation does not match the advertised operation.');
          if(/https?:\/\//.test(source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'')))network=true;
        }
      }
      const route=path.relative(projectRoot,file).split(path.sep).join('/');
      tools.push({key:`${category}/${entry.name}`,id:entry.name,category,path:route,
        name:title.replace(/\s*-\s*Awesome WASM Tools 1000.*$/i,'').replace(new RegExp(`^${entry.name}\\s*`),'').trim()||entry.name,
        description:attr(description||{},'content')||'',status:reasons.length?'blocked':'unverified',network,reasons:[...new Set(reasons)]});
    }
  }
  return tools;
}
export function classicScripts(tools,projectRoot=root) {
  const files=new Map();
  for(const tool of tools.filter(t=>t.status!=='blocked')) {
    const page=path.join(projectRoot,tool.path);
    for(const node of elements(parse(fs.readFileSync(page,'utf8')))) {
      if(node.tagName!=='script'||attr(node,'type')==='module')continue;
      const asset=localFile(attr(node,'src'),page,projectRoot);if(!asset||!fs.existsSync(asset))continue;
      const route=path.relative(projectRoot,asset).split(path.sep).join('/');
      if(route.startsWith('../'))throw new Error('Script escapes the project root');
      if(!route.startsWith('public/'))files.set(route,fs.readFileSync(asset,'utf8'));
    }
  }
  return files;
}
export function unavailablePage(tool) {
  const name=escapeHtml(`${tool.id} ${tool.name}`);
  return `<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${name} — 暫停使用</title><link rel="stylesheet" href="/src/styles/global.css"></head><body><main class="tool-page" id="main"><a class="back-btn" href="/index.html">← 返回工具目錄 / Back to tools</a><section class="audit-blocked" data-tool-status="blocked"><p>功能未完成 · Unavailable</p><h1>${name}</h1><p>此工具的實作或必要資源尚未完成。為避免產生錯誤檔案或誤導性的加密、驗證結果，處理與下載功能已停用。</p><p>This tool is unavailable: its implementation or required assets are incomplete. No input is accepted and no output is produced.</p><details><summary>檢查結果 / Audit findings</summary><ul>${tool.reasons.map(r=>`<li>${escapeHtml(r)}</li>`).join('')}</ul></details><p>原始實作保留於 Git 歷史；通過格式與功能測試後才能重新啟用。</p></section></main></body></html>`;
}
export function relativeLinks(html,route) {
  const dir=path.posix.dirname(route);
  return html.replace(/\b(href|src)=(['"])\/(?!\/)([^'"<>]*)\2/g,(_,attribute,quote,value)=>{
    const cut=value.search(/[?#]/),pathname=cut<0?value:value.slice(0,cut),suffix=cut<0?'':value.slice(cut);
    const relative=path.posix.relative(dir,pathname||'index.html');
    return `${attribute}=${quote}${relative.startsWith('.')?relative:'./'+relative}${suffix}${quote}`;
  });
}
export function writeCatalog(projectRoot=root) {
  const tools=getTools(projectRoot),publicDir=path.join(projectRoot,'public');
  fs.mkdirSync(path.join(publicDir,'catalog'),{recursive:true});
  fs.writeFileSync(path.join(publicDir,'tools.json'),JSON.stringify({schemaVersion:1,categories,tools}));
  const body=Object.entries(categories).map(([category,[name]])=>`<section><h2>${name}</h2><ul>${tools.filter(t=>t.category===category).map(t=>`<li><a href="../${t.path}">${escapeHtml(t.id+' '+t.name)}</a> — ${t.status==='blocked'?'暫停使用 / Unavailable':'待功能驗證 / Unverified'}</li>`).join('')}</ul></section>`).join('');
  fs.writeFileSync(path.join(publicDir,'catalog/index.html'),`<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>完整工具目錄 — Awesome WASM Tools 1000</title><style>body{font:1rem/1.8 system-ui;max-width:70rem;margin:auto;padding:2rem}a{overflow-wrap:anywhere}li{margin:.5rem 0}</style></head><body><main><a href="../index.html">← 首頁</a><h1>完整工具目錄 · ${tools.length} 個頁面</h1><p>頁面存在不等於功能已通過驗證。外部套件與離線能力依工具而異。</p>${body}</main></body></html>`);
  return tools;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) { const tools=writeCatalog();console.log(`Catalog: ${tools.length} pages, ${tools.filter(t=>t.status==='blocked').length} unavailable.`); }
