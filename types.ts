
export interface Category {
  id: number | string;
  name: string;
}

export interface ItemVariant {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  note?: string;
  isPopular?: boolean;
  isCombo?: boolean;
  comboItems?: string[];
  tags?: string[];
  variants?: ItemVariant[]; 
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedVariant?: ItemVariant; 
}

export interface AppConfig {
  images: {
    logo: string;
    menuLogo: string;
    selectorLogo: string;
    aiAvatar: string;
    slideBackgrounds: string[];
    menuBackground: string;
  };
  menu: MenuItem[];
  whatsappNumber: string;
  socialMedia: { facebook: string; instagram: string; tiktok: string; };
  paymentQr?: string;
  paymentName?: string;
}

// POS Types
export interface CashSession {
  id: number;
  opened_at: string;
  closed_at?: string;
  opening_balance: number;
  closing_balance?: number;
  total_sales: number;
  total_entry: number;
  total_exit: number;
  status: 'open' | 'closed';
  user_name: string;
}

export interface CashTransaction {
  id: number;
  session_id: number;
  type: 'entry' | 'exit';
  amount: number;
  reason: string;
  created_at: string;
}
