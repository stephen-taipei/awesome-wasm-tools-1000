const copy={
 'zh-TW':{full:'完整目錄',eyebrow:'BROWSER TOOL LAB / 開放原始碼',headline:'少一點切換，\n多一點完成。',description:'圖片、音訊、文字與計算，在瀏覽器裡探索。以真實工具名稱搜尋，清楚知道每個功能的驗證狀態。',pages:'工具頁面',categories:'主題分類',unavailable:'暫停使用',trust:'頁面存在不代表功能已驗證。部分工具需要下載外部套件；請保留原始檔，不要以未驗證的加密工具保護敏感資料。',browse:'探索工具',sidebar:'每個主題，同一套清楚的入口。原有工具網址保持不變。',searchLabel:'搜尋工具名稱、編號或功能',clear:'清除',statusLabel:'驗證狀態',allStatus:'所有狀態',unverified:'待功能驗證',empty:'找不到符合的工具',emptyHint:'試試其他關鍵字，或清除分類與搜尋條件。',reset:'重設篩選',error:'目錄載入失敗',retry:'重新載入',more:'顯示更多工具',faq:'使用前，先知道這些',faq1:'所有工具都使用 WebAssembly 嗎？',answer1:'不是。此集合包含 JavaScript、瀏覽器原生 API 與 WebAssembly 實作。品牌名稱不代表每個工具都使用 WASM。',faq2:'可以完全離線使用嗎？',answer2:'不保證。部分工具會從 CDN 載入套件；本站尚未提供完整離線快取。不要將本地運算等同於完全離線。',faq3:'「待功能驗證」與「暫停使用」有什麼差別？',answer3:'待驗證代表尚未逐項確認輸出正確性；暫停使用代表已發現未完成實作或資源缺漏，已停用輸入與下載。請以備份檔案測試可開啟的工具。',footer:'開放探索，誠實標示。工具驗證是一項持續的工程。',all:'全部工具',network:'外部資源',results:n=>`${n.toLocaleString()} 個符合的工具`,loading:'載入目錄中…'},
 en:{full:'Full directory',eyebrow:'BROWSER TOOL LAB / OPEN SOURCE',headline:'Less switching.\nMore doing.',description:'Explore image, audio, text and calculation tools in your browser. Search by real names, with clear validation status for every tool.',pages:'Tool pages',categories:'Categories',unavailable:'Unavailable',trust:'A page is not proof of correctness. Some tools fetch external libraries. Keep your originals, and never trust unverified cryptography with sensitive data.',browse:'Explore tools',sidebar:'One clear entry point for every category. Existing tool URLs stay the same.',searchLabel:'Search by name, ID or function',clear:'Clear',statusLabel:'Validation status',allStatus:'All statuses',unverified:'Unverified',empty:'No matching tools',emptyHint:'Try another keyword or clear your filters.',reset:'Reset filters',error:'Directory could not be loaded',retry:'Retry',more:'Show more tools',faq:'Before you begin',faq1:'Does every tool use WebAssembly?',answer1:'No. The collection includes JavaScript, native browser APIs and WebAssembly. The brand does not imply that every tool uses WASM.',faq2:'Does everything work offline?',answer2:'No offline guarantee is provided. Some tools load CDN dependencies, and a complete offline cache is not implemented. Local computation is not the same as offline availability.',faq3:'What do Unverified and Unavailable mean?',answer3:'Unverified tools have not all had their outputs checked. Unavailable tools have known incomplete implementations or missing assets, so input and downloads are disabled. Test usable tools with copies of your files.',footer:'Open to explore. Honest about status. Verification is ongoing engineering.',all:'All tools',network:'External assets',results:n=>`${n.toLocaleString()} matching tools`,loading:'Loading directory…'}
};
const $=id=>document.getElementById(id);
let language='zh-TW';try{if(localStorage.getItem('wasm-tools-lang')==='en')language='en';}catch{}
let catalog,category='all',limit=40;
const element=(tag,content,className)=>{const node=document.createElement(tag);if(content!==undefined)node.textContent=content;if(className)node.className=className;return node;};
function readURL(){const params=new URLSearchParams(location.search);$('search').value=(params.get('q')||'').slice(0,200);category=params.get('category')||'all';if(catalog&&!Object.hasOwn(catalog.categories,category))category='all';$('status').value=['all','unverified','blocked'].includes(params.get('status'))?params.get('status'):'all';limit=40;}
function saveURL(){const url=new URL(location.href);for(const [key,value] of Object.entries({q:$('search').value.trim(),category:category==='all'?'':category,status:$('status').value==='all'?'':$('status').value}))value?url.searchParams.set(key,value):url.searchParams.delete(key);history.replaceState(null,'',url);}
function renderCategories(){
 if(!catalog)return;const dict=copy[language],fragment=document.createDocumentFragment();
 for(const [key,label] of [['all',dict.all],...Object.entries(catalog.categories).map(([k,v])=>[k,v[language==='en'?1:0]])]){
  const button=element('button');button.type='button';button.dataset.category=key;button.setAttribute('aria-pressed',String(category===key));
  button.append(element('span',label),element('span',String(key==='all'?catalog.tools.length:catalog.tools.filter(t=>t.category===key).length),'count'));
  button.addEventListener('click',()=>{category=key;limit=40;saveURL();render();});fragment.append(button);
 }$('categories').replaceChildren(fragment);
}
function render(){
 if(!catalog)return;const dict=copy[language],words=$('search').value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),status=$('status').value;
 const matches=catalog.tools.filter(tool=>(category==='all'||tool.category===category)&&(status==='all'||tool.status===status)&&words.every(word=>`${tool.id} ${tool.name} ${tool.description} ${catalog.categories[tool.category].join(' ')}`.toLocaleLowerCase().includes(word)));
 const fragment=document.createDocumentFragment();
 for(const tool of matches.slice(0,limit)){
  const card=element('a',undefined,'tool-card');card.href='./'+tool.path;card.dataset.status=tool.status;
  const top=element('div',undefined,'card-top');top.append(element('span',tool.id,'tool-id'),element('span','↗','arrow'));
  const title=element('h3',tool.name),detail=element('p',tool.description||catalog.categories[tool.category][language==='en'?1:0],'card-description');
  const badges=element('div',undefined,'badges');badges.append(element('span',dict[tool.status==='blocked'?'unavailable':'unverified'],`badge ${tool.status}`));if(tool.network)badges.append(element('span',dict.network,'network-badge'));
  card.append(top,title,detail,badges);fragment.append(card);
 }
 $('results').replaceChildren(fragment);$('results').setAttribute('aria-busy','false');$('result-count').textContent=dict.results(matches.length);$('empty').hidden=matches.length>0;$('load-more').hidden=matches.length<=limit;renderCategories();
}
function translate(){document.documentElement.lang=language;for(const node of document.querySelectorAll('[data-copy]'))node.textContent=copy[language][node.dataset.copy];$('language').textContent=language==='en'?'繁中':'EN';$('language').setAttribute('aria-label',language==='en'?'切換為繁體中文':'Switch to English');$('result-count').textContent=copy[language].loading;render();}
async function load(){
 $('error').hidden=true;$('results').setAttribute('aria-busy','true');
 try{
  const response=await fetch(new URL('./tools.json',location.href));if(!response.ok)throw new Error('catalog unavailable');
  const data=await response.json();if(data.schemaVersion!==1||!Array.isArray(data.tools)||!data.categories)throw new Error('invalid catalog');
  for(const tool of data.tools)if(!/^src\/tools\/[a-z]+\/[A-Z]{3}-\d{3}\/index\.html$/.test(tool.path)||!Object.hasOwn(data.categories,tool.category))throw new Error('invalid route');
  catalog=data;$('total-count').textContent=data.tools.length.toLocaleString();$('blocked-count').textContent=data.tools.filter(t=>t.status==='blocked').length.toLocaleString();$('category-count').textContent=Object.keys(data.categories).length;readURL();render();
 }catch{$('error').hidden=false;$('result-count').textContent=copy[language].error;}finally{$('results').setAttribute('aria-busy','false');}
}
$('language').addEventListener('click',()=>{language=language==='en'?'zh-TW':'en';try{localStorage.setItem('wasm-tools-lang',language);}catch{}translate();});
$('search-form').addEventListener('submit',event=>{event.preventDefault();saveURL();render();});$('search').maxLength=200;
$('search').addEventListener('input',()=>{limit=40;saveURL();render();});$('status').addEventListener('change',()=>{limit=40;saveURL();render();});
$('clear').addEventListener('click',()=>{$('search').value='';limit=40;saveURL();render();$('search').focus();});
$('reset-filters').addEventListener('click',()=>{$('search').value='';$('status').value='all';category='all';limit=40;saveURL();render();});
$('load-more').addEventListener('click',()=>{limit+=40;render();});$('retry').addEventListener('click',load);window.addEventListener('popstate',()=>{readURL();render();});translate();load();
