export type UserRole = 'client' | 'driver' | 'admin' | 'store_owner';
export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected';
export type PaymentMethod = 'cash' | 'wallet' | 'card';
export type TransactionType = 'top-up' | 'withdrawal' | 'order_payment' | 'refund' | 'system_fee';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type StoreCategoryType = 'restaurant' | 'pharmacy' | 'market' | 'other';
export type AppInfoSettingType = 'about_us' | 'privacy_policy' | 'terms_of_service' | 'ad_banner';
export type AdminConfigSettingType = 'coupon' | 'vip_package' | 'loyalty_points_config' | 'system_fee_config';


// Using a generic GeoPoint type as Firestore GeoPoint is a class instance.
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface City {
  id?: string; // Document ID from Firestore
  cityId: string;
  name_ar: string;
  name_en: string;
  country_code: string; // e.g. 'YE'
  is_active: boolean;
  support_number: string;
}

export interface User {
  uid: string;
  phone: string; // Primary identifier for OTP auth
  role: UserRole;
  full_name?: string;
  email?: string;
  profile_image?: string;
  city_id?: string; // ref to City
  created_at: string; // ISO 8601
  last_login_at: string; // ISO 8601
  order_history?: string[]; // Array of orderIds
  account_status: {
    is_blocked: boolean;
    reason?: string;
  };
  driver_details?: {
    vehicle_type: string;
    license_plate: string;
    id_card_image: string;
    status: 'pending' | 'approved' | 'rejected';
    is_online: boolean;
    rating: number;
    wallet_balance: number;
    current_location?: GeoPoint;
  };
  // Custom claims on the auth token will reflect the user's role
}

export interface CategoryFilter {
  filterId: string;
  name_ar: string;
  name_en: string;
  type: StoreCategoryType;
  icon_url?: string;
  parent_filter_id?: string; // For sub-categories like 'Cuisine' under 'Restaurant'
}

export interface WorkingHoursSlot {
    open: string;
    close: string;
}

export interface DailyHours {
    is_closed: boolean;
    slots: WorkingHoursSlot[];
}

export interface Store {
  id?: string; // Document ID from Firestore
  storeId: string;
  ownerUid: string; // ref to User
  name_ar: string;
  name_en?: string;
  description_ar?: string;
  description_en?: string;
  logo_url: string;
  cover_image_url?: string;
  city_id: string; // ref to City
  filter_ids: string[]; // ref to CategoryFilter
  location: GeoPoint;
  address_text?: string;
  working_hours?: Record<string, DailyHours>; // e.g. { "saturday": { is_closed: false, slots: [{ open: "09:00", close: "22:00" }] } }
  preparation_time?: string;
  is_open: boolean; // Manual override
  is_active: boolean; // Admin approval
  rating?: number;
  // Denormalized for security rules
  storeOwnerUid: string;
}

export interface ProductVariant {
  variantId: string;
  name_ar: string;
  name_en: string;
  price: number;
  stock_count?: number;
  image_url?: string;
}

export interface Product {
  productId: string;
  storeId: string; // ref to Store
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  main_image_url: string;
  base_price: number;
  is_available: boolean;
  // Denormalized for security rules
  storeOwnerUid: string;
}

export interface OrderItem {
  productId: string;
  productName_ar: string;
  quantity: number;
  price: number; // Price at time of order
  variantId?: string;
  variantName_ar?: string;
}

export interface Order {
  orderId: string;
  clientUid: string; // ref to User
  driverUid?: string; // ref to User
  storeId: string; // ref to Store
  items: OrderItem[];
  subtotal_price: number;
  delivery_fee: number;
  total_price: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  delivery_location: GeoPoint;
  delivery_address_text: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  // Denormalized for security rules
  storeOwnerUid: string;
}

export interface FinanceTransaction {
  transactionId: string;
  userUid: string; // ref to User
  orderId?: string; // ref to Order
  amount: number; // Positive for credit, negative for debit
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  created_at: string; // ISO 8601
}

export interface AppInfoSetting {
  settingId: string;
  type: AppInfoSettingType;
  content_ar: string;
  content_en?: string;
  image_url?: string;
  is_active: boolean;
}

export interface AdminConfigSetting {
  settingId: string;
  type: AdminConfigSettingType;
  config_data: any;
  is_active: boolean;
}
