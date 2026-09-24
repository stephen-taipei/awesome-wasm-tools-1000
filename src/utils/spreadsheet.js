import { evaluateExpression } from './expression.js';
const cellPattern = /^[A-J](?:[1-9]|1[0-9]|20)$/;
export function createSheetEvaluator(data) {
  const cache = new Map(), visiting = new Set();
  function cell(id) {
    if (!cellPattern.test(id)) throw new Error('Cell is outside A1:J20.');
    if (cache.has(id)) return cache.get(id);
    if (visiting.has(id)) throw new Error('Circular cell reference.');
    const raw = String(data[id] ?? '').trim();
    visiting.add(id);
    try {
      const value = raw.startsWith('=') ? formula(raw.slice(1)) : raw === '' ? 0 : Number(raw);
      if (!Number.isFinite(value)) throw new Error('Cell is not numeric.');
      cache.set(id,value); return value;
    } finally { visiting.delete(id); }
  }
  function range(start,end) {
    if (!cellPattern.test(start) || !cellPattern.test(end)) throw new Error('Range is outside A1:J20.');
    const c1=start.charCodeAt(0), c2=end.charCodeAt(0), r1=Number(start.slice(1)), r2=Number(end.slice(1));
    if(c2<c1 || r2<r1) throw new Error('Reversed range.');
    const values=[];
    for(let c=c1;c<=c2;c++) for(let r=r1;r<=r2;r++) values.push(cell(String.fromCharCode(c)+r));
    return values;
  }
  function formula(input) {
    if(input.length>4096) throw new Error('Formula is too long.');
    let source=input.toUpperCase().replace(/(SUM|AVG|MIN|MAX)\(\s*([A-Z]\d+)\s*:\s*([A-Z]\d+)\s*\)/g, (_,kind,start,end)=>{
      const values=range(start,end), sum=values.reduce((a,b)=>a+b,0);
      const result=kind==='SUM'?sum:kind==='AVG'?sum/values.length:kind==='MIN'?Math.min(...values):Math.max(...values);
      if(!Number.isFinite(result)) throw new Error('Range result is not finite.');
      return `(${result})`;
    });
    source=source.replace(/\b[A-Z]\d+\b/g,id=>`(${cell(id)})`);
    return evaluateExpression(source);
  }
  return { cell, formula };
}
export function csvCell(value) {
  let text = String(value);
  if (/^[\s]*[=+@-]/.test(text) && !/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(text.trim())) text = "'" + text;
  return '"' + text.replace(/"/g,'""') + '"';
}
