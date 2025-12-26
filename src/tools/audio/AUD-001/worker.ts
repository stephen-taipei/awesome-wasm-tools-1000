import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  try {
    if (type === "load") {
      await ffmpeg.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm",
      });
      self.postMessage({ type: "loaded" });
    } else if (type === "convert") {
      const { file, outputFormat } = payload;
      const inputName = "input." + file.name.split(".").pop();
      const outputName = "output." + outputFormat;

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Simple conversion
      await ffmpeg.exec(["-i", inputName, outputName]);

      const data = await ffmpeg.readFile(outputName);
      self.postMessage({
        type: "completed",
        payload: {
          buffer: data,
          filename: file.name.replace(/\.[^/.]+$/, "") + "." + outputFormat,
        },
      });

      // Cleanup
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    }
  } catch (error: any) {
    self.postMessage({ type: "error", payload: error.message });
  }
};
