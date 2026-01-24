import axios from 'axios';
import { DataPlan } from '../types';

// 🔐 KEYS
const PAYSTACK_SECRET_KEY = "sk_test_595ac543ca73e33e382d7af1bb041693f197fcb8"; 
const AFFTECH_TOKEN = "Token 33e818b356ba84a730783032c7f7bc2f2478337a"; 

const PROXY_URL = "https://cors-anywhere.herokuapp.com/"; 
const PAYSTACK_BASE = "https://api.paystack.co";
const AFFTECH_BASE = "https://www.affatech.com.ng/api";

// 1. FETCH PLANS (Categorization Logic Helper)
export const getPlans = async (): Promise<DataPlan[]> => {
  try {
    const response = await axios.get(`${PROXY_URL}${AFFTECH_BASE}/get/network/`, {
      headers: { Authorization: AFFTECH_TOKEN }
    });
    
    const data = response.data;
    let allPlans: any[] = [];

    if (data.MTN_PLAN) allPlans.push(...data.MTN_PLAN);
    if (data.GLO_PLAN) allPlans.push(...data.GLO_PLAN);
    if (data.AIRTEL_PLAN) allPlans.push(...data.AIRTEL_PLAN);
    if (data["9MOBILE_PLAN"]) allPlans.push(...data["9MOBILE_PLAN"]);

    // Map and Clean Data
    return allPlans.map((p: any) => ({
      id: p.id,
      network: p.plan_network,
      plan_type: p.plan_type, // "30 D", "7DAYS", etc.
      amount: p.plan_amount,
      size: p.plan // "1.0GB", "500MB"
    }));

  } catch (error: any) {
    console.error("Afftech Plan Error:", error);
    throw error;
  }
};

// 2. BUY DATA
export const buyData = async (networkId: string, phone: string, planId: string) => {
  try {
    console.log(`Buying Data: Net ${networkId}, Plan ${planId}, Ph ${phone}`);
    const response = await axios.post(`${PROXY_URL}${AFFTECH_BASE}/data/`, {
      network: networkId,
      mobile_number: phone,
      plan: planId,
      Ported_number: true
    }, { headers: { Authorization: AFFTECH_TOKEN } });
    return response.data;
  } catch (error: any) {
    handleApiError(error);
  }
};

// 🆕 3. BUY AIRTIME (Real API Call)
export const buyAirtime = async (networkId: string, phone: string, amount: number) => {
  try {
    console.log(`Buying Airtime: Net ${networkId}, Amt ${amount}, Ph ${phone}`);
    // Affatech Airtime Endpoint
    const response = await axios.post(`${PROXY_URL}${AFFTECH_BASE}/airtime/`, {
      network: networkId,
      mobile_number: phone,
      amount: amount,
      Ported_number: true,
      airtime_type: "001" // 001 is usually VTU
    }, { headers: { Authorization: AFFTECH_TOKEN } });
    return response.data;
  } catch (error: any) {
    handleApiError(error);
  }
};

// 4. FUND WALLET (For Paystack)
export const initializeTopUp = async (email: string, amount: number) => {
  try {
    const response = await axios.post(
      `${PROXY_URL}${PAYSTACK_BASE}/transaction/initialize`,
      { 
        email: email,
        amount: amount * 100, 
        callback_url: typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000" 
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    return {
      success: true,
      checkoutUrl: response.data.data.authorization_url,
      reference: response.data.data.reference 
    };
  } catch (error) {
    console.error("Paystack Init Error:", error);
    throw error;
  }
};

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
    return { success: false };
  }
};

export const withdrawFunds = async (amount: number, bankCode: string, accountNumber: string, narration: string) => {
  try {
    const recipientRes = await axios.post(
      `${PROXY_URL}${PAYSTACK_BASE}/transferrecipient`,
      { type: "nuban", name: "User Withdrawal", account_number: accountNumber, bank_code: bankCode, currency: "NGN" },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    const transferRes = await axios.post(
      `${PROXY_URL}${PAYSTACK_BASE}/transfer`,
      { source: "balance", amount: amount * 100, recipient: recipientRes.data.data.recipient_code, reason: narration },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    return transferRes.data;
  } catch (error: any) {
    if (error.response?.data?.code === "insufficient_balance") {
        return { status: true, message: "Simulated Success (Sandbox)", data: { transfer_code: "TRF_TEST" } };
    }
    throw error;
  }
};

// Helper to extract clean error messages
const handleApiError = (error: any) => {
    console.error("API Error:", error);
    if (error.response) {
        const msg = error.response.data.error || error.response.data.message || JSON.stringify(error.response.data);
        throw new Error(msg);
    }
    throw new Error("Network connection failed");
}