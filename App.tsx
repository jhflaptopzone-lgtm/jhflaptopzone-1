import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  Link, 
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from 'react-router-dom';
import { 
  LayoutDashboard, 
  Laptop, 
  ShoppingCart, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Plus,
  Search,
  AlertTriangle,
  FileText,
  ScanLine,
  User,
  Bell,
  Edit,
  Trash2,
  History,
  RotateCcw,
  Download,
  Upload,
  Database as DbIcon,
  Calendar,
  Filter,
  ChevronRight,
  ChevronDown,
  Printer,
  FileSpreadsheet,
  Truck,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler
);

const numberToWords = (num: any): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (numValue: number): string => {
    if (numValue < 20) return ones[numValue];
    if (numValue < 100) return tens[Math.floor(numValue / 10)] + (numValue % 10 !== 0 ? ' ' + ones[numValue % 10] : '');
    if (numValue < 1000) return ones[Math.floor(numValue / 100)] + ' Hundred' + (numValue % 100 !== 0 ? ' ' + convert(numValue % 100) : '');
    if (numValue < 100000) return convert(Math.floor(numValue / 1000)) + ' Thousand' + (numValue % 1000 !== 0 ? ' ' + convert(numValue % 1000) : '');
    if (numValue < 10000000) return convert(Math.floor(numValue / 100000)) + ' Lakh' + (numValue % 100000 !== 0 ? ' ' + convert(numValue % 100000) : '');
    return convert(Math.floor(numValue / 10000000)) + ' Crore' + (numValue % 10000000 !== 0 ? ' ' + convert(numValue % 10000000) : '');
  };

  if (n === 0) return 'Zero';
  return convert(Math.floor(n));
};

