
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Smartphone, 
  Wifi, 
  History as HistoryIcon, 
  MessageCircle, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  X, 
  CreditCard, 
  User as UserIcon, 
  Zap, 
  Filter, 
  Copy, 
  Calendar, 
  Hash, 
  ExternalLink, 
  ChevronDown, 
  Info, 
  ShieldCheck,
  Search,
  LogIn,
  UserPlus,
  LogOut,
  Mail,
  Lock,
  Sun,
  Moon,
  Monitor,
  Save,
  Settings,
  AlertCircle,
  Clock,
  UserCheck,
  Sparkles,
  Bell,
  Repeat,
  Trash2,
  Plus,
  ZapOff,
  Building2,
  PhoneCall,
  ShoppingBag
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Carrier, ProductType, DataPlan, Transaction, ChatMessage } from './types';
import { CARRIERS, MOCK_DATA_PLANS } from './constants';
import { getGeminiRecommendation } from './services/geminiService';

type Theme = 'light' | 'dark' | 'system';
type PaymentMethod = 'Card' | 'USSD' | 'Transfer';

interface RecurringPlan {
  id: string;
  planId: string;
  planName: string;
  phoneNumber: string;
  carrier: Carrier;
  price: number;
  nextRenewal: string;
  frequency: string;
}

