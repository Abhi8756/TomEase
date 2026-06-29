import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, MapPin, CloudRain, Sun, Wind, Activity, Image as ImageIcon } from 'lucide-react';
import { plotsApi, API_BASE } from '../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { useStore } from '../store';

export default function PlotDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plot, setPlot] = useState<any>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const setLatestResult = useStore(state => state.setLatestResult);

  useEffect(() => {
    if (!id) return;
    plotsApi.getById(id)
      .then(res => {
        setPlot(res.data.plot);
        setScans(res.data.scans);
        
        // Fetch real weather if we have coordinates
        if (res.data.plot.latitude && res.data.plot.longitude) {
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${res.data.plot.latitude}&longitude=${res.data.plot.longitude}&current=temperature_2m,weather_code,wind_speed_10m&hourly=uv_index`)
            .then(r => r.json())
            .then(data => {
              const currentHour = new Date().getHours();
              setWeather({
                temp: data.current.temperature_2m,
                wind: data.current.wind_speed_10m,
                code: data.current.weather_code,
                uv: data.hourly?.uv_index?.[currentHour] || 0
              });
            })
            .catch(console.error);
        }
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load plot details');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const getWeatherInfo = (code: number) => {
    if (code === 0) return { text: 'Clear Sky', icon: Sun };
    if (code <= 3) return { text: 'Partly Cloudy', icon: CloudRain };
    if (code <= 48) return { text: 'Fog', icon: Wind };
    if (code <= 65) return { text: 'Rain', icon: CloudRain };
    if (code > 65) return { text: 'Storm/Snow', icon: CloudRain };
    return { text: 'Unknown', icon: Sun };
  };

  const generateReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text(`Scouting Report: ${plot?.name}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Date Generated: ${dayjs().format('MMMM D, YYYY')}`, 14, 30);
    doc.text(`Total Scans: ${scans.length}`, 14, 38);
    
    // Table Data
    const tableColumn = ["Date", "Disease Detected", "Confidence", "Severity"];
    const tableRows = scans.map(s => [
      dayjs(s.timestamp).format('MMM D, YYYY h:mm A'),
      s.disease.replace(/_/g, ' '),
      `${(s.confidence * 100).toFixed(1)}%`,
      s.severity || 'Moderate'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129] } // emerald-500
    });

    doc.save(`${plot?.name.replace(/\\s+/g, '_')}_Scouting_Report.pdf`);
    toast.success('Report downloaded successfully!');
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading field data...</div>;
  }

  if (!plot) {
    return <div className="p-8 text-center text-gray-400">Field not found.</div>;
  }

  // Calculate Health Score (basic placeholder logic: more healthy scans = higher score)
  const healthyScans = scans.filter(s => s.disease === 'Healthy').length;
  const healthScore = scans.length > 0 ? Math.round((healthyScans / scans.length) * 100) : 100;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate('/plots')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to My Plots
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <MapPin className="w-8 h-8 text-primary-500" />
            {plot.name}
          </h1>
          <p className="text-gray-400 mt-2">
            Lat: {plot.latitude?.toFixed(4) || 'N/A'}, Lng: {plot.longitude?.toFixed(4) || 'N/A'}
          </p>
        </div>
        <button 
          onClick={generateReport}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Generate Scouting Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Scan History */}
          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Recent Scans</h2>
            {scans.length === 0 ? (
              <p className="text-gray-400">No scans recorded for this field yet.</p>
            ) : (
              <div className="space-y-4">
                {scans.map((scan, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={scan.scan_id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-dark-900 border border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => {
                      setLatestResult(scan);
                      navigate('/result');
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {scan.image_url ? (
                        <img 
                          src={scan.image_url.startsWith('http') ? scan.image_url : `${API_BASE}${scan.image_url}`} 
                          alt="Scan" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(scan.image_url);
                          }}
                          className="w-12 h-12 object-cover rounded-lg border border-white/10 hover:opacity-80 transition-opacity" 
                        />
                      ) : (
                        <div className="w-12 h-12 bg-dark-800 rounded-lg flex items-center justify-center border border-white/5">
                          <ImageIcon className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`w-3 h-3 rounded-full ${scan.disease === 'Healthy' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                          <h3 className="font-semibold text-white">{scan.disease.replace(/_/g, ' ')}</h3>
                        </div>
                        <p className="text-sm text-gray-400">
                          {dayjs(scan.timestamp).format('MMM D, YYYY · h:mm A')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-300">{(scan.confidence * 100).toFixed(1)}% Match</p>
                      <p className={`text-xs mt-1 ${scan.disease === 'Healthy' ? 'text-green-400' : 'text-red-400'}`}>
                        {scan.disease === 'Healthy' ? 'No Action Needed' : 'Action Required'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Health Score Widget */}
          <div className="glass p-6 rounded-2xl bg-gradient-to-br from-dark-800 to-dark-900 border-t-4 border-t-primary-500 relative overflow-hidden">
            <Activity className="absolute -right-4 -top-4 w-32 h-32 text-primary-500/5 rotate-12" />
            <h2 className="text-lg font-bold text-gray-300 mb-2">Crop Health Score</h2>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-white">{healthScore}</span>
              <span className="text-xl text-gray-500 mb-1">/100</span>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Based on the ratio of healthy vs diseased scans in this field.
            </p>
          </div>

          {/* Hyper-local Weather */}
          <div className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-transparent" />
            <div className="relative">
              <h2 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-blue-400" />
                Live Field Weather
              </h2>
              
              {weather ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-4xl font-black text-white">{weather.temp}°C</div>
                      <div className="text-sm text-blue-400 mt-1">{getWeatherInfo(weather.code).text}</div>
                    </div>
                    {(() => {
                      const Icon = getWeatherInfo(weather.code).icon;
                      return <Icon className="w-12 h-12 text-blue-400" />;
                    })()}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-dark-900/50 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <Wind className="w-3 h-3" /> Wind
                      </div>
                      <div className="text-white font-medium">{weather.wind} km/h</div>
                    </div>
                    <div className="bg-dark-900/50 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <Sun className="w-3 h-3" /> UV Index
                      </div>
                      <div className="text-white font-medium">{weather.uv}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-sm py-4">
                  {plot.latitude ? 'Loading weather data...' : 'Add GPS coordinates to this plot to see live weather.'}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>

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
