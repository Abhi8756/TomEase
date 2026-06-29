import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Leaf, Clock, TrendingUp, X, Image as ImageIcon } from 'lucide-react';
import { predictApi, API_BASE } from '../services/api';

const diseaseColors: Record<string, string> = {
  Healthy: '#10b981', Early_Blight: '#f59e0b', Late_Blight: '#ef4444',
  Leaf_Mold: '#8b5cf6', Septoria: '#f97316', TYLCV: '#ec4899',
};

const ALL_DISEASES = ['All', 'Healthy', 'Early_Blight', 'Late_Blight', 'Leaf_Mold', 'Septoria', 'TYLCV'];

export default function HistoryPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [diseaseFilter, setDiseaseFilter] = useState('All');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    predictApi.recentScans(100)
      .then(({ data }) => setScans(data.scans || []))
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = scans.filter(s => {
    const matchDisease = diseaseFilter === 'All' || s.disease === diseaseFilter;
    const matchSearch = !search || s.disease?.toLowerCase().includes(search.toLowerCase()) ||
      s.scan_id?.toLowerCase().includes(search.toLowerCase());
    return matchDisease && matchSearch;
  });

  const stats = {
    total: scans.length,
    healthy: scans.filter(s => s.disease === 'Healthy').length,
    diseased: scans.filter(s => s.disease !== 'Healthy').length,
    avgConf: scans.length ? (scans.reduce((a, s) => a + (s.confidence || 0), 0) / scans.length * 100).toFixed(1) : '0',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Scan History</h1>
          <p className="text-gray-400 mt-1">All your previous scans and results</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Scans', value: stats.total, icon: Leaf },
            { label: 'Healthy', value: stats.healthy, icon: TrendingUp },
            { label: 'Diseased', value: stats.diseased, icon: Filter },
            { label: 'Avg Confidence', value: `${stats.avgConf}%`, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass p-4">
              <Icon className="w-4 h-4 text-primary-400 mb-2" />
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search scans..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 pr-10" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {ALL_DISEASES.map(d => (
              <button key={d} onClick={() => setDiseaseFilter(d)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all
                  ${diseaseFilter === d
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}>
                {d === 'All' ? 'All' : d.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="glass overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Leaf className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">
                {scans.length === 0 ? 'No scans yet' : 'No scans match your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4 w-16">#</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4 w-20">Image</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Disease</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Confidence</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Date</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Scan ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((scan, i) => {
                    const color = diseaseColors[scan.disease] || '#6b7280';
                    return (
                      <tr key={scan.scan_id || i} className="hover:bg-white/3 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-500">{i + 1}</td>
                        <td className="px-6 py-4">
                          {scan.image_url ? (
                            <img 
                              src={scan.image_url.startsWith('http') ? scan.image_url : `${API_BASE}${scan.image_url}`} 
                              alt="Scan" 
                              onClick={() => setSelectedImage(scan.image_url)}
                              className="w-10 h-10 object-cover rounded-lg border border-white/10 hover:opacity-80 transition-opacity cursor-pointer" 
                            />
                          ) : (
                            <div className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center border border-white/5">
                              <ImageIcon className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="font-semibold text-white text-sm">
                              {scan.disease?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full max-w-24 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(scan.confidence || 0) * 100}%`, background: color }} />
                            </div>
                            <span className="text-sm font-bold" style={{ color }}>
                              {((scan.confidence || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs text-gray-600 font-mono">
                            {scan.scan_id?.slice(0, 8)}...
                          </code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-center text-gray-600 text-xs mt-4">
          Showing {filtered.length} of {scans.length} scans
        </p>
      </motion.div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <motion.img 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={selectedImage.startsWith('http') ? selectedImage : `${API_BASE}${selectedImage}`} 
            alt="Scan Full" 
            className="max-w-full max-h-[90vh] rounded-2xl border border-white/10 object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
