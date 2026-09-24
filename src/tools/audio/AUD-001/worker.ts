import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
const ffmpeg = new FFmpeg();
let queue: Promise<void> = Promise.resolve();
let loaded = false;
let sequence = 0;
// Serialize access to the single virtual filesystem and command runner.
self.onmessage = (event: MessageEvent) => {
  const message = event.data;
  queue = queue.then(async () => {
    const { type, payload, id } = message;
    let inputName: string | undefined;
    let outputName: string | undefined;
    try {
      if (type === 'load') {
        const base = new URL(payload.coreBase);
        if (base.origin !== self.location.origin) throw new Error('FFmpeg assets must be same-origin.');
        if (!loaded) {
          await ffmpeg.load({ coreURL: new URL('ffmpeg-core.js', base).href, wasmURL: new URL('ffmpeg-core.wasm', base).href });
          loaded = true;
        }
        self.postMessage({ type: 'loaded' }); return;
      }
      if (type !== 'convert') throw new Error('Unknown operation.');
      if (!loaded) throw new Error('The audio engine is not ready.');
      const file = payload.file;
      if (!(file instanceof File) || !file.size || file.size > 100 * 1024 * 1024) throw new Error('Select a non-empty audio file up to 100 MB.');
      if (payload.outputFormat !== 'wav') throw new Error('Only WAV output is supported.');
      const token = ++sequence;
      inputName = `input-${token}.mp3`; outputName = `output-${token}.wav`;
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const exitCode = await ffmpeg.exec(['-y','-i',inputName,'-vn','-c:a','pcm_s16le',outputName],120000);
      if (exitCode !== 0) throw new Error(`Audio conversion failed (exit ${exitCode}).`);
      const data = await ffmpeg.readFile(outputName);
      if (!(data instanceof Uint8Array) || data.byteLength < 44) throw new Error('Invalid WAV output.');
      if (String.fromCharCode(...data.slice(0,4)) !== 'RIFF' || String.fromCharCode(...data.slice(8,12)) !== 'WAVE') throw new Error('The output is not a WAV file.');
      const buffer = Uint8Array.from(data).buffer;
      self.postMessage({type:'completed',id,payload:{buffer,filename:file.name.replace(/\.[^/.]+$/,'')+'.wav'}},{transfer:[buffer]});
    } catch (error: unknown) {
      self.postMessage({type:'error',id,payload:error instanceof Error?error.message:'Audio conversion failed.'});
    } finally {
      for (const name of [inputName,outputName]) if(name) { try { await ffmpeg.deleteFile(name); } catch {} }
    }
  });
};
