import { defineConfig } from 'vite';
import path from 'node:path';
import { repairHomepageCopy } from './scripts/homepage.mjs';
import { root, getTools, writeCatalog, relativeLinks, unavailablePage, classicScripts } from './scripts/catalog.mjs';
export default defineConfig(() => {
  const tools = getTools(), byPath = new Map(tools.map(tool => [tool.path,tool]));
  return {
    root, base: './',
    plugins: [{
      name: 'tool-catalog-and-routes',
      buildStart() {
        writeCatalog();
        for(const [fileName,source] of classicScripts(tools)) this.emitFile({type:'asset',fileName,source});
      },
      configureServer() { writeCatalog(); },
      transformIndexHtml: {
        order: 'pre',
        handler(html,context) {
          const route=path.relative(root,context.filename).split(path.sep).join('/');
          const tool=byPath.get(route);
          if(route==='index.html')html=repairHomepageCopy(html,tools.length);
          if(tool?.status==='blocked')html=unavailablePage(tool);
          else if(tool)html=html.replace('</body>','<script type="module" src="/src/utils/tool-shell.js"></script></body>');
          return relativeLinks(html,route);
        }
      }
    }],
    build: {
      outDir:'dist',target:'es2022',
      rollupOptions: {input:{main:path.join(root,'index.html'),...Object.fromEntries(tools.map(t=>[t.key,path.join(root,t.path)]))},external:id=>/^https?:\/\//.test(id)}
    },
    worker:{format:'es'},server:{host:'127.0.0.1',port:3000},preview:{host:'127.0.0.1',port:4173}
  };
});