// --- Contexts ---
const AuthContext = createContext<any>(null);
const NotificationContext = createContext<any>(null);

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<any>(null);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const confirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  };

  return (
    <NotificationContext.Provider value={{ notify, confirm }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`p-4 rounded-lg shadow-lg border ${
                n.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' :
                n.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' :
                'bg-blue-500/10 border-blue-500 text-blue-500'
              }`}
            >
              {n.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-card border border-dark-border p-8 rounded-2xl max-w-md w-full space-y-6"
            >
              <h3 className="text-xl font-bold text-white">Confirm Action</h3>
              <p className="text-gray-400">{confirmModal.message}</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-6 py-2 rounded-lg border border-dark-border text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

const useNotification = () => useContext(NotificationContext);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<any>(null);

  const { notify } = useNotification() || { notify: (m: string) => alert(m) };

  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await axios.get('/api/health/db-status');
        if (!res.data.connected) {
          setDbError(res.data);
        }
      } catch (e) {
        console.error('DB check failed', e);
      }
    };
    checkDb();

    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);

    // Add interceptor for 401/403 errors
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          if (error.response.status === 401) {
            logout();
            window.location.href = '/login';
          } else if (error.response.status === 403) {
            notify('Access Denied: You do not have permission to perform this action.', 'error');
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (access_id: string, password: string) => {
    const res = await axios.post('/api/auth/login', { access_id, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {dbError && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white p-2 text-center text-sm font-bold flex items-center justify-center space-x-2">
          <AlertTriangle size={16} />
          <span>Database Connection Error: {dbError.hint || dbError.error}</span>
          <button 
            onClick={() => window.location.reload()}
            className="ml-4 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// --- Components ---

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-dark-bg">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [supplierOpen, setSupplierOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Inventory', path: '/inventory', icon: Laptop },
    { name: 'Sales / POS', path: '/sales', icon: ShoppingCart },
    { name: 'Sales History', path: '/sales-history', icon: History },
    { name: 'EMI / Dues', path: '/emi', icon: CreditCard },
    { name: 'Due Report', path: '/due-report', icon: FileText },
    { 
      name: 'Suppliers', 
      path: '/suppliers', 
      icon: Truck,
      hasSub: true,
      isOpen: supplierOpen,
      toggle: () => setSupplierOpen(!supplierOpen),
      children: [
        { name: 'Supplier List', path: '/suppliers' },
        { name: 'Supplier Ledger', path: '/suppliers/ledger' },
        { name: 'Supplier Payment', path: '/suppliers/payment' },
        { name: 'Supplier Report', path: '/suppliers/report' },
      ]
    },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Staff', path: '/staff', icon: User, roles: ['Admin', 'Manager', 'Staff'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['Admin'] },
  ];

  return (
    <div className={`bg-dark-card border-r border-dark-border h-screen transition-all duration-300 flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="p-6 flex items-center justify-between border-b border-dark-border">
        {isOpen && <h1 className="text-neon-green font-bold text-xl tracking-tighter">JHF LAPTOP ZONE</h1>}
        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-400 hover:text-neon-green">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          if (item.roles && !item.roles.includes(user?.role)) return null;
          const isActive = location.pathname === item.path || (item.children?.some(c => location.pathname === c.path));
          
          if (item.hasSub) {
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={item.toggle}
                  className={`flex items-center justify-between w-full p-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-neon-green/10 text-neon-green border border-neon-green/20' 
                      : 'text-gray-400 hover:bg-dark-border hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon size={20} className={isActive ? 'text-neon-green' : ''} />
                    {isOpen && <span className="ml-3 font-medium">{item.name}</span>}
                  </div>
                  {isOpen && (item.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                </button>
                {isOpen && item.isOpen && (
                  <div className="ml-6 space-y-1 border-l border-dark-border pl-4">
                    {item.children?.map(child => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`block p-2 text-sm rounded-lg transition-all ${
                          location.pathname === child.path ? 'text-neon-green font-bold' : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center p-3 rounded-lg transition-all ${
                isActive 
                  ? 'bg-neon-green/10 text-neon-green border border-neon-green/20' 
                  : 'text-gray-400 hover:bg-dark-border hover:text-white'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-neon-green' : ''} />
              {isOpen && <span className="ml-3 font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-dark-border">
        <button 
          onClick={logout}
          className="flex items-center w-full p-3 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
        >
          <LogOut size={20} />
          {isOpen && <span className="ml-3 font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
};

const Navbar = () => {
  const { user } = useAuth();
  return (
    <header className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-8">
      <div className="flex items-center bg-dark-bg border border-dark-border rounded-full px-4 py-1.5 w-96">
        <Search size={18} className="text-gray-500" />
        <input 
          type="text" 
          placeholder="Search serial, invoice, customer..." 
          className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full text-white"
        />
      </div>
      <div className="flex items-center space-x-6">
        <button className="relative text-gray-400 hover:text-neon-green">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-neon-green rounded-full"></span>
        </button>
        <div className="flex items-center space-x-3 border-l border-dark-border pl-6">
          <div className="text-right">
            <p className="text-sm font-bold text-white leading-none">{user?.name}</p>
            <p className="text-xs text-neon-green font-mono mt-1">{user?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-neon-green/20 border border-neon-green/30 flex items-center justify-center text-neon-green font-bold">
            {user?.name?.[0]}
          </div>
        </div>
      </div>
    </header>
  );
};

// --- Pages ---

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    axios.get('/api/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(err => {
        console.error('Dashboard stats error:', err);
        const msg = err.response?.data?.message || err.message;
        if (msg.includes('getaddrinfo') || msg.includes('EAI_AGAIN')) {
          setError('Database connection error: Could not resolve the database host. If you are using Render, please ensure you are using the EXTERNAL Database URL in your secrets.');
        } else {
          setError('Failed to load dashboard statistics. Please check your database connection.');
        }
      });
  }, []);

  if (error) return (
    <div className="p-8 max-w-2xl">
      <div className="bg-red-500/10 border border-red-500 p-8 rounded-3xl text-red-500 space-y-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle size={32} />
          <h3 className="text-2xl font-black uppercase tracking-tighter">System Error</h3>
        </div>
        
        <p className="text-gray-300 leading-relaxed">{error}</p>

        {error.includes('Render') && (
          <div className="bg-black/40 p-6 rounded-2xl space-y-4 border border-red-500/20">
            <h4 className="text-sm font-bold uppercase tracking-widest text-red-400">Connection Guide</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-bold mt-0.5">1</div>
                <p className="text-xs text-gray-400">Log in to your <strong>Render Dashboard</strong>.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-bold mt-0.5">2</div>
                <p className="text-xs text-gray-400">Select your database and copy the <strong>External Database URL</strong>.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-bold mt-0.5">3</div>
                <p className="text-xs text-gray-400">Go to <strong>Settings &gt; Secrets</strong> in AI Studio and update <strong>DATABASE_URL</strong>.</p>
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-red-500 text-white font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400 animate-pulse">Loading dashboard statistics...</p>
    </div>
  );

  const chartData = {
    labels: (stats.monthlySales || []).map((s: any) => s.month).reverse(),
    datasets: [{
      label: 'Sales (BDT)',
      data: (stats.monthlySales || []).map((s: any) => s.total).reverse(),
      borderColor: '#39FF14',
      backgroundColor: 'rgba(57, 255, 20, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  };

  const pieData = {
    labels: (stats.paymentMethods || []).map((p: any) => p.payment_type),
    datasets: [{
      data: (stats.paymentMethods || []).map((p: any) => p.count),
      backgroundColor: ['#39FF14', '#1F1F1F', '#5A5A40'],
      borderWidth: 0,
    }]
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white">Dashboard Overview</h2>
          <p className="text-gray-400 mt-1">Welcome back to JHF Laptop Zone</p>
        </div>
        <div className="bg-dark-card border border-dark-border p-3 rounded-xl flex items-center space-x-4">
          {isAdmin && stats.lastBackupDate && (
            <div className="text-right border-r border-dark-border pr-4">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Last Backup</p>
              <p className="text-white text-xs font-mono">{new Date(stats.lastBackupDate).toLocaleDateString()}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Current Time</p>
            <p className="text-neon-green font-mono">{format(new Date(), 'hh:mm:ss a')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: isAdmin ? 'Total Sales' : 'My Total Sales', value: `TK ${(stats.totalSalesAmount ?? 0).toLocaleString()}`, sub: `${stats.totalSalesCount ?? 0} units sold`, icon: ShoppingCart },
          isAdmin && { label: 'Total Profit', value: `TK ${(stats.totalProfit ?? 0).toLocaleString()}`, sub: 'Net earnings', icon: BarChart3 },
          { label: isAdmin ? 'EMI Outstanding' : 'My Due Report', value: `TK ${(stats.emiOutstanding ?? 0).toLocaleString()}`, sub: 'Receivables', icon: CreditCard, color: 'text-yellow-500' },
          { label: 'Low Stock', value: stats.lowStockCount ?? 0, sub: 'Items need restock', icon: AlertTriangle, color: 'text-red-500' },
        ].filter(Boolean).map((card: any, i) => (
          <div key={i} className="bg-dark-card border border-dark-border p-6 rounded-2xl hover:border-neon-green/50 transition-all group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-400 font-medium">{card.label}</p>
                <h3 className={`text-2xl font-bold mt-2 ${card.color || 'text-white'}`}>{card.value}</h3>
                <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
              </div>
              <div className="p-3 bg-dark-bg rounded-xl group-hover:bg-neon-green/10 transition-colors">
                <card.icon size={24} className="text-neon-green" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-dark-card border border-dark-border p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-6">Monthly Sales Performance</h3>
          <div className="h-80">
            <Line data={chartData} options={{ maintainAspectRatio: false, scales: { y: { grid: { color: '#1F1F1F' } }, x: { grid: { display: false } } } }} />
          </div>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-6">Payment Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <Pie data={pieData} />
          </div>
          <div className="mt-6 space-y-3">
            {(stats.paymentMethods || []).map((p: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-400">{p.payment_type}</span>
                <span className="font-bold">{p.count} sales</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && stats.supplierStats && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold">Supplier Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <p className="text-gray-500 text-xs font-bold uppercase mb-2">Total Supplier Due</p>
              <p className="text-2xl font-bold text-red-500">TK {(stats.supplierStats.totalDue ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <p className="text-gray-500 text-xs font-bold uppercase mb-2">Purchases (This Month)</p>
              <p className="text-2xl font-bold text-white">TK {(stats.supplierStats.monthlyPurchase ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <p className="text-gray-500 text-xs font-bold uppercase mb-2">Payments (This Month)</p>
              <p className="text-2xl font-bold text-neon-green">TK {(stats.supplierStats.monthlyPayment ?? 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <h4 className="font-bold mb-4">Top Supplier Dues</h4>
              <div className="space-y-3">
                {stats.supplierStats.topDues?.map((s: any) => (
                  <div key={s.id} className="flex justify-between items-center">
                    <span className="text-gray-400">{s.name}</span>
                    <span className="font-bold text-red-500">TK {(s.due ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl flex items-center justify-center">
               <div className="text-center">
                  <Truck size={48} className="text-neon-green mx-auto mb-2 opacity-20" />
                  <p className="text-gray-500 text-sm">Supplier Ledger Integrated</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Inventory = () => {
  const { notify, confirm: confirmAction } = useNotification();
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [formData, setFormData] = useState({
    model: '', config: '', serial_number: '', buy_price: '', sell_price: '', supplier_name: '', supplier_id: '', purchase_date: format(new Date(), 'yyyy-MM-dd'), status: 'Available'
  });

  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    (window as any).showScanner = showScanner;
  }, [showScanner]);

  const fetchItems = () => axios.get('/api/inventory')
    .then(res => setItems(res.data))
    .catch(err => notify('Failed to load inventory', 'error'));
  const fetchSuppliers = () => axios.get('/api/suppliers')
    .then(res => setSuppliers(res.data))
    .catch(err => notify('Failed to load suppliers', 'error'));
  
  const handleDownloadReport = async () => {
    try {
      const res = await axios.get('/api/reports/inventory');
      window.open(res.data.pdfUrl, '_blank');
      notify('Inventory report generated', 'success');
    } catch (err: any) {
      notify('Failed to generate report', 'error');
    }
  };

  useEffect(() => { 
    fetchItems(); 
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`/api/inventory/${editingItem.id}`, formData);
      } else {
        await axios.post('/api/inventory', formData);
      }
      setShowAdd(false);
      setEditingItem(null);
      fetchItems();
      setFormData({ model: '', config: '', serial_number: '', buy_price: '', sell_price: '', supplier_name: '', supplier_id: '', purchase_date: format(new Date(), 'yyyy-MM-dd'), status: 'Available' });
    } catch (err: any) {
      notify(err.response?.data?.message || 'Error saving item', 'error');
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      model: item.model,
      config: item.config,
      serial_number: item.serial_number,
      buy_price: item.buy_price?.toString() || '',
      sell_price: item.sell_price.toString(),
      supplier_name: item.supplier_name || '',
      supplier_id: item.supplier_id || '',
      purchase_date: item.purchase_date,
      status: item.status
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    confirmAction('Are you sure you want to delete this item?', async () => {
      try {
        await axios.delete(`/api/inventory/${id}`);
        fetchItems();
        notify('Item deleted successfully', 'success');
      } catch (err: any) {
        notify('Error deleting item', 'error');
      }
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-gray-400">Track and manage your laptop stock</p>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={handleDownloadReport} className="flex items-center px-4 py-2 bg-dark-border text-white rounded-lg hover:bg-dark-border/80 transition-all">
            <Download size={18} className="mr-2" /> Stock Report
          </button>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)} className="btn-neon flex items-center">
              <Plus size={18} className="mr-2" /> Add New Stock
            </button>
          )}
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-dark-bg border-b border-dark-border">
            <tr>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Model & Config</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Serial Number</th>
              {isAdmin && <th className="p-4 text-xs uppercase text-gray-500 font-bold">Buy Price</th>}
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Sell Price</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Status</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Purchase Date</th>
              {isAdmin && <th className="p-4 text-xs uppercase text-gray-500 font-bold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <p className="font-bold">{item.model}</p>
                  <p className="text-xs text-gray-500">{item.config}</p>
                </td>
                <td className="p-4 font-mono text-sm">{item.serial_number}</td>
                {isAdmin && <td className="p-4 text-sm">TK {(item.buy_price ?? 0).toLocaleString()}</td>}
                <td className="p-4 text-sm font-bold text-neon-green">TK {(item.sell_price ?? 0).toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    item.status === 'Available' ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 text-xs text-gray-400">{item.purchase_date}</td>
                {isAdmin && (
                  <td className="p-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleEdit(item)} className="p-2 hover:bg-neon-green/10 text-gray-400 hover:text-neon-green rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {showScanner && (
            <BarcodeScanner 
              onScan={(text) => {
                setFormData({ ...formData, serial_number: text });
                setShowScanner(false);
              }} 
              onClose={() => setShowScanner(false)} 
            />
          )}
          <div className="bg-dark-card border border-dark-border w-full max-w-2xl rounded-2xl p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingItem ? 'Edit Laptop' : 'Add New Laptop'}</h3>
              <button onClick={() => { setShowAdd(false); setEditingItem(null); }} className="text-gray-400 hover:text-white"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Model Name</label>
                <input required className="input-dark w-full" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="HP Victus 15" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Configuration</label>
                <input required className="input-dark w-full" value={formData.config} onChange={e => setFormData({...formData, config: e.target.value})} placeholder="i5-12th, 16GB, 512GB, RTX 3050" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 flex justify-between">
                  Serial Number
                  <button type="button" onClick={() => (window as any).showScanner = true} className="text-neon-green hover:underline flex items-center">
                    <ScanLine size={12} className="mr-1" /> Scan
                  </button>
                </label>
                <input required className="input-dark w-full font-mono" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} placeholder="SN-XXXX-XXXX" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Supplier</label>
                <select 
                  className="input-dark w-full" 
                  value={formData.supplier_id} 
                  onChange={e => {
                    const s = suppliers.find(sup => sup.id === parseInt(e.target.value));
                    setFormData({...formData, supplier_id: e.target.value, supplier_name: s?.name || ''});
                  }}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Buy Price (TK)</label>
                <input required type="number" className="input-dark w-full" value={formData.buy_price} onChange={e => setFormData({...formData, buy_price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Sell Price (TK)</label>
                <input required type="number" className="input-dark w-full" value={formData.sell_price} onChange={e => setFormData({...formData, sell_price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Purchase Date</label>
                <input required type="date" className="input-dark w-full" value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Status</label>
                <select className="input-dark w-full" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="Available">Available</option>
                  <option value="Sold">Sold</option>
                </select>
              </div>
              <button type="submit" className="btn-neon col-span-2 mt-4">{editingItem ? 'Update Item' : 'Save to Inventory'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Sales = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [customer, setCustomer] = useState({ 
    name: '', 
    phone: '', 
    address: '', 
    payment_type: 'Cash',
    sale_date: format(new Date(), 'yyyy-MM-dd')
  });
  const [emiData, setEmiData] = useState({ down_payment: '', duration_months: '3' });
  const [dueData, setDueData] = useState({ estimate_date: '', reference_name: '', reference_phone: '', installment_plan: '2', down_payment: '0' });
  const [invoice, setInvoice] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    axios.get('/api/inventory').then(res => setItems((Array.isArray(res.data) ? res.data : []).filter((i: any) => i.status === 'Available')));
  }, []);

  const handleScan = (text: string) => {
    const item = items.find(i => i.serial_number === text);
    if (item) {
      setSelectedItem(item);
    } else {
      notify('Item not found in available stock', 'error');
    }
    setShowScanner(false);
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return notify('Select a laptop', 'error');
    try {
      const res = await axios.post('/api/sales', {
        inventory_id: selectedItem.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        payment_type: customer.payment_type,
        emi_data: customer.payment_type === 'EMI' ? emiData : null,
        due_data: customer.payment_type === 'Due' ? dueData : null,
        sale_date: customer.sale_date
      });
      setInvoice({
        ...res.data,
        customer,
        item: selectedItem,
        date: new Date(customer.sale_date).toLocaleString(),
        installments: res.data.installments
      });
      // Refresh items
      axios.get('/api/inventory').then(res => setItems((Array.isArray(res.data) ? res.data : []).filter((i: any) => i.status === 'Available')));
      setSelectedItem(null);
      setCustomer({ 
        name: '', 
        phone: '', 
        address: '', 
        payment_type: 'Cash',
        sale_date: format(new Date(), 'yyyy-MM-dd')
      });
    } catch (err: any) {
      notify(err.response?.data?.message || 'Sale failed', 'error');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text('JHF Laptop Zone', pageWidth / 2, 12, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text('Best Laptop Buy, Sell & Accessories Importer, Traders & Suppliers', pageWidth / 2, 18, { align: 'center' });
    doc.text('Branch Office : Baroipara Bazar, Chandra, Gazipur', pageWidth / 2, 22, { align: 'center' });
    doc.text('Main Office : Sonali Trade, Shop No : 1001 & 1040', pageWidth / 2, 26, { align: 'center' });
    doc.text('ECS Computer City Centre, Multiplan, New Elephant Road, Dhaka', pageWidth / 2, 30, { align: 'center' });
    doc.text('Mobile : 01935-693071 , 01731-693071', pageWidth / 2, 34, { align: 'center' });
    doc.text('Email : jhflaptopzone@gmail.com', pageWidth / 2, 38, { align: 'center' });
    doc.text('Facebook : www.facebook.com/jhflaptopzone', pageWidth / 2, 42, { align: 'center' });
    doc.text('Web : www.jhflaptopzone.com', pageWidth / 2, 46, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(10, 50, pageWidth - 10, 50);
    
    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text('SALES INVOICE', pageWidth / 2, 62, { align: 'center' });
    
    // Customer & Invoice Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Left side
    doc.text(`Customer : ${invoice.customer.name}`, 15, 75);
    doc.text(`Mobile : ${invoice.customer.phone}`, 15, 81);
    doc.text(`Address : ${invoice.customer.address}`, 15, 87);
    
    // Right side
    doc.text(`Invoice No : ${invoice.invoice_number}`, pageWidth - 15, 75, { align: 'right' });
    doc.text(`Date : ${invoice.customer.sale_date}`, pageWidth - 15, 81, { align: 'right' });
    doc.text(`Sales By : ${user?.name || 'Jahid Hasan'}`, pageWidth - 15, 87, { align: 'right' });
    
    // Table
    autoTable(doc, {
      startY: 95,
      head: [['SL', 'Item Name', 'Qty', 'Unit Price', 'Amount']],
      body: [[
        '1',
        {
          content: `${invoice.item.model}\n${invoice.item.config}\nSerial No : ${invoice.item.serial_number || 'Not Applicable'}`,
          styles: { cellPadding: 5 }
        },
        '1',
        (invoice.item.sell_price ?? 0).toLocaleString(),
        (invoice.item.sell_price ?? 0).toLocaleString()
      ]],
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        textColor: [0, 0, 0]
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.2
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 }
      }
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY || 95;
    
    // Total Box
    doc.setFont("helvetica", "bold");
    const totalBoxWidth = 70;
    const totalBoxHeight = 12;
    const totalBoxX = pageWidth - 15 - totalBoxWidth;
    const dividerX = pageWidth - 15 - 40;
    
    doc.rect(totalBoxX, finalY + 5, totalBoxWidth, totalBoxHeight);
    doc.line(dividerX, finalY + 5, dividerX, finalY + 5 + totalBoxHeight);
    
    doc.text('Total', totalBoxX + 5, finalY + 13);
    doc.text(`${(invoice.item.sell_price ?? 0).toLocaleString()} TK`, pageWidth - 20, finalY + 13, { align: 'right' });
    
    // In Words
    doc.setFontSize(10);
    doc.text(`In Words : ${numberToWords(invoice.item.sell_price)} Taka Only`, 15, finalY + 25);
    
    // Warranty Policy
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text('Warranty Policy', 15, finalY + 35);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text('• Full Laptop & Spare Parts : 1 Month', 20, finalY + 42);
    doc.text('• Service : 5 Years', 20, finalY + 48);
    
    // Installments
    let nextY = finalY + 58;
    if (invoice.installments && invoice.installments.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text('Payment / Installment Details', 15, nextY);
      
      autoTable(doc, {
        startY: nextY + 5,
        head: [['No', 'Due Date', 'Amount', 'Status']],
        body: invoice.installments.map((inst: any, idx: number) => [
          (idx + 1).toString(),
          inst.due_date,
          (inst.amount ?? 0).toLocaleString(),
          inst.status
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0] },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2 },
        margin: { left: 15, right: 15 }
      });
      nextY = ((doc as any).lastAutoTable?.finalY || nextY) + 10;
    } else {
      nextY = finalY + 65;
    }
    
    // Signatures
    const sigY = doc.internal.pageSize.height - 80;
    doc.setLineWidth(0.5);
    doc.line(15, sigY, 85, sigY);
    doc.setFontSize(10);
    doc.text('Customer Signature', 50, sigY + 7, { align: 'center' });
    
    doc.line(pageWidth - 85, sigY, pageWidth - 15, sigY);
    doc.text('Authorized Signature', pageWidth - 50, sigY + 7, { align: 'center' });
    
    // Thank You Message
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text('Thank You For Your Purchase', pageWidth / 2, sigY + 20, { align: 'center' });
    
    // Footer (Always on first page)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text('Software Developed By Jahid Hasan | JHF Laptop Zone', pageWidth / 2, doc.internal.pageSize.height - 30, { align: 'center' });
    
    doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  };

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">New Sale / POS</h3>
            <button onClick={() => setShowScanner(true)} className="btn-neon text-xs flex items-center">
              <ScanLine size={14} className="mr-1" /> Scan Serial
            </button>
          </div>
          <form onSubmit={handleSale} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Select Laptop (Available Stock)</label>
              <select 
                className="input-dark w-full" 
                onChange={e => setSelectedItem(items.find(i => i.id === parseInt(e.target.value)))}
                value={selectedItem?.id || ''}
              >
                <option value="">Choose a model...</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.model} - {item.serial_number} (TK {(item.sell_price ?? 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Customer Name</label>
                <input required className="input-dark w-full" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Phone Number</label>
                <input required className="input-dark w-full" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-xs font-bold text-gray-500">Address</label>
                <textarea className="input-dark w-full h-20" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Payment Type</label>
                <select className="input-dark w-full" value={customer.payment_type} onChange={e => setCustomer({...customer, payment_type: e.target.value})}>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Due">Due</option>
                  <option value="EMI">EMI</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Sale Date</label>
                <input 
                  type="date" 
                  className="input-dark w-full" 
                  value={customer.sale_date} 
                  onChange={e => setCustomer({...customer, sale_date: e.target.value})} 
                />
              </div>
            </div>

            {customer.payment_type === 'EMI' && (
              <div className="p-4 bg-dark-bg border border-dark-border rounded-xl grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">1st Installment / Down Payment (TK)</label>
                  <input required type="number" className="input-dark w-full" value={emiData.down_payment} onChange={e => setEmiData({...emiData, down_payment: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">Installment Plan (Duration)</label>
                  <select className="input-dark w-full" value={emiData.duration_months} onChange={e => setEmiData({...emiData, duration_months: e.target.value})}>
                    <option value="2">2 Months (1 Future)</option>
                    <option value="3">3 Months (2 Future)</option>
                    <option value="4">4 Months (3 Future)</option>
                    <option value="6">6 Months (5 Future)</option>
                    <option value="9">9 Months (8 Future)</option>
                    <option value="12">12 Months (11 Future)</option>
                  </select>
                </div>
                <div className="col-span-2 text-[10px] text-gray-500 italic">
                  * 1st installment is paid instantly. Remaining balance will be divided into {parseInt(emiData.duration_months) - 1} future installments.
                </div>
              </div>
            )}

            {customer.payment_type === 'Due' && (
              <div className="p-4 bg-dark-bg border border-dark-border rounded-xl grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">1st Installment / Down Payment (TK)</label>
                  <input required type="number" className="input-dark w-full" value={dueData.down_payment} onChange={e => setDueData({...dueData, down_payment: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">Installment Plan</label>
                  <select className="input-dark w-full" value={dueData.installment_plan} onChange={e => setDueData({...dueData, installment_plan: e.target.value})}>
                    <option value="2">2 Months (1 Future)</option>
                    <option value="3">3 Months (2 Future)</option>
                    <option value="4">4 Months (3 Future)</option>
                    <option value="6">6 Months (5 Future)</option>
                    <option value="9">9 Months (8 Future)</option>
                    <option value="12">12 Months (11 Future)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">Estimate Pay Date</label>
                  <input required type="date" className="input-dark w-full" value={dueData.estimate_date} onChange={e => setDueData({...dueData, estimate_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">Reference Name</label>
                  <input required className="input-dark w-full" value={dueData.reference_name} onChange={e => setDueData({...dueData, reference_name: e.target.value})} />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold text-gray-500">Reference Number</label>
                  <input required className="input-dark w-full" value={dueData.reference_phone} onChange={e => setDueData({...dueData, reference_phone: e.target.value})} />
                </div>
              </div>
            )}

            <button type="submit" className="btn-neon w-full py-4 text-lg">Complete Sale & Generate Invoice</button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-4">Summary</h3>
          {selectedItem ? (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Model</span>
                <span className="font-bold">{selectedItem.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Price</span>
                <span className="font-bold text-neon-green">TK {(selectedItem.sell_price ?? 0).toLocaleString()}</span>
              </div>
              <div className="border-t border-dark-border pt-4">
                <div className="flex justify-between text-xl">
                  <span>Total</span>
                  <span className="font-bold text-neon-green">TK {(selectedItem.sell_price ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No item selected</p>
          )}
        </div>

        {invoice && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-dark-card border border-neon-green w-full max-w-md p-8 rounded-3xl space-y-6 shadow-2xl shadow-neon-green/20 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-neon-green tracking-tighter">INVOICE READY</h3>
                  <p className="text-gray-400 text-sm">Sale completed successfully</p>
                </div>
                <div className="w-12 h-12 bg-neon-green/10 rounded-2xl flex items-center justify-center">
                  <FileText className="text-neon-green" />
                </div>
              </div>
              
              <div className="bg-dark-bg border border-dark-border p-4 rounded-2xl space-y-2">
                <div className="flex justify-between text-xs text-gray-500 uppercase font-bold tracking-widest">
                  <span>Invoice Number</span>
                  <span>Date</span>
                </div>
                <div className="flex justify-between font-mono text-sm">
                  <span>{invoice.invoice_number}</span>
                  <span>{invoice.customer.sale_date}</span>
                </div>
              </div>

              <div className="flex justify-center py-6 bg-white rounded-2xl">
                <QRCodeSVG value={`${window.location.origin}/invoice/view/${invoice.invoice_number}?token=${invoice.public_token}`} size={150} />
              </div>

              <div className="bg-dark-bg border border-dark-border p-4 rounded-2xl space-y-2">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Public Share Link</p>
                <div className="flex items-center space-x-2">
                  <input 
                    readOnly 
                    className="bg-transparent border-none text-xs text-neon-green w-full focus:ring-0" 
                    value={`${window.location.origin}/invoice/view/${invoice.invoice_number}?token=${invoice.public_token}`} 
                  />
                  <button 
                    onClick={() => {
                      const link = `${window.location.origin}/invoice/view/${invoice.invoice_number}?token=${invoice.public_token}`;
                      navigator.clipboard.writeText(link);
                      notify('Share Link Copied', 'success');
                    }}
                    className="p-2 hover:bg-neon-green/10 text-neon-green rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => window.open(`/invoices/Invoice_${invoice.invoice_number}.pdf`, '_blank')} 
                  className="btn-neon py-4 flex items-center justify-center"
                >
                  <FileText size={18} className="mr-2" /> View PDF
                </button>
                <button onClick={() => setInvoice(null)} className="bg-dark-bg border border-dark-border hover:bg-white/5 text-white font-bold py-4 rounded-xl transition-all">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SalesHistory = () => {
  const { notify, confirm: confirmAction } = useNotification();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: '',
    customer: '',
    dueOnly: false
  });

  const fetchSales = async () => {
    try {
      const res = await axios.get('/api/sales');
      setSales(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleReturn = async (saleId: number) => {
    confirmAction('Are you sure you want to return this sale? This will revert the item to available stock and delete any EMI records.', async () => {
      try {
        await axios.delete(`/api/sales/${saleId}`);
        fetchSales();
        notify('Sale returned and stock updated.', 'success');
      } catch (err: any) {
        notify(err.response?.data?.message || 'Error returning sale', 'error');
      }
    });
  };

  const filteredSales = (Array.isArray(sales) ? sales : []).filter(sale => {
    const matchesDate = !filters.date || sale.sale_date.startsWith(filters.date);
    const matchesCustomer = !filters.customer || 
      sale.customer_name.toLowerCase().includes(filters.customer.toLowerCase()) ||
      sale.customer_phone.includes(filters.customer);
    const matchesDue = !filters.dueOnly || sale.payment_type === 'Due' || sale.payment_type === 'EMI';
    
    return matchesDate && matchesCustomer && matchesDue;
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sales History</h2>
          <p className="text-gray-400">View and manage past sales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-dark-card border border-dark-border p-4 rounded-2xl">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Filter by Date</label>
          <input 
            type="date" 
            className="input-dark w-full text-sm" 
            value={filters.date} 
            onChange={e => setFilters({...filters, date: e.target.value})} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Name/Phone</label>
          <input 
            type="text" 
            className="input-dark w-full text-sm" 
            placeholder="Search..." 
            value={filters.customer} 
            onChange={e => setFilters({...filters, customer: e.target.value})} 
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-dark-border bg-dark-bg text-neon-green focus:ring-neon-green" 
              checked={filters.dueOnly} 
              onChange={e => setFilters({...filters, dueOnly: e.target.checked})} 
            />
            <span className="text-sm text-gray-400">Show Due/EMI Only</span>
          </label>
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-dark-bg border-b border-dark-border">
            <tr>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Invoice</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Customer</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Item</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Amount</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Type</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Date</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Status</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-500">Loading sales history...</td></tr>
            ) : filteredSales.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-500">No sales found</td></tr>
            ) : filteredSales.map(sale => (
              <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-mono text-sm">{sale.invoice_number}</td>
                <td className="p-4">
                  <p className="font-bold">{sale.customer_name}</p>
                  <p className="text-xs text-gray-500">{sale.customer_phone}</p>
                </td>
                <td className="p-4">
                  <p className="text-sm">{sale.model}</p>
                  <p className="text-[10px] text-gray-500 font-mono">{sale.serial_number}</p>
                </td>
                <td className="p-4 text-sm font-bold text-neon-green">TK {(sale.sell_price ?? 0).toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    sale.payment_type === 'Cash' ? 'bg-blue-500/20 text-blue-500' : 
                    sale.payment_type === 'Bank' ? 'bg-purple-500/20 text-purple-500' : 
                    sale.payment_type === 'EMI' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-orange-500/20 text-orange-500'
                  }`}>
                    {sale.payment_type}
                  </span>
                  {sale.payment_type === 'Due' && (
                    <div className="mt-1 text-[9px] text-gray-500">
                      Ref: {sale.due_reference_name} (Plan: {sale.due_terms})
                    </div>
                  )}
                </td>
                <td className="p-4 text-xs text-gray-400">{new Date(sale.sale_date).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    sale.invoice_pdf_path ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {sale.invoice_pdf_path ? 'Generated' : 'Missing'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => {
                        const url = `${window.location.origin}/invoices/${sale.invoice_pdf_path}`;
                        window.open(url, '_blank');
                      }}
                      className="p-2 hover:bg-neon-green/10 text-gray-400 hover:text-neon-green rounded-lg transition-colors flex items-center"
                      title="View PDF"
                    >
                      <FileText size={16} className="mr-1" />
                      <span className="text-[10px] font-bold">PDF</span>
                    </button>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}/invoice/view/${sale.invoice_number}?token=${sale.invoice_public_token}`;
                        navigator.clipboard.writeText(link);
                        notify('Invoice Link Copied to Clipboard', 'success');
                      }}
                      className="p-2 hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 rounded-lg transition-colors flex items-center"
                      title="Copy Share Link"
                    >
                      <Copy size={16} className="mr-1" />
                      <span className="text-[10px] font-bold">Link</span>
                    </button>
                    <button 
                      onClick={() => handleReturn(sale.id)}
                      className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors flex items-center"
                      title="Return Sale"
                    >
                      <RotateCcw size={16} className="mr-1" />
                      <span className="text-[10px] font-bold text-red-500">Return</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DueReport = () => {
  const { notify } = useNotification();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    salesPerson: '',
    customerName: '',
    supplier: '',
    overdueOnly: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reports/due');
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching due report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = (Array.isArray(data) ? data : []).filter(item => {
    if (filters.customerName && !item.customer_name.toLowerCase().includes(filters.customerName.toLowerCase())) return false;
    if (filters.salesPerson && !item.staff_name.toLowerCase().includes(filters.salesPerson.toLowerCase())) return false;
    if (filters.supplier && !item.supplier_name.toLowerCase().includes(filters.supplier.toLowerCase())) return false;
    if (filters.startDate && new Date(item.sale_date) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(item.sale_date) > new Date(filters.endDate)) return false;
    
    const isOverdue = item.final_due_date && new Date(item.final_due_date) < new Date();
    if (filters.overdueOnly && !isOverdue) return false;
    
    return true;
  });

  const stats = {
    totalOutstanding: filteredData.reduce((sum, item) => sum + ((item.sell_price ?? 0) - (item.total_paid ?? 0)), 0),
    totalCustomers: filteredData.length,
    overdueCustomers: filteredData.filter(item => item.final_due_date && new Date(item.final_due_date) < new Date()).length,
    dueThisMonth: filteredData.filter(item => {
      if (!item.final_due_date) return false;
      const d = new Date(item.final_due_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length
  };

  const exportCSV = () => {
    const headers = ['Model', 'Serial', 'Config', 'Sale Date', 'Buy Price', 'Sell Price', 'Paid', 'Remaining', 'Final Due Date', 'Customer', 'Phone', 'Address', 'Supplier', 'Sales Person'];
    const rows = filteredData.map(item => [
      item.model,
      item.serial_number,
      item.config,
      item.sale_date,
      item.buy_price,
      item.sell_price,
      item.total_paid,
      item.sell_price - item.total_paid,
      item.final_due_date || 'N/A',
      item.customer_name,
      item.customer_phone,
      item.customer_address,
      item.supplier_name,
      item.staff_name
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `JHF_Due_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text('JHF Laptop Zone', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('DUE REPORT', pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    
    autoTable(doc, {
      startY: 35,
      head: [['Model', 'Serial', 'Sale Date', 'Sell Price', 'Paid', 'Remaining', 'Final Due', 'Customer', 'Phone']],
      body: filteredData.map(item => [
        item.model,
        item.serial_number,
        new Date(item.sale_date).toLocaleDateString(),
        (item.sell_price ?? 0).toLocaleString(),
        (item.total_paid ?? 0).toLocaleString(),
        ((item.sell_price ?? 0) - (item.total_paid ?? 0)).toLocaleString(),
        item.final_due_date ? new Date(item.final_due_date).toLocaleDateString() : 'N/A',
        item.customer_name,
        item.customer_phone
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [57, 255, 20], textColor: [0, 0, 0] }
    });

    const finalY = ((doc as any).lastAutoTable?.finalY || 35) + 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Total Outstanding Due: ${(stats.totalOutstanding ?? 0).toLocaleString()} TK`, 15, finalY);
    
    doc.line(pageWidth - 60, finalY + 20, pageWidth - 15, finalY + 20);
    doc.text('Authorized Signature', pageWidth - 37.5, finalY + 25, { align: 'center' });

    // Footer
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text('Software Developed By Jahid Hasan | JHF Laptop Zone', pageWidth / 2, doc.internal.pageSize.height - 8, { align: 'center' });

    doc.save(`JHF_Due_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Due Report</h2>
          <p className="text-gray-400">Manage and track outstanding customer balances</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={exportCSV} className="btn-dark flex items-center">
            <FileSpreadsheet size={18} className="mr-2" /> CSV
          </button>
          <button onClick={exportPDF} className="btn-neon flex items-center">
            <Printer size={18} className="mr-2" /> PDF Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <p className="text-gray-500 text-xs font-bold uppercase mb-2">Total Outstanding</p>
          <p className="text-2xl font-bold text-neon-green">TK {(stats.totalOutstanding ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <p className="text-gray-500 text-xs font-bold uppercase mb-2">Customers with Due</p>
          <p className="text-2xl font-bold text-white">{stats.totalCustomers}</p>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <p className="text-gray-500 text-xs font-bold uppercase mb-2">Overdue Customers</p>
          <p className="text-2xl font-bold text-red-500">{stats.overdueCustomers}</p>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <p className="text-gray-500 text-xs font-bold uppercase mb-2">Due This Month</p>
          <p className="text-2xl font-bold text-yellow-500">{stats.dueThisMonth}</p>
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-4">
        <div className="flex items-center space-x-4">
          <Filter size={18} className="text-neon-green" />
          <h3 className="font-bold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input type="date" className="input-dark text-xs" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} placeholder="Start Date" />
          <input type="date" className="input-dark text-xs" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} placeholder="End Date" />
          <input className="input-dark text-xs" value={filters.customerName} onChange={e => setFilters({...filters, customerName: e.target.value})} placeholder="Customer Name" />
          <input className="input-dark text-xs" value={filters.salesPerson} onChange={e => setFilters({...filters, salesPerson: e.target.value})} placeholder="Sales Person" />
          <div className="flex items-center space-x-2">
            <input type="checkbox" checked={filters.overdueOnly} onChange={e => setFilters({...filters, overdueOnly: e.target.checked})} className="rounded border-dark-border bg-dark-bg text-neon-green focus:ring-neon-green" />
            <label className="text-xs text-gray-400">Overdue Only</label>
          </div>
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1200px]">
          <thead className="bg-dark-bg border-b border-dark-border">
            <tr>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Model / Serial</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Sale Date</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Prices (Buy/Sell)</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Paid / Remaining</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Final Due Date</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Customer Info</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Sales Person</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading report data...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">No records found</td></tr>
            ) : filteredData.map(item => {
              const remaining = item.sell_price - item.total_paid;
              const isOverdue = item.final_due_date && new Date(item.final_due_date) < new Date();
              const isDueSoon = item.final_due_date && new Date(item.final_due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              
              return (
                <tr key={item.id} className={`hover:bg-white/5 transition-colors ${isOverdue ? 'bg-red-500/5' : isDueSoon ? 'bg-yellow-500/5' : ''}`}>
                  <td className="p-4">
                    <p className="font-bold">{item.model}</p>
                    <p className="text-xs text-gray-500 font-mono">{item.serial_number}</p>
                  </td>
                  <td className="p-4 text-sm">{new Date(item.sale_date).toLocaleDateString()}</td>
                  <td className="p-4">
                    <p className="text-xs text-gray-500">Buy: TK {(item.buy_price ?? 0).toLocaleString()}</p>
                    <p className="text-sm font-bold">Sell: TK {(item.sell_price ?? 0).toLocaleString()}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-xs text-neon-green">Paid: TK {(item.total_paid ?? 0).toLocaleString()}</p>
                    <p className={`text-sm font-bold ${isOverdue ? 'text-red-500' : 'text-white'}`}>Due: TK {(remaining ?? 0).toLocaleString()}</p>
                  </td>
                  <td className="p-4">
                    <p className={`text-sm font-bold ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {item.final_due_date ? new Date(item.final_due_date).toLocaleDateString() : 'N/A'}
                    </p>
                    {isOverdue && <span className="text-[10px] text-red-500 font-bold uppercase">Overdue</span>}
                  </td>
                  <td className="p-4">
                    <p className="font-bold">{item.customer_name}</p>
                    <p className="text-xs text-gray-500">{item.customer_phone}</p>
                  </td>
                  <td className="p-4 text-sm">{item.staff_name}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { notify, confirm: confirmAction } = useNotification();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = () => axios.get('/api/backup/logs').then(res => setLogs(res.data));
  useEffect(() => { fetchLogs(); }, []);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/backup');
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", res.data.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      fetchLogs();
      notify('Backup generated and downloaded successfully!', 'success');
    } catch (err) {
      notify('Backup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    confirmAction('WARNING: This will clear all current data and restore from the backup file. Are you sure?', async () => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          await axios.post('/api/restore', { data });
          notify('Database restored successfully! The page will now reload.', 'success');
          setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
          const msg = err.response?.data?.message || err.message || 'Invalid file format';
          notify('Restore failed: ' + msg, 'error');
        }
      };
      reader.readAsText(file);
    });
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold">System Settings</h2>
        <p className="text-gray-400">Manage database backups and system configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-dark-card border border-dark-border p-8 rounded-3xl space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-neon-green/10 rounded-2xl flex items-center justify-center text-neon-green">
              <DbIcon size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Database Backup</h3>
              <p className="text-sm text-gray-500">Export all system data to a JSON file</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            Regular backups are recommended to prevent data loss. The backup includes all sales, inventory, installments, and user data.
          </p>
          <button 
            onClick={handleBackup} 
            disabled={loading}
            className="btn-neon w-full py-4 flex items-center justify-center"
          >
            {loading ? 'Generating...' : <><Download size={20} className="mr-2" /> Backup Now</>}
          </button>
        </div>

        <div className="bg-dark-card border border-dark-border p-8 rounded-3xl space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
              <RotateCcw size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Restore Database</h3>
              <p className="text-sm text-gray-500">Import data from a backup JSON file</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            Restoring will overwrite all current data. Please ensure you have a recent backup before proceeding.
          </p>
          <label className="btn-dark w-full py-4 flex items-center justify-center cursor-pointer">
            <Upload size={20} className="mr-2" /> Select Backup File
            <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-dark-border flex justify-between items-center">
          <h3 className="font-bold">Backup History</h3>
          <History size={18} className="text-gray-500" />
        </div>
        <table className="w-full text-left">
          <thead className="bg-dark-bg text-xs uppercase text-gray-500 font-bold">
            <tr>
              <th className="p-4">Date & Time</th>
              <th className="p-4">File Name</th>
              <th className="p-4">Generated By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {logs.map(log => (
              <tr key={log.id} className="text-sm">
                <td className="p-4">{new Date(log.backup_date).toLocaleString()}</td>
                <td className="p-4 font-mono text-xs text-gray-400">{log.file_name}</td>
                <td className="p-4">{log.user_name}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={3} className="p-8 text-center text-gray-500 italic">No backup history found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EMI = () => {
  const { notify } = useNotification();
  const [emis, setEmis] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [payModal, setPayModal] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');

  const fetchEmis = () => axios.get('/api/sales').then(res => setEmis((Array.isArray(res.data) ? res.data : []).filter((s: any) => s.payment_type === 'EMI' || s.payment_type === 'Due')));
  useEffect(() => { fetchEmis(); }, []);

  const fetchInstallments = async (saleId: number) => {
    const res = await axios.get(`/api/installments/${saleId}`);
    setInstallments(Array.isArray(res.data.installments) ? res.data.installments : []);
    setPayments(Array.isArray(res.data.payments) ? res.data.payments : []);
  };

  const handlePayment = async () => {
    try {
      await axios.post(`/api/installments/payment/${payModal.id}`, { 
        amount: parseFloat(payAmount),
        payment_type: paymentType,
        note: paymentNote
      });
      setPayModal(null);
      setPayAmount('');
      setPaymentNote('');
      fetchInstallments(selectedSale.id);
      fetchEmis();
    } catch (err) {
      notify('Payment failed', 'error');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Installment & Due Tracker</h2>
          <p className="text-gray-400">Monitor payments and installment timelines</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-dark-card border border-dark-border rounded-2xl overflow-hidden h-fit">
          <div className="p-4 border-b border-dark-border bg-dark-bg font-bold text-xs uppercase text-gray-500">
            Active Installments / Dues
          </div>
          <div className="divide-y divide-dark-border max-h-[600px] overflow-y-auto">
            {emis.map(sale => (
              <button 
                key={sale.id}
                onClick={() => { setSelectedSale(sale); fetchInstallments(sale.id); }}
                className={`w-full p-4 text-left hover:bg-white/5 transition-all ${selectedSale?.id === sale.id ? 'bg-neon-green/10 border-l-4 border-neon-green' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-sm">{sale.customer_name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${sale.payment_type === 'EMI' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-orange-500/20 text-orange-500'}`}>
                    {sale.payment_type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono mb-2">{sale.invoice_number}</p>
                <div className="flex justify-between items-end">
                  <p className="text-xs text-gray-400">{sale.model}</p>
                  <p className="text-sm font-bold text-neon-green">TK {(sale.sell_price ?? 0).toLocaleString()}</p>
                </div>
              </button>
            ))}
            {emis.length === 0 && <div className="p-8 text-center text-gray-500 italic">No active installments found</div>}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedSale ? (
            <>
              <div className="bg-dark-card border border-dark-border p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-bold">Customer Info</p>
                  <p className="font-bold">{selectedSale.customer_name}</p>
                  <p className="text-sm text-gray-400">{selectedSale.customer_phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-bold">Item Details</p>
                  <p className="font-bold">{selectedSale.model}</p>
                  <p className="text-xs text-gray-400 font-mono">{selectedSale.serial_number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-bold">Financial Summary</p>
                  <p className="text-sm">Total: <span className="font-bold">TK {(selectedSale?.sell_price ?? 0).toLocaleString()}</span></p>
                  <p className="text-sm text-neon-green">Paid: <span className="font-bold">TK {((installments || []).reduce((sum, i) => sum + i.paid_amount, 0) ?? 0).toLocaleString()}</span></p>
                  <p className="text-sm text-red-500">Due: <span className="font-bold">TK {((selectedSale?.sell_price ?? 0) - (installments || []).reduce((sum, i) => sum + i.paid_amount, 0)).toLocaleString()}</span></p>
                </div>
              </div>

              <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-dark-border bg-dark-bg font-bold text-xs uppercase text-gray-500">
                  Installment Timeline
                </div>
                <table className="w-full text-left">
                  <thead className="text-xs text-gray-500 uppercase font-bold border-b border-dark-border">
                    <tr>
                      <th className="p-4">#</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Paid</th>
                      <th className="p-4">Remaining</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {installments.map(inst => (
                      <tr key={inst.id} className="text-sm">
                        <td className="p-4 font-bold">{inst.installment_number}</td>
                        <td className="p-4">{new Date(inst.due_date).toLocaleDateString()}</td>
                        <td className="p-4 font-bold">TK {(inst.amount ?? 0).toLocaleString()}</td>
                        <td className="p-4 text-neon-green font-bold">TK {(inst.paid_amount ?? 0).toLocaleString()}</td>
                        <td className="p-4 text-xs text-gray-500">TK {(inst.remaining_balance ?? 0).toLocaleString() || ((selectedSale?.sell_price ?? 0) - (installments || []).filter(i => i.installment_number <= inst.installment_number).reduce((acc, i) => acc + i.amount, 0)).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inst.status === 'Paid' ? 'bg-neon-green/20 text-neon-green' : 
                            new Date(inst.due_date) < new Date() ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {new Date(inst.due_date) < new Date() && inst.status !== 'Paid' ? 'Overdue' : inst.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {inst.status !== 'Paid' && (
                            <button 
                              onClick={() => { setPayModal(inst); setPayAmount((inst.amount - inst.paid_amount).toString()); }}
                              className="text-neon-green hover:underline font-bold"
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-dark-border bg-dark-bg font-bold text-xs uppercase text-gray-500">
                  Full Payment History
                </div>
                <table className="w-full text-left">
                  <thead className="text-xs text-gray-500 uppercase font-bold border-b border-dark-border">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {payments.map(p => (
                      <tr key={p.id} className="text-sm">
                        <td className="p-4 text-gray-400">{p.payment_date ? new Date(p.payment_date).toLocaleString() : 'N/A'}</td>
                        <td className="p-4 uppercase text-[10px] font-bold text-neon-green">{p.payment_type}</td>
                        <td className="p-4 font-bold">TK {(p.amount ?? 0).toLocaleString()}</td>
                        <td className="p-4 text-xs text-gray-500">{p.note}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500 italic">No payment history found</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-dark-card border border-dark-border border-dashed rounded-2xl p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-dark-bg rounded-full flex items-center justify-center text-gray-600">
                <ChevronRight size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-400">Select a Sale</h3>
                <p className="text-gray-500">Choose a customer from the left to view their installment timeline</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {payModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Record Payment</h3>
              <button onClick={() => setPayModal(null)} className="text-gray-400 hover:text-white"><X /></button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                <p className="text-xs text-gray-500 uppercase">Installment #{payModal.installment_number}</p>
                <p className="font-bold">Amount: TK {(payModal.amount ?? 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-2">Remaining: TK {((payModal.amount ?? 0) - (payModal.paid_amount ?? 0)).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Payment Amount (TK)</label>
                <input 
                  type="number" 
                  className="input-dark w-full text-xl font-bold text-neon-green" 
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Payment Type</label>
                <select className="input-dark w-full" value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Bkash">Bkash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                  <option value="POS">POS</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Note (Optional)</label>
                <input 
                  className="input-dark w-full" 
                  value={paymentNote} 
                  onChange={e => setPaymentNote(e.target.value)}
                  placeholder="Reference or note..."
                />
              </div>
              <button onClick={handlePayment} className="btn-neon w-full py-3">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TypingAnimation = ({ text, speed = 100 }: { text: string, speed?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
        // Play a mechanical typing sound
        const audio = new Audio('https://www.soundjay.com/communication/typewriter-key-1.mp3');
        audio.volume = 0.1;
        audio.play().catch(() => {});
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [index, text, speed]);

  return <span className="font-black text-neon-green drop-shadow-[0_0_8px_rgba(0,255,0,0.5)]">{displayedText}</span>;
};

const Login = () => {
  const { notify } = useNotification();
  const [accessId, setAccessId] = useState('');
  const [password, setPassword] = useState('');
  const [isDbError, setIsDbError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDbError(false);
    try {
      await login(accessId, password);
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.message || err.message;
      if (message.includes('getaddrinfo') || message.includes('EAI_AGAIN')) {
        setIsDbError(true);
        notify('Database connection error: Could not resolve the database host.', 'error');
      } else {
        notify(message, 'error');
      }
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-dark-bg p-4 overflow-hidden relative">
      {/* Matrix-like background effect */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="grid grid-cols-12 gap-4 h-full w-full p-4">
          {Array.from({ length: 48 }).map((_, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: [0, 1, 0], y: [0, 100, 200] }}
              transition={{ duration: Math.random() * 5 + 2, repeat: Infinity, delay: Math.random() * 5 }}
              className="text-neon-green text-[10px] font-mono break-all"
            >
              {Math.random().toString(36).substring(2, 15)}
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        <div className="text-center">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="w-20 h-20 bg-neon-green/10 border border-neon-green/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,255,0,0.2)]"
          >
            <Laptop size={40} className="text-neon-green" />
          </motion.div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
            JHF LAPTOP <span className="text-neon-green">ZONE</span>
          </h1>
          <div className="h-6 mt-2 flex justify-center items-center">
            <TypAnimationWrapper />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-dark-card border border-dark-border p-8 rounded-3xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Access ID</label>
            <input 
              required 
              type="text" 
              className="input-dark w-full py-3 font-mono" 
              value={accessId} 
              onChange={e => setAccessId(e.target.value)}
              placeholder="Enter your Access ID"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Password</label>
            <input 
              required 
              type="password" 
              className="input-dark w-full py-3 font-mono" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            className="btn-neon w-full py-4 text-lg mt-4 shadow-lg shadow-neon-green/20 font-black uppercase tracking-widest"
          >
            Access System
          </motion.button>

          {isDbError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl space-y-3"
            >
              <div className="flex items-center space-x-2 text-red-500 font-bold text-sm">
                <AlertTriangle size={16} />
                <span>Connection Troubleshooting</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                It looks like the system cannot reach your database. This usually happens when using a Render <strong>Internal URL</strong>.
              </p>
              <div className="bg-black/40 p-3 rounded-xl space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Required Action:</p>
                <ol className="text-[10px] text-gray-300 list-decimal list-inside space-y-1">
                  <li>Go to Render Dashboard</li>
                  <li>Copy the <strong>External Database URL</strong></li>
                  <li>Update <strong>DATABASE_URL</strong> in AI Studio Secrets</li>
                </ol>
              </div>
            </motion.div>
          )}
        </form>
        
        <p className="text-center text-xs text-gray-600 font-mono">
          &copy; 2024 JHF Laptop Zone. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

const TypAnimationWrapper = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  if (!show) return null;
  return <TypingAnimation text="INITIALIZING SECURE SESSION..." />;
};

const BarcodeScanner = ({ onScan, onClose }: { onScan: (text: string) => void, onClose: () => void }) => {
  useEffect(() => {
    const html5QrCode = new (window as any).Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, (decodedText: string) => {
      onScan(decodedText);
      html5QrCode.stop().then(() => onClose());
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-dark-card border border-neon-green rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-dark-border flex justify-between items-center">
          <h3 className="font-bold">Scan Barcode / Serial</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X /></button>
        </div>
        <div id="reader" className="w-full aspect-square"></div>
        <div className="p-4 text-center text-xs text-gray-500">
          Point your camera at the barcode or serial number
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const { notify } = useNotification();
  const [data, setData] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const handleDownloadInventoryReport = async () => {
    try {
      const res = await axios.get('/api/reports/inventory');
      window.open(res.data.pdfUrl, '_blank');
      notify('Inventory report generated', 'success');
    } catch (err: any) {
      notify('Failed to generate report', 'error');
    }
  };

  useEffect(() => {
    axios.get('/api/dashboard/stats').then(res => setData(res.data));
    axios.get('/api/sales').then(res => setSales(Array.isArray(res.data) ? res.data : []));
  }, []);

  const generateSalesReport = () => {
    const filteredSales = (Array.isArray(sales) ? sales : []).filter(s => {
      try {
        const saleDate = new Date(s.sale_date);
        if (isNaN(saleDate.getTime())) return false;
        if (reportType === 'monthly') {
          return saleDate.toISOString().slice(0, 7) === selectedMonth;
        } else {
          return saleDate.getFullYear().toString() === selectedYear;
        }
      } catch (e) {
        return false;
      }
    });

    if (filteredSales.length === 0) {
      notify('No sales found for the selected period', 'error');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.width;
      
      // Header (Same as Invoice)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text('JHF Laptop Zone', pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text('Best Laptop Buy, Sell & Accessories Importer, Traders & Suppliers', pageWidth / 2, 20, { align: 'center' });
      doc.text(`SALES REPORT - ${reportType === 'monthly' ? selectedMonth : selectedYear}`, pageWidth / 2, 28, { align: 'center' });
      
      doc.setLineWidth(0.2);
      doc.line(10, 35, pageWidth - 10, 35);

      const totalBuy = filteredSales.reduce((sum, s) => sum + (s.buy_price ?? 0), 0);
      const totalSales = filteredSales.reduce((sum, s) => sum + (s.sell_price ?? 0), 0);
      const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit ?? 0), 0);
      const avgMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

      autoTable(doc, {
        startY: 40,
        head: [['Model', 'Serial', 'Sale Date', 'Buy Price', 'Sell Price', 'Profit', 'Margin %', 'Customer', 'Sales Person']],
        body: filteredSales.map(s => [
          s.model,
          s.serial_number,
          new Date(s.sale_date).toLocaleDateString(),
          (s.buy_price ?? 0).toLocaleString(),
          (s.sell_price ?? 0).toLocaleString(),
          (s.profit ?? 0).toLocaleString(),
          s.sell_price > 0 ? ((s.profit / s.sell_price) * 100).toFixed(1) + '%' : '0%',
          s.customer_name,
          s.staff_name || s.staff_id
        ]),
        foot: [[
          'Total:', 
          '', 
          '', 
          totalBuy.toLocaleString(), 
          totalSales.toLocaleString(), 
          totalProfit.toLocaleString(), 
          avgMargin.toFixed(1) + '%',
          '', 
          ''
        ]],
        theme: 'grid',
        styles: { fontSize: 7 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });

      const finalY = ((doc as any).lastAutoTable?.finalY || 40) + 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Total Sold Units: ${filteredSales.length}`, 15, finalY);
      doc.text(`Total Sales Amount: TK ${(totalSales ?? 0).toLocaleString()}`, 15, finalY + 7);
      doc.text(`Total Profit: TK ${(totalProfit ?? 0).toLocaleString()}`, 15, finalY + 14);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, doc.internal.pageSize.height - 15);
      
      doc.line(pageWidth - 60, doc.internal.pageSize.height - 25, pageWidth - 15, doc.internal.pageSize.height - 25);
      doc.text('Authorized Signature', pageWidth - 37.5, doc.internal.pageSize.height - 20, { align: 'center' });

      // Footer
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text('Software Developed By Jahid Hasan | JHF Laptop Zone', pageWidth / 2, doc.internal.pageSize.height - 8, { align: 'center' });

      const fileName = reportType === 'monthly' ? `JHF_Sales_Report_Month_${selectedMonth}.pdf` : `JHF_Sales_Report_Year_${selectedYear}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      notify('Failed to generate PDF report', 'error');
    }
  };

  if (!data) return <div className="p-8 text-neon-green">Loading reports...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Business Reports</h2>
        <div className="flex space-x-4">
          <button onClick={handleDownloadInventoryReport} className="flex items-center px-4 py-2 bg-dark-border text-white rounded-lg hover:bg-dark-border/80 transition-all">
            <Download size={18} className="mr-2" /> Stock Report
          </button>
          <button onClick={() => window.print()} className="btn-neon flex items-center">
            <FileText size={18} className="mr-2" /> Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <h4 className="text-gray-500 text-xs font-bold uppercase mb-4">Profit Analysis</h4>
          <p className="text-3xl font-bold text-neon-green">TK {(data.totalProfit ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">Total net profit from all sales</p>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <h4 className="text-gray-500 text-xs font-bold uppercase mb-4">Total Revenue</h4>
          <p className="text-3xl font-bold text-white">TK {(data.totalSalesAmount ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">Gross sales volume</p>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
          <h4 className="text-gray-500 text-xs font-bold uppercase mb-4">Sales Volume</h4>
          <p className="text-3xl font-bold text-white">{data.totalSalesCount}</p>
          <p className="text-xs text-gray-400 mt-2">Total units sold to date</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-dark-card border border-dark-border p-8 rounded-3xl space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-neon-green/10 rounded-2xl flex items-center justify-center text-neon-green">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Sales Report Generator</h3>
              <p className="text-sm text-gray-500">Generate professional PDF sales reports</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Report Type</label>
              <select className="input-dark w-full" value={reportType} onChange={e => setReportType(e.target.value as any)}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {reportType === 'monthly' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Select Month</label>
                <input type="month" className="input-dark w-full" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Select Year</label>
                <select className="input-dark w-full" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                  {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
          </div>

          <button onClick={generateSalesReport} className="btn-neon w-full py-4 flex items-center justify-center">
            <Printer size={20} className="mr-2" /> Generate PDF Report
          </button>
        </div>

        <div className="bg-dark-card border border-dark-border p-8 rounded-3xl">
          <h3 className="text-xl font-bold mb-6">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-dark-bg rounded-2xl border border-dark-border">
              <span className="text-gray-400">Total Sales Volume</span>
              <span className="text-xl font-bold text-neon-green">TK {(data.totalSalesAmount ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-dark-bg rounded-2xl border border-dark-border">
              <span className="text-gray-400">Total Estimated Profit</span>
              <span className="text-xl font-bold text-white">TK {(data.totalProfit ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-dark-bg rounded-2xl border border-dark-border">
              <span className="text-gray-400">EMI Outstanding</span>
              <span className="text-xl font-bold text-yellow-500">TK {(data.emiOutstanding ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Suppliers = () => {
  const { notify, confirm: confirmAction } = useNotification();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', mobile: '', address: '', opening_balance: '0' });

  const fetchSuppliers = () => axios.get('/api/suppliers').then(res => setSuppliers(res.data));
  useEffect(() => { fetchSuppliers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await axios.put(`/api/suppliers/${editingSupplier.id}`, formData);
      } else {
        await axios.post('/api/suppliers', formData);
      }
      setShowAdd(false);
      setEditingSupplier(null);
      fetchSuppliers();
      setFormData({ name: '', mobile: '', address: '', opening_balance: '0' });
    } catch (err: any) {
      notify(err.response?.data?.message || 'Error saving supplier', 'error');
    }
  };

  const handleEdit = (s: any) => {
    setEditingSupplier(s);
    setFormData({ name: s.name, mobile: s.mobile || '', address: s.address || '', opening_balance: s.opening_balance.toString() });
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    confirmAction('Are you sure? This will delete all purchase records for this supplier.', async () => {
      try {
        await axios.delete(`/api/suppliers/${id}`);
        fetchSuppliers();
        notify('Supplier deleted', 'success');
      } catch (err: any) {
        notify('Error deleting supplier', 'error');
      }
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Supplier List</h2>
        <button onClick={() => setShowAdd(true)} className="btn-neon flex items-center">
          <Plus size={18} className="mr-2" /> Add New Supplier
        </button>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-dark-bg border-b border-dark-border">
            <tr>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Supplier Name</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Mobile</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Address</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Total Purchase</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Total Paid</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Due</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {suppliers.map(s => {
              const due = (s.total_purchase + s.opening_balance) - s.total_paid;
              return (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="p-4 font-bold">{s.name}</td>
                  <td className="p-4 text-gray-400">{s.mobile}</td>
                  <td className="p-4 text-xs text-gray-500">{s.address}</td>
                  <td className="p-4">TK {(s.total_purchase ?? 0).toLocaleString()}</td>
                  <td className="p-4">TK {(s.total_paid ?? 0).toLocaleString()}</td>
                  <td className="p-4 font-bold text-red-500">TK {(due ?? 0).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleEdit(s)} className="p-2 hover:bg-neon-green/10 text-gray-400 hover:text-neon-green rounded-lg">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Supplier Name</label>
                <input required className="input-dark w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Mobile Number</label>
                <input className="input-dark w-full" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Shop Address</label>
                <textarea className="input-dark w-full h-20" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Opening Balance (TK)</label>
                <input type="number" className="input-dark w-full" value={formData.opening_balance} onChange={e => setFormData({...formData, opening_balance: e.target.value})} />
              </div>
              <button type="submit" className="btn-neon w-full mt-4">Save Supplier</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SupplierLedger = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [ledger, setLedger] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/suppliers').then(res => setSuppliers(res.data));
  }, []);

  useEffect(() => {
    if (selectedId) {
      axios.get(`/api/suppliers/ledger/${selectedId}`).then(res => setLedger(res.data));
    } else {
      setLedger(null);
    }
  }, [selectedId]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Supplier Ledger</h2>
        <select className="input-dark w-64" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          <option value="">Select Supplier</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {ledger && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <p className="text-gray-500 text-xs font-bold uppercase mb-2">Total Purchase</p>
              <p className="text-2xl font-bold text-white">TK {((ledger?.purchases || []).reduce((acc: any, p: any) => acc + p.purchase_amount, 0) ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <p className="text-gray-500 text-xs font-bold uppercase mb-2">Total Paid</p>
              <p className="text-2xl font-bold text-neon-green">TK {((ledger?.payments || []).reduce((acc: any, p: any) => acc + p.payment_amount, 0) ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <p className="text-gray-500 text-xs font-bold uppercase mb-2">Remaining Due</p>
              {(() => {
                const totalP = (ledger?.purchases || []).reduce((acc: any, p: any) => acc + p.purchase_amount, 0);
                const totalPaid = (ledger?.payments || []).reduce((acc: any, p: any) => acc + p.payment_amount, 0);
                const due = (totalP + (ledger?.supplier?.opening_balance ?? 0)) - totalPaid;
                return <p className="text-2xl font-bold text-red-500">TK {(due ?? 0).toLocaleString()}</p>;
              })()}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Purchase History</h3>
            <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-dark-bg border-b border-dark-border">
                  <tr>
                    <th className="p-4 text-xs uppercase text-gray-500 font-bold">Date</th>
                    <th className="p-4 text-xs uppercase text-gray-500 font-bold">Product</th>
                    <th className="p-4 text-xs uppercase text-gray-500 font-bold">Serial Number</th>
                    <th className="p-4 text-xs uppercase text-gray-500 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {ledger.purchases.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="p-4 text-sm text-gray-400">{p.purchase_date}</td>
                      <td className="p-4">
                        <p className="font-bold">{p.model}</p>
                        <p className="text-xs text-gray-500">{p.config}</p>
                      </td>
                      <td className="p-4 font-mono text-xs">{p.serial_number}</td>
                      <td className="p-4 text-right font-bold">TK {(p.purchase_amount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Payment History</h3>
            <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-dark-bg border-b border-dark-border">
                  <tr>
                    <th className="p-4 text-xs uppercase text-gray-500 font-bold">Date</th>
                    <th className="p-4 text-xs uppercase text-gray-500 font-bold">Type</th>
                    <th className="p-4 text-xs uppercase text-gray-500 font-bold">Note</th>
                    <th className="p-4 text-xs uppercase text-gray-500 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {ledger.payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="p-4 text-sm text-gray-400">{p.payment_date}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-dark-bg border border-dark-border rounded text-[10px] font-bold uppercase text-neon-green">
                          {p.payment_type}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-500">{p.note}</td>
                      <td className="p-4 text-right font-bold text-neon-green">TK {(p.payment_amount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SupplierPayment = () => {
  const { notify } = useNotification();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    supplier_id: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_amount: '',
    payment_type: 'Cash',
    note: ''
  });

  useEffect(() => {
    axios.get('/api/suppliers').then(res => setSuppliers(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/suppliers/payments', formData);
      notify('Payment recorded successfully', 'success');
      setFormData({
        supplier_id: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_amount: '',
        payment_type: 'Cash',
        note: ''
      });
    } catch (err: any) {
      notify(err.response?.data?.message || 'Error recording payment', 'error');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="bg-dark-card border border-dark-border p-8 rounded-3xl space-y-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-neon-green/10 rounded-2xl flex items-center justify-center text-neon-green">
            <CreditCard size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Supplier Payment</h2>
            <p className="text-sm text-gray-500">Record payments made to suppliers</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Select Supplier</label>
            <select required className="input-dark w-full" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}>
              <option value="">Choose Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Payment Date</label>
              <input required type="date" className="input-dark w-full" value={formData.payment_date} onChange={e => setFormData({...formData, payment_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Amount (TK)</label>
              <input required type="number" className="input-dark w-full" value={formData.payment_amount} onChange={e => setFormData({...formData, payment_amount: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Payment Type</label>
            <select className="input-dark w-full" value={formData.payment_type} onChange={e => setFormData({...formData, payment_type: e.target.value})}>
              <option value="Cash">Cash</option>
              <option value="Bank Account">Bank Account</option>
              <option value="Bkash">Bkash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="POS">POS</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Note (Optional)</label>
            <textarea className="input-dark w-full h-24" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Payment reference or note..." />
          </div>

          <button type="submit" className="btn-neon w-full py-4 font-bold">Record Payment</button>
        </form>
      </div>
    </div>
  );
};

const SupplierReport = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [filters, setFilters] = useState({ supplier_id: '', start_date: '', end_date: '' });
  const [reportData, setReportData] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/suppliers').then(res => setSuppliers(res.data));
  }, []);

  const fetchReport = async () => {
    const res = await axios.get('/api/reports/supplier', { params: filters });
    setReportData(Array.isArray(res.data) ? res.data : []);
  };

  const generatePDF = (sup: any) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(20);
    doc.text('JHF Laptop Zone - Supplier Report', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Supplier: ${sup.name}`, 15, 25);
    doc.text(`Date Range: ${filters.start_date || 'All'} to ${filters.end_date || 'All'}`, 15, 32);

    const due = ((sup?.total_purchase ?? 0) + (sup?.opening_balance ?? 0)) - (sup?.total_paid ?? 0);
    doc.text(`Summary: Total Purchase: ${(sup?.total_purchase ?? 0).toLocaleString()} | Total Paid: ${(sup?.total_paid ?? 0).toLocaleString()} | Remaining Due: ${(due ?? 0).toLocaleString()}`, 15, 45);

    doc.setFontSize(14);
    doc.text('Purchase History', 15, 55);
    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Product', 'Serial Number', 'Amount']],
      body: (sup?.purchases || []).map((p: any) => [p.purchase_date, p.model, p.serial_number, (p.purchase_amount ?? 0).toLocaleString()]),
      theme: 'grid'
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 60;
    doc.text('Payment History', 15, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Date', 'Type', 'Note', 'Amount']],
      body: (sup?.payments || []).map((p: any) => [p.payment_date, p.payment_type, p.note, (p.payment_amount ?? 0).toLocaleString()]),
      theme: 'grid'
    });

    // Footer
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text('Software Developed By Jahid Hasan | JHF Laptop Zone', pageWidth / 2, doc.internal.pageSize.height - 8, { align: 'center' });

    doc.save(`JHF_Supplier_Report_${sup.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-6">
        <h2 className="text-2xl font-bold">Supplier Report Generator</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Supplier</label>
            <select className="input-dark w-full" value={filters.supplier_id} onChange={e => setFilters({...filters, supplier_id: e.target.value})}>
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Start Date</label>
            <input type="date" className="input-dark w-full" value={filters.start_date} onChange={e => setFilters({...filters, start_date: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">End Date</label>
            <input type="date" className="input-dark w-full" value={filters.end_date} onChange={e => setFilters({...filters, end_date: e.target.value})} />
          </div>
          <button onClick={fetchReport} className="btn-neon py-3">Generate Report</button>
        </div>
      </div>

      {Array.isArray(reportData) && reportData.length > 0 && (
        <div className="space-y-6">
          {reportData.map(sup => (
            <div key={sup.id} className="bg-dark-card border border-dark-border p-6 rounded-2xl flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{sup.name}</h3>
                <p className="text-sm text-gray-500">
                  Purchases: TK {(sup.total_purchase ?? 0).toLocaleString()} | Paid: TK {(sup.total_paid ?? 0).toLocaleString()} | Due: TK {(((sup.total_purchase ?? 0) + (sup.opening_balance ?? 0)) - (sup.total_paid ?? 0)).toLocaleString()}
                </p>
              </div>
              <button onClick={() => generatePDF(sup)} className="p-3 bg-neon-green/10 text-neon-green rounded-xl hover:bg-neon-green/20 transition-all">
                <Download size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Staff = () => {
  const { notify, confirm: confirmAction } = useNotification();
  const [staff, setStaff] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  
  const [formData, setFormData] = useState({ name: '', access_id: '', password: '', role: 'Staff' });

  const fetchStaff = () => axios.get('/api/users').then(res => setStaff(res.data));
  useEffect(() => { fetchStaff(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await axios.put(`/api/users/${editingStaff.id}`, formData);
        notify('Staff member updated', 'success');
      } else {
        await axios.post('/api/users', formData);
        notify('Staff member added', 'success');
      }
      setShowAdd(false);
      setEditingStaff(null);
      fetchStaff();
      setFormData({ name: '', access_id: '', password: '', role: 'Staff' });
    } catch (err: any) {
      notify(err.response?.data?.message || 'Error saving staff', 'error');
    }
  };

  const handleEdit = (s: any) => {
    setEditingStaff(s);
    setFormData({ name: s.name, access_id: s.access_id, password: '', role: s.role });
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    confirmAction('Are you sure you want to delete this staff member?', async () => {
      try {
        await axios.delete(`/api/users/${id}`);
        fetchStaff();
        notify('Staff member deleted', 'success');
      } catch (err: any) {
        notify(err.response?.data?.message || 'Error deleting staff', 'error');
      }
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-gray-400">Manage your team and their access levels</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-neon flex items-center">
          <Plus size={18} className="mr-2" /> Add Staff Member
        </button>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-dark-bg border-b border-dark-border">
            <tr>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Name</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Access ID</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Role</th>
              <th className="p-4 text-xs uppercase text-gray-500 font-bold">Status</th>
              {isAdmin && <th className="p-4 text-xs uppercase text-gray-500 font-bold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-white/5">
                <td className="p-4 font-bold">{s.name}</td>
                <td className="p-4 text-gray-400">{s.access_id}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-dark-bg border border-dark-border rounded text-[10px] font-bold uppercase text-neon-green">
                    {s.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-xs text-green-500 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> Active
                  </span>
                </td>
                {isAdmin && (
                  <td className="p-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleEdit(s)} className="p-2 hover:bg-neon-green/10 text-gray-400 hover:text-neon-green rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id)} 
                        disabled={s.id === user?.id}
                        className={`p-2 rounded-lg transition-colors ${s.id === user?.id ? 'opacity-20 cursor-not-allowed' : 'hover:bg-red-500/10 text-gray-400 hover:text-red-500'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-2xl p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingStaff ? 'Edit Staff member' : 'Add New Staff'}</h3>
              <button onClick={() => { setShowAdd(false); setEditingStaff(null); }} className="text-gray-400 hover:text-white"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Full Name</label>
                <input required className="input-dark w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Jahid Hasan" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Access ID</label>
                <input required className="input-dark w-full" value={formData.access_id} onChange={e => setFormData({...formData, access_id: e.target.value})} placeholder="Enter Access ID" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Password {editingStaff && '(Leave blank to keep current)'}</label>
                <input required={!editingStaff} type="password" minLength={6} className="input-dark w-full" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Role</label>
                <select className="input-dark w-full" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  {isAdmin && <option value="Admin">Admin</option>}
                </select>
              </div>
              <button type="submit" className="btn-neon w-full mt-4">{editingStaff ? 'Update Account' : 'Create Account'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const PublicInvoiceView = () => {
  const { invoiceNumber } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await axios.get(`/api/public/invoice/${invoiceNumber}?token=${token}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    if (invoiceNumber && token) fetchInvoice();
    else {
      setLoading(false);
      setError('Invalid invoice link');
    }
  }, [invoiceNumber, token]);

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center text-neon-green">
      <div className="animate-pulse text-2xl font-bold">Loading Invoice...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center text-red-500 p-4 text-center">
      <div>
        <AlertTriangle size={48} className="mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.href = '/'} className="mt-4 text-neon-green hover:underline">Go Home</button>
      </div>
    </div>
  );

  const { sale, installments } = data;

  return (
    <div className="min-h-screen bg-dark-bg text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-dark-card border border-dark-border p-8 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-1 border-b border-dark-border pb-6">
          <h1 className="text-4xl font-bold text-neon-green">JHF Laptop Zone</h1>
          <p className="text-sm text-gray-400">Best Laptop Buy, Sell & Accessories Importer, Traders & Suppliers</p>
          <p className="text-xs text-gray-500">Branch Office : Baroipara Bazar, Chandra, Gazipur</p>
          <p className="text-xs text-gray-500">Main Office : Sonali Trade, Shop No : 1001 & 1040</p>
          <p className="text-xs text-gray-500">ECS Computer City Centre, Multiplan, New Elephant Road, Dhaka</p>
          <p className="text-xs text-gray-500">Mobile : 01935-693071, 01731-693071</p>
          <div className="flex justify-center space-x-4 text-[10px] text-gray-500 mt-2">
            <span>Email : jhflaptopzone@gmail.com</span>
            <span>Web : www.jhflaptopzone.com</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold uppercase tracking-widest text-neon-green">Sales Invoice</h2>
          <button 
            onClick={() => window.open(`/invoices/${sale.invoice_pdf_path}`, '_blank')}
            className="px-4 py-2 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green/80 transition-colors flex items-center text-sm"
          >
            <Download size={16} className="mr-2" />
            Download PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-2">
            <p><span className="text-gray-500 font-bold uppercase text-[10px]">Customer:</span> <span className="text-lg">{sale.customer_name}</span></p>
            <p><span className="text-gray-500 font-bold uppercase text-[10px]">Mobile:</span> {sale.customer_phone}</p>
            <p><span className="text-gray-500 font-bold uppercase text-[10px]">Address:</span> {sale.customer_address || 'N/A'}</p>
          </div>

          <div className="md:text-right space-y-2">
            <p><span className="text-gray-500 font-bold uppercase text-[10px]">Invoice No:</span> <span className="font-mono text-neon-green">{sale.invoice_number}</span></p>
            <p><span className="text-gray-500 font-bold uppercase text-[10px]">Date:</span> {new Date(sale.sale_date).toLocaleDateString()}</p>
            <p><span className="text-gray-500 font-bold uppercase text-[10px]">Sales By:</span> {sale.staff_name || 'System Admin'}</p>
          </div>
        </div>

        <div className="border border-dark-border rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-dark-bg border-b border-dark-border">
              <tr>
                <th className="p-4 text-gray-500 uppercase text-[10px] w-16 text-center">SL</th>
                <th className="p-4 text-gray-500 uppercase text-[10px]">Item Name</th>
                <th className="p-4 text-gray-500 uppercase text-[10px] w-20 text-center">Qty</th>
                <th className="p-4 text-gray-500 uppercase text-[10px] w-32 text-right">Unit Price</th>
                <th className="p-4 text-gray-500 uppercase text-[10px] w-32 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              <tr>
                <td className="p-4 text-center text-gray-500">1</td>
                <td className="p-4">
                  <div className="font-bold text-lg">{sale.model}</div>
                  <div className="text-xs text-gray-400 mt-1">{sale.config}</div>
                  <div className="text-[10px] font-mono text-neon-green mt-1">SN: {sale.serial_number}</div>
                </td>
                <td className="p-4 text-center">1</td>
                <td className="p-4 text-right">TK {(sale?.sell_price ?? 0).toLocaleString()}</td>
                <td className="p-4 text-right font-bold text-neon-green">TK {(sale?.sell_price ?? 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="bg-neon-green/10 border border-neon-green/20 p-4 rounded-xl flex items-center space-x-8">
            <span className="text-gray-400 font-bold uppercase text-xs">Total Amount</span>
            <span className="text-2xl font-bold text-neon-green">TK {(sale?.sell_price ?? 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-sm italic text-gray-400">
            <span className="text-gray-500 font-bold not-italic uppercase text-[10px] mr-2">In Words:</span>
            {numberToWords(sale?.sell_price ?? 0)} Taka Only
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-neon-green tracking-widest">Warranty Policy</h4>
              <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                <li>Full Laptop & Spare Parts : 1 Month</li>
                <li>Service : 5 Years</li>
              </ul>
            </div>

            {(installments || []).length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-neon-green tracking-widest">Installment Timeline</h4>
                <div className="space-y-2">
                  {(installments || []).map((inst: any) => (
                    <div key={inst.id} className="flex justify-between text-xs p-2 bg-white/5 rounded border border-white/5">
                      <span>#{inst.installment_number} - {inst.due_date}</span>
                      <span className="font-bold">TK {(inst.amount ?? 0).toLocaleString()}</span>
                      <span className={inst.status === 'Paid' ? 'text-neon-green' : 'text-yellow-500'}>{inst.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-16 grid grid-cols-2 gap-12 text-center">
          <div className="space-y-2">
            <div className="border-t border-dark-border pt-2 text-[10px] uppercase text-gray-500">Customer Signature</div>
          </div>
          <div className="space-y-2">
            <div className="border-t border-dark-border pt-2 text-[10px] uppercase text-gray-500">Authorized Signature</div>
          </div>
        </div>

        <div className="text-center space-y-2 pt-8 border-t border-dark-border">
          <p className="text-xl font-bold text-neon-green italic">Thank You For Your Purchase</p>
          <p className="text-[10px] text-gray-600">Software Developed By Jahid Hasan | JHF Laptop Zone</p>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/invoice/view/:invoiceNumber" element={<PublicInvoiceView />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-y-auto bg-dark-bg">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/sales-history" element={<SalesHistory />} />
                        <Route path="/emi" element={<EMI />} />
                        <Route path="/due-report" element={<DueReport />} />
                        <Route path="/suppliers" element={<Suppliers />} />
                        <Route path="/suppliers/ledger" element={<SupplierLedger />} />
                        <Route path="/suppliers/payment" element={<SupplierPayment />} />
                        <Route path="/suppliers/report" element={<SupplierReport />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/staff" element={<Staff />} />
                        <Route path="/settings" element={<SettingsPage />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
}
