
import { Carrier, DataPlan } from './types';

export const CARRIERS = [
  { id: Carrier.MTN, color: 'bg-yellow-400', textColor: 'text-black', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/MTN_Logo.svg' },
  { id: Carrier.AIRTEL, color: 'bg-red-600', textColor: 'text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Airtel_logo.svg' },
  { id: Carrier.GLO, color: 'bg-green-600', textColor: 'text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Glo_logo.png' },
  { id: Carrier.NINEMOBILE, color: 'bg-emerald-900', textColor: 'text-white', logo: 'https://upload.wikimedia.org/wikipedia/en/3/30/9mobile_logo.png' }
];

export const MOCK_DATA_PLANS: Record<Carrier, DataPlan[]> = {
  [Carrier.MTN]: [
    { id: 'm1', name: 'Daily 100MB', price: 100, validity: '1 Day', allowance: '100MB', category: 'Daily' },
    { id: 'm2', name: 'Weekly 1.5GB', price: 500, validity: '7 Days', allowance: '1.5GB', category: 'Weekly' },
    { id: 'm3', name: 'Monthly 3.5GB', price: 1200, validity: '30 Days', allowance: '3.5GB', category: 'Monthly' },
    { id: 'm4', name: 'Monthly 10GB', price: 3000, validity: '30 Days', allowance: '10GB', category: 'Monthly' },
  ],
  [Carrier.AIRTEL]: [
    { id: 'a1', name: 'Daily 200MB', price: 100, validity: '1 Day', allowance: '200MB', category: 'Daily' },
    { id: 'a2', name: 'Weekly 2GB', price: 500, validity: '7 Days', allowance: '2GB', category: 'Weekly' },
    { id: 'a3', name: 'Monthly 5GB', price: 1500, validity: '30 Days', allowance: '5GB', category: 'Monthly' },
    { id: 'a4', name: 'Monthly 15GB', price: 4000, validity: '30 Days', allowance: '15GB', category: 'Monthly' },
  ],
  [Carrier.GLO]: [
    { id: 'g1', name: 'Mega 1GB', price: 300, validity: '1 Day', allowance: '1GB', category: 'Daily' },
    { id: 'g2', name: 'Weekly 2.5GB', price: 500, validity: '7 Days', allowance: '2.5GB', category: 'Weekly' },
    { id: 'g3', name: 'Monthly 7GB', price: 1500, validity: '30 Days', allowance: '7GB', category: 'Monthly' },
  ],
  [Carrier.NINEMOBILE]: [
    { id: 'n1', name: 'Small 1GB', price: 500, validity: '7 Days', allowance: '1GB', category: 'Weekly' },
    { id: 'n2', name: 'Monthly 2GB', price: 1000, validity: '30 Days', allowance: '2GB', category: 'Monthly' },
  ]
};
