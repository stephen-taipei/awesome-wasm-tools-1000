import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileAudio, ArrowRight, Download, RefreshCw, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { ConversionStatus } from './types';

const App: React.FC = () => {
    const [status, setStatus] = useState<ConversionStatus>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState<string>('');
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        workerRef.current = new Worker(new URL('./worker.ts', import.meta.url), {
            type: 'module'
        });

        workerRef.current.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'loaded') {
                console.log('FFmpeg loaded');
            } else if (type === 'completed') {
                setStatus('completed');
                const blob = new Blob([payload.buffer], { type: 'audio/wav' });
                saveAs(blob, payload.filename);
            } else if (type === 'error') {
                setStatus('error');
                setProgress(`Error: ${payload}`);
            }
        };

        workerRef.current.postMessage({ type: 'load' });

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
        }
    };

    const handleConvert = () => {
        if (!file || !workerRef.current) return;
        setStatus('converting');
        workerRef.current.postMessage({
            type: 'convert',
            payload: {
                file,
                outputFormat: 'wav'
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="bg-indigo-600 p-6 text-white text-center">
                    <h1 className="text-3xl font-bold mb-2">AUD-001 MP3 to WAV</h1>
                    <p className="opacity-90">Convert MP3 audio to lossless WAV format efficiently offline.</p>
                </div>

                <div className="p-8 space-y-8">
                    {!file ? (
                        <div className="border-3 border-dashed border-gray-300 rounded-xl p-12 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                             <input
                                type="file"
                                onChange={handleFileChange}
                                accept="audio/mp3,audio/mpeg"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="bg-indigo-100 text-indigo-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload size={32} />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">Upload MP3 File</h3>
                            <p className="text-gray-500">Drag & drop or click to browse</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-gray-100 p-4 rounded-lg">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-orange-100 text-orange-600 p-3 rounded-lg">
                                        <FileAudio size={24} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{file.name}</p>
                                        <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFile(null)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex items-center justify-center space-x-4 text-gray-400">
                                <span>MP3</span>
                                <ArrowRight size={20} />
                                <span>WAV</span>
                            </div>

                            <button
                                onClick={handleConvert}
                                disabled={status === 'converting'}
                                className={`w-full py-4 rounded-xl text-lg font-semibold flex items-center justify-center space-x-2 transition-all ${
                                    status === 'converting'
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'
                                }`}
                            >
                                {status === 'converting' ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        <span>Converting...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw />
                                        <span>Start Conversion</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {status === 'completed' && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center justify-center space-x-2 animate-fade-in">
                            <Download size={20} />
                            <span>Conversion Complete! Download started automatically.</span>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center animate-fade-in">
                            {progress || 'An error occurred during conversion.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
