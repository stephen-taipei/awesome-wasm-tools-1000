import { test,expect } from '@playwright/test';
import fs from 'node:fs/promises';
const prefix='/awesome-wasm-tools-1000/';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ZkAAAAASUVORK5CYII=','base64');
async function upload(page,name='sample.png'){await page.locator('#fileInput').setInputFiles({name,mimeType:'image/png',buffer:png});await expect(page.locator('#convertBtn')).toBeEnabled();}
for(const mount of ['/',prefix]){
 test(`original category homepage and child navigation at ${mount}`,async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(mount);
  await expect(page.locator('.tools-grid > .category')).toHaveCount(8);
  await expect(page.locator('.tool-card')).toHaveCount(160);
  await expect(page.locator('.header h1')).toHaveText('Awesome WASM Tools 1000');
  await expect(page.locator('.lang-btn')).toHaveCount(2);
  await expect(page.locator('#search,.sidebar,.hero,.masthead')).toHaveCount(0);
  await page.locator('a[href$="image/IMG-008/index.html"]').click();
  await expect(page.locator('[data-tool-status=blocked]')).toBeVisible();
  await expect(page.locator('input,button,textarea,script')).toHaveCount(0);
  await page.locator('.back-btn').click();
  await expect(page.locator('.tools-grid > .category')).toHaveCount(8);
  await expect(page.locator('.tool-card')).toHaveCount(160);
  await page.locator('a[href$="image/IMG-001/index.html"]').click();
  await expect(page.locator('#fileInput')).toBeAttached();
  expect(errors).toEqual([]);
 });
 test(`PNG conversion, download bytes and stale result clearing at ${mount}`,async({page})=>{
  await page.goto(mount+'src/tools/image/IMG-001/index.html');await upload(page);await page.locator('#convertBtn').click();await expect(page.locator('#downloadBtn')).toBeVisible();
  const promise=page.waitForEvent('download');await page.locator('#downloadBtn').click();const download=await promise;expect(download.suggestedFilename()).toBe('sample.jpg');const bytes=await fs.readFile(await download.path());expect([...bytes.subarray(0,3)]).toEqual([255,216,255]);
  await upload(page,'replacement.png');await expect(page.locator('#downloadBtn')).toBeHidden();expect(await page.evaluate(()=>window.converter.convertedBlob)).toBeNull();await page.locator('#resetBtn').click();await expect(page.locator('#convertBtn')).toBeDisabled();
 });
}
test('image reset cancels in-flight result and wrong MIME is rejected',async({page})=>{
 await page.goto(prefix+'src/tools/image/IMG-001/index.html');await upload(page);
 await page.evaluate(async()=>{const c=window.converter,original=c.loadImage.bind(c);c.loadImage=async f=>{await new Promise(r=>setTimeout(r,40));return original(f)};const pending=c.convert();c.reset();await pending;c.loadImage=original;});
 await expect(page.locator('#downloadBtn')).toBeHidden();expect(await page.evaluate(()=>window.converter.convertedBlob)).toBeNull();await upload(page);
 await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=function(callback){callback(new Blob(['not-jpeg'],{type:'image/png'}));}});await page.locator('#convertBtn').click();await expect(page.locator('#statusMessage')).toContainText('Unsupported encoder');await expect(page.locator('#downloadBtn')).toBeHidden();
});
test('corrupt files are rejected and object URLs are revoked on reset',async({page})=>{
 await page.addInitScript(()=>{window.liveUrls=new Set();const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{const u=create(blob);window.liveUrls.add(u);return u};URL.revokeObjectURL=u=>{window.liveUrls.delete(u);return revoke(u)};});
 await page.goto(prefix+'src/tools/image/IMG-001/index.html');await upload(page);await page.locator('#convertBtn').click();await expect(page.locator('#downloadBtn')).toBeVisible();await page.locator('#resetBtn').click();expect(await page.evaluate(()=>window.liveUrls.size)).toBe(0);
 await page.locator('#fileInput').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await expect(page.locator('#statusMessage')).toContainText('Cannot decode');await expect(page.locator('#convertBtn')).toBeDisabled();
});
test('original mobile homepage and language switch work without storage',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage denied')}})});
 await page.goto(prefix);
 await expect(page.locator('.lang-btn').first()).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('.header h1')).toHaveText('Awesome WASM Tools 1000');
 await expect(page.locator('.subtitle')).toContainText('Browser utilities');
 await expect(page.locator('[data-i18n=footer_privacy]')).toContainText('not guaranteed');
 await page.getByRole('button',{name:'繁中',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','zh-TW');
 await expect(page.locator('.subtitle')).toContainText('瀏覽器工具集合');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('all original category groups retain twenty links and their order',async({page})=>{
 await page.goto(prefix);
 const categories=page.locator('.tools-grid > .category');
 const keys=['cat_image','cat_audio','cat_compress','cat_crypto','cat_text','cat_pdf','cat_encoding','cat_calculator'];
 for(const [index,key] of keys.entries()){
  await expect(categories.nth(index).locator('h2')).toHaveAttribute('data-i18n',key);
  await expect(categories.nth(index).locator('.tool-card')).toHaveCount(20);
 }
 await expect(page.locator('.tool-card h3').first()).toHaveText('IMG-001');
 await expect(page.locator('.tool-card h3').last()).toHaveText('CAL-130');
});
test('static catalog stays navigable without JavaScript',async({browser})=>{const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('http://127.0.0.1:4173'+prefix+'catalog/index.html');await expect(page.locator('li a')).toHaveCount(1186);await page.locator('li a').first().click();expect(page.url()).toContain('/src/tools/image/IMG-001/');await context.close();});
test('homepage does not depend on catalog fetch or restore misleading offline claims',async({page})=>{
 let requests=0;
 await page.route('**/tools.json',route=>{requests++;return route.fulfill({status:503,body:'Unavailable'});});
 await page.goto(prefix);
 await expect(page.locator('.lang-btn').first()).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.tool-card')).toHaveCount(160);
 await expect(page.locator('.footer strong')).toHaveText('1186');
 await expect(page.locator('body')).not.toContainText('已完成 1176');
 expect(requests).toBe(0);
 const description=await page.locator('meta[name=description]').getAttribute('content');
 expect(description).toContain('not guaranteed');
 const json=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
 expect(json['@graph'].find(item=>item['@type']==='FAQPage').mainEntity[0].acceptedAnswer.text).toContain('JavaScript');
});
test('spreadsheet evaluates chains and rejects circular references',async({page})=>{await page.goto(prefix+'src/tools/calculation/CAL-126/index.html');await page.locator('#A1').fill('2');await page.locator('#A1').press('Enter');await page.locator('#A2').fill('3');await page.locator('#A2').press('Enter');await page.locator('#A3').fill('=SUM(A1:A2)');await page.locator('#A3').press('Enter');await expect(page.locator('#A3')).toHaveValue('5');await page.locator('#B1').fill('=A3*2');await page.locator('#B1').press('Enter');await expect(page.locator('#B1')).toHaveValue('10');await page.locator('#C1').fill('=C1');await page.locator('#C1').press('Enter');await expect(page.locator('#C1')).toHaveValue('#ERROR');});
test('sample page from every category has no startup JS error',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));for(const route of ['image/IMG-002','audio/AUD-002','compress/CMP-001','crypto/CRY-001','text/TXT-100','pdf/PDF-001','encoding/ENC-001','calculator/CAL-006','calculation/CAL-129']){await page.goto(prefix+'src/tools/'+route+'/index.html');await page.waitForTimeout(100);}expect(errors).toEqual([]);});
test('original category homepage is navigable without JavaScript at both mounts',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});
 const page=await context.newPage();
 for(const mount of ['/',prefix]){
  await page.goto('http://127.0.0.1:4173'+mount);
  await expect(page.locator('.tools-grid > .category')).toHaveCount(8);
  await expect(page.locator('.tool-card')).toHaveCount(160);
  await expect(page.locator('.footer strong')).toHaveText('1186');
  await expect(page.locator('.subtitle')).toContainText('部分功能使用外部套件');
  await page.locator('a[href$="image/IMG-008/index.html"]').click();
  await expect(page.locator('[data-tool-status=blocked]')).toBeVisible();
  await page.locator('.back-btn').click();
  await expect(page.locator('.tool-card')).toHaveCount(160);
 }
 await context.close();
});
