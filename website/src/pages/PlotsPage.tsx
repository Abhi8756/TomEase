import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, X } from 'lucide-react';
import L from 'leaflet';
import { plotsApi } from '../services/api';
import toast from 'react-hot-toast';

// Fix Leaflet's default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }: any) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function PlotsPage() {
  const [plots, setPlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlotName, setNewPlotName] = useState('');
  const [position, setPosition] = useState<[number, number] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPlots();
  }, []);

  const loadPlots = async () => {
    try {
      const { data } = await plotsApi.getAll();
      setPlots(data);
    } catch (e) {
      toast.error('Failed to load plots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlot = async () => {
    if (!newPlotName.trim()) {
      toast.error('Please enter a plot name');
      return;
    }
    if (!position) {
      toast.error('Please select a location on the map');
      return;
    }
    try {
      await plotsApi.create(newPlotName, position[0], position[1]);
      toast.success('Plot created!');
      setShowAddModal(false);
      setNewPlotName('');
      setPosition(null);
      loadPlots();
    } catch (e) {
      toast.error('Failed to create plot');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">My Farms & Plots</h1>
          <p className="text-gray-400 mt-1">Manage your fields and track diseases geographically</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Plot
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : plots.length === 0 ? (
        <div className="glass p-12 text-center rounded-2xl">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No plots yet</h3>
          <p className="text-gray-400 mb-6">Create your first plot to start organizing your scans geographically.</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Plot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plots.map(plot => (
            <div 
              key={plot.id} 
              onClick={() => navigate(`/plots/${plot.id}`)}
              className="glass p-5 rounded-2xl cursor-pointer group hover:border-primary-500/50 hover:bg-dark-800/80 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary-500/10 rounded-xl group-hover:bg-primary-500/20 transition-colors">
                  <MapPin className="w-6 h-6 text-primary-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary-400 transition-colors">{plot.name}</h3>
              <p className="text-xs text-gray-500">Added {new Date(plot.created_at).toLocaleDateString()}</p>
              
              {plot.latitude && plot.longitude && (
                <div className="mt-4 h-32 rounded-xl overflow-hidden border border-white/5">
                  <MapContainer center={[plot.latitude, plot.longitude]} zoom={13} zoomControl={false} dragging={false} scrollWheelZoom={false} className="w-full h-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[plot.latitude, plot.longitude]} />
                  </MapContainer>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Plot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/80 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass max-w-2xl w-full p-6 rounded-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Add New Plot</h2>
            <p className="text-gray-400 text-sm mb-6">Click on the map to drop a pin for your plot's location.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Plot Name</label>
                <input 
                  type="text" 
                  value={newPlotName} 
                  onChange={e => setNewPlotName(e.target.value)}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="e.g. North Field"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Location</label>
                <div className="h-64 rounded-xl overflow-hidden border border-white/10">
                  <MapContainer center={[20.5937, 78.9629]} zoom={4} className="w-full h-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker position={position} setPosition={setPosition} />
                  </MapContainer>
                </div>
              </div>

              <button onClick={handleCreatePlot} className="btn-primary w-full py-3 mt-4">
                Save Plot
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
