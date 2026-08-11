import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, CheckCircle, Scan, ChevronRight, Eye, EyeOff, Users, Bug, Shield, Pill, Droplet, Leaf, Sparkles } from 'lucide-react';
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

  const { disease, confidence, gradcam_url, severity, recommendations, is_reliable, warning, image_uri } = latestResult;
  const { cause, prevention, remedy, rag_summary, remedy_natural, remedy_chemical } = latestResult as any;
  const color = diseaseColors[disease] || '#6b7280';
  const info = diseaseInfo[disease] || { cause: 'Unknown' };
  const confPct = (confidence * 100).toFixed(1);
  const isHealthy = disease === 'Healthy';

  const gradcamSrc = gradcam_url?.startsWith('http') ? gradcam_url : gradcam_url ? `${API_BASE}${gradcam_url}` : null;

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
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

      {/* Recommendations - Enhanced with icons and better layout */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="mt-6 glass p-6 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-primary-500/20 border border-primary-500/30">
              <Pill className="w-5 h-5 text-primary-400" />
            </div>
            <h3 className="font-bold text-white text-lg">Quick Action Items</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + (i * 0.05) }}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/3 hover:bg-white/5 border border-white/5 hover:border-primary-500/20 transition-all duration-300 group"
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-primary-500/20 group-hover:bg-primary-500/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-primary-400" />
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{rec}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* RAG Synthesis: separate boxes for Cause, Prevention, Remedy with enhanced visuals */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">

        {/* Cause - with gradient and icon */}
        <div className="glass p-6 min-h-[280px] relative overflow-hidden group hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30">
                <Bug className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-bold text-white text-lg">Cause & Symptoms</h3>
            </div>
            
            {cause ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-200 leading-relaxed">{cause}</p>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    <span>AI-generated from agricultural research</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bug className="w-12 h-12 text-gray-600 mb-3 opacity-50" />
                <div className="text-sm text-gray-400">No cause information available.</div>
              </div>
            )}
          </div>
        </div>

        {/* Prevention - with gradient and icon */}
        <div className="glass p-6 min-h-[280px] relative overflow-hidden group hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-green-500/20 border border-green-500/30">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-bold text-white text-lg">Prevention Tips</h3>
            </div>
            
            {prevention ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-200 leading-relaxed">{prevention}</p>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Sparkles className="w-3.5 h-3.5 text-green-400" />
                    <span>Evidence-based recommendations</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="w-12 h-12 text-gray-600 mb-3 opacity-50" />
                <div className="text-sm text-gray-400">No prevention tips available.</div>
              </div>
            )}
          </div>
        </div>

        {/* Remedy: Natural + Chemical - with gradient and icons */}
        <div className="glass p-6 min-h-[280px] relative overflow-hidden group hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30">
                <Pill className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-bold text-white text-lg">Treatment Options</h3>
            </div>
            
            {/* Natural remedies */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-4 h-4 text-emerald-400" />
                <div className="text-sm font-semibold text-emerald-300">Natural / Organic</div>
              </div>
              {remedy_natural ? (
                <div className="pl-6 text-sm text-gray-200 leading-relaxed">{remedy_natural}</div>
              ) : (
                <div className="pl-6 text-sm text-gray-500 italic">No natural remedies found.</div>
              )}
            </div>
            
            {/* Chemical remedies */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Droplet className="w-4 h-4 text-cyan-400" />
                <div className="text-sm font-semibold text-cyan-300">Chemical / Conventional</div>
              </div>
              {remedy_chemical ? (
                <div className="pl-6 text-sm text-gray-200 leading-relaxed">{remedy_chemical}</div>
              ) : (
                <div className="pl-6 text-sm text-gray-500 italic">No chemical remedies found or requires expert review.</div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Consult local agricultural extension for dosages</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="mt-6 flex flex-col sm:flex-row gap-3">
        <button onClick={() => navigate('/scan')} className="btn-secondary flex-1">
          New Scan
        </button>
        <button onClick={() => navigate('/community', { state: { scan_id: latestResult.scan_id, prefill: `I just scanned my tomato plant and got ${latestResult.disease.replace(/_/g, ' ')}. Does anyone have advice?` } })} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 flex-1 flex items-center justify-center gap-2">
          <Users className="w-5 h-5" /> Share to Community
        </button>
        <button onClick={() => navigate('/history')} className="btn-primary flex-1">
          History
        </button>
      </motion.div>
    </div>
  );
}
