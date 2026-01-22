// services/dbService.ts
// 🛠️ OFFLINE DATABASE WITH OTP & PASSWORD RESET LOGIC

const DB_KEY = 'naija_connect_database_v3';

// Load DB
const getDb = () => {
  const stored = localStorage.getItem(DB_KEY);
  if (!stored) return { profiles: [], transactions: [] };
  return JSON.parse(stored);
};

// Save DB
const saveDb = (data: any) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
};

export const dbService = {
  
  // 1. LOGIN
  async loginUser(email: string, password: string) { 
    await new Promise(r => setTimeout(r, 800)); 
    const db = getDb();
    const user = db.profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());

    if (!user) throw new Error("User not found.");
    if (user.password !== password) throw new Error("Incorrect password.");

    return user;
  },

  // 2. REGISTER
  async registerUser(email: string, name: string, password: string) {
    await new Promise(r => setTimeout(r, 800));
    const db = getDb();
    if (db.profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("User already exists.");
    }

    const newUser = { 
      id: 'user_' + Date.now(),
      email: email.toLowerCase(), 
      full_name: name, 
      password: password, 
      wallet_balance: 0,
      created_at: new Date().toISOString(),
      otp: null,
      otp_expiry: null
    };

    db.profiles.push(newUser);
    saveDb(db);
    return newUser;
  },

  // 3. GENERATE OTP (Forgot Password)
  async generateOtp(email: string, otpLength: number, expirationSeconds: number) {
    await new Promise(r => setTimeout(r, 500));
    const db = getDb();
    const userIndex = db.profiles.findIndex((p: any) => p.email.toLowerCase() === email.toLowerCase());

    if (userIndex === -1) throw new Error("Email not found.");

    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < otpLength; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }

    const expiry = new Date();
    expiry.setSeconds(expiry.getSeconds() + expirationSeconds);

    db.profiles[userIndex].otp = otp;
    db.profiles[userIndex].otp_expiry = expiry.toISOString();
    saveDb(db);

    return otp;
  },

  // 4. VERIFY OTP
  async verifyOtp(email: string, inputOtp: string) {
    await new Promise(r => setTimeout(r, 500));
    const db = getDb();
    const user = db.profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());

    if (!user || !user.otp) throw new Error("Invalid request.");
    
    if (new Date() > new Date(user.otp_expiry)) {
        throw new Error("OTP has expired. Request a new one.");
    }

    if (user.otp !== inputOtp) {
        throw new Error("Invalid OTP code.");
    }

    return true;
  },

  // 5. RESET PASSWORD
  async resetPassword(email: string, newPassword: string) {
    await new Promise(r => setTimeout(r, 500));
    const db = getDb();
    const userIndex = db.profiles.findIndex((p: any) => p.email.toLowerCase() === email.toLowerCase());

    if (userIndex === -1) throw new Error("User not found.");

    db.profiles[userIndex].password = newPassword;
    db.profiles[userIndex].otp = null;
    db.profiles[userIndex].otp_expiry = null;
    saveDb(db);
  },

  // --- STANDARD HELPERS ---

  async getUserProfile(email: string, nameFallback?: string) {
    const db = getDb();
    let user = db.profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
    
    // If we're syncing and user doesn't exist (e.g. social login simulation)
    if (!user && nameFallback) {
        user = await this.registerUser(email, nameFallback, 'password123');
    }
    return user;
  },

  async updateBalance(email: string, newBalance: number) {
    const db = getDb();
    const idx = db.profiles.findIndex((p: any) => p.email.toLowerCase() === email.toLowerCase());
    if (idx !== -1) { 
        db.profiles[idx].wallet_balance = newBalance; 
        saveDb(db); 
    }
  },

  async addTransaction(tx: any) {
    const db = getDb();
    db.transactions.push({ 
        ...tx, 
        id: 'tx_' + Date.now(), 
        created_at: new Date().toISOString() 
    });
    saveDb(db);
  },

  /**
   * 🆕 ENHANCED GET HISTORY
   * Correctly identifies carrier and formatting for the UI components.
   */
  async getHistory(email: string) {
    await new Promise(r => setTimeout(r, 500));
    const db = getDb();
    
    // Filter and sort by date
    const userTx = db.transactions
      .filter((t: any) => t.user_email.toLowerCase() === email.toLowerCase())
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Map to the format expected by the UI Transaction interface
    return userTx.map((t: any) => ({
      id: t.id,
      date: new Date(t.created_at).toLocaleString(),
      // Logic to ensure 'carrier' field isn't empty for Wallet operations
      carrier: t.carrier || (t.type === 'Deposit' ? 'Wallet' : 'System'),
      type: t.type,
      amount: Number(t.amount),
      phoneNumber: t.phoneNumber || t.user_email,
      status: t.status || 'Success'
    }));
  }
};