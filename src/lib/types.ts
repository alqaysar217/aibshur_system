export type UserRole = 'client' | 'driver' | 'admin' | 'support';
export type OrderStatus = 'pending' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash' | 'wallet';
export type TransactionType = 'top-up' | 'withdrawal' | 'payment';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type StoreCategoryType = 'restaurant' | 'pharmacy' | 'market';

// Using a generic GeoPoint type as Firestore GeoPoint is a class instance.
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface City {
  city_id: string;
  name_ar: string;
  support_contact: string;
  is_active: boolean;
  geometry: GeoPoint;
}

export interface User {
  uid: string;
  full_name: string;
  phone: string;
  role: UserRole;
  city_id: string; // ref to City
  profile_image: string;
  created_at: string;
  driver_details?: {
    vehicle_type: string;
    id_card_image: string;
    status: 'pending' | 'approved' | 'rejected';
    is_online: boolean;
    rating: number;
    wallet_balance: number;
  };
  account_status: {
    is_blocked: boolean;
    reason?: string;
  };
}

export interface CategoryFilter {
  filter_id: string;
  name_ar: string;
  type: StoreCategoryType;
  icon_url: string; // Or a component if handled locally
}

export interface Store {
  store_id: string;
  city_id: string; // ref to City
  filter_id: string; // ref to CategoryFilter
  name_ar: string;
  logo_url: string;
  location: GeoPoint;
  address_text: string;
  working_hours: Record<string, string>; // e.g. { "sunday": "9am-10pm" }
  average_delivery_time: number; // in minutes
  is_open: boolean;
  rating: number;
  owner_uid: string; // ref to User
}

export interface ProductVariant {
  variant_id: string;
  size_name: 'S' | 'M' | 'L' | 'Standard';
  price: number;
  image_url?: string;
}

export interface Product {
  product_id: string;
  store_id: string; // ref to Store
  category_id: string; // ref to a more granular category if needed
  name_ar: string;
  description_ar: string;
  main_image: string;
  base_price: number;
  has_variants: boolean;
  variants?: ProductVariant[];
}

export interface OrderItem {
  product_id: string;
  name_ar: string;
  quantity: number;
  price: number;
  variant_id?: string;
}

export interface Order {
  order_id: string;
  client_uid: string; // ref to User
  driver_uid?: string; // ref to User
  store_id: string; // ref to Store
  items: OrderItem[];
  total_price: number;
  delivery_fee: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  client_location: GeoPoint;
  timestamp: string;
}

export interface Transaction {
  transaction_id: string;
  user_uid: string; // ref to User
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  date: string;
}

export interface SystemSettingDoc {
  id: string;
  data: Record<string, any>;
}
