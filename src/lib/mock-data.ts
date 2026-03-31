import type { City, User, Store, Product, Order, FinanceTransaction, CategoryFilter } from './types';

// --- SUPER ADMINS ---
export const mockMasterUser1: User = {
  uid: 'mock-master-uid-1',
  phone: '775258830',
  full_name: 'محمود حساني',
  email: 'mahmoud@absher.com',
  profile_image: 'https://picsum.photos/seed/mahmoud/200/200',
  roles: { is_admin: true, is_driver: true, is_store_owner: true, is_user: true },
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
  account_status: { is_blocked: false },
  wallet_balance: 150000,
  store_id: 'store-1',
  isMock: true,
};

export const mockMasterUser2: User = {
  uid: 'mock-master-uid-2',
  phone: '770636008',
  full_name: 'عمر دعكيك',
  email: 'omar@absher.com',
  profile_image: 'https://picsum.photos/seed/omar/200/200',
  roles: { is_admin: true, is_driver: true, is_store_owner: true, is_user: true },
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
  account_status: { is_blocked: false },
  wallet_balance: 250000,
  store_id: 'store-2',
  isMock: true,
};

// --- ADMINS ---
const mockAdmin1: User = {
  uid: 'mock-admin-uid-1',
  phone: '777000001',
  full_name: 'مدير النظام',
  email: 'admin1@absher.com',
  roles: { is_admin: true, is_user: true },
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
  account_status: { is_blocked: false },
  isMock: true,
};
const mockAdmin2: User = {
  uid: 'mock-admin-uid-2',
  phone: '777000002',
  full_name: 'مشرف الدعم',
  email: 'admin2@absher.com',
  roles: { is_admin: true, is_user: true },
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
  account_status: { is_blocked: false },
  isMock: true,
};


