import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, X, Leaf, AlertCircle, Zap } from 'lucide-react';
import { predictApi } from '../services/api';
import { useStore } from '../store';
import toast from 'react-hot-toast';

export default function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { setLatestResult } = useStore();
  const navigate = useNavigate();

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const clearFile = () => { setFile(null); setPreview(null); };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setProgress(0);
    // Animate progress bar
    const interval = setInterval(() => setProgress(p => Math.min(p + 8, 85)), 200);
    try {
      const { data } = await predictApi.predict(file);
      clearInterval(interval);
      setProgress(100);
      setLatestResult(data, preview || undefined);
      toast.success('Analysis complete!');
      setTimeout(() => navigate('/result'), 300);
    } catch (err: any) {
      clearInterval(interval);
      setProgress(0);
      const msg = err?.response?.data?.detail || 'Analysis failed — is the backend running?';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Scan Leaf</h1>
          <p className="text-gray-400 mt-1">Upload a tomato leaf photo to detect diseases instantly</p>
        </div>

        {/* Tips */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { tip: 'Good lighting', desc: 'Natural light preferred' },
            { tip: 'Close-up shot', desc: 'Fill 70% of frame' },
            { tip: 'Single leaf', desc: 'One leaf per scan' },
          ].map(({ tip, desc }) => (
            <div key={tip} className="glass p-3 text-center">
              <div className="text-primary-400 font-semibold text-xs">{tip}</div>
              <div className="text-gray-500 text-xs mt-0.5">{desc}</div>
            </div>
          ))}
        </div>

        {/* Drop zone / Preview */}
        <AnimatePresence mode="wait">
          {!preview ? (
            <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div {...getRootProps()}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
                          transition-all duration-300 group
                          ${isDragActive 
                            ? 'border-primary-500 bg-primary-500/10' 
                            : 'border-white/10 hover:border-primary-500/50 hover:bg-white/3'}`}>
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
                                ${isDragActive ? 'bg-primary-500/30 scale-110' : 'bg-white/5 group-hover:bg-primary-500/20'}`}>
                    {isDragActive 
                      ? <Leaf className="w-10 h-10 text-primary-400 animate-bounce" />
                      : <Upload className="w-10 h-10 text-gray-500 group-hover:text-primary-400 transition-colors" />
                    }
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg mb-1">
                      {isDragActive ? 'Drop the leaf here!' : 'Drop your leaf photo here'}
                    </p>
                    <p className="text-gray-500 text-sm">or <span className="text-primary-400">browse files</span></p>
                    <p className="text-gray-600 text-xs mt-2">JPG, PNG, WebP · Max 20MB</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                <img src={preview} alt="Leaf preview" className="w-full object-contain max-h-80 bg-dark-800" />
                <button onClick={clearFile}
                  className="absolute top-3 right-3 w-8 h-8 bg-dark-900/80 backdrop-blur-sm rounded-lg 
                           flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/20 transition-all">
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark-900/90 to-transparent p-4">
                  <p className="text-white text-sm font-medium truncate">{file?.name}</p>
                  <p className="text-gray-400 text-xs">{((file?.size || 0) / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        {loading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                Analyzing with AI...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>
          </div>
        )}

        {/* Analyze button */}
        <div className="mt-6 flex gap-3">
          {preview && (
            <button onClick={clearFile} className="btn-secondary flex items-center gap-2 flex-1">
              <Camera className="w-4 h-4" />
              Use Different Photo
            </button>
          )}
          <button onClick={analyze} disabled={!file || loading}
            className="btn-primary flex items-center justify-center gap-2 flex-1">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {preview ? 'Analyze Leaf' : 'Select Photo First'}
              </>
            )}
          </button>
        </div>

        {/* Info note */}
        <div className="mt-6 flex gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-400">
            For best results, photograph a single leaf in good natural lighting. 
            The AI works best with photos showing the full leaf surface clearly.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
