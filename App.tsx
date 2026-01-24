import React, { useState, useEffect, useMemo } from 'react';
import { 
  Smartphone, Wifi, History as HistoryIcon, MessageCircle, ArrowRight, 
  CheckCircle2, Loader2, X, CreditCard, User as UserIcon, Zap, Search, 
  LogOut, Repeat, Trash2, ShoppingBag, Eye, EyeOff, Wallet, Lightbulb, 
  Languages as LangIcon, RotateCcw, Building2, Hash, ExternalLink,
  AlertCircle, Info, Lock, Mail, KeyRound, Check, UserPlus, LogIn
} from 'lucide-react';

// SERVICES
import { initializeTopUp, withdrawFunds, buyData, getPlans, verifyTransaction } from './services/paymentService';
import { dbService } from './services/dbService'; 
import { Carrier, ProductType, DataPlan, Transaction, ChatMessage, Language } from './types';
import { CARRIERS, MOCK_DATA_PLANS, LANGUAGES, TRANSLATIONS } from './constants';
import { getGeminiRecommendation } from './services/geminiService';

type Theme = 'light' | 'dark' | 'system';
type PaymentMethod = 'Wallet' | 'Card' | 'USSD' | 'Transfer';
type AuthView = 'login' | 'signup' | 'forgot-password' | 'verify-otp' | 'reset-password';

const SECURITY_CONFIG = {
  MIN_PASSWORD_LENGTH: 8,
  EMAIL_OTP_EXPIRATION: 600,
  EMAIL_OTP_LENGTH: 6,
  REQUIRE_LOWERCASE: true,
  REQUIRE_UPPERCASE: true,
  REQUIRE_DIGIT: true,
  REQUIRE_SYMBOL: true
};

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

interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
  
  const [isSplashScreen, setIsSplashScreen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [activeTab, setActiveTab] = useState<'buy' | 'history' | 'assistant' | 'profile'>('buy');
  
  const [walletBalance, setWalletBalance] = useState(0); 
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const [userName, setUserName] = useState('Oladimeji John');
  const [userEmail, setUserEmail] = useState('oladimeji@example.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpInput, setOtpInput] = useState('');
  
  const [paymentPending, setPaymentPending] = useState(false);
  const [pendingReference, setPendingReference] = useState('');
  const [pendingTxUrl, setPendingTxUrl] = useState('');

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('057'); 
  const [withdrawAccount, setWithdrawAccount] = useState('0000000000'); 
  const [defaultPhone, setDefaultPhone] = useState('08031234567');

  const [livePlans, setLivePlans] = useState<Record<string, DataPlan[]>>(MOCK_DATA_PLANS);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier>(Carrier.MTN);
  const [productType, setProductType] = useState<ProductType>('Airtime');
  const [selectedCategory, setSelectedCategory] = useState<string>('Monthly');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recentNumbers, setRecentNumbers] = useState<string[]>(['08031234567', '09012345678']);
  const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [isConfirmingPlan, setIsConfirmingPlan] = useState(false);
  const [isRecurringChecked, setIsRecurringChecked] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Wallet');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [planToCancel, setPlanToCancel] = useState<RecurringPlan | null>(null);

  const [aiPlanQuery, setAiPlanQuery] = useState('');
  const [aiPlanRecommendation, setAiPlanRecommendation] = useState<string | null>(null);
  const [isAiPlanLoading, setIsAiPlanLoading] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'All' | 'Airtime' | 'Data'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const t = (key: string) => TRANSLATIONS[language][key] || key;
  const quickTips = ["Best data plan?", "Check balance", "MTN monthly", "Cheap 10GB", "Help me"];

  const validatePassword = (pwd: string) => {
    return {
      length: pwd.length >= SECURITY_CONFIG.MIN_PASSWORD_LENGTH,
      lower: /[a-z]/.test(pwd),
      upper: /[A-Z]/.test(pwd),
      digit: /\d/.test(pwd),
      symbol: /[^a-zA-Z0-9]/.test(pwd)
    };
  };

  const passwordStatus = useMemo(() => validatePassword(password), [password]);
  const isPasswordStrong = Object.values(passwordStatus).every(v => v);

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  const syncUserData = async (email: string) => {
    setIsLoadingBalance(true);
    try {
      const profile = await dbService.getUserProfile(email, userName);
      if (profile) {
        setWalletBalance(Number(profile.wallet_balance));
        setUserName(profile.full_name);
        const history = await dbService.getHistory(email);
        setTransactions(history);
      }
    } catch (error) {
      addNotification('error', "Could not sync data.");
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const saveNewBalance = async (newBal: number) => {
    setWalletBalance(newBal);
    await dbService.updateBalance(userEmail, newBal);
  };

  // --- PURCHASE LOGIC ---
  const handlePurchase = async () => {
    if (!phoneNumber || phoneNumber.length < 11) { 
      addNotification('error', "Invalid phone number"); 
      return; 
    }
    
    const cost = productType === 'Airtime' ? Number(amount) : (selectedPlan?.price || 0);

    if (selectedPaymentMethod === 'Wallet' && cost > walletBalance) {
      addNotification('error', "Insufficient wallet balance.");
      return;
    }

    setIsProcessing(true);
    const originalBal = walletBalance;
    const newBal = walletBalance - cost;
    setWalletBalance(newBal); 

    try {
      if (productType === 'Data' && selectedPlan) {
        const networkMap: Record<string, string> = { 'MTN': '1', 'GLO': '2', 'AIRTEL': '3', '9MOBILE': '4' };
        const networkId = networkMap[selectedCarrier];
        await buyData(networkId, phoneNumber, selectedPlan.id); 
      } else { 
        await new Promise(r => setTimeout(r, 1500)); 
      }

      await dbService.updateBalance(userEmail, newBal);
      await dbService.addTransaction({
        user_email: userEmail,
        type: productType,
        amount: cost,
        carrier: selectedCarrier,
        phoneNumber: phoneNumber,
        status: 'Success'
      });

      const history = await dbService.getHistory(userEmail);
      setTransactions(history);
      setIsConfirmingPlan(false);
      setShowSuccess(true);
      addNotification('success', "Purchase Successful!");

    } catch (error: any) {
        setWalletBalance(originalBal); 
        
        let errorMsg = error.message;
        if (error.message.toLowerCase().includes("insufficient") || error.message.toLowerCase().includes("balance")) {
          errorMsg = "Service temporarily unavailable (Merchant balance low)";
        }

        addNotification('error', errorMsg);
        
        await dbService.addTransaction({
          user_email: userEmail,
          type: productType,
          amount: cost,
          carrier: selectedCarrier,
          phoneNumber: phoneNumber,
          status: 'Failed'
        });
        const history = await dbService.getHistory(userEmail);
        setTransactions(history);
    } finally { 
        setIsProcessing(false); 
    }
  };

  // --- AUTH FLOWS ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!userEmail || !password) { addNotification('error', "Please fill all fields"); return; }
    setIsProcessing(true);
    try {
      if (authView === 'login') {
        const user = await dbService.loginUser(userEmail, password);
        setUserName(user.full_name);
        await syncUserData(user.email);
        setIsAuthenticated(true);
        addNotification('success', `Welcome, ${user.full_name}!`);
      } else if (authView === 'signup') {
        if(!isPasswordStrong) { addNotification('error', "Password is too weak"); setIsProcessing(false); return; }
        const newUser = await dbService.registerUser(userEmail, userName, password);
        setUserName(newUser.full_name);
        setWalletBalance(0);
        setTransactions([]);
        setIsAuthenticated(true);
        addNotification('success', "Account created!");
      }
    } catch (error: any) {
      addNotification('error', error.message || "Auth failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
        const otp = await dbService.generateOtp(userEmail, SECURITY_CONFIG.EMAIL_OTP_LENGTH, SECURITY_CONFIG.EMAIL_OTP_EXPIRATION);
        addNotification('info', `OTP sent to email: ${otp}`); 
        setAuthView('verify-otp');
    } catch (error: any) {
        addNotification('error', error.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
        await dbService.verifyOtp(userEmail, otpInput);
        setAuthView('reset-password');
        addNotification('success', "Email Verified!");
    } catch (error: any) {
        addNotification('error', error.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if(password !== confirmPassword) { addNotification('error', "Passwords do not match"); return; }
    setIsProcessing(true);
    try {
        await dbService.resetPassword(userEmail, password);
        setAuthView('login');
        addNotification('success', "Password Reset! Please Login.");
    } catch (error: any) {
        addNotification('error', error.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDepositSubmit = async () => {
    const val = Number(depositAmount);
    if (!val || val <= 0) { addNotification('error', "Enter valid amount"); return; }
    setIsProcessing(true);
    try {
        const result = await initializeTopUp(userEmail, val);
        if (result.success) {
            window.open(result.checkoutUrl, '_blank');
            setPendingReference(result.reference);
            setPendingTxUrl(result.checkoutUrl);
            setPaymentPending(true);
        }
    } catch (error) { addNotification('error', "Paystack error."); } 
    finally { setIsProcessing(false); }
  };

  const verifyPayment = async () => {
    setIsProcessing(true);
    try {
        const verification = await verifyTransaction(pendingReference);
        if (verification.success) {
            const newBal = walletBalance + Number(verification.amount);
            await saveNewBalance(newBal);
            await dbService.addTransaction({ user_email: userEmail, type: 'Deposit', amount: Number(verification.amount), carrier: Carrier.MTN, phoneNumber: 'Wallet Fund' });
            const history = await dbService.getHistory(userEmail);
            setTransactions(history);
            setDepositAmount(''); setIsDepositing(false); setPaymentPending(false);
            addNotification('success', `₦${verification.amount} added!`);
        } else { addNotification('error', "Verification failed."); }
    } catch (e) { addNotification('error', "Error."); } 
    finally { setIsProcessing(false); }
  };

  const handleWithdrawSubmit = async () => {
    const val = Number(withdrawAmount);
    if (val > walletBalance) { addNotification('error', "Insufficient funds"); return; }
    setIsProcessing(true);
    try {
        const result = await withdrawFunds(val, withdrawBank, withdrawAccount, "Withdrawal");
        if (result.status) {
             const newBal = walletBalance - val; await saveNewBalance(newBal);
             await dbService.addTransaction({ user_email: userEmail, type: 'Withdraw', amount: val, carrier: Carrier.MTN, phoneNumber: withdrawAccount });
             const history = await dbService.getHistory(userEmail); setTransactions(history);
             setIsWithdrawing(false); setWithdrawAmount('');
             addNotification('success', "Success!");
        }
    } catch (error: any) { addNotification('error', "Failed"); } finally { setIsProcessing(false); }
  };

  // STANDARD INIT HOOKS
  useEffect(() => { 
    const fetchPlans = async () => {
      setIsLoadingPlans(true);
      try {
        const plansFromApi = await getPlans();
        const formattedPlans: Record<string, DataPlan[]> = { [Carrier.MTN]: [], [Carrier.AIRTEL]: [], [Carrier.GLO]: [], [Carrier.NINEMOBILE]: [] };
        plansFromApi.forEach((p: any) => {
          let carrier = Carrier.MTN;
          if(p.network.includes("AIRTEL")) carrier = Carrier.AIRTEL;
          if(p.network.includes("GLO")) carrier = Carrier.GLO;
          if(p.network.includes("9MOBILE") || p.network.includes("ETISALAT")) carrier = Carrier.NINEMOBILE;
          formattedPlans[carrier].push({ id: p.id, name: `${p.size} - ${p.plan_type}`, price: Number(p.amount), validity: p.plan_type, allowance: p.size, category: p.plan_type.includes("Month") ? "Monthly" : "Daily" });
        });
        setLivePlans(formattedPlans);
      } catch (e) { console.log(e); } finally { setIsLoadingPlans(false); }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else { root.classList.remove('dark'); }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => { setTimeout(() => setIsSplashScreen(false), 2000); }, []);

  const carrierPrefixes: Record<string, Carrier> = { '0803': Carrier.MTN, '0806': Carrier.MTN, '0810': Carrier.MTN, '0813': Carrier.MTN, '0814': Carrier.MTN, '0816': Carrier.MTN, '0903': Carrier.MTN, '0906': Carrier.MTN, '0913': Carrier.MTN, '0916': Carrier.MTN, '0802': Carrier.AIRTEL, '0808': Carrier.AIRTEL, '0812': Carrier.AIRTEL, '0805': Carrier.GLO, '0807': Carrier.GLO, '0811': Carrier.GLO, '0809': Carrier.NINEMOBILE };
  const handlePhoneChange = (val: string) => { let cleaned = val.replace(/\D/g, ''); if (cleaned.startsWith('234') && cleaned.length > 3) cleaned = '0' + cleaned.slice(3); cleaned = cleaned.slice(0, 11); setPhoneNumber(cleaned); if (cleaned.length >= 4) { const prefix = cleaned.slice(0, 4); const detected = carrierPrefixes[prefix]; if (detected && detected !== selectedCarrier) { setSelectedCarrier(detected); setSelectedPlan(null); } } };
  useEffect(() => { if (isAuthenticated && !phoneNumber) handlePhoneChange(defaultPhone); }, [isAuthenticated, defaultPhone]);

  const availableCategories = useMemo(() => { const plans = livePlans[selectedCarrier] || []; const categories = Array.from(new Set(plans.map(p => p.category))); return categories.length > 0 ? categories : ['Monthly']; }, [selectedCarrier, livePlans]);
  useEffect(() => { if (!availableCategories.includes(selectedCategory as any)) { setSelectedCategory(availableCategories[0] || 'Monthly'); } }, [selectedCarrier, availableCategories]);

  const handleLogout = () => { setIsAuthenticated(false); setAuthView('login'); setWalletBalance(0); setTransactions([]); addNotification('info', "Signed out"); };
  const resetForm = () => { setShowSuccess(false); setAmount(''); setSelectedPlan(null); };

  const handleAiMessage = async (overrideInput?: string) => { const textToSend = overrideInput || userInput; if (!textToSend.trim()) return; setChatHistory(prev => [...prev, { role: 'user', text: textToSend }]); setUserInput(''); setIsAiLoading(true); try { const response = await getGeminiRecommendation(textToSend, language); setChatHistory(prev => [...prev, { role: 'model', text: response }]); } catch (err) { setChatHistory(prev => [...prev, { role: 'model', text: "Error." }]); } finally { setIsAiLoading(false); } };
  
  const filteredTransactions = useMemo(() => { return transactions.filter(tx => { if (historyTypeFilter !== 'All' && tx.type !== historyTypeFilter) return false; return !searchQuery || tx.phoneNumber.includes(searchQuery); }); }, [transactions, historyTypeFilter, searchQuery]);
  const filteredPlans = (livePlans[selectedCarrier] || []).filter(plan => plan.category === selectedCategory);
  const openPlanConfirmation = (plan: DataPlan) => { setSelectedPlan(plan); setIsConfirmingPlan(true); };
  const openAirtimeConfirmation = () => { if (Number(amount) >= 50) setIsConfirmingPlan(true); };

  if (isSplashScreen) return <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-600 text-white p-6"><Zap className="w-24 h-24 animate-bounce text-yellow-400 fill-yellow-400"/><h1 className="text-4xl font-black mt-8 tracking-tighter">NaijaConnect</h1></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-50 dark:bg-slate-900 p-6 relative overflow-hidden">
        {/* NOTIFICATIONS (Auth View) */}
        <div className="fixed top-6 left-0 right-0 z-[100] px-4 flex flex-col gap-2 pointer-events-none">
          {notifications.map(n => (
            <div key={n.id} className={`max-w-md mx-auto w-full p-4 rounded-2xl shadow-xl flex items-start gap-3 pointer-events-auto animate-in slide-in-from-top-2 duration-300 ${n.type === 'success' ? 'bg-emerald-600 text-white' : n.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-white'}`}>
              {n.type === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}<p className="text-sm font-bold">{n.message}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <div className="bg-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"><Zap className="w-10 h-10 text-yellow-400 fill-yellow-400"/></div>
            <h2 className="text-3xl font-black dark:text-white tracking-tight">
              {authView === 'login' ? t('welcome') : authView === 'signup' ? t('create') : 'Security Check'}
            </h2>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mt-1">
              {authView === 'login' ? 'Sign in to continue' : authView === 'signup' ? 'Join NaijaConnect Today' : 'Verify your identity'}
            </p>
          </div>

          {(authView === 'login' || authView === 'signup') && (
            <form onSubmit={handleAuth} className="space-y-4">
              {authView === 'signup' && (
                  <div className="relative animate-in slide-in-from-top-2">
                    <UserIcon className="absolute left-3 top-4 text-slate-400" size={18} />
                    <input type="text" required placeholder="Full Name" value={userName} onChange={e => setUserName(e.target.value)} className="w-full pl-10 p-4 rounded-xl border dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                  </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-4 text-slate-400" size={18} />
                <input type="email" required placeholder="Email Address" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full pl-10 p-4 rounded-xl border dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-4 text-slate-400" size={18} />
                <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 p-4 rounded-xl border dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
              </div>
              
              <button type="submit" disabled={isProcessing} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-tight flex justify-center items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all">
                {isProcessing ? <Loader2 className="animate-spin" /> : (authView === 'login' ? <><LogIn size={18} /> {t('signin')}</> : <><UserPlus size={18} /> {t('signup')}</>)}
              </button>
            </form>
          )}

          {authView === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-slate-500 text-center font-bold">A 6-digit OTP will be sent to your email.</p>
              <input type="email" required placeholder="Enter Email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full p-4 rounded-xl border dark:bg-slate-950 dark:text-white outline-none" />
              <button type="submit" disabled={isProcessing} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase">{isProcessing ? <Loader2 className="animate-spin mx-auto"/> : "Get OTP"}</button>
            </form>
          )}

          {authView === 'verify-otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-slate-500 text-center font-bold">Enter OTP sent to {userEmail}</p>
              <input type="text" maxLength={6} required placeholder="123456" value={otpInput} onChange={e => setOtpInput(e.target.value)} className="w-full p-4 rounded-xl border dark:bg-slate-950 dark:text-white text-center text-2xl font-mono tracking-widest outline-none" />
              <button type="submit" disabled={isProcessing} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase">Verify Code</button>
            </form>
          )}

          {authView === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input type="password" required placeholder="New Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-xl border dark:bg-slate-950 dark:text-white" />
              <input type="password" required placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-4 rounded-xl border dark:bg-slate-950 dark:text-white" />
              <button type="submit" disabled={isProcessing} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase">Update Password</button>
            </form>
          )}

          {/* TOGGLE BETWEEN LOGIN AND SIGNUP */}
          <div className="text-center space-y-4">
            {authView === 'login' && (
                <>
                  <button onClick={() => setAuthView('forgot-password')} className="text-xs font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest">Forgot Password?</button>
                  <div className="border-t dark:border-slate-800 pt-6 mt-2">
                    <p className="text-sm font-bold text-slate-500 mb-2">Don't have an account?</p>
                    <button onClick={() => setAuthView('signup')} className="text-emerald-600 font-black uppercase tracking-wider text-sm hover:underline">Create Account</button>
                  </div>
                </>
            )}

            {authView === 'signup' && (
                <div className="border-t dark:border-slate-800 pt-6 mt-2">
                    <p className="text-sm font-bold text-slate-500 mb-2">Already have an account?</p>
                    <button onClick={() => setAuthView('login')} className="text-emerald-600 font-black uppercase tracking-wider text-sm hover:underline">Log In Here</button>
                </div>
            )}
            
            {(authView === 'forgot-password' || authView === 'verify-otp' || authView === 'reset-password') && (
              <button onClick={() => setAuthView('login')} className="text-xs font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest">Back to Login</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-50 dark:bg-slate-900 relative transition-colors">
      
      {/* 🔔 NOTIFICATIONS (Main App) */}
      <div className="fixed top-20 left-0 right-0 z-[100] px-4 flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`max-w-md mx-auto w-full p-4 rounded-2xl shadow-2xl flex items-start gap-3 pointer-events-auto animate-in slide-in-from-top-2 duration-300 ${n.type === 'success' ? 'bg-emerald-600 text-white' : n.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-white'}`}>
            {n.type === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}<p className="text-sm font-black">{n.message}</p>
          </div>
        ))}
      </div>

      <header className="bg-emerald-600 p-4 text-white flex justify-between items-center sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2"><Zap className="fill-yellow-400 text-yellow-400" size={20}/><h1 className="text-xl font-black tracking-tight">NaijaConnect</h1></div>
        <div className="flex gap-3">
          <button onClick={() => setShowLangMenu(!showLangMenu)} className="p-2 bg-white/10 rounded-full"><LangIcon size={20}/></button>
          {showLangMenu && <div className="absolute top-14 right-4 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-2xl z-50 overflow-hidden">{LANGUAGES.map(l => <button key={l.id} onClick={() => {setLanguage(l.id as any); setShowLangMenu(false)}} className="block w-full text-left p-3 text-xs font-black dark:text-white border-b last:border-0">{l.flag} {l.name}</button>)}</div>}
          <button onClick={() => setActiveTab('profile')} className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center font-black border-2 border-white/20 uppercase shadow-inner">{userName.charAt(0)}</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'buy' && (
          <div className="space-y-6">
            <section className="bg-emerald-600 p-6 rounded-[35px] shadow-xl text-white space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={120}/></div>
               <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-1">{t('wallet_bal')}</p>
                  <div className="flex items-center gap-3">
                    <h2 className="text-4xl font-black">{isLoadingBalance ? "..." : (isBalanceVisible ? `₦${walletBalance.toLocaleString()}` : '••••••••')}</h2>
                    <button onClick={() => setIsBalanceVisible(!isBalanceVisible)} className="p-2 bg-white/10 rounded-full"><Eye size={18}/></button>
                  </div>
               </div>
               <div className="flex gap-3 relative">
                  <button onClick={() => setIsDepositing(true)} className="flex-1 bg-white text-emerald-700 py-4 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95">Deposit</button>
                  <button onClick={() => setIsWithdrawing(true)} className="flex-1 bg-emerald-700 border border-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase active:scale-95">Withdraw</button>
               </div>
            </section>

            <section>
              <h2 className="text-xs font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">{t('select_net')}</h2>
              <div className="grid grid-cols-4 gap-3">
                {CARRIERS.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCarrier(c.id); setSelectedPlan(null); }} className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${selectedCarrier === c.id ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 scale-105 shadow-md' : 'border-transparent bg-white dark:bg-slate-800 hover:border-slate-200'}`}>
                    <img src={c.logo} alt={c.id} className="w-10 h-10 object-contain mb-1" />
                    <span className="text-[10px] font-black dark:text-white uppercase">{c.id}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="flex bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner">
              <button onClick={() => setProductType('Airtime')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${productType === 'Airtime' ? 'bg-white shadow-lg text-emerald-700 scale-100' : 'text-slate-500'}`}>{t('airtime')}</button>
              <button onClick={() => setProductType('Data')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${productType === 'Data' ? 'bg-white shadow-lg text-emerald-700 scale-100' : 'text-slate-500'}`}>{t('data')}</button>
            </div>

            <section className="bg-white dark:bg-slate-800 p-5 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-4 text-slate-400" size={18} />
                  <input type="tel" value={phoneNumber} onChange={e => handlePhoneChange(e.target.value)} className="w-full pl-10 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-black dark:text-white outline-none text-base border border-transparent focus:border-emerald-500 transition-all" placeholder="080..." />
                </div>
              </div>

              {productType === 'Airtime' ? (
                <div className="animate-in fade-in duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Select Amount</label>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[100, 200, 500, 1000].map(v => <button key={v} onClick={() => setAmount(v.toString())} className={`py-3 rounded-xl text-xs font-black border-2 transition-all ${amount === v.toString() ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-600' : 'border-slate-50 dark:bg-slate-900 dark:text-white'}`}>₦{v}</button>)}
                  </div>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-black dark:text-white outline-none text-base" placeholder="Custom Amount" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  {isLoadingPlans ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-2"/><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading {selectedCarrier} Plans</p></div> : 
                   filteredPlans.length === 0 ? <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-3xl"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No plans available</p></div> :
                   filteredPlans.map(plan => (
                    <button key={plan.id} onClick={() => openPlanConfirmation(plan)} className="w-full p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-transparent hover:border-emerald-500 transition-all group active:scale-95">
                      <div className="text-left">
                        <p className="font-black text-sm dark:text-white group-hover:text-emerald-600 transition-colors">{plan.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{plan.validity} • {plan.allowance}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-emerald-600 text-sm">₦{plan.price}</span>
                        <ArrowRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform"/>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {productType === 'Airtime' && (
              <button onClick={openAirtimeConfirmation} disabled={!amount || Number(amount) < 50} className="w-full py-5 bg-emerald-600 text-white rounded-[25px] font-black uppercase shadow-xl tracking-tighter disabled:opacity-50 active:scale-95 transition-all">{t('recharge_now')} ₦{amount || 0}</button>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
             <section className="bg-white dark:bg-slate-800 p-5 rounded-[35px] shadow-lg border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-6 px-1">
                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 tracking-tight"><HistoryIcon size={20} className="text-emerald-600" /> {t('history')}</h2>
                <div className="flex gap-2">
                   {['All', 'Airtime', 'Data'].map(f => <button key={f} onClick={() => setHistoryTypeFilter(f as any)} className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${historyTypeFilter === f ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-900 dark:text-slate-400'}`}>{f}</button>)}
                </div>
              </div>
              <div className="space-y-3">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-10 opacity-30 font-black text-sm uppercase italic">No history found</div>
                ) : filteredTransactions.map(tx => (
                  <div key={tx.id} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent rounded-2xl group shadow-sm transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${CARRIERS.find(c => c.id === tx.carrier)?.color || 'bg-emerald-600'} shadow-sm transition-transform group-hover:scale-110`}><Smartphone size={18} className="text-white" /></div>
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{tx.carrier} {tx.type}</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-wider">{tx.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">₦{tx.amount}</p>
                      <p className={`text-[8px] font-black uppercase flex items-center justify-end gap-1 ${tx.status === 'Success' ? 'text-emerald-600' : 'text-rose-500'}`}>{tx.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* AI ASSISTANT */}
        {activeTab === 'assistant' && (
          <div className="flex flex-col h-[calc(100vh-180px)] animate-in slide-in-from-bottom duration-500">
             <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar pb-4">
              <div className="bg-emerald-50 dark:bg-emerald-950 p-5 rounded-[30px] border-2 border-emerald-100 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-300 font-bold leading-relaxed shadow-sm">
                👋 <strong>Oshey!</strong> NaijaConnect Assistant ready to help you find the best deals. 🇳🇬
              </div>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] p-4 rounded-[25px] text-sm font-bold shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>{msg.text}</div>
                </div>
              ))}
              {isAiLoading && <div className="flex justify-start"><div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-3xl flex items-center gap-2 shadow-sm"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div></div></div>}
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {quickTips.map((tip, idx) => <button key={idx} onClick={() => handleAiMessage(tip)} className="flex-shrink-0 px-4 py-2 bg-emerald-50 dark:bg-slate-800 border-2 border-emerald-100 dark:border-slate-700 rounded-2xl text-[10px] font-black text-emerald-700 dark:text-emerald-400 hover:border-emerald-400 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap active:scale-95"><Lightbulb size={12} className="text-emerald-500" />{tip}</button>)}
              </div>
              <div className="flex gap-3">
                <input type="text" placeholder="Type a message..." value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAiMessage()} className="flex-1 px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400 font-bold shadow-inner" />
                <button onClick={() => handleAiMessage()} disabled={isAiLoading || !userInput.trim()} className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 active:scale-90 shadow-xl"><ArrowRight size={24} /></button>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6 text-center py-6 animate-in fade-in duration-500">
             <div className="w-32 h-32 bg-emerald-600 rounded-[45px] mx-auto flex items-center justify-center text-5xl text-white font-black mb-4 shadow-xl shadow-emerald-100 dark:shadow-none border-4 border-white/20 uppercase">{userName.charAt(0)}</div>
             <div>
                <h2 className="text-2xl font-black dark:text-white tracking-tight">{userName}</h2>
                <p className="text-slate-400 font-bold text-sm">{userEmail}</p>
             </div>
             <div className="grid grid-cols-2 gap-4 mt-8 px-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-[30px] border shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                   <p className="text-emerald-600 font-black text-sm uppercase">Verified</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-[30px] border shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Member Since</p>
                   <p className="text-slate-800 dark:text-white font-black text-sm uppercase tracking-tighter">Jan 2026</p>
                </div>
             </div>
             <div className="px-4 mt-10">
                <button onClick={handleLogout} className="w-full py-5 text-rose-500 font-black flex items-center gap-3 justify-center bg-rose-50 dark:bg-rose-950/20 rounded-[30px] transition-all hover:bg-rose-100 active:scale-95"><LogOut size={22}/> Sign Out from NaijaConnect</button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full max-w-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-t dark:border-slate-700 p-5 flex justify-around shadow-2xl z-40">
        <button onClick={() => setActiveTab('buy')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'buy' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}><Wifi size={24} strokeWidth={3}/><span className="text-[9px] font-black uppercase tracking-widest">{t('buy')}</span></button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}><HistoryIcon size={24} strokeWidth={3}/><span className="text-[9px] font-black uppercase tracking-widest">{t('history')}</span></button>
        <button onClick={() => setActiveTab('assistant')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'assistant' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}><MessageCircle size={24} strokeWidth={3}/><span className="text-[9px] font-black uppercase tracking-widest">Ask AI</span></button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}><UserIcon size={24} strokeWidth={3}/><span className="text-[9px] font-black uppercase tracking-widest">Me</span></button>
      </nav>

      {/* CONFIRM PURCHASE MODAL */}
      {isConfirmingPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[45px] p-8 shadow-2xl border-2 border-white/10 animate-in zoom-in-95">
             <div className="flex justify-center mb-6"><div className="bg-emerald-100 p-4 rounded-3xl"><Smartphone size={32} className="text-emerald-600" /></div></div>
             <h3 className="text-xl font-black text-center mb-1 dark:text-white">Confirm Transaction</h3>
             <p className="text-xs text-slate-400 text-center font-bold uppercase tracking-widest mb-8">{selectedPlan?.name || 'Airtime'} for {phoneNumber}</p>
             
             <div className="flex justify-between items-center mb-10 p-5 bg-slate-50 dark:bg-slate-900 rounded-[30px] shadow-inner border border-slate-100 dark:border-slate-700">
                <span className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Total Pay</span>
                <span className="font-black text-3xl text-emerald-600 tracking-tighter">₦{selectedPlan?.price || amount}</span>
             </div>

             <div className="space-y-3">
               <button onClick={handlePurchase} disabled={isProcessing} className="w-full py-5 bg-emerald-600 text-white rounded-[25px] font-black uppercase tracking-tighter shadow-xl shadow-emerald-200 dark:shadow-none flex justify-center items-center gap-2 active:scale-95 transition-all">{isProcessing ? <Loader2 className="animate-spin" /> : "Purchase Now"}</button>
               <button onClick={() => setIsConfirmingPlan(false)} className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-rose-500 transition-colors">Go Back</button>
             </div>
          </div>
        </div>
      )}

      {/* DEPOSIT MODAL */}
      {isDepositing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[45px] p-8 shadow-2xl animate-in zoom-in-95 border-2 border-white/10 text-center">
             
             {!paymentPending ? (
               <>
                 <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black dark:text-white tracking-tight uppercase">Deposit Funds</h3><button onClick={() => setIsDepositing(false)} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-400"><X size={18}/></button></div>
                 <div className="mb-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left ml-1">Enter Amount (₦)</p>
                    <input type="number" autoFocus placeholder="500" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl font-black dark:text-white outline-none text-2xl border-2 border-transparent focus:border-emerald-600 transition-all shadow-inner" />
                 </div>
                 <button onClick={handleDepositSubmit} disabled={isProcessing} className="w-full py-5 bg-emerald-600 text-white rounded-[25px] font-black uppercase shadow-xl active:scale-95 tracking-tighter transition-all flex justify-center items-center gap-2">{isProcessing ? <Loader2 className="animate-spin"/> : "Start Secure Payment"}</button>
               </>
             ) : (
               <div className="animate-in slide-in-from-bottom-2 duration-500">
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[30px] flex items-center justify-center mx-auto mb-6 shadow-sm"><CheckCircle2 size={40} /></div>
                 <h3 className="text-xl font-black dark:text-white mb-2 tracking-tight">Payment Started</h3>
                 <p className="text-xs text-slate-500 mb-8 font-bold leading-relaxed tracking-wide">Finish payment in your browser, then click below to credit your wallet.</p>
                 <button onClick={verifyPayment} disabled={isProcessing} className="w-full py-5 bg-emerald-600 text-white rounded-[25px] font-black uppercase shadow-xl flex justify-center mb-4 active:scale-95 transition-all">{isProcessing ? <Loader2 className="animate-spin"/> : "I've Finished Payment"}</button>
                 <button onClick={() => window.open(pendingTxUrl, '_blank')} className="text-[10px] font-black text-emerald-600 flex items-center justify-center gap-1 mx-auto uppercase tracking-widest mb-6">Re-open Link <ExternalLink size={12} /></button>
                 <button onClick={() => setPaymentPending(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Back</button>
               </div>
             )}
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {isWithdrawing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[45px] p-8 shadow-2xl border-2 border-white/10">
             <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Withdraw</h3><button onClick={() => setIsWithdrawing(false)} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-400"><X size={18}/></button></div>
             <div className="space-y-5">
               <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Amount</label><input type="number" placeholder="₦" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-black dark:text-white outline-none shadow-inner" /></div>
               <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Bank Code</label><div className="relative"><Building2 className="absolute left-3 top-4 text-slate-400" size={16} /><input type="text" placeholder="057 (Zenith)" value={withdrawBank} onChange={e => setWithdrawBank(e.target.value)} className="w-full pl-10 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-black dark:text-white outline-none shadow-inner" /></div></div>
               <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Account Number</label><div className="relative"><Hash className="absolute left-3 top-4 text-slate-400" size={16} /><input type="text" maxLength={10} placeholder="0000000000" value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)} className="w-full pl-10 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-black dark:text-white outline-none shadow-inner" /></div></div>
             </div>
             <button onClick={handleWithdrawSubmit} disabled={isProcessing} className="w-full mt-10 py-5 bg-emerald-600 text-white rounded-[25px] font-black uppercase shadow-xl flex justify-center tracking-tighter active:scale-95 transition-all">{isProcessing ? <Loader2 className="animate-spin"/> : "Withdraw Funds"}</button>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {showSuccess && (
        <div className="fixed inset-0 bg-emerald-600 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[55px] p-10 text-center space-y-8 shadow-2xl border-8 border-white/10 animate-in zoom-in-90">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-[45px] flex items-center justify-center mx-auto shadow-sm"><CheckCircle2 size={64} /></div>
            <h3 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{t('done')}</h3>
            <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">Purchase Complete</p>
            <button onClick={() => { setShowSuccess(false); setAmount(''); setSelectedPlan(null); }} className="w-full py-5 bg-emerald-600 text-white rounded-[30px] font-black text-lg hover:bg-emerald-700 shadow-2xl active:scale-95 transition-all">{t('finish')}</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;