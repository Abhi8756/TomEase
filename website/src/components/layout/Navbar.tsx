import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, Scan, History, LayoutDashboard, Settings, LogOut, Menu, X, ChevronRight, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../store';
import toast from 'react-hot-toast';

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
