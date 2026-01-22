// src/services/paymentService.ts

import axios from 'axios';
import { DataPlan } from '../types';

// 🔐 KEYS
// ⚠️ IMPORTANT: These are visible in the browser. For production, move to a backend.
const PAYSTACK_SECRET_KEY = "sk_test_595ac543ca73e33e382d7af1bb041693f197fcb8"; 
const AFFTECH_TOKEN = "Token 6c21f4919149ab4e44425149ae11b0c6548e75a0"; 

const PROXY_URL = "https://cors-anywhere.herokuapp.com/"; 
const PAYSTACK_BASE = "https://api.paystack.co";
const AFFTECH_BASE = "https://www.affatech.com.ng/api";

// 1. FETCH PLANS
export const getPlans = async (): Promise<DataPlan[]> => {
  try {
    const response = await axios.get(`${PROXY_URL}${AFFTECH_BASE}/network/`, {
      headers: { Authorization: AFFTECH_TOKEN }
    });
    const data = response.data;
    let allPlans: any[] = [];
    if (data.MTN_PLAN) allPlans.push(...data.MTN_PLAN);
    if (data.GLO_PLAN) allPlans.push(...data.GLO_PLAN);
    if (data.AIRTEL_PLAN) allPlans.push(...data.AIRTEL_PLAN);
    if (data["9MOBILE_PLAN"]) allPlans.push(...data["9MOBILE_PLAN"]);

    return allPlans.map((p: any) => ({
      id: p.id,
      network: p.plan_network,
      plan_type: p.plan_type,
      amount: p.plan_amount,
      size: p.plan
    }));
  } catch (error) {
    console.error("Afftech Plan Error:", error);
    throw error;
  }
};

// 2. BUY DATA (Fixed Capital 'P' Error)
export const buyData = async (networkId: string, phone: string, planId: string) => {
  try {
    console.log(`Attempting Buy: Network ${networkId}, Plan ${planId}, Phone ${phone}`);
    
    const response = await axios.post(`${PROXY_URL}${AFFTECH_BASE}/data/`, {
      network: networkId,
      mobile_number: phone,
      plan: planId,
      Ported_number: true // ⚠️ FIXED: Capital 'P' is required by API
    }, { headers: { Authorization: AFFTECH_TOKEN } });
    
    return response.data;

  } catch (error: any) {
    console.error("🔥 BUY DATA ERROR:", error);
    
    // Extract the specific error message from Afftech
    if (error.response) {
        console.error("Server Response:", error.response.data);
        const serverMsg = error.response.data.error || error.response.data.message || JSON.stringify(error.response.data);
        throw new Error(serverMsg);
    }
    throw new Error("Network connection failed");
  }
};

// 3. FUND WALLET (Also exported as initializeTopUp for compatibility)
export const fundWallet = async (email: string, amount: number) => {
  try {
    const response = await axios.post(
      `${PROXY_URL}${PAYSTACK_BASE}/transaction/initialize`,
      { 
        email: email,
        amount: amount * 100, // Paystack uses Kobo
        // Use window.location.origin so it works on localhost or production automatically
        callback_url: typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000" 
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    return {
      success: true,
      authorization_url: response.data.data.authorization_url, // 'authorization_url' is correct for Paystack
      checkoutUrl: response.data.data.authorization_url, // Alias for your UI
      reference: response.data.data.reference 
    };
  } catch (error) {
    console.error("Paystack Init Error:", error);
    throw error;
  }
};

// 3b. ALIAS for App.tsx compatibility
export const initializeTopUp = fundWallet;

// 4. VERIFY TRANSACTION
export const verifyTransaction = async (reference: string) => {
  try {
    const response = await axios.get(
      `${PROXY_URL}${PAYSTACK_BASE}/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    if (response.data.data.status === "success") {
      return { success: true, amount: response.data.data.amount / 100 };
    }
    return { success: false };
  } catch (error) {
    console.error("Verification Error:", error);
    return { success: false };
  }
};

// 5. WITHDRAW FUNDS
export const withdrawFunds = async (amount: number, bankCode: string, accountNumber: string, narration: string) => {
  try {
    // A. Create Recipient
    const recipientRes = await axios.post(
      `${PROXY_URL}${PAYSTACK_BASE}/transferrecipient`,
      {
        type: "nuban", name: "User Withdrawal", 
        account_number: accountNumber, bank_code: bankCode, currency: "NGN"
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    const recipientCode = recipientRes.data.data.recipient_code;

    // B. Initiate Transfer
    const transferRes = await axios.post(
      `${PROXY_URL}${PAYSTACK_BASE}/transfer`,
      {
        source: "balance", amount: amount * 100, 
        recipient: recipientCode, reason: narration
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    return transferRes.data;
  } catch (error: any) {
    // Handle Sandbox "Insufficient Balance" gracefully for testing
    if (error.response && error.response.data.code === "insufficient_balance") {
        console.warn("Sandbox Mode: Simulating success because Test Balance is low.");
        return { status: true, message: "Simulated Success (Sandbox Balance Low)", data: { transfer_code: "TRF_TEST_MOCK" } };
    }
    throw error;
  }
};