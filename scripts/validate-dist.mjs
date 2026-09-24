import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parse } from 'parse5';
import { root, elements, attr, getTools } from './catalog.mjs';
const dist=path.join(root,'dist'),tools=getTools(),failures=[];
const pages=['index.html','catalog/index.html',...tools.map(t=>t.path)];
for(const route of pages){
 const file=path.join(dist,route);if(!fs.existsSync(file)){failures.push(`Missing emitted page: ${route}`);continue;}
 const nodes=elements(parse(fs.readFileSync(file,'utf8')));
 for(const node of nodes)for(const key of ['src','href']){
  const value=attr(node,key);if(!value||/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value))continue;
  if(value.startsWith('/')){failures.push(`${route}: origin-root URL ${value}`);continue;}
  const target=path.resolve(path.dirname(file),decodeURIComponent(value.split(/[?#]/)[0]));
  if(target!==dist&&!target.startsWith(dist+path.sep))failures.push(`${route}: escaping URL ${value}`);
  else if(!fs.existsSync(target))failures.push(`${route}: missing target ${value}`);
 }
 if(tools.find(t=>t.path===route)?.status==='blocked'){
  assert(nodes.some(n=>n.tagName==='meta'&&attr(n,'name')==='robots'&&attr(n,'content')==='noindex'),`${route}: blocked page must be noindex`);
  assert(!nodes.some(n=>['script','input','textarea','select','button'].includes(n.tagName)),`${route}: unavailable page accepts input or executes code`);
 }
}
const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');assert(!sitemap.includes('<lastmod>'),'Do not invent modification dates');
for(const tool of tools)assert.equal(sitemap.includes('/'+tool.path+'</loc>'),tool.status!=='blocked',`Sitemap mismatch: ${tool.key}`);
const report={pages:pages.length,toolPages:tools.length,unavailable:tools.filter(t=>t.status==='blocked').length,localLinkFailures:failures.length,failures};
fs.mkdirSync(path.join(root,'audit-results'),{recursive:true});fs.writeFileSync(path.join(root,'audit-results/dist.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));assert.equal(failures.length,0,'Emitted site has broken local routes or assets');
