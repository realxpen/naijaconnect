// types.ts

export type Language = 'en' | 'yo' | 'ha' | 'ig' | 'pidgin';

export enum Carrier {
  MTN = 'MTN',
  AIRTEL = 'AIRTEL',
  GLO = 'GLO',
  NINEMOBILE = '9MOBILE'
}

export type ProductType = 'Airtime' | 'Data';

export interface DataPlan {
  id: string;
  name: string;
  price: number;
  validity: string;
  allowance: string;
  category: string; // 'Daily', 'Weekly', 'Monthly'
  network?: string; // Optional, used when fetching from API
}

export interface Transaction {
  id: string;
  date: string;
  carrier: Carrier;
  type: ProductType | string; // 'Data', 'Airtime', or 'Transfer'
  amount: number;
  phoneNumber: string;
  status: 'Success' | 'Failed' | 'Pending';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface WalletResponse {
  requestSuccessful: boolean;
  responseBody: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    reservationReference?: string;
  };
}

// For UI Theme toggling
export type Theme = 'light' | 'dark' | 'system';