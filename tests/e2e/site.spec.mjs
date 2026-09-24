import { test,expect } from '@playwright/test';
import fs from 'node:fs/promises';
const prefix='/awesome-wasm-tools-1000/';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ZkAAAAASUVORK5CYII=','base64');
async function upload(page,name='sample.png'){await page.locator('#fileInput').setInputFiles({name,mimeType:'image/png',buffer:png});await expect(page.locator('#convertBtn')).toBeEnabled();}
for(const mount of ['/',prefix]){
 test(`directory searches and filters at ${mount}`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(mount);
  await expect(page.locator('.tool-card')).toHaveCount(40);await expect(page.locator('#total-count')).toHaveText('1,186');await expect(page.locator('#categories button')).toHaveCount(10);
  await page.locator('#search').fill('CRY-071');await expect(page.locator('.tool-card')).toHaveCount(1);await expect(page.locator('.tool-card')).toHaveAttribute('data-status','blocked');
  await page.locator('.tool-card').click();await expect(page.locator('[data-tool-status=blocked]')).toBeVisible();await expect(page.locator('input,button,textarea,script')).toHaveCount(0);
  await page.locator('.back-btn').click();await expect(page.locator('.tool-card')).toHaveCount(40);
  await page.locator('[data-category=text]').click();await page.locator('#search').fill('TXT-100');await expect(page.locator('.tool-card')).toHaveCount(1);
  await page.locator('#search').fill('no-such-tool-zzzz');await expect(page.locator('#empty')).toBeVisible();await page.locator('#reset-filters').click();await expect(page.locator('.tool-card')).toHaveCount(40);expect(errors).toEqual([]);
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
test('mobile directory has no horizontal document overflow and language works without storage',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage denied')}})});await page.goto(prefix);await expect(page.locator('.tool-card')).toHaveCount(40);await page.locator('#language').click();await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('h1')).toContainText('Less switching.');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'audit-results/catalog-mobile.png',fullPage:false});
});
test('desktop screenshot and every category filter',async({page})=>{
 await page.setViewportSize({width:1440,height:1080});await page.goto(prefix);await expect(page.locator('.tool-card')).toHaveCount(40);
 for(const category of ['image','audio','compress','crypto','text','pdf','encoding','calculator','calculation']){await page.locator(`[data-category=${category}]`).click();await expect(page.locator(`[data-category=${category}]`)).toHaveAttribute('aria-pressed','true');expect(await page.locator('.tool-card').count()).toBeGreaterThan(0);}await page.locator('[data-category=all]').click();await page.screenshot({path:'audit-results/catalog-desktop.png',fullPage:false});
});
test('static catalog stays navigable without JavaScript',async({browser})=>{const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('http://127.0.0.1:4173'+prefix+'catalog/index.html');await expect(page.locator('li a')).toHaveCount(1186);await page.locator('li a').first().click();expect(page.url()).toContain('/src/tools/image/IMG-001/');await context.close();});
test('directory handles fetch failure and retry',async({page})=>{let fail=true;await page.route('**/tools.json',route=>fail?route.fulfill({status:503,body:'Unavailable'}):route.continue());await page.goto(prefix);await expect(page.locator('#error')).toBeVisible();fail=false;await page.locator('#retry').click();await expect(page.locator('.tool-card')).toHaveCount(40);await expect(page.locator('#error')).toBeHidden();});
test('spreadsheet evaluates chains and rejects circular references',async({page})=>{await page.goto(prefix+'src/tools/calculation/CAL-126/index.html');await page.locator('#A1').fill('2');await page.locator('#A1').press('Enter');await page.locator('#A2').fill('3');await page.locator('#A2').press('Enter');await page.locator('#A3').fill('=SUM(A1:A2)');await page.locator('#A3').press('Enter');await expect(page.locator('#A3')).toHaveValue('5');await page.locator('#B1').fill('=A3*2');await page.locator('#B1').press('Enter');await expect(page.locator('#B1')).toHaveValue('10');await page.locator('#C1').fill('=C1');await page.locator('#C1').press('Enter');await expect(page.locator('#C1')).toHaveValue('#ERROR');});
test('sample page from every category has no startup JS error',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));for(const route of ['image/IMG-002','audio/AUD-002','compress/CMP-001','crypto/CRY-001','text/TXT-100','pdf/PDF-001','encoding/ENC-001','calculator/CAL-006','calculation/CAL-129']){await page.goto(prefix+'src/tools/'+route+'/index.html');await page.waitForTimeout(100);}expect(errors).toEqual([]);});
