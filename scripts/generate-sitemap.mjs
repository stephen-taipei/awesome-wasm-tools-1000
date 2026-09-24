import fs from 'node:fs';
import path from 'node:path';
import { root, writeCatalog, escapeHtml } from './catalog.mjs';
const site=new URL(process.env.SITE_URL||process.env.VITE_SITE_URL||'https://stephen-taipei.github.io/awesome-wasm-tools-1000/');
if(!['http:','https:'].includes(site.protocol)||site.username||site.password||site.search||site.hash)throw new Error('SITE_URL must be an HTTP(S) deployment URL without credentials, query or fragment.');
site.pathname=site.pathname.replace(/\/$/,'')+'/';
const tools=writeCatalog();
const routes=['','catalog/index.html',...tools.filter(t=>t.status!=='blocked').map(t=>t.path)];
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route=>`  <url><loc>${escapeHtml(new URL(route,site).href)}</loc></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root,'public/sitemap.xml'),xml);
// Preserve the old URL as an ordinary sitemap, not a Google News feed.
fs.writeFileSync(path.join(root,'public/news-sitemap.xml'),xml);
fs.writeFileSync(path.join(root,'public/robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml',site).href}\n`);
console.log(`Generated sitemap: ${routes.length} URLs; ${tools.length-routes.length+2} unavailable tools excluded.`);
