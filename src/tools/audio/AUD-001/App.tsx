import { useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import type { ConversionStatus } from './types';
export default function App() {
  const [file,setFile]=useState<File|null>(null),[status,setStatus]=useState<ConversionStatus>('idle');
  const [ready,setReady]=useState(false),[message,setMessage]=useState('Loading audio engine…');
  const worker=useRef<Worker|null>(null),request=useRef(0),busy=useRef(false);
  useEffect(()=>{
    const instance=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});worker.current=instance;
    instance.onmessage=event=>{
      const {type,payload,id}=event.data;if(id!==undefined&&id!==request.current)return;
      if(type==='loaded'){setReady(true);setMessage('Audio engine ready · maximum input 100 MB');}
      else if(type==='completed'){busy.current=false;setStatus('completed');setMessage('Conversion complete. Download started.');saveAs(new Blob([payload.buffer],{type:'audio/wav'}),payload.filename);}
      else if(type==='error'){busy.current=false;setStatus('error');setMessage(String(payload));}
    };
    instance.onerror=()=>{busy.current=false;setReady(false);setStatus('error');setMessage('Audio engine failed. Reload this page to retry.');};
    instance.postMessage({type:'load',payload:{coreBase:new URL('../../../../ffmpeg/',location.href).href}});
    return()=>{request.current++;busy.current=false;instance.terminate();worker.current=null;};
  },[]);
  function selectFile(selected:File|undefined){
    if(!selected||busy.current)return;
    if(!selected.size||selected.size>100*1024*1024){setStatus('error');setMessage('Select a non-empty MP3 file up to 100 MB.');return;}
    request.current++;setFile(selected);setStatus('idle');setMessage(ready?'Audio engine ready':'Loading audio engine…');
  }
  function convert(){
    if(!file||!ready||busy.current||!worker.current)return;
    busy.current=true;setStatus('converting');setMessage('Converting audio…');
    worker.current.postMessage({type:'convert',id:++request.current,payload:{file,outputFormat:'wav'}});
  }
  return <main className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
    <section className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-8 space-y-6">
      <a href="../../../../index.html" className="text-indigo-700 underline">← Tool directory</a>
      <header><p className="text-sm text-indigo-700">AUDIO / AUD-001</p><h1 className="text-3xl font-bold my-3">MP3 to WAV</h1><p>Decode MP3 to WAV locally. This does not restore quality lost in MP3 encoding.</p></header>
      <p className="text-sm">Keep your original file. This tool has not been tested against every format or input.</p>
      <label className="block border-2 border-dashed rounded-xl p-6">Select MP3 file
        <input type="file" aria-label="Select MP3 file" accept="audio/mp3,audio/mpeg" disabled={status==='converting'} onChange={e=>selectFile(e.target.files?.[0])} className="block mt-3 max-w-full"/>
      </label>
      {file&&<p className="break-all">{file.name} · {(file.size/1024/1024).toFixed(2)} MB</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!file||!ready||status==='converting'} onClick={convert} className="bg-indigo-600 text-white px-6 py-3 rounded-lg disabled:opacity-50">{status==='converting'?'Converting…':ready?'Start Conversion':'Loading audio engine…'}</button>
        <button type="button" disabled={status==='converting'} onClick={()=>{request.current++;setFile(null);setStatus('idle');}} className="border px-6 py-3 rounded-lg">Clear selection</button>
      </div>
      <p role="status" aria-live="polite" className={status==='error'?'text-red-700':'text-gray-700'}>{message}</p>
    </section>
  </main>;
}
