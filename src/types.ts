export type Step = 'UPLOAD' | 'BILL_NAME' | 'CAMERA' | 'PROCESSING' | 'ASSIGN_ITEMS' | 'TAX_SERVICE' | 'PAYMENTS' | 'SUMMARY' | 'RESTORE';

export type DistributionMode = 'PROPORTIONAL' | 'EQUAL';

export type Person = {
  id: string;
  name: string;
  color: string;
};

export type Item = {
  id: string;
  name: string;
  price: number;
  qty: number;
  sharedBy: string[]; // Array of Person IDs
};

export type ReceiptData = {
  id: string;
  name: string;
  items: Item[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  image?: string;
};

export type Payment = {
  id: string;
  personId: string;
  amount: number;
  note: string;
};

export const COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 
  'bg-violet-500', 'bg-cyan-500', 'bg-orange-500', 'bg-fuchsia-500'
];

export const ANIMALS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🕸', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔'];
