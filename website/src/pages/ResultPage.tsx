import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, CheckCircle, Scan, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import { useState } from 'react';
import { API_BASE } from '../services/api';

const diseaseColors: Record<string, string> = {
  Healthy: '#10b981',
  Early_Blight: '#f59e0b',
  Late_Blight: '#ef4444',
  Leaf_Mold: '#8b5cf6',
  Septoria: '#f97316',
  TYLCV: '#ec4899',
};

const diseaseInfo: Record<string, { severity: string; cause: string }> = {
  Healthy: { severity: 'None', cause: 'Plant is in excellent health' },
  Early_Blight: { severity: 'Medium', cause: 'Alternaria solani fungus — warm, humid conditions' },
  Late_Blight: { severity: 'High', cause: 'Phytophthora infestans — cool, wet conditions' },
  Leaf_Mold: { severity: 'Medium', cause: 'Passalora fulva — high humidity greenhouses' },
  Septoria: { severity: 'Medium', cause: 'Septoria lycopersici — wet, splashing soil' },
  TYLCV: { severity: 'Critical', cause: 'Tomato Yellow Leaf Curl Virus — whitefly vectors' },
};

export default function ResultPage() {
  const { latestResult } = useStore();
  const navigate = useNavigate();
  const [showGradcam, setShowGradcam] = useState(true);

  if (!latestResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Scan className="w-12 h-12 text-gray-600" />
        <p className="text-gray-500">No result found. Scan a leaf first.</p>
        <button onClick={() => navigate('/scan')} className="btn-primary">Go to Scan</button>
      </div>
    );
  }

  const { disease, confidence, confidence_calibrated, gradcam_url, severity, recommendations, is_reliable, warning, image_uri } = latestResult;
  const color = diseaseColors[disease] || '#6b7280';
  const info = diseaseInfo[disease] || { cause: 'Unknown' };
  const confPct = (confidence * 100).toFixed(1);
  const calPct = (confidence_calibrated * 100).toFixed(1);
  const isHealthy = disease === 'Healthy';

  const gradcamSrc = gradcam_url?.startsWith('http') ? gradcam_url : gradcam_url ? `${API_BASE}${gradcam_url}` : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button onClick={() => navigate('/scan')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> New Scan
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Image + GradCAM */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <div className="glass overflow-hidden">
            {/* Image toggle */}
            {(image_uri || gradcamSrc) && (
              <div className="relative aspect-square bg-dark-800">
                <img
                  src={showGradcam && gradcamSrc ? gradcamSrc : image_uri || gradcamSrc || ''}
                  alt={showGradcam ? 'GradCAM heatmap' : 'Original leaf'}
                  className="w-full h-full object-contain"
                />
                {gradcamSrc && image_uri && (
                  <button onClick={() => setShowGradcam(!showGradcam)}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 
                             bg-dark-900/80 backdrop-blur-sm rounded-lg text-xs text-gray-300 
                             hover:text-white transition-colors border border-white/10">
                    {showGradcam ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showGradcam ? 'Original' : 'GradCAM'}
                  </button>
                )}
                {showGradcam && gradcamSrc && (
                  <div className="absolute bottom-3 left-3 px-2 py-1 bg-dark-900/80 rounded-lg text-xs text-primary-400 border border-primary-500/30">
                    🔥 GradCAM Active — disease region highlighted
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right: Result details */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4">
          {/* Disease name card */}
          <div className="glass p-6" style={{ borderColor: `${color}30` }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">Diagnosis</div>
                <h2 className="text-3xl font-black text-white">{disease.replace(/_/g, ' ')}</h2>
              </div>
              <div className={`p-3 rounded-xl`} style={{ background: `${color}20` }}>
                {isHealthy 
                  ? <CheckCircle className="w-8 h-8" style={{ color }} />
                  : <AlertTriangle className="w-8 h-8" style={{ color }} />
                }
              </div>
            </div>

            {/* Severity + Cause */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Severity</div>
                <div className="font-bold text-sm" style={{ color }}>{severity || 'Unknown'}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <div className="font-bold text-sm text-white">{is_reliable ? 'Reliable' : 'Low Confidence'}</div>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">{info.cause}</p>

            {warning && (
              <div className="mt-3 flex gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">{warning}</p>
              </div>
            )}
          </div>

          {/* Confidence bars */}
          <div className="glass p-5">
            <h3 className="font-bold text-white text-sm mb-4">AI Confidence Score</h3>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">Match Probability</span>
                <span className="font-bold text-white">{parseFloat(confPct)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${parseFloat(confPct)}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recommendations */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="mt-6 glass p-6">
        <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
          💊 Treatment Recommendations
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
              <ChevronRight className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-300">{rec}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="mt-6 flex gap-3">
        <button onClick={() => navigate('/scan')} className="btn-secondary flex-1">
          Scan Another Leaf
        </button>
        <button onClick={() => navigate('/history')} className="btn-primary flex-1">
          View History
        </button>
      </motion.div>
    </div>
  );
}
