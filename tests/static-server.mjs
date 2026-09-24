import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist'),prefix='/awesome-wasm-tools-1000/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain'};
http.createServer((request,response)=>{try{let pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);if(pathname.startsWith(prefix))pathname=pathname.slice(prefix.length);let file=path.resolve(root,'.'+(pathname.startsWith('/')?pathname:'/'+pathname));if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){response.writeHead(404).end('Not found');return;}response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(response);}catch{response.writeHead(400).end('Bad request');}}).listen(4173,'127.0.0.1');
