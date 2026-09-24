import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'parse5';
import { elements, attr, text, getTools, relativeLinks } from '../scripts/catalog.mjs';
import { repairHomepageCopy } from '../scripts/homepage.mjs';
import { siteCopy } from '../src/i18n/site-copy.js';
const original = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url));
const blob = value => { const data=Buffer.from(value); return createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex'); };
const bodyShape = html => {
  const body = elements(parse(html)).find(node => node.tagName === 'body');
  return elements(body).map(node => [node.tagName, node.attrs]);
};
test('category-home template and stylesheet match the pre-audit design byte for byte', () => {
  assert.equal(blob(original), '0da4c3874734bc619d42826ef012ac66647ddd8d');
  assert.equal(blob(css), '1722a64031aa173f41f5762c13557c58cb904460');
  assert(!fs.existsSync(new URL('../src/catalog/main.js', import.meta.url)));
  assert(!fs.existsSync(new URL('../src/catalog/catalog.css', import.meta.url)));
});
test('factual copy repairs preserve every body element, class and navigation attribute', () => {
  const repaired = repairHomepageCopy(original, getTools().length);
  assert.deepEqual(bodyShape(repaired), bodyShape(original));
  const nodes=elements(parse(repaired));
  assert.equal(nodes.filter(n => attr(n, 'class')==='category').length, 8);
  assert.equal(nodes.filter(n => attr(n, 'class')==='tool-card').length, 160);
  assert.match(repaired, /<strong>1186<\/strong>/);
  assert.doesNotMatch(repaired, /1176|fully offline|已完成/);
  assert.doesNotMatch(repaired, /src\/catalog|tool-safety\.css/);
});
test('server-rendered homepage copy and JSON-LD agree with the Chinese locale', () => {
  const html=repairHomepageCopy(original,1186),nodes=elements(parse(html));
  for(const [key,copy] of Object.entries(siteCopy['zh-TW'])) {
    assert.equal(text(nodes.find(n => attr(n,'data-i18n')===key)),copy);
  }
  const data=JSON.parse(text(nodes.find(n => attr(n,'type')==='application/ld+json')));
  const faq=data['@graph'].find(item => item['@type']==='FAQPage');
  for (const [index, question] of faq.mainEntity.entries()) assert.equal(question.acceptedAnswer.text,siteCopy['zh-TW'][`faq_a${index+1}`]);
  const output=relativeLinks(html,'index.html');
  assert(output.includes('href="./src/tools/image/IMG-001/index.html"'));
  assert(output.includes('href="./llms.txt"'));
});
test('copy repair is idempotent and rejects invalid counts', () => {
  const html=repairHomepageCopy(original,1186);
  assert.equal(repairHomepageCopy(html,1186),html);
  for(const value of [-1,Infinity,NaN,'1186',1.5]) assert.throws(()=>repairHomepageCopy(original,value),TypeError);
});
