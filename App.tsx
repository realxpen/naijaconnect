
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
  ShoppingBag,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Lightbulb,
  Banknote,
  ChevronRight,
  Languages as LangIcon
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
import { Carrier, ProductType, DataPlan, Transaction, ChatMessage, Language } from './types';
import { CARRIERS, MOCK_DATA_PLANS, LANGUAGES, TRANSLATIONS } from './constants';
import { getGeminiRecommendation } from './services/geminiService';

type Theme = 'light' | 'dark' | 'system';
type PaymentMethod = 'Wallet' | 'Card' | 'USSD' | 'Transfer';

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
  // Localization & Theme
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
  
  // Authentication & Loading State
  const [isSplashScreen, setIsSplashScreen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [activeTab, setActiveTab] = useState<'buy' | 'history' | 'assistant' | 'profile'>('buy');
  
  // Wallet State
  const [walletBalance, setWalletBalance] = useState(12500);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [depositMethod, setDepositMethod] = useState<'Card' | 'Transfer' | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Wallet');
  const [showLangMenu, setShowLangMenu] = useState(false);

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

  // Helper for translations
  const t = (key: string) => TRANSLATIONS[language][key] || key;

  // Quick Tips for AI
  const quickTips = [
    "What data plans are best for me?",
    "How to check my balance?",
    "Show me MTN monthly plans",
    "I have 500 Naira, what can I buy?",
    "Which network has the cheapest 10GB?"
  ];

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
    ];
    setTransactions(mockHistory);
  }, []);

  const handlePurchase = () => {
    if (!phoneNumber || phoneNumber.length < 11) {
      alert("Please enter a valid 11-digit phone number");
      setIsConfirmingPlan(false);
      return;
    }
    const cost = productType === 'Airtime' ? Number(amount) : selectedPlan!.price;
    if (selectedPaymentMethod === 'Wallet' && cost > walletBalance) {
      alert("Insufficient wallet balance. Please top up!");
      setIsConfirmingPlan(false);
      return;
    }

    setIsConfirmingPlan(false);
    setIsProcessing(true);
    setTimeout(() => {
      if (selectedPaymentMethod === 'Wallet') {
        setWalletBalance(prev => prev - cost);
      }
      const newTx: Transaction = {
        id: 'tx_' + Math.random().toString(36).substr(2, 7),
        date: new Date().toLocaleString(),
        carrier: selectedCarrier,
        type: productType,
        amount: cost,
        phoneNumber,
        status: 'Success'
      };
      setTransactions([newTx, ...transactions]);
      setIsProcessing(false);
      setShowSuccess(true);
      setIsRecurringChecked(false);
    }, 2000);
  };

  const handleAiMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput || userInput;
    if (!textToSend.trim()) return;

    const newMessage: ChatMessage = { role: 'user', text: textToSend };
    setChatHistory(prev => [...prev, newMessage]);
    setUserInput('');
    setIsAiLoading(true);

    try {
      const response = await getGeminiRecommendation(textToSend, language);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Error glitch. Try again!" }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiPlanSearch = async () => {
    if (!aiPlanQuery.trim()) return;
    setIsAiPlanLoading(true);
    setAiPlanRecommendation(null);
    try {
      const recommendation = await getGeminiRecommendation(`Recommend a data plan for: ${aiPlanQuery}`, language);
      setAiPlanRecommendation(recommendation);
    } catch (err) {
      setAiPlanRecommendation("Error.");
    } finally {
      setIsAiPlanLoading(false);
    }
  };

  const detectedPlansFromAi = useMemo(() => {
    if (!aiPlanRecommendation) return [];
    const detected: { plan: DataPlan; carrier: Carrier }[] = [];
    const seenPlanIds = new Set<string>();
    for (const carrier of Object.values(Carrier)) {
      const plans = MOCK_DATA_PLANS[carrier];
      for (const plan of plans) {
        if (aiPlanRecommendation.toLowerCase().includes(plan.name.toLowerCase())) {
          if (!seenPlanIds.has(plan.id)) {
            detected.push({ plan, carrier });
            seenPlanIds.add(plan.id);
          }
        }
      }
    }
    return detected;
  }, [aiPlanRecommendation]);

  const buyAiRecommendedPlan = (plan: DataPlan, carrier: Carrier) => {
    setSelectedCarrier(carrier);
    setProductType('Data');
    setSelectedPlan(plan);
    setIsConfirmingPlan(true);
    setIsRecurringChecked(false);
    setSelectedPaymentMethod('Wallet');
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (historyTypeFilter !== 'All' && tx.type !== historyTypeFilter) return false;
      if (searchQuery && !tx.phoneNumber.includes(searchQuery)) return false;
      return true;
    });
  }, [transactions, historyTypeFilter, searchQuery]);

  const chartData = useMemo(() => {
    return filteredTransactions.slice(0, 10).map(t => ({
      name: t.date.split(' ')[0],
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
    setSelectedPaymentMethod('Wallet');
  };

  const openAirtimeConfirmation = () => {
    if (!amount || Number(amount) < 50) return;
    if (!phoneNumber || phoneNumber.length < 11) return;
    setIsConfirmingPlan(true);
    setSelectedPlan(null);
    setSelectedPaymentMethod('Wallet');
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      setIsProcessing(false);
    }, 1500);
  };

  const resetForm = () => {
    setShowSuccess(false);
    setAmount('');
    setSelectedPlan(null);
  };

  // Fixed missing useDefaultPhone function to use the default stored number
  const useDefaultPhone = () => {
    handlePhoneChange(defaultPhone);
  };

  // Fixed missing handleDepositSubmit function for wallet updates
  const handleDepositSubmit = () => {
    const val = Number(depositAmount);
    if (val > 0) {
      setWalletBalance(prev => prev + val);
      setIsDepositing(false);
      setDepositAmount('');
    } else {
      alert("Please enter a valid amount to deposit.");
    }
  };

  // Fixed missing handleWithdrawSubmit function for wallet updates
  const handleWithdrawSubmit = () => {
    const val = Number(withdrawAmount);
    if (val > 0 && val <= walletBalance) {
      setWalletBalance(prev => prev - val);
      setIsWithdrawing(false);
      setWithdrawAmount('');
    } else {
      alert(val > walletBalance ? "Insufficient wallet balance." : "Please enter a valid amount to withdraw.");
    }
  };

  if (isSplashScreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-600 text-white p-6 transition-all">
        <div className="relative animate-bounce">
          <Zap className="fill-yellow-400 text-yellow-400 w-24 h-24" />
          <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-2xl animate-pulse"></div>
        </div>
        <h1 className="text-4xl font-black mt-8 tracking-tighter">NaijaConnect</h1>
        <p className="mt-2 text-emerald-100 font-medium opacity-80">Fastest Recharge in Naija 🇳🇬</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden p-6 transition-colors duration-300">
        <div className="flex-1 flex flex-col justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2">
            <div className="bg-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
              <Zap className="fill-yellow-400 text-yellow-400 w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              {authView === 'login' ? t('welcome') : t('create')}
            </h2>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authView === 'signup' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">{t('name')}</label>
                  <input type="text" required placeholder="John Doe" className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">{t('lang')}</label>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none"
                  >
                    {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.flag} {l.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('email')}</label>
              <input type="email" required placeholder="name@example.com" className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('pass')}</label>
              <input type="password" required placeholder="••••••••" className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none" />
            </div>

            <button type="submit" disabled={isProcessing} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg">
              {isProcessing ? <Loader2 className="animate-spin" /> : (authView === 'login' ? t('signin') : t('signup'))}
            </button>
          </form>

          <button onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')} className="text-sm font-bold text-emerald-600 hover:underline text-center">
            {authView === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden relative transition-colors duration-300">
      <header className="bg-emerald-600 p-4 text-white flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Zap className="fill-yellow-400 text-yellow-400" />
          <h1 className="text-xl font-bold tracking-tight">NaijaConnect</h1>
        </div>
        <div className="flex items-center gap-3 relative">
          <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1"
          >
            <LangIcon size={20} />
            <span className="text-xs font-black uppercase">{language}</span>
          </button>
          {showLangMenu && (
            <div className="absolute top-12 right-0 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 min-w-[120px]">
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => { setLanguage(l.id as Language); setShowLangMenu(false); }}
                  className={`w-full text-left px-4 py-3 text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${language === l.id ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  {l.flag} {l.name}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setActiveTab('profile')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all overflow-hidden border-2 ${activeTab === 'profile' ? 'border-white scale-110' : 'border-emerald-500'}`}>
            <div className="bg-emerald-500 w-full h-full flex items-center justify-center"><span className="text-white font-bold uppercase">{userName.charAt(0)}</span></div>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24">
        {activeTab === 'buy' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <section className="bg-emerald-600 p-6 rounded-[35px] shadow-xl text-white space-y-6 relative overflow-hidden">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-emerald-200" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">{t('wallet_bal')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black tracking-tight">{isBalanceVisible ? `₦${walletBalance.toLocaleString()}` : '••••••••'}</h2>
                      <button onClick={() => setIsBalanceVisible(!isBalanceVisible)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                        {isBalanceVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"><Zap className="fill-yellow-400 text-yellow-400" size={24} /></div>
               </div>
               <div className="flex gap-3">
                  <button onClick={() => setIsDepositing(true)} className="flex-1 bg-white text-emerald-700 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95">{t('deposit')}</button>
                  <button onClick={() => setIsWithdrawing(true)} className="flex-1 bg-emerald-700/50 backdrop-blur-sm border border-white/20 text-white py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95">{t('withdraw')}</button>
               </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">{t('select_net')}</h2>
              <div className="grid grid-cols-4 gap-3">
                {CARRIERS.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCarrier(c.id); setSelectedPlan(null); }} className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${selectedCarrier === c.id ? 'border-emerald-600 scale-105 shadow-md dark:border-emerald-500' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'} ${c.color}`}>
                    <img src={c.logo} alt={c.id} className="w-10 h-10 object-contain" />
                    <span className={`text-[10px] mt-1 font-bold ${c.textColor}`}>{c.id}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 dark:from-emerald-500/5 dark:to-blue-500/5 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 space-y-3">
              <div className="flex items-center gap-2 mb-1"><Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" /><h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">{t('ai_finder')}</h3></div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/50" size={18} />
                <input type="text" placeholder="..." value={aiPlanQuery} onChange={(e) => setAiPlanQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAiPlanSearch()} className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none" />
                <button onClick={handleAiPlanSearch} disabled={isAiPlanLoading || !aiPlanQuery.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-xl active:scale-95 disabled:opacity-50">
                  {isAiPlanLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                </button>
              </div>

              {aiPlanRecommendation && (
                <div className="animate-in fade-in zoom-in-95 duration-300 relative bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm space-y-4">
                  <button onClick={() => setAiPlanRecommendation(null)} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={14} /></button>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed italic font-medium">"{aiPlanRecommendation}"</p>
                  {detectedPlansFromAi.length > 0 && (
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('suggested')}</p>
                       <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                        {detectedPlansFromAi.map((item, idx) => (
                          <div key={`${item.plan.id}-${idx}`} className="flex-shrink-0 w-48 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl snap-start flex flex-col justify-between space-y-3">
                            <div><p className="text-xs font-black text-slate-800 dark:text-white truncate">{item.plan.name}</p><p className="text-[10px] font-bold text-emerald-600">₦{item.plan.price}</p></div>
                            <button onClick={() => buyAiRecommendedPlan(item.plan, item.carrier)} className="w-full py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all flex items-center justify-center gap-1"><ShoppingBag size={12} /> {t('buy')}</button>
                          </div>
                        ))}
                       </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
              <button onClick={() => setProductType('Airtime')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${productType === 'Airtime' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-500'}`}>{t('airtime')}</button>
              <button onClick={() => setProductType('Data')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${productType === 'Data' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-500'}`}>{t('data')}</button>
            </div>

            <section className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1.5"><label className="text-xs font-bold text-slate-400 uppercase tracking-tight">{t('phone')} ({phoneNumber.length}/11)</label><button onClick={useDefaultPhone} className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-tighter"><UserCheck size={12} /> {t('use_mine')}</button></div>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="tel" maxLength={11} placeholder="080 0000 0000" value={phoneNumber} onChange={(e) => handlePhoneChange(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 text-base font-bold shadow-inner" />
                </div>
                <div className="mt-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1"><HistoryIcon size={10} /> {t('recent_num')}</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {recentNumbers.map(num => (
                      <button key={num} onClick={() => handlePhoneChange(num)} className={`flex-shrink-0 px-3.5 py-2 rounded-xl border-2 text-[11px] font-bold transition-all shadow-sm ${phoneNumber === num ? 'bg-emerald-600 text-white border-emerald-600 scale-105' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-emerald-400'}`}>{num}</button>
                    ))}
                  </div>
                </div>
              </div>

              {productType === 'Airtime' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-tight mb-2">{t('amount')} (₦)</label>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[100, 200, 500, 1000].map(val => <button key={val} onClick={() => setAmount(val.toString())} className={`py-3 rounded-xl border-2 transition-all font-black text-sm ${amount === val.toString() ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-700 hover:border-emerald-400'}`}>₦{val}</button>)}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">₦</span>
                    <input type="number" placeholder="..." value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pl-8 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white outline-none placeholder:text-slate-400 text-base font-bold shadow-inner" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredPlans.map(plan => (
                      <button key={plan.id} onClick={() => openPlanConfirmation(plan)} className={`w-full p-4 flex justify-between items-center rounded-2xl border-2 transition-all group ${selectedPlan?.id === plan.id ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 shadow-md' : 'border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-800 bg-slate-50/30 dark:bg-slate-900/30'}`}>
                        <div className="text-left"><p className="font-black text-slate-800 dark:text-slate-100 text-sm">{plan.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{plan.validity} • {plan.allowance}</p></div>
                        <div className="text-right flex items-center gap-3"><p className="font-black text-emerald-700 dark:text-emerald-400">₦{plan.price}</p><ArrowRight size={16} className={`transition-transform ${selectedPlan?.id === plan.id ? 'translate-x-1 text-emerald-600' : 'text-slate-300 group-hover:text-emerald-400'}`} /></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {productType === 'Airtime' && (
              <button onClick={openAirtimeConfirmation} disabled={isProcessing || !amount || !phoneNumber} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-xl active:scale-95">
                {isProcessing ? <Loader2 className="animate-spin" /> : <><CreditCard size={20} /> {t('recharge_now')} ₦{amount || 0}</>}
              </button>
            )}
          </div>
        )}

        {/* History / Assistant / Profile Views with t() wraps */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
             <section className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 mb-6"><HistoryIcon size={20} className="text-emerald-600" /> {t('history')}</h2>
              <div className="space-y-3">
                {filteredTransactions.map(tx => (
                  <button key={tx.id} onClick={() => setSelectedTxForDetail(tx)} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 rounded-2xl transition-all group shadow-sm active:scale-98">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${CARRIERS.find(c => c.id === tx.carrier)?.color || 'bg-slate-200'} transition-transform group-hover:scale-110 shadow-md`}><Smartphone size={18} className="text-white" /></div>
                      <div className="text-left"><p className="text-sm font-black text-slate-800 dark:text-slate-100">{tx.carrier} {tx.type}</p><p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{tx.phoneNumber}</p></div>
                    </div>
                    <div className="text-right"><p className="text-sm font-black text-slate-800 dark:text-slate-100">₦{tx.amount}</p><p className={`text-[9px] font-black uppercase flex items-center justify-end gap-1 ${tx.status === 'Success' ? 'text-emerald-600' : 'text-rose-500'}`}>{tx.status}</p></div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className="flex flex-col h-[calc(100vh-180px)] animate-in slide-in-from-bottom duration-500">
             <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar pb-4">
              <div className="bg-emerald-50 dark:bg-emerald-950 p-5 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed shadow-sm">
                👋 <strong>Oshey!</strong> NaijaConnect Assistant ({language.toUpperCase()}). 🇳🇬
              </div>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>{msg.text}</div>
                </div>
              ))}
              {isAiLoading && <div className="flex justify-start"><div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-3xl flex items-center gap-2 shadow-sm"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div></div></div>}
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {quickTips.map((tip, idx) => <button key={idx} onClick={() => handleAiMessage(tip)} className="flex-shrink-0 px-4 py-2 bg-emerald-50 dark:bg-slate-800 border-2 border-emerald-100 dark:border-slate-700 rounded-2xl text-[10px] font-black text-emerald-700 dark:text-emerald-400 hover:border-emerald-400 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap active:scale-95"><Lightbulb size={12} className="text-emerald-500" />{tip}</button>)}
              </div>
              <div className="flex gap-3">
                <input type="text" placeholder="..." value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAiMessage()} className="flex-1 px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400 font-bold" />
                <button onClick={() => handleAiMessage()} disabled={isAiLoading || !userInput.trim()} className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 active:scale-90 shadow-xl"><ArrowRight size={24} /></button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in slide-in-from-top duration-500 pb-12">
             <section className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
               <div className="w-28 h-28 bg-emerald-600 rounded-[35px] flex items-center justify-center text-white text-4xl font-black mb-6 relative shadow-lg"><span className="uppercase">{userName.charAt(0)}</span></div>
               <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{userName}</h2>
               <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1">{userEmail}</p>
            </section>
            <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 space-y-4">
               <div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-xl"><Wallet size={18} className="text-emerald-600 dark:text-emerald-400" /></div><h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{t('wallet_bal')}</h3></div><p className="font-black text-emerald-600">₦{walletBalance.toLocaleString()}</p></div>
               <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={() => { setIsDepositing(true); setActiveTab('buy'); }} className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase">{t('deposit')}</button>
                  <button onClick={() => { setIsWithdrawing(true); setActiveTab('buy'); }} className="py-3 border-2 border-emerald-100 text-emerald-600 rounded-xl font-bold text-xs uppercase">{t('withdraw')}</button>
               </div>
            </section>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-40 transition-colors duration-300 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
        <button onClick={() => setActiveTab('buy')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'buy' ? 'text-emerald-600 scale-110 drop-shadow-sm' : 'text-slate-400 dark:text-slate-600'}`}>
          <div className={`p-1 rounded-lg ${activeTab === 'buy' ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}><Wifi size={24} strokeWidth={activeTab === 'buy' ? 3 : 2} /></div>
          <span className="text-[9px] font-black uppercase tracking-wider">{t('buy')}</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-emerald-600 scale-110' : 'text-slate-400 dark:text-slate-600'}`}>
          <div className={`p-1 rounded-lg ${activeTab === 'history' ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}><HistoryIcon size={24} strokeWidth={activeTab === 'history' ? 3 : 2} /></div>
          <span className="text-[9px] font-black uppercase tracking-wider">{t('history')}</span>
        </button>
        <button onClick={() => setActiveTab('assistant')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'assistant' ? 'text-emerald-600 scale-110' : 'text-slate-400 dark:text-slate-600'}`}>
          <div className={`p-1 rounded-lg ${activeTab === 'assistant' ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}><MessageCircle size={24} strokeWidth={activeTab === 'assistant' ? 3 : 2} /></div>
          <span className="text-[9px] font-black uppercase tracking-wider">{t('assistant')}</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-emerald-600 scale-110' : 'text-slate-400 dark:text-slate-600'}`}>
          <div className={`p-1 rounded-lg ${activeTab === 'profile' ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}><UserIcon size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} /></div>
          <span className="text-[9px] font-black uppercase tracking-wider">{t('profile')}</span>
        </button>
      </nav>

      {/* Confirmation Modal */}
      {isConfirmingPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-white/20">
            <div className="bg-emerald-600 p-6 flex flex-col items-center text-center text-white relative">
               <button onClick={() => setIsConfirmingPlan(false)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={18} /></button>
               <h3 className="text-xl font-black">{selectedPlan ? selectedPlan.name : `${selectedCarrier} ${t('airtime')}`}</h3>
               <p className="text-emerald-100 text-[10px] font-black uppercase mt-0.5">{selectedCarrier} • {phoneNumber}</p>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSelectedPaymentMethod('Wallet')} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${selectedPaymentMethod === 'Wallet' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shadow-md' : 'border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400'}`}>
                  <Wallet size={18} /><div className="text-left"><span className="text-[9px] font-black uppercase block">Wallet</span><span className="text-[8px] font-bold">₦{walletBalance.toLocaleString()}</span></div>
                </button>
                <button onClick={() => setSelectedPaymentMethod('Card')} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${selectedPaymentMethod === 'Card' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shadow-md' : 'border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400'}`}>
                  <CreditCard size={18} /><span className="text-[9px] font-black uppercase">Card</span>
                </button>
              </div>
              <div className="pt-4 border-t-2 border-slate-50 dark:border-slate-700">
                <div className="flex justify-between items-center mb-5"><p className="text-sm font-bold text-slate-600 dark:text-slate-400">Total Charged</p><p className="text-2xl font-black text-emerald-600">₦{selectedPlan ? selectedPlan.price : amount}</p></div>
                <button onClick={handlePurchase} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl active:scale-95"><ShieldCheck size={20} /> {t('confirm')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-emerald-600 z-[110] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[50px] p-10 text-center space-y-6 shadow-2xl border-4 border-white/20">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-[40px] flex items-center justify-center mx-auto mb-2"><CheckCircle2 size={64} /></div>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{t('done')}</h3>
            <button onClick={resetForm} className="w-full py-5 bg-emerald-600 text-white rounded-[30px] font-black text-lg hover:bg-emerald-700 shadow-xl">{t('finish')}</button>
          </div>
        </div>
      )}

      {/* Deposit / Withdraw Modals */}
      {isDepositing && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-6"><div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[40px] p-6 text-center shadow-2xl border-2 border-white/10 animate-in zoom-in-95"><button onClick={() => setIsDepositing(false)} className="float-right p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={20}/></button><h3 className="text-xl font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight">{t('deposit')}</h3><div className="space-y-4 text-left mb-6"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Amount (₦)</label><input type="number" placeholder="Enter amount" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-bold outline-none" /></div></div><button onClick={handleDepositSubmit} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase shadow-lg active:scale-95">{t('confirm')}</button></div></div>}
      {isWithdrawing && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-6"><div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[40px] p-6 text-center shadow-2xl border-2 border-white/10 animate-in zoom-in-95"><button onClick={() => setIsWithdrawing(false)} className="float-right p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={20}/></button><h3 className="text-xl font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight">{t('withdraw')}</h3><div className="space-y-4 text-left mb-6"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Amount (₦)</label><input type="number" placeholder="Enter amount" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-bold outline-none" /></div></div><button onClick={handleWithdrawSubmit} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase shadow-lg active:scale-95">{t('confirm')}</button></div></div>}
    </div>
  );
};

export default App;
