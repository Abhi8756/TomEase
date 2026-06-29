import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scan, History, TrendingUp, Leaf, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { predictApi, modelApi } from '../services/api';

const diseaseColors: Record<string, string> = {
  Healthy: '#10b981',
  Early_Blight: '#f59e0b',
  Late_Blight: '#ef4444',
  Leaf_Mold: '#8b5cf6',
  Septoria: '#f97316',
  TYLCV: '#ec4899',
};

const diseaseEmoji: Record<string, string> = {
  Healthy: '✅',
  Early_Blight: '🟡',
  Late_Blight: '🔴',
  Leaf_Mold: '🟣',
  Septoria: '🟠',
  TYLCV: '🔴',
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

export default function DashboardPage() {
  const { user, recentScans, setRecentScans } = useStore();
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scansRes, modelRes] = await Promise.all([
          predictApi.recentScans(10),
          modelApi.info(),
        ]);
        setRecentScans(scansRes.data.scans || []);
        setModelInfo(modelRes.data);
      } catch (e) {
        // Backend might not have scans yet — that's fine
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const diseaseCounts = recentScans.reduce((acc: any, s: any) => {
    acc[s.disease] = (acc[s.disease] || 0) + 1;
    return acc;
  }, {});

  const healthyCount = diseaseCounts['Healthy'] || 0;
  const diseasedCount = recentScans.length - healthyCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Greeting */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="mb-8">
        <h1 className="text-3xl font-black text-white">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
          <span className="text-primary-400">{user?.name?.split(' ')[0] || 'Farmer'}</span> 👋
        </h1>
        <p className="text-gray-400 mt-1">Here's your crop health overview</p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Scans', value: modelInfo?.total_scans ?? recentScans.length, icon: Scan, color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
          { label: 'Healthy Leaves', value: healthyCount, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
          { label: 'Diseased Leaves', value: diseasedCount, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
          { label: 'Model Accuracy', value: modelInfo ? `${(modelInfo.accuracy_field * 100).toFixed(1)}%` : '90.2%', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        ].map(({ label, value, icon: Icon, color, bg, border }, i) => (
          <motion.div key={label} initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
            className={`glass p-5 border ${border}`}>
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-black text-white">{loading ? '—' : value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <Link to="/scan"
            className="group glass-hover p-6 flex items-center gap-4 hover:border-primary-500/40 block">
            <div className="w-14 h-14 bg-primary-500/20 rounded-2xl flex items-center justify-center 
                          group-hover:bg-primary-500/30 transition-colors border border-primary-500/30">
              <Scan className="w-7 h-7 text-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg">Scan New Leaf</h3>
              <p className="text-gray-400 text-sm">Upload a photo for instant disease detection</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
          <Link to="/history"
            className="group glass-hover p-6 flex items-center gap-4 hover:border-blue-500/40 block">
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center 
                          group-hover:bg-blue-500/30 transition-colors border border-blue-500/30">
              <History className="w-7 h-7 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg">View History</h3>
              <p className="text-gray-400 text-sm">Review all previous scans and results</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </motion.div>
      </div>

      {/* Recent Scans */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Recent Scans</h2>
          <Link to="/history" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="glass overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentScans.length === 0 ? (
            <div className="text-center py-16">
              <Leaf className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No scans yet</p>
              <p className="text-gray-600 text-sm mt-1">Upload your first leaf photo to get started</p>
              <Link to="/scan" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
                Scan Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentScans.slice(0, 5).map((scan: any, i: number) => (
                <div key={scan.scan_id || i} className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: `${diseaseColors[scan.disease] || '#6b7280'}20` }}>
                    {diseaseEmoji[scan.disease] || '🍃'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm truncate">
                      {scan.disease?.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : 'Just now'}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold" style={{ color: diseaseColors[scan.disease] || '#9ca3af' }}>
                      {((scan.confidence || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600">confidence</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Model info footer */}
      {modelInfo && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={8}
          className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/5 text-sm text-gray-500">
          <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          Model {modelInfo.version} · {modelInfo.accuracy_field * 100}% field accuracy · {modelInfo.total_scans} total scans
        </motion.div>
      )}
    </div>
  );
}
