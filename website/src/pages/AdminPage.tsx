import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Shield, Upload, CheckCircle, XCircle, AlertTriangle, Cpu, Zap, Download } from 'lucide-react';
import { modelApi } from '../services/api';
import { useStore } from '../store';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { user } = useStore();
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [modelInfo, setModelInfo] = useState<any>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => setModelFile(accepted[0] || null),
    accept: { 'application/octet-stream': ['.pth', '.pt'] },
    maxFiles: 1,
  });

  const uploadModel = async () => {
    if (!modelFile) {
      toast.error('Select a model file first');
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const { data } = await modelApi.upload(modelFile);
      setUploadResult(data);
      toast.success(`Model ${data.version} uploaded and hot-swapped!`);
      fetchHistory();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Upload failed';
      toast.error(msg);
      setUploadResult({ error: msg });
    } finally {
      setUploading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const [histRes, infoRes] = await Promise.all([
        modelApi.history(),
        modelApi.info(),
      ]);
      setHistory(histRes.data.versions || []);
      setModelInfo(infoRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to fetch history');
    } finally {
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchHistory();
    }
  }, [user]);

  const downloadCurrentModel = async () => {
    try {
      toast.loading('Starting download...', { id: 'download' });
      await modelApi.download('current');
      toast.success('Download started!', { id: 'download' });
    } catch (err) {
      toast.error('Failed to download model', { id: 'download' });
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="w-12 h-12 text-gray-600" />
        <p className="text-gray-500 font-medium">Admin access required</p>
        <p className="text-gray-600 text-sm">Your account role: {user?.role || 'user'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-amber-500/20 rounded-xl border border-amber-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm mt-0.5">Model management and hot-swap</p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-6">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            Model uploads take effect immediately without server restart.
            Ensure the model is validated before uploading to production.
          </p>
        </div>



        {/* Current model info */}
        {modelInfo && (
          <div className="glass p-6 mb-6 border border-primary-500/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary-400" />
                Current Model
              </h2>
              <button onClick={downloadCurrentModel}
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 border-primary-500/30 hover:border-primary-500/60">
                <Download className="w-3.5 h-3.5 text-primary-400" />
                Download .pth
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Version', value: modelInfo.version },
                { label: 'Accuracy', value: `${(modelInfo.accuracy_field * 100).toFixed(1)}%` },
                { label: 'Total Scans', value: modelInfo.total_scans },
                { label: 'Uploaded', value: modelInfo.uploaded_at === 'initial' ? 'Pre-loaded' : new Date(modelInfo.uploaded_at).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className="font-bold text-white text-sm">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model Upload */}
        <div className="glass p-6 mb-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary-400" />
            Upload New Model
          </h2>

          <div {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer mb-4 transition-all
              ${isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-primary-500/50'}`}>
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            {modelFile ? (
              <div>
                <p className="text-white font-semibold">{modelFile.name}</p>
                <p className="text-gray-500 text-sm mt-1">{(modelFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-400">Drop your <code className="text-primary-400">.pth</code> file here</p>
                <p className="text-gray-600 text-sm mt-1">CBAM_False_SUPCON_False_..._best_test.pth</p>
              </div>
            )}
          </div>

          <button onClick={uploadModel} disabled={!modelFile || uploading}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading & Validating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Upload & Hot-Swap Model
              </>
            )}
          </button>

          {/* Upload result */}
          {uploadResult && (
            <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 
              ${uploadResult.error
                ? 'bg-red-500/10 border border-red-500/20'
                : 'bg-primary-500/10 border border-primary-500/20'}`}>
              {uploadResult.error
                ? <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                : <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className={`font-semibold text-sm ${uploadResult.error ? 'text-red-400' : 'text-primary-400'}`}>
                  {uploadResult.error ? 'Upload Failed' : 'Model Updated Successfully'}
                </p>
                {uploadResult.version && (
                  <p className="text-gray-400 text-xs mt-1">
                    New version: <code>{uploadResult.version}</code> ·
                    Previous: <code>{uploadResult.previous_version}</code>
                  </p>
                )}
                {uploadResult.error && (
                  <p className="text-gray-400 text-xs mt-1">{uploadResult.error}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Version history */}
        {history.length > 0 && (
          <div className="glass p-6">
            <h2 className="font-bold text-white mb-4">Version History</h2>
            <div className="space-y-2">
              {history.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div>
                    <code className="text-primary-400 font-mono text-sm">{v.version || v}</code>
                    {i === 0 && <span className="ml-2 badge badge-healthy text-xs">current</span>}
                  </div>
                  <span className="text-xs text-gray-500">{v.uploaded_at ? new Date(v.uploaded_at).toLocaleString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
