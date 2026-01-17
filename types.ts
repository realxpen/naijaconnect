
export enum Carrier {
  MTN = 'MTN',
  AIRTEL = 'Airtel',
  GLO = 'Glo',
  NINEMOBILE = '9mobile'
}

export type ProductType = 'Airtime' | 'Data';

export interface DataPlan {
  id: string;
  name: string;
  price: number;
  validity: string;
  allowance: string;
  category: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
}

export interface Transaction {
  id: string;
  date: string;
  carrier: Carrier;
  type: ProductType;
  amount: number;
  phoneNumber: string;
  status: 'Success' | 'Failed' | 'Pending';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