// --- STORE OWNERS (VENDORS) ---
const mockVendor1: User = { uid: 'mock-vendor-uid-1', phone: '777100001', full_name: 'صاحب مطعم حضرموت', roles: { is_store_owner: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, store_id: 'store-1', isMock: true, };
const mockVendor2: User = { uid: 'mock-vendor-uid-2', phone: '777100002', full_name: 'مالك صيدلية الشفاء', roles: { is_store_owner: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, store_id: 'store-2', isMock: true, };
const mockVendor3: User = { uid: 'mock-vendor-uid-3', phone: '777100003', full_name: 'مدير سوبرماركت', roles: { is_store_owner: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, store_id: 'store-3', isMock: true, };
const mockVendor4: User = { uid: 'mock-vendor-uid-4', phone: '777100004', full_name: 'صاحب كافيه', roles: { is_store_owner: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, store_id: 'store-4', isMock: true, };
const mockVendor5: User = { uid: 'mock-vendor-uid-5', phone: '777100005', full_name: 'بائع عسل', roles: { is_store_owner: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, store_id: 'store-5', isMock: true, };


// --- DRIVERS ---
const mockDriver1: User = { uid: 'mock-driver-uid-1', phone: '777200001', full_name: 'سالم اليافعي', roles: { is_driver: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, driver_details: { status: 'approved', is_online: true, rating: 4.8, wallet_balance: 1500, vehicle_type: 'motorcycle', license_plate: '123-AB' }, isMock: true, };
const mockDriver2: User = { uid: 'mock-driver-uid-2', phone: '777200002', full_name: 'علي الكندي', roles: { is_driver: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, driver_details: { status: 'approved', is_online: false, rating: 4.5, wallet_balance: -500, vehicle_type: 'motorcycle', license_plate: '456-CD' }, isMock: true, };
const mockDriver3: User = { uid: 'mock-driver-uid-3', phone: '777200003', full_name: 'حسن بامطرف', roles: { is_driver: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: true, reason: 'مخالفات متكررة' }, driver_details: { status: 'approved', is_online: false, rating: 3.2, wallet_balance: 0, vehicle_type: 'car', license_plate: '789-EF' }, isMock: true, };
const mockDriver4: User = { uid: 'mock-driver-uid-4', phone: '777200004', full_name: 'خالد العمودي', roles: { is_driver: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, driver_details: { status: 'pending', is_online: false, rating: 0, wallet_balance: 0, vehicle_type: 'motorcycle', license_plate: '101-GH' }, isMock: true, };
const mockDriver5: User = { uid: 'mock-driver-uid-5', phone: '777200005', full_name: 'ياسر باعمر', roles: { is_driver: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, driver_details: { status: 'approved', is_online: true, rating: 4.9, wallet_balance: 3200, vehicle_type: 'car', license_plate: '112-IJ' }, isMock: true, };


// --- NORMAL USERS ---
const mockUser1: User = { uid: 'mock-user-uid-1', phone: '777300001', full_name: 'أحمد عبدالله', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 5000, isMock: true, };
const mockUser2: User = { uid: 'mock-user-uid-2', phone: '777300002', full_name: 'فاطمة محمد', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 12000, isMock: true, };
const mockUser3: User = { uid: 'mock-user-uid-3', phone: '777300003', full_name: 'يوسف خالد', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 0, isMock: true, };
const mockUser4: User = { uid: 'mock-user-uid-4', phone: '777300004', full_name: 'مريم علي', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: true, reason: 'حساب غير نشط' }, wallet_balance: 800, isMock: true, };
const mockUser5: User = { uid: 'mock-user-uid-5', phone: '777300005', full_name: 'إبراهيم حسن', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 25000, isMock: true, };
const mockUser6: User = { uid: 'mock-user-uid-6', phone: '777300006', full_name: 'عائشة سعيد', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 100, isMock: true, };
const mockUser7: User = { uid: 'mock-user-uid-7', phone: '777300007', full_name: 'عبدالرحمن سالم', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 9000, isMock: true, };
const mockUser8: User = { uid: 'mock-user-uid-8', phone: '777300008', full_name: 'سارة ياسر', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 7500, isMock: true, };
const mockUser9: User = { uid: 'mock-user-uid-9', phone: '777300009', full_name: 'مصطفى جمال', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 1500, isMock: true, };
const mockUser10: User = { uid: 'mock-user-uid-10', phone: '777300010', full_name: 'نور حسين', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 3000, isMock: true, };

// --- AGGREGATED USERS ---
export const mockAdminUser: User = mockMasterUser1;
export const mockUsers: User[] = [
  mockMasterUser1, mockMasterUser2,
  mockAdmin1, mockAdmin2,
  mockVendor1, mockVendor2, mockVendor3, mockVendor4, mockVendor5,
  mockDriver1, mockDriver2, mockDriver3, mockDriver4, mockDriver5,
  mockUser1, mockUser2, mockUser3, mockUser4, mockUser5, mockUser6, mockUser7, mockUser8, mockUser9, mockUser10
];

// --- OTHER MOCKS ---
export const mockCities: City[] = [
  { id: 'sanaa', cityId: 'sanaa', name_ar: 'صنعاء', name_en: 'Sana\'a', country_code: 'YE', is_active: true, support_number: '777636008' },
  { id: 'aden', cityId: 'aden', name_ar: 'عدن', name_en: 'Aden', country_code: 'YE', is_active: true, support_number: '777636008' },
  { id: 'mukalla', cityId: 'mukalla', name_ar: 'المكلا', name_en: 'Al Mukalla', country_code: 'YE', is_active: true, support_number: '777636008' },
];

export const mockCategories: CategoryFilter[] = [
    { filterId: 'restaurant', name_ar: 'مطعم', name_en: 'Restaurant', type: 'restaurant' },
    { filterId: 'pharmacy', name_ar: 'صيدلية', name_en: 'Pharmacy', type: 'pharmacy' },
    { filterId: 'market', name_ar: 'سوبر ماركت', name_en: 'Market', type: 'market' },
    { filterId: 'other', name_ar: 'أخرى', name_en: 'Other', type: 'other' },
];

export const mockStores: Store[] = [
    { id: 'store-1', storeId: 'store-1', name_ar: 'مطعم حضرموت', city_id: 'mukalla', is_active: true, is_open: true, filter_ids: ['restaurant'], logo_url: 'https://picsum.photos/seed/store1/200', rating: 4.8, ownerUid: 'mock-vendor-uid-1', storeOwnerUid: 'mock-vendor-uid-1', location: {latitude: 14.54, longitude: 49.13}, isMock: true, },
    { id: 'store-2', storeId: 'store-2', name_ar: 'صيدلية الشفاء', city_id: 'sanaa', is_active: true, is_open: true, filter_ids: ['pharmacy'], logo_url: 'https://picsum.photos/seed/store2/200', rating: 4.9, ownerUid: 'mock-vendor-uid-2', storeOwnerUid: 'mock-vendor-uid-2', location: {latitude: 15.36, longitude: 44.19}, isMock: true, },
    { id: 'store-3', storeId: 'store-3', name_ar: 'سوبرماركت المدينة', city_id: 'aden', is_active: true, is_open: false, filter_ids: ['market'], logo_url: 'https://picsum.photos/seed/store3/200', rating: 4.5, ownerUid: 'mock-vendor-uid-3', storeOwnerUid: 'mock-vendor-uid-3', location: {latitude: 12.77, longitude: 45.03}, isMock: true, },
    { id: 'store-4', storeId: 'store-4', name_ar: 'كافيه أرابيكا', city_id: 'sanaa', is_active: true, is_open: true, filter_ids: ['restaurant'], logo_url: 'https://picsum.photos/seed/store4/200', rating: 4.7, ownerUid: 'mock-vendor-uid-4', storeOwnerUid: 'mock-vendor-uid-4', location: {latitude: 15.37, longitude: 44.20}, isMock: true, },
    { id: 'store-5', storeId: 'store-5', name_ar: 'عسل دوعن', city_id: 'mukalla', is_active: true, is_open: true, filter_ids: ['other'], logo_url: 'https://picsum.photos/seed/store5/200', rating: 5.0, ownerUid: 'mock-vendor-uid-5', storeOwnerUid: 'mock-vendor-uid-5', location: {latitude: 14.55, longitude: 49.14}, isMock: true, },
];

export const mockProducts: Product[] = [];
export const mockOrders: Order[] = [];
export const mockTransactions: FinanceTransaction[] = [];
