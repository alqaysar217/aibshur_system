export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected';
export type PaymentMethod = 'cash' | 'wallet' | 'card';
export type TransactionType = 'top-up' | 'withdrawal' | 'order_payment' | 'refund' | 'system_fee' | 'points_conversion' | 'vip_subscription' | 'donation';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type AppInfoSettingType = 'about_us' | 'privacy_policy' | 'terms_of_service' | 'ad_banner';
export type AdminConfigSettingType = 'coupon' | 'vip_package' | 'loyalty_points_config' | 'system_fee_config' | 'app_config';
export type TargetType = 'general' | 'store' | 'product';
export type DiscountType = 'percentage' | 'fixed_amount';
export type CouponScope = 'global' | 'store' | 'product';
export type DonationType = 'siquia' | 'itiam' | 'jariyah' | 'general';
export type LoyaltyTransactionType = 'earn' | 'redeem' | 'manual_adjustment';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'dispatched' | 'completed' | 'cancelled';


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

export interface VipPlanBenefits {
    hasFreeDelivery: boolean;
    discountPercentage: number;
    pointsMultiplier: number;
}

export interface VipPlan {
    id?: string;
    planId: string;
    name: string;
    description?: string;
    price: number;
    durationInDays: number;
    benefits: VipPlanBenefits;
    features?: string[];
    isActive: boolean;
}

export interface User {
  uid: string;
  phone: string; // Primary identifier for OTP auth
  roles: {
    is_user?: boolean;
    is_admin?: boolean;
    is_driver?: boolean;
    is_store_owner?: boolean;
  };
  full_name?: string;
  email?: string;
  profile_image?: string;
  city_id?: string; // ref to City
  store_id?: string; // For store owners
  created_at: string; // ISO 8601
  last_login_at: string; // ISO 8601
  order_history?: string[]; // Array of orderIds
  wallet_balance?: number;
  loyalty_points?: number;
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
  vip_details?: {
    isActive: boolean;
    planId: string;
    planName: string;
    startDate: string; // ISO 8601
    expiryDate: string; // ISO 8601
    amountPaid?: number;
    receiptNumber?: string;
    receiptImageUrl?: string;
    activatedBy?: string; // Admin UID
  };
  isMock?: boolean;
}

export interface StoreCategory {
  id?: string; // Document ID from Firestore
  categoryId: string;
  name_ar: string;
  name_en?: string;
  image_url: string;
  is_active: boolean;
}

export interface ProductCategory {
  id?: string; // Document ID from Firestore
  productCategoryId: string;
  name_ar: string;
  storeId: string; // ref to Store
  sortOrder: number;
  image_url: string;
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
  isMock?: boolean;
}

export interface ProductVariant {
  variantId: string;
  name_ar: string;
  name_en?: string;
  price: number;
  image_url?: string;
}

export interface Product {
  id?: string;
  productId: string;
  storeId: string; // ref to Store
  productCategoryId: string; // ref to ProductCategory
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  main_image_url: string;
  base_price?: number;
  is_active: boolean;
  rating?: number;
  variants?: ProductVariant[];
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

export interface OrderHistoryItem {
    status: OrderStatus;
    timestamp: string; // ISO 8601
    updatedBy?: string; // Admin or System UID
    reason?: string; // For cancellations
}

export interface Order {
  id?: string;
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
  order_history?: OrderHistoryItem[];
  isMock?: boolean;
  // Denormalized for security rules
  storeOwnerUid: string;
}

export interface Appointment {
    id?: string;
    appointmentId: string;
    clientUid: string;
    clientName: string;
    clientPhone: string;
    clientAddress: string;
    storeId: string;
    storeName: string;
    items: OrderItem[];
    totalPrice: number;
    paymentMethod: PaymentMethod;
    appointmentDate: string; // ISO 8601
    status: AppointmentStatus;
    createdAt: string; // ISO 8601
}

export interface FinanceTransaction {
  id?: string;
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
  id?: string;
  settingId: string;
  type: AdminConfigSettingType;
  config_data: any;
  is_active: boolean;
}

export interface AdBanner {
    id?: string; // Firestore doc ID
    bannerId: string;
    image_url: string;
    is_active: boolean;
    sort_order: number;
    target_type: TargetType;
    target_id?: string; // Store or Product ID
}

export interface Coupon {
    id?: string; // Firestore doc ID
    couponId: string;
    code: string;
    discount_type: DiscountType;
    discount_value: number;
    min_order_value?: number;
    expiry_date: string; // ISO String
    usage_limit: number;
    scope: CouponScope;
    scope_ids?: string[]; // Store or Product IDs
    is_active: boolean;
}

export interface AppBank {
    id?: string; // Firestore doc ID
    bankId: string;
    bank_name: string;
    account_number: string;
    account_holder: string;
    iban?: string;
    bank_logo: string;
    is_active: boolean;
}
    
export interface WalletTopupRequest {
    id?: string; // Document ID
    transactionId: string;
    userId: string;
    user_phone: string;
    user_name: string;
    amount: number;
    receipt_number?: string;
    receipt_image?: string;
    bank_id: string;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: string; // ISO 8601
    type?: 'manual_topup' | 'client_request';
    rejection_reason?: string;
    processed_by?: string; // Admin UID
    processed_at?: string; // ISO 8601
    isMock?: boolean;
}

export interface Donation {
    id?: string;
    donationId: string;
    userId?: string; 
    userName?: string;
    userPhone?: string;
    donationType: DonationType;
    amount: number;
    bankId: string;
    receiptNumber?: string;
    receiptImage?: string;
    timestamp: string;
}

export interface LoyaltyPointsConfig {
    points_per_yer: number;
    cash_per_1000_points: number;
    vip_multiplier: number;
}

export interface LoyaltyTransaction {
    id?: string;
    transactionId: string;
    userId: string;
    type: LoyaltyTransactionType;
    points: number;
    related_order_id?: string;
    related_finance_tx_id?: string;
    description: string;
    timestamp: string;
}

export interface AppConfig {
    id?: string;
    financial: {
        platform_fee_percentage: number;
        default_delivery_fee: number;
        min_order_for_free_delivery: number;
    };
    identity: {
        app_logo_url: string;
        main_slider_images: string[];
    };
    maintenance: {
        is_maintenance_mode: boolean;
        maintenance_message: string;
    };
    support: {
        whatsapp_number: string;
        facebook_url: string;
        email: string;
    }
}

export interface Complaint {
    id?: string;
    complaintId: string;
    userId: string;
    userName: string;
    userPhone: string;
    issueText: string;
    createdAt: string; // ISO 8601
    status: 'pending' | 'resolved';
}

// This is a legacy type, do not use.
export interface CategoryFilter {
    filterId: string;
    name_ar: string;
    name_en: string;
    type: 'restaurant' | 'pharmacy' | 'market' | 'other';
}