const App: React.FC = () => {
  // Authentication & Loading State
  const [isSplashScreen, setIsSplashScreen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [activeTab, setActiveTab] = useState<'buy' | 'history' | 'assistant' | 'profile'>('buy');
  
  // Theme State
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
  
  // User Profile State
  const [userName, setUserName] = useState('Oladimeji John');
  const [userEmail, setUserEmail] = useState('oladimeji@example.com');
  const [defaultPhone, setDefaultPhone] = useState('08031234567');
  
  // App States
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier>(Carrier.MTN);
  const [productType, setProductType] = useState<ProductType>('Airtime');
  const [selectedCategory, setSelectedCategory] = useState<string>('Monthly');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recentNumbers, setRecentNumbers] = useState<string[]>(['08031234567', '09012345678', '07051234567']);
  const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [isConfirmingPlan, setIsConfirmingPlan] = useState(false);
  const [isRecurringChecked, setIsRecurringChecked] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Card');

  // Buy Tab AI Assistant State
  const [aiPlanQuery, setAiPlanQuery] = useState('');
  const [aiPlanRecommendation, setAiPlanRecommendation] = useState<string | null>(null);
  const [isAiPlanLoading, setIsAiPlanLoading] = useState(false);

  // History Filter State
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'All' | 'Airtime' | 'Data'>('All');
  const [historyDateFilter, setHistoryDateFilter] = useState<'All' | '7days' | '30days'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Assistant State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Theme Application Logic
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashScreen(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Carrier prefixes in Nigeria
  const carrierPrefixes: Record<string, Carrier> = {
    '0803': Carrier.MTN, '0806': Carrier.MTN, '0810': Carrier.MTN, '0813': Carrier.MTN, '0814': Carrier.MTN, '0816': Carrier.MTN, '0903': Carrier.MTN, '0906': Carrier.MTN, '0913': Carrier.MTN, '0916': Carrier.MTN, '0703': Carrier.MTN, '0706': Carrier.MTN,
    '0802': Carrier.AIRTEL, '0808': Carrier.AIRTEL, '0812': Carrier.AIRTEL, '0701': Carrier.AIRTEL, '0708': Carrier.AIRTEL, '0901': Carrier.AIRTEL, '0902': Carrier.AIRTEL, '0904': Carrier.AIRTEL, '0907': Carrier.AIRTEL, '0912': Carrier.AIRTEL,
    '0805': Carrier.GLO, '0807': Carrier.GLO, '0811': Carrier.GLO, '0815': Carrier.GLO, '0705': Carrier.GLO, '0905': Carrier.GLO, '0915': Carrier.GLO,
    '0809': Carrier.NINEMOBILE, '0817': Carrier.NINEMOBILE, '0818': Carrier.NINEMOBILE, '0908': Carrier.NINEMOBILE, '0909': Carrier.NINEMOBILE
  };

  const handlePhoneChange = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('234') && cleaned.length > 3) {
      cleaned = '0' + cleaned.slice(3);
    }
    cleaned = cleaned.slice(0, 11);
    setPhoneNumber(cleaned);

    if (cleaned.length >= 4) {
      const prefix = cleaned.slice(0, 4);
      const detected = carrierPrefixes[prefix];
      if (detected && detected !== selectedCarrier) {
        setSelectedCarrier(detected);
        setSelectedPlan(null);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated && !phoneNumber) {
      handlePhoneChange(defaultPhone);
    }
  }, [isAuthenticated, defaultPhone]);

  const availableCategories = useMemo(() => {
    return Array.from(new Set(MOCK_DATA_PLANS[selectedCarrier].map(p => p.category)));
  }, [selectedCarrier]);

  useEffect(() => {
    if (!availableCategories.includes(selectedCategory as any)) {
      setSelectedCategory(availableCategories[0] || 'Monthly');
    }
  }, [selectedCarrier, availableCategories]);

  useEffect(() => {
    const now = new Date();
    const getDate = (daysAgo: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().replace('T', ' ').substring(0, 16);
    };

    const mockHistory: Transaction[] = [
      { id: 'tx_7y2b81k', date: getDate(1), carrier: Carrier.MTN, type: 'Data', amount: 1200, phoneNumber: '08031234567', status: 'Success' },
      { id: 'tx_9p4x51m', date: getDate(3), carrier: Carrier.AIRTEL, type: 'Airtime', amount: 500, phoneNumber: '09012345678', status: 'Success' },
      { id: 'tx_1w8z20r', date: getDate(10), carrier: Carrier.GLO, type: 'Data', amount: 300, phoneNumber: '07051234567', status: 'Failed' },
      { id: 'tx_v8s2q1n', date: getDate(15), carrier: Carrier.MTN, type: 'Airtime', amount: 1000, phoneNumber: '08031234567', status: 'Success' },
      { id: 'tx_m2k9p3l', date: getDate(35), carrier: Carrier.AIRTEL, type: 'Data', amount: 2500, phoneNumber: '09012345678', status: 'Success' },
    ];
    setTransactions(mockHistory);
  }, []);

  const handlePurchase = () => {
    if (!phoneNumber || phoneNumber.length < 11) {
      alert("Please enter a valid 11-digit phone number");
      setIsConfirmingPlan(false);
      return;
    }
    if (productType === 'Airtime' && (!amount || Number(amount) < 50)) {
      alert("Minimum airtime is ₦50");
      return;
    }
    if (productType === 'Data' && !selectedPlan) {
      alert("Please select a data plan");
      return;
    }

    setIsConfirmingPlan(false);
    setIsProcessing(true);
    setTimeout(() => {
      const newTx: Transaction = {
        id: 'tx_' + Math.random().toString(36).substr(2, 7),
        date: new Date().toLocaleString(),
        carrier: selectedCarrier,
        type: productType,
        amount: productType === 'Airtime' ? Number(amount) : selectedPlan!.price,
        phoneNumber,
        status: 'Success'
      };

      if (isRecurringChecked && productType === 'Data' && selectedPlan) {
        const nextRenewal = new Date();
        const days = parseInt(selectedPlan.validity) || 30;
        nextRenewal.setDate(nextRenewal.getDate() + days);
        
        const newRecurring: RecurringPlan = {
          id: 'rec_' + Math.random().toString(36).substr(2, 7),
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          phoneNumber,
          carrier: selectedCarrier,
          price: selectedPlan.price,
          nextRenewal: nextRenewal.toLocaleDateString(),
          frequency: selectedPlan.validity
        };
        setRecurringPlans(prev => [newRecurring, ...prev]);
      }

      if (!recentNumbers.includes(phoneNumber)) {
        setRecentNumbers(prev => [phoneNumber, ...prev].slice(0, 5));
      }

      setTransactions([newTx, ...transactions]);
      setIsProcessing(false);
      setShowSuccess(true);
      setIsRecurringChecked(false);
    }, 2000);
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      setIsProcessing(false);
    }, 1500);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('buy');
    setPhoneNumber('');
    setAmount('');
  };

  const resetForm = () => {
    setShowSuccess(false);
    setAmount('');
    setSelectedPlan(null);
  };

  const removeRecurring = (id: string) => {
    if (confirm("Cancel this auto-renewal?")) {
      setRecurringPlans(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleAiMessage = async () => {
    if (!userInput.trim()) return;
    const newMessage: ChatMessage = { role: 'user', text: userInput };
    setChatHistory([...chatHistory, newMessage]);
    setUserInput('');
    setIsAiLoading(true);
    const response = await getGeminiRecommendation(userInput);
    setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    setIsAiLoading(false);
  };

  const handleAiPlanSearch = async () => {
    if (!aiPlanQuery.trim()) return;
    setIsAiPlanLoading(true);
    setAiPlanRecommendation(null);
    try {
      const recommendation = await getGeminiRecommendation(`Recommend a data plan for: ${aiPlanQuery}`);
      setAiPlanRecommendation(recommendation);
    } catch (err) {
      setAiPlanRecommendation("Couldn't get a recommendation right now.");
    } finally {
      setIsAiPlanLoading(false);
    }
  };

  const detectedPlanFromAi = useMemo(() => {
    if (!aiPlanRecommendation) return null;
    
    // Scan all carriers and their plans to see if any plan name is mentioned in the recommendation
    for (const carrier of Object.values(Carrier)) {
      const plans = MOCK_DATA_PLANS[carrier];
      for (const plan of plans) {
        if (aiPlanRecommendation.toLowerCase().includes(plan.name.toLowerCase())) {
          return { plan, carrier };
        }
      }
    }
    return null;
  }, [aiPlanRecommendation]);

  const buyAiRecommendedPlan = () => {
    if (detectedPlanFromAi) {
      setSelectedCarrier(detectedPlanFromAi.carrier);
      setProductType('Data');
      setSelectedPlan(detectedPlanFromAi.plan);
      setIsConfirmingPlan(true);
      setIsRecurringChecked(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (historyTypeFilter !== 'All' && tx.type !== historyTypeFilter) return false;
      if (historyDateFilter !== 'All') {
        const txDate = new Date(tx.date.replace(/-/g, '/'));
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - txDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (historyDateFilter === '7days' && diffDays > 7) return false;
        if (historyDateFilter === '30days' && diffDays > 30) return false;
      }
      if (searchQuery && !tx.phoneNumber.includes(searchQuery)) return false;
      return true;
    });
  }, [transactions, historyTypeFilter, historyDateFilter, searchQuery]);

  const chartData = useMemo(() => {
    return filteredTransactions.slice(0, 10).map(t => ({
      name: t.date.split(' ')[0].split('-').slice(1).join('/'),
      amount: t.amount
    })).reverse();
  }, [filteredTransactions]);

  const filteredPlans = MOCK_DATA_PLANS[selectedCarrier].filter(
    plan => plan.category === selectedCategory
  );

  const openPlanConfirmation = (plan: DataPlan) => {
    setSelectedPlan(plan);
    setIsConfirmingPlan(true);
    setIsRecurringChecked(false);
  };

  const openAirtimeConfirmation = () => {
    if (!amount || Number(amount) < 50) {
      alert("Minimum airtime is ₦50");
      return;
    }
    if (!phoneNumber || phoneNumber.length < 11) {
      alert("Please enter a valid 11-digit phone number");
      return;
    }
    setIsConfirmingPlan(true);
    setSelectedPlan(null); // Mark as airtime
  };

  const clearFilters = () => {
    setHistoryTypeFilter('All');
    setHistoryDateFilter('All');
    setSearchQuery('');
  };

  const isFiltered = historyTypeFilter !== 'All' || historyDateFilter !== 'All' || searchQuery !== '';

  const saveProfile = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert('Profile updated successfully!');
    }, 1000);
  };

  const useDefaultPhone = () => {
    handlePhoneChange(defaultPhone);
  };

  // Splash Screen View
  if (isSplashScreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-600 text-white p-6 transition-all">
        <div className="relative animate-bounce">
          <Zap className="fill-yellow-400 text-yellow-400 w-24 h-24" />
          <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-2xl animate-pulse"></div>
        </div>
        <h1 className="text-4xl font-black mt-8 tracking-tighter">NaijaConnect</h1>
        <p className="mt-2 text-emerald-100 font-medium opacity-80">Fastest Recharge in Naija 🇳🇬</p>
        <div className="mt-12 w-12 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
        <style>{`
          @keyframes loading {
            0% { width: 0%; transform: translateX(-100%); }
            50% { width: 100%; transform: translateX(0%); }
            100% { width: 0%; transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  // Auth Screen View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden p-6 transition-colors duration-300">
        <div className="flex-1 flex flex-col justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2">
            <div className="bg-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
              <Zap className="fill-yellow-400 text-yellow-400 w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              {authView === 'login' ? 'Welcome Back!' : 'Create Account'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {authView === 'login' ? 'Sign in to your NaijaConnect account' : 'Join thousands of Nigerians recharging daily'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required 
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            {authView === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required 
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 shadow-sm font-medium"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {authView === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {authView === 'login' ? 'Sign In' : 'Sign Up'}
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <button 
              onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')}
              className="text-sm font-bold text-emerald-600 hover:underline"
            >
              {authView === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App View
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden relative transition-colors duration-300">
      {/* Header */}
      <header className="bg-emerald-600 p-4 text-white flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Zap className="fill-yellow-400 text-yellow-400" />
          <h1 className="text-xl font-bold tracking-tight">NaijaConnect</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setActiveTab('profile')}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all overflow-hidden border-2 ${activeTab === 'profile' ? 'border-white scale-110' : 'border-emerald-500'}`}
          >
            <div className="bg-emerald-500 w-full h-full flex items-center justify-center">
               <span className="text-white font-bold uppercase">{userName.charAt(0)}</span>
            </div>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24">
        {activeTab === 'buy' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Carrier Grid */}
            <section>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Select Network</h2>
              <div className="grid grid-cols-4 gap-3">
                {CARRIERS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCarrier(c.id); setSelectedPlan(null); }}
                    className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${
                      selectedCarrier === c.id 
                        ? 'border-emerald-600 scale-105 shadow-md dark:border-emerald-500' 
                        : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                    } ${c.color}`}
                  >
                    <img src={c.logo} alt={c.id} className="w-10 h-10 object-contain" />
                    <span className={`text-[10px] mt-1 font-bold ${c.textColor}`}>{c.id}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* AI Plan Assistant Search Bar */}
            <section className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 dark:from-emerald-500/5 dark:to-blue-500/5 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">AI Plan Finder</h3>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/50" size={18} />
                <input
                  type="text"
                  placeholder="e.g., 'Best monthly plan for GLO'"
                  value={aiPlanQuery}
                  onChange={(e) => setAiPlanQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAiPlanSearch()}
                  className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 shadow-sm"
                />
                <button 
                  onClick={handleAiPlanSearch}
                  disabled={isAiPlanLoading || !aiPlanQuery.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  {isAiPlanLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                </button>
              </div>

              {aiPlanRecommendation && (
                <div className="animate-in fade-in zoom-in-95 duration-300 relative bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
                  <button 
                    onClick={() => setAiPlanRecommendation(null)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed italic font-medium">
                      "{aiPlanRecommendation}"
                    </p>
                    {detectedPlanFromAi && (
                      <button
                        onClick={buyAiRecommendedPlan}
                        className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                      >
                        <ShoppingBag size={14} />
                        Buy This Plan ({detectedPlanFromAi.plan.name})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Product Type Toggle */}
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
              <button
                onClick={() => setProductType('Airtime')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${productType === 'Airtime' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-500'}`}
              >
                Airtime
              </button>
              <button
                onClick={() => setProductType('Data')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${productType === 'Data' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-500'}`}
              >
                Data
              </button>
            </div>

            {/* Input Form */}
            <section className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Phone Number ({phoneNumber.length}/11)</label>
                  <button 
                    onClick={useDefaultPhone}
                    className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-tighter"
                  >
                    <UserCheck size={12} /> Use Mine
                  </button>
                </div>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="tel"
                    maxLength={11}
                    placeholder="080 0000 0000"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 text-base font-bold shadow-inner"
                  />
                </div>
                
                {/* Recent Numbers quick add */}
                <div className="mt-3">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <HistoryIcon size={10} /> Quick Add History
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {recentNumbers.map(num => (
                      <button
                        key={num}
                        onClick={() => handlePhoneChange(num)}
                        className={`flex-shrink-0 px-3.5 py-2 rounded-xl border-2 text-[11px] font-bold transition-all shadow-sm ${
                          phoneNumber === num 
                            ? 'bg-emerald-600 text-white border-emerald-600 scale-105' 
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {productType === 'Airtime' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight mb-2">Select Amount (₦)</label>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[100, 200, 500, 1000].map(val => (
                      <button
                        key={val}
                        onClick={() => setAmount(val.toString())}
                        className={`py-3 rounded-xl border-2 transition-all font-black text-sm ${
                          amount === val.toString()
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        ₦{val}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">₦</span>
                    <input
                      type="number"
                      placeholder="Enter other amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 text-base font-bold shadow-inner"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3">
                      <Filter size={12} /> Filter Duration
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {['Daily', 'Weekly', 'Monthly', 'Yearly'].map(cat => {
                        const isAvailable = availableCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            disabled={!isAvailable}
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSelectedPlan(null);
                            }}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${
                              !isAvailable 
                                ? 'opacity-30 cursor-not-allowed border-slate-100 dark:border-slate-800'
                                : selectedCategory === cat
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-emerald-400 shadow-sm'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredPlans.length > 0 ? (
                      filteredPlans.map(plan => (
                        <button
                          key={plan.id}
                          onClick={() => openPlanConfirmation(plan)}
                          className={`w-full p-4 flex justify-between items-center rounded-2xl border-2 transition-all group ${
                            selectedPlan?.id === plan.id 
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 shadow-md' 
                              : 'border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-800 bg-slate-50/30 dark:bg-slate-900/30'
                          }`}
                        >
                          <div className="text-left">
                            <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{plan.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">{plan.validity} • {plan.allowance}</p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-black text-emerald-700 dark:text-emerald-400">₦{plan.price}</p>
                              {selectedPlan?.id === plan.id && <p className="text-[8px] font-black text-emerald-600 uppercase">Selected</p>}
                            </div>
                            <ArrowRight size={16} className={`transition-transform ${selectedPlan?.id === plan.id ? 'translate-x-1 text-emerald-600' : 'text-slate-300 group-hover:text-emerald-400'}`} />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <ZapOff className="mx-auto text-slate-300 mb-2" size={24} />
                        <p className="text-xs font-bold text-slate-400">No {selectedCategory} plans available</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {productType === 'Airtime' && (
              <button
                onClick={openAirtimeConfirmation}
                disabled={isProcessing || !amount || !phoneNumber}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-200 dark:shadow-none scale-100 active:scale-95"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <CreditCard size={20} />
                    Recharge ₦{amount || 0} Now
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <section className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <HistoryIcon size={20} className="text-emerald-600" />
                  Activity History
                </h2>
                {isFiltered && (
                   <button 
                   onClick={clearFilters}
                   className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                 >
                   Reset Search
                 </button>
                )}
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 font-bold shadow-inner"
                  />
                </div>

                <div className="flex gap-3">
                   <div className="flex-1">
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 ml-1">Product Type</label>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl shadow-inner">
                      {['All', 'Airtime', 'Data'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setHistoryTypeFilter(type as any)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                            historyTypeFilter === type 
                              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 ml-1">Time Range</label>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl shadow-inner">
                      {[
                        { id: 'All', label: 'ALL' },
                        { id: '7days', label: '7D' },
                        { id: '30days', label: '30D' }
                      ].map((range) => (
                        <button
                          key={range.id}
                          onClick={() => setHistoryDateFilter(range.id as any)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                            historyDateFilter === range.id 
                              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="h-44 mb-6 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                      <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                      <YAxis fontSize={9} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#fff' : '#000', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                        cursor={{fill: theme === 'dark' ? '#1e293b' : '#f8fafc'}}
                      />
                      <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2">
                    <HistoryIcon size={24} className="opacity-20" />
                    <span className="text-[10px] font-black uppercase">No Data Found</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(tx => (
                    <button 
                      key={tx.id} 
                      onClick={() => setSelectedTxForDetail(tx)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 rounded-2xl transition-all group shadow-sm active:scale-98"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${CARRIERS.find(c => c.id === tx.carrier)?.color || 'bg-slate-200'} transition-transform group-hover:scale-110 shadow-md`}>
                          <Smartphone size={18} className="text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-slate-800 dark:text-slate-100">{tx.carrier} {tx.type}</p>
                          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{tx.phoneNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">₦{tx.amount}</p>
                        <p className={`text-[9px] font-black uppercase flex items-center justify-end gap-1 ${tx.status === 'Success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {tx.status === 'Success' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                          {tx.status}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <HistoryIcon className="text-slate-200 dark:text-slate-700 mx-auto mb-4" size={48} />
                    <p className="text-sm text-slate-400 font-bold">No transactions matched</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className="flex flex-col h-[calc(100vh-180px)] animate-in slide-in-from-bottom duration-500">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar pb-4">
              <div className="bg-emerald-50 dark:bg-emerald-950 p-5 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed shadow-sm">
                👋 <strong>Oshey!</strong> I'm your NaijaConnect Assistant. Need the best plan or having issues? Just ask me! 🇳🇬
              </div>
              
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-3xl flex items-center gap-2 shadow-sm">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <input
                type="text"
                placeholder="Ask NaijaConnect AI..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAiMessage()}
                className="flex-1 px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 shadow-lg text-slate-900 dark:text-white placeholder:text-slate-400 font-bold"
              />
              <button
                onClick={handleAiMessage}
                disabled={isAiLoading || !userInput.trim()}
                className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-none active:scale-90"
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in slide-in-from-top duration-500 pb-12">
            <section className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
               <div className="w-28 h-28 bg-emerald-600 rounded-[35px] flex items-center justify-center text-white text-4xl font-black mb-6 relative ring-8 ring-emerald-50 dark:ring-emerald-900/20 shadow-lg transform rotate-3">
                  <span className="transform -rotate-3 uppercase">{userName.charAt(0)}</span>
                  <button className="absolute -bottom-2 -right-2 p-3 bg-white dark:bg-slate-700 rounded-2xl shadow-xl text-emerald-600 dark:text-emerald-400 border-2 border-emerald-50 dark:border-slate-600 hover:scale-110 transition-transform">
                    <Settings size={18} />
                  </button>
               </div>
               <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{userName}</h2>
               <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1">{userEmail}</p>
            </section>

            {/* Auto-Renewals Management Section */}
            <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-xl">
                    <Repeat size={18} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Active Auto-Renewals</h3>
                </div>
                {recurringPlans.length > 0 && (
                  <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                    {recurringPlans.length} plans
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {recurringPlans.length > 0 ? (
                  recurringPlans.map(plan => (
                    <div 
                      key={plan.id}
                      className="p-5 bg-slate-50 dark:bg-slate-900/80 border-2 border-slate-100 dark:border-slate-700 rounded-[28px] flex justify-between items-center group transition-all hover:border-emerald-200"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-800 dark:text-white">{plan.planName}</p>
                          <span className="text-[8px] bg-emerald-100 dark:bg-emerald-900 text-emerald-600 px-1.5 py-0.5 rounded-md font-black uppercase">{plan.frequency}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{plan.phoneNumber} • {plan.carrier}</p>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 w-fit px-2 py-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                          <Clock size={12} /> Next: {plan.nextRenewal}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <p className="text-base font-black text-slate-800 dark:text-white">₦{plan.price}</p>
                        <button 
                          onClick={() => removeRecurring(plan.id)}
                          className="p-2.5 text-rose-500 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all shadow-md active:scale-90"
                          title="Cancel auto-renewal"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Repeat className="mx-auto text-slate-200 dark:text-slate-700 mb-3 opacity-50" size={32} />
                    <p className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase">No active recurring plans</p>
                    <button 
                      onClick={() => setActiveTab('buy')}
                      className="mt-3 text-[10px] font-black text-emerald-600 hover:underline uppercase"
                    >
                      Browse data plans
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 space-y-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                  <UserIcon size={18} className="text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Account Settings</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Default Recharge Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="tel" 
                      maxLength={11}
                      value={defaultPhone}
                      onChange={(e) => setDefaultPhone(e.target.value.replace(/\D/g, '').slice(0,11))}
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none placeholder:text-slate-400 font-black shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Display Name</label>
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none placeholder:text-slate-400 font-black shadow-inner"
                  />
                </div>

                <button 
                  onClick={saveProfile}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Update Profile</>}
                </button>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                  <Monitor size={18} className="text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Appearance</h3>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl gap-2 shadow-inner">
                <button 
                  onClick={() => setTheme('light')}
                  className={`flex-1 py-4 rounded-xl flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600' : 'text-slate-400 dark:text-slate-600'}`}
                >
                  <Sun size={20} />
                  <span className="text-[10px] font-black uppercase">Light</span>
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`flex-1 py-4 rounded-xl flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600' : 'text-slate-400 dark:text-slate-600'}`}
                >
                  <Moon size={20} />
                  <span className="text-[10px] font-black uppercase">Dark</span>
                </button>
                <button 
                  onClick={() => setTheme('system')}
                  className={`flex-1 py-4 rounded-xl flex flex-col items-center gap-2 transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600' : 'text-slate-400 dark:text-slate-600'}`}
                >
                  <Monitor size={20} />
                  <span className="text-[10px] font-black uppercase">System</span>
                </button>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                  <Bell size={18} className="text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Communication</h3>
              </div>
              <div className="space-y-5 px-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-800 dark:text-white font-black">Email Receipts</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Sent after every purchase</p>
                  </div>
                  <div className="w-11 h-6 bg-emerald-600 rounded-full relative cursor-pointer shadow-inner">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-700 pt-5">
                  <div>
                    <p className="text-sm text-slate-800 dark:text-white font-black">SMS Alerts</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Low balance & status updates</p>
                  </div>
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative cursor-pointer shadow-inner">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md"></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="px-2 pt-4">
               <button 
                onClick={handleLogout}
                className="w-full py-5 text-rose-500 bg-rose-50 dark:bg-rose-950/30 rounded-[30px] font-black flex items-center justify-center gap-3 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all border-2 border-rose-100 dark:border-rose-900/50 shadow-sm active:scale-95"
               >
                 <LogOut size={22} />
                 Sign Out from NaijaConnect
               </button>
               <p className="text-center text-[10px] font-black text-slate-300 dark:text-slate-700 mt-6 uppercase tracking-[0.2em]">v2.4.0 • Built with Love 🇳🇬</p>
            </section>
          </div>
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-40 transition-colors duration-300 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'buy' ? 'text-emerald-600 scale-110 drop-shadow-sm' : 'text-slate-400 dark:text-slate-600'}`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'buy' ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}>
            <Wifi size={24} strokeWidth={activeTab === 'buy' ? 3 : 2} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider">Buy</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-emerald-600 scale-110' : 'text-slate-400 dark:text-slate-600'}`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'history' ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}>
            <HistoryIcon size={24} strokeWidth={activeTab === 'history' ? 3 : 2} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider">Activity</span>
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'assistant' ? 'text-emerald-600 scale-110' : 'text-slate-400 dark:text-slate-600'}`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'assistant' ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}>
            <MessageCircle size={24} strokeWidth={activeTab === 'assistant' ? 3 : 2} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider">Ask AI</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-emerald-600 scale-110' : 'text-slate-400 dark:text-slate-600'}`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'profile' ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}>
            <UserIcon size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
        </button>
      </nav>

      {/* Plan Selection Confirmation Modal */}
      {isConfirmingPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-white/20">
            <div className="bg-emerald-600 p-6 flex flex-col items-center text-center text-white relative">
               <button 
                  onClick={() => setIsConfirmingPlan(false)}
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xl border-4 border-white/30 ${CARRIERS.find(c => c.id === selectedCarrier)?.color}`}>
                {productType === 'Data' ? <Wifi size={32} className="text-white drop-shadow-md" /> : <Smartphone size={32} className="text-white drop-shadow-md" />}
              </div>
              <h3 className="text-xl font-black">{selectedPlan ? selectedPlan.name : `${selectedCarrier} Airtime`}</h3>
              <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-80">{selectedCarrier} • {phoneNumber}</p>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{productType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{productType === 'Data' ? 'Duration' : 'Recipient'}</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{productType === 'Data' ? selectedPlan?.validity : phoneNumber}</p>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Preferred Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Card', icon: <CreditCard size={18} />, label: 'Card' },
                    { id: 'USSD', icon: <PhoneCall size={18} />, label: 'USSD' },
                    { id: 'Transfer', icon: <Building2 size={18} />, label: 'Bank' }
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id as PaymentMethod)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                        selectedPaymentMethod === method.id 
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shadow-md' 
                          : 'border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400'
                      }`}
                    >
                      {method.icon}
                      <span className="text-[9px] font-black uppercase">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {productType === 'Data' && (
                <div 
                  onClick={() => setIsRecurringChecked(!isRecurringChecked)}
                  className={`group p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    isRecurringChecked 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-600' 
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 hover:border-emerald-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shadow-sm transition-colors ${isRecurringChecked ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>
                        <Repeat size={14} />
                      </div>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-tight ${isRecurringChecked ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>Auto-renewal</p>
                        <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500">Every {selectedPlan?.validity}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isRecurringChecked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                      {isRecurringChecked && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t-2 border-slate-50 dark:border-slate-700">
                <div className="flex justify-between items-center mb-5">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Total Charged</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₦{selectedPlan ? selectedPlan.price : amount}</p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={handlePurchase}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl active:scale-95"
                  >
                    <ShieldCheck size={20} />
                    Pay with {selectedPaymentMethod}
                  </button>
                  <button
                    onClick={() => {
                      setIsConfirmingPlan(false);
                      setIsRecurringChecked(false);
                    }}
                    className="w-full py-3 bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-[10px] uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 border border-slate-100 dark:border-slate-700">
            <div className={`p-8 text-white text-center relative ${selectedTxForDetail.status === 'Success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              <button 
                onClick={() => setSelectedTxForDetail(null)}
                className="absolute right-6 top-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="w-20 h-20 bg-white/20 rounded-[30px] flex items-center justify-center mx-auto mb-4 shadow-inner border-2 border-white/20">
                {selectedTxForDetail.status === 'Success' ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Receipt</h3>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
                {selectedTxForDetail.status === 'Success' ? 'Verified OK' : 'Failed Process'}
              </p>
            </div>
            
            <div className="p-8 space-y-5">
              <div className="flex justify-between items-center border-b-2 border-slate-50 dark:border-slate-700 pb-4">
                <div className="flex items-center gap-2.5 text-slate-400">
                  <Hash size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider">TX ID</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black font-mono text-slate-800 dark:text-slate-100 tracking-tighter">{selectedTxForDetail.id}</span>
                  <button 
                    onClick={() => {
                        navigator.clipboard.writeText(selectedTxForDetail.id);
                        alert('ID Copied to clipboard!');
                    }}
                    className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-emerald-600 shadow-sm active:scale-90 transition-transform"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center border-b-2 border-slate-50 dark:border-slate-700 pb-4">
                <div className="flex items-center gap-2.5 text-slate-400">
                  <Calendar size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Date</span>
                </div>
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">{selectedTxForDetail.date}</span>
              </div>

              <div className="flex justify-between items-center border-b-2 border-slate-50 dark:border-slate-700 pb-4">
                <div className="flex items-center gap-2.5 text-slate-400">
                  <Smartphone size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Account</span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">{selectedTxForDetail.phoneNumber}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">{selectedTxForDetail.carrier}</p>
                </div>
              </div>

              <div className="flex justify-between items-center border-b-2 border-slate-50 dark:border-slate-700 pb-4">
                <div className="flex items-center gap-2.5 text-slate-400">
                  <Clock size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Result</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${selectedTxForDetail.status === 'Success' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span className={`text-[11px] font-black uppercase ${selectedTxForDetail.status === 'Success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedTxForDetail.status}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2.5 text-slate-400">
                  <CreditCard size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Grand Total</span>
                </div>
                <span className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">₦{selectedTxForDetail.amount}</span>
              </div>

              <button
                onClick={() => setSelectedTxForDetail(null)}
                className="w-full mt-4 py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-[25px] font-black hover:bg-slate-800 transition-all text-xs uppercase tracking-widest shadow-xl active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-emerald-600 z-[110] flex items-center justify-center p-6 transition-all duration-500 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[50px] p-10 text-center space-y-6 scale-in-center shadow-2xl border-4 border-white/20">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-[40px] flex items-center justify-center mx-auto mb-2 shadow-inner transform rotate-12">
              <CheckCircle2 size={64} className="transform -rotate-12" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">Done! No Cap! 🚀</h3>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed">
              Your {selectedCarrier} {productType} recharge for <strong>{phoneNumber}</strong> was successfully processed via {selectedPaymentMethod}.
            </p>
            <button
              onClick={resetForm}
              className="w-full py-5 bg-emerald-600 text-white rounded-[30px] font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 dark:shadow-none active:scale-95"
            >
              Finish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
