import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'parse5';
import { evaluateExpression } from '../src/utils/expression.js';
import { createSheetEvaluator,csvCell } from '../src/utils/spreadsheet.js';
import { root,getTools,elements,attr,text,relativeLinks,unavailablePage,classicScripts } from '../scripts/catalog.mjs';
for(const [input,expected] of [['1+2*3',7],['(1+2)*3',9],['-2^2',-4],['2^-2',0.25],['2^3^2',512],['sin(PI/2)',1],['asin(0.5)',Math.asin(.5)],['acos(0.5)',Math.acos(.5)],['atan(1)',Math.atan(1)],['log(100)',2],['ln(E)',1],['sqrt(9)+abs(-2)',5],['1e3 + .25',1000.25],['5%2',1],['2×3÷2',3]])test(`arithmetic ${input}`,()=>assert.equal(evaluateExpression(input),expected));
for(const input of ['', '1/0','sqrt(-1)','globalThis.alert(1)','constructor(1)','1; process.exit()','sin(1,2)','1 2','1+','1e999','('.repeat(100)+'1'+')'.repeat(100),'1'.repeat(4097)])test(`reject unsafe/invalid expression ${input.slice(0,40)}`,()=>assert.throws(()=>evaluateExpression(input)));
test('spreadsheet references, ranges and chains',()=>{const sheet=createSheetEvaluator({A1:'2',A2:'3',A3:'=A1+A2',B1:'=SUM(A1:A3)',B2:'=AVG(A1:A3)',B3:'=A3*B1',C1:'=1E3+A1'});assert.equal(sheet.cell('A3'),5);assert.equal(sheet.cell('B1'),10);assert.equal(sheet.cell('B2'),10/3);assert.equal(sheet.cell('B3'),50);assert.equal(sheet.cell('C1'),1002);});
test('spreadsheet refuses cycles, bad ranges and nonnumeric dependencies',()=>{for(const data of [{A1:'=A1'},{A1:'=B1',B1:'=A1'},{A1:'=SUM(A1:Z99999999)'},{A1:'=SUM(A3:A2)'},{A1:'=B1',B1:'hello'}])assert.throws(()=>createSheetEvaluator(data).cell('A1'));});
test('CSV escapes data and prevents active formulas',()=>{assert.equal(csvCell('a,"b"\nc'),'"a,""b""\nc"');assert.equal(csvCell('=1+2'),'"\'=1+2"');assert.equal(csvCell('-2'),'"-2"');});
test('catalog includes every page with category-scoped unique keys',()=>{const tools=getTools();assert.equal(tools.length,1186);assert.equal(new Set(tools.map(t=>t.key)).size,tools.length);assert.equal(new Set(tools.map(t=>t.path)).size,tools.length);assert.equal(tools.filter(t=>t.id==='CAL-126').length,2);assert(tools.some(t=>t.key==='crypto/CRY-071'&&t.status==='blocked'));assert(tools.some(t=>t.key==='image/IMG-008'&&t.status==='blocked'));for(const t of tools)assert(fs.existsSync(path.join(root,t.path)));});
test('root links become portable and retain complete query/fragment',()=>{assert.equal(relativeLinks('<a href="/index.html?q=x#section">home</a>','src/tools/image/IMG-001/index.html'),'<a href="../../../../index.html?q=x#section">home</a>');assert.equal(relativeLinks('<script src="//cdn.example/a.js"></script>','index.html'),'<script src="//cdn.example/a.js"></script>');});
test('unavailable page is escaped and fail-closed without application scripts',()=>{const html=unavailablePage({id:'TEST',name:'<script>alert(1)</script>',reasons:['<img src=x onerror=alert(1)>']});const nodes=elements(parse(html));assert(!nodes.some(n=>['script','input','textarea','button'].includes(n.tagName)));assert(html.includes('&lt;script&gt;'));});
test('all first-party JS and inline scripts parse; no dynamic eval constructors',()=>{
 let js=0,inline=0;
 function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(file.endsWith('.js')||file.endsWith('.mjs')){const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/\b(?:new\s+Function|eval)\s*\(/,file);new vm.SourceTextModule(source,{identifier:file});js++;}else if(file.endsWith('.html'))for(const node of elements(parse(fs.readFileSync(file,'utf8')))){if(node.tagName!=='script'||attr(node,'src')||['application/ld+json','application/json','importmap'].includes(attr(node,'type')))continue;const source=text(node);if(attr(node,'type')==='module')new vm.SourceTextModule(source,{identifier:file});else new vm.Script(source,{filename:file});inline++;}}}
 walk(path.join(root,'src'));walk(path.join(root,'scripts'));assert(js>1180);console.log(`Parsed ${js} JavaScript files and ${inline} inline scripts.`);
});
test('classic scripts remain parseable as classic scripts, not modules',()=>{let count=0;for(const [file,source] of classicScripts(getTools())){new vm.Script(source,{filename:file});count++;}assert(count>300);console.log(`Preserved ${count} classic scripts.`);});
