import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, Scan, History, LayoutDashboard, Settings, LogOut, Menu, X, ChevronRight, MapPin, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import toast from 'react-hot-toast';
import { analyticsApi } from '../../services/api';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scan', icon: Scan, label: 'Scan Leaf' },
  { to: '/plots', icon: MapPin, label: 'My Plots' },
  { to: '/history', icon: History, label: 'History' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      analyticsApi.getAlerts().then(res => setAlerts(res.data)).catch(console.error);
    }
  }, [user]);

  const unreadCount = alerts.filter(a => !a.is_read).length;

  const handleMarkRead = async (id: number) => {
    try {
      await analyticsApi.markAlertRead(id);
      setAlerts(alerts.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-800/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center 
                          group-hover:bg-primary-500/30 transition-colors border border-primary-500/30">
              <Leaf className="w-4 h-4 text-primary-400" />
            </div>
            <span className="font-bold text-white text-lg">Tom<span className="text-primary-400">Ease</span></span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${pathname === to 
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link to="/admin"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${pathname === '/admin' 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/5'}`}>
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                )}
              </button>
              
              {/* Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-dark-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-white/10 bg-dark-900/50 flex justify-between items-center">
                    <h3 className="font-semibold text-white">Regional Alerts</h3>
                    {unreadCount > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="p-4 text-sm text-gray-400 text-center">No alerts in your region</p>
                    ) : (
                      alerts.map(alert => (
                        <div key={alert.id} 
                          onClick={() => handleMarkRead(alert.id)}
                          className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors
                            ${!alert.is_read ? 'bg-red-500/5' : ''}`}
                        >
                          <p className={`text-[10px] mb-1 font-bold tracking-wider ${alert.type === 'danger' ? 'text-red-400' : 'text-amber-400'}`}>
                            {alert.type === 'danger' ? 'CRITICAL ALERT' : 'WARNING'}
                          </p>
                          <p className={`text-sm ${!alert.is_read ? 'text-white font-medium' : 'text-gray-400'}`}>{alert.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-6 h-6 rounded-full bg-primary-500/30 border border-primary-500/50 
                            flex items-center justify-center text-xs font-bold text-primary-400">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-gray-300">{user?.name || 'User'}</span>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-red-400 
                       hover:bg-red-500/5 transition-all text-sm">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-dark-800/95 backdrop-blur-xl border-t border-white/5 py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors
                ${pathname === to ? 'text-primary-400 bg-primary-500/10' : 'text-gray-400 hover:text-white'}`}>
              <div className="flex items-center gap-3"><Icon className="w-4 h-4" />{label}</div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </Link>
          ))}
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-3 text-sm text-red-400 hover:bg-red-500/5">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      )}
    </nav>
  );
}
