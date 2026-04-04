import type { City, User, Store, Product, Order, FinanceTransaction, CategoryFilter, AppBank, Donation, LoyaltyTransaction, LoyaltyPointsConfig, Appointment, Complaint } from './types';
import { addDays, set, subDays, nextSaturday, addHours } from 'date-fns';

// --- SUPER ADMINS ---
export const mockMasterUser1: User = {
  uid: 'mock-master-uid-1',
  phone: '775258830',
  full_name: 'محمود حساني',
  email: 'mahmoud@absher.com',
  profile_image: '/profile.png',
  roles: { is_admin: true, is_driver: true, is_store_owner: true, is_user: true },
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
  account_status: { is_blocked: false },
  wallet_balance: 150000,
  loyalty_points: 250,
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


// --- DRIVERS (WITH PERFORMANCE DATA) ---
const mockDriver1: User = { uid: 'mock-driver-uid-1', phone: '777200001', full_name: 'سالم اليافعي', roles: { is_driver: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, driver_details: { status: 'approved', is_online: true, rating: 4.8, wallet_balance: 1500, vehicle_type: 'motorcycle', license_plate: '123-AB', total_orders: 150, outstanding_commission: 5000, debt: 20000 }, isMock: true, };
const mockDriver2: User = { uid: 'mock-driver-uid-2', phone: '777200002', full_name: 'علي الكندي', roles: { is_driver: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, driver_details: { status: 'approved', is_online: false, rating: 4.5, wallet_balance: -500, vehicle_type: 'motorcycle', license_plate: '456-CD', total_orders: 80, outstanding_commission: 2500, debt: 0 }, isMock: true, };
const mockDriver3: User = { uid: 'mock-driver-uid-3', phone: '777200003', full_name: 'حسن بامطرف', roles: { is_driver: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: true, reason: 'مخالفات متكررة' }, driver_details: { status: 'approved', is_online: false, rating: 3.2, wallet_balance: 0, vehicle_type: 'car', license_plate: '789-EF', total_orders: 35, outstanding_commission: 900, debt: 1500 }, isMock: true, };
const mockDriver4: User = { uid: 'mock-driver-uid-4', phone: '777200004', full_name: 'خالد العمودي', roles: { is_driver: true, is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, driver_details: { status: 'pending', is_online: false, rating: 0, wallet_balance: 0, vehicle_type: 'motorcycle', license_plate: '101-GH', total_orders: 0, outstanding_commission: 0, debt: 0 }, isMock: true, };
const mockDriver5: User = { uid: 'mock-driver-uid-5', phone: '777200005', full_name: 'ياسر باعمر', roles: { is_driver: true, is_user: true }, createdAt: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, driver_details: { status: 'approved', is_online: true, rating: 4.9, wallet_balance: 3200, vehicle_type: 'car', license_plate: '112-IJ', total_orders: 210, outstanding_commission: 8500, debt: 12000 }, isMock: true, };


// --- NORMAL USERS ---
const mockUser1: User = { uid: 'mock-user-uid-1', phone: '777300001', full_name: 'أحمد عبدالله', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 5000, loyalty_points: 120, isMock: true, };
const mockUser2: User = { uid: 'mock-user-uid-2', phone: '777300002', full_name: 'فاطمة محمد', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 12000, loyalty_points: 85, isMock: true, };
const mockUser3: User = { uid: 'mock-user-uid-3', phone: '777300003', full_name: 'يوسف خالد', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 0, isMock: true, };
const mockUser4: User = { uid: 'mock-user-uid-4', phone: '777300004', full_name: 'مريم علي', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: true, reason: 'حساب غير نشط' }, wallet_balance: 800, isMock: true, };
const mockUser5: User = { uid: 'mock-user-uid-5', phone: '777300005', full_name: 'إبراهيم حسن', roles: { is_user: true }, created_at: new Date().toISOString(), last_login_at: new Date().toISOString(), account_status: { is_blocked: false }, wallet_balance: 25000, isMock: true, };

// --- AGGREGATED USERS ---
export const mockAdminUser: User = mockMasterUser1;
export const mockUsers: User[] = [
  mockMasterUser1, mockMasterUser2,
  mockAdmin1, mockAdmin2,
  mockVendor1, mockVendor2, mockVendor3, mockVendor4, mockVendor5,
  mockDriver1, mockDriver2, mockDriver3, mockDriver4, mockDriver5,
  mockUser1, mockUser2, mockUser3, mockUser4, mockUser5,
];

export const mockComplaints: Omit<Complaint, 'id' | 'complaintId' | 'isMock'>[] = [
    {
        userId: 'mock-user-uid-1',
        userName: 'أحمد عبدالله',
        userPhone: '777300001',
        issueText: 'الطلب تأخر كثيراً ولم يصل بعد، والمندوب لا يرد على اتصالاتي. رقم الطلب #123456.',
        createdAt: subDays(new Date(), 1).toISOString(),
        status: 'pending',
        priority: 'high',
        history: [
            { from: 'user', message: 'الطلب تأخر كثيراً ولم يصل بعد، والمندوب لا يرد على اتصالاتي.', timestamp: subDays(new Date(), 1).toISOString() }
        ]
    },
    {
        userId: 'mock-user-uid-2',
        userName: 'فاطمة محمد',
        userPhone: '777300002',
        issueText: 'وصلني دواء خاطئ من الصيدلية، أحتاج استبداله فوراً.',
        createdAt: subDays(new Date(), 2).toISOString(),
        status: 'pending',
        priority: 'medium',
        history: [
             { from: 'user', message: 'وصلني دواء خاطئ من الصيدلية، أحتاج استبداله فوراً.', timestamp: subDays(new Date(), 2).toISOString() },
             { from: 'admin', message: 'مرحباً أخت فاطمة، نعتذر عن الخطأ. هل يمكنك تزويدنا برقم الطلب وصورة المنتج الذي وصلك؟', adminId: 'mock-admin-uid-1', timestamp: subDays(new Date(), 2).toISOString() }
        ]
    },
    {
        userId: 'mock-user-uid-3',
        userName: 'يوسف خالد',
        userPhone: '777300003',
        issueText: 'الكوبون الذي استخدمته لم يطبق الخصم على الفاتورة النهائية.',
        createdAt: subDays(new Date(), 5).toISOString(),
        status: 'resolved',
        priority: 'low',
        history: [
            { from: 'user', message: 'الكوبون لم يعمل.', timestamp: subDays(new Date(), 5).toISOString() },
            { from: 'admin', message: 'مرحباً أستاذ يوسف، نعتذر عن الإزعاج. تم إضافة قيمة الخصم كرصيد في محفظتك كتعويض.', adminId: 'mock-admin-uid-1', timestamp: subDays(new Date(), 5).toISOString() },
            { message: `تم تعويض العميل بمبلغ 1,500 ر.ي`, from: 'admin', adminId: 'mock-admin-uid-1', timestamp: subDays(new Date(), 5).toISOString() },
            { from: 'user', message: 'شكراً جزيلاً، تم استلام المبلغ.', timestamp: subDays(new Date(), 4).toISOString() },
            { status: 'resolved', updatedBy: 'mock-admin-uid-1', timestamp: subDays(new Date(), 4).toISOString() }
        ]
    },
    {
        userId: 'mock-user-uid-4',
        userName: 'مريم علي',
        userPhone: '777300004',
        issueText: 'لدي استفسار بخصوص سياسة الإرجاع للمنتجات الغذائية.',
        createdAt: subDays(new Date(), 3).toISOString(),
        status: 'pending',
        priority: 'low',
        history: [
             { from: 'user', message: 'لدي استفسار بخصوص سياسة الإرجاع للمنتجات الغذائية.', timestamp: subDays(new Date(), 3).toISOString() }
        ]
    },
    {
        userId: 'mock-user-uid-5',
        userName: 'إبراهيم حسن',
        userPhone: '777300005',
        issueText: 'المطعم ألغى طلبي بدون سبب واضح.',
        createdAt: new Date().toISOString(),
        status: 'pending',
        priority: 'high',
        history: [
            { from: 'user', message: 'المطعم ألغى طلبي بدون سبب واضح. ماذا أفعل؟', timestamp: new Date().toISOString() }
        ]
    }
];


// --- OTHER MOCKS ---
export const mockBanks: AppBank[] = [
    { id: 'bank-kareemi', bankId: 'bank-kareemi', bank_name: 'بنك الكريمي', account_number: '123456789', account_holder: 'شركة أبشر', bank_logo: 'https://i.postimg.cc/rsP4G5j7/karemi.png', is_active: true, isMock: true },
    { id: 'bank-amalk', bankId: 'bank-amalk', bank_name: 'بنك الأمل', account_number: '987654321', account_holder: 'شركة أبشر', bank_logo: 'https://i.postimg.cc/W34dGj2n/alamal.png', is_active: true, isMock: true },
];

export const mockDonations: Omit<Donation, 'id' | 'donationId' | 'timestamp'>[] = [
    { userId: mockUser1.uid, userName: mockUser1.full_name, userPhone: mockUser1.phone, donationType: 'siquia', amount: 5000, bankId: 'bank-kareemi', receiptNumber: 'R-1001', receiptImage: 'https://picsum.photos/seed/receipt1/400' },
    { userName: 'فاعل خير', donationType: 'itiam', amount: 10000, bankId: 'bank-amalk', receiptNumber: 'R-1002', receiptImage: 'https://picsum.photos/seed/receipt2/400' },
    { userId: mockUser2.uid, userName: mockUser2.full_name, userPhone: mockUser2.phone, donationType: 'general', amount: 7500, bankId: 'bank-kareemi', receiptNumber: 'R-1003', receiptImage: 'https://picsum.photos/seed/receipt3/400' },
];

export const mockLoyaltyConfig: LoyaltyPointsConfig = {
    points_per_yer: 1000,
    cash_per_1000_points: 1000,
    vip_multiplier: 1.5,
};

export const mockLoyaltyTransactions: Omit<LoyaltyTransaction, 'id' | 'transactionId' | 'timestamp'>[] = [
    { userId: mockUser1.uid, type: 'earn', points: 50, description: 'كسب نقاط من طلب #1234' },
    { userId: mockUser1.uid, type: 'redeem', points: -20, description: 'استبدال نقاط' },
    { userId: mockUser2.uid, type: 'earn', points: 85, description: 'كسب نقاط من طلب #5678' },
    { userId: mockMasterUser1.uid, type: 'manual_adjustment', points: 250, description: 'مكافأة مدير' },
];

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
    { id: 'store-1', storeId: 'store-1', name_ar: 'مطعم حضرموت', city_id: 'mukalla', is_active: true, is_open: true, filter_ids: ['restaurant'], logo_url: 'https://picsum.photos/seed/store1/200', rating: 4.8, ownerUid: 'mock-vendor-uid-1', storeOwnerUid: 'mock-vendor-uid-1', location: { lat: 14.54, lng: 49.13 }, isMock: true, },
    { id: 'store-2', storeId: 'store-2', name_ar: 'صيدلية الشفاء', city_id: 'sanaa', is_active: true, is_open: true, filter_ids: ['pharmacy'], logo_url: 'https://picsum.photos/seed/store2/200', rating: 4.9, ownerUid: 'mock-vendor-uid-2', storeOwnerUid: 'mock-vendor-uid-2', location: { lat: 15.36, lng: 44.19 }, isMock: true, },
    { id: 'store-3', storeId: 'store-3', name_ar: 'سوبرماركت المدينة', city_id: 'aden', is_active: true, is_open: false, filter_ids: ['market'], logo_url: 'https://picsum.photos/seed/store3/200', rating: 4.5, ownerUid: 'mock-vendor-uid-3', storeOwnerUid: 'mock-vendor-uid-3', location: { lat: 12.77, lng: 45.03 }, isMock: true, },
    { id: 'store-4', storeId: 'store-4', name_ar: 'كافيه أرابيكا', city_id: 'sanaa', is_active: true, is_open: true, filter_ids: ['restaurant'], logo_url: 'https://picsum.photos/seed/store4/200', rating: 4.7, ownerUid: 'mock-vendor-uid-4', storeOwnerUid: 'mock-vendor-uid-4', location: { lat: 15.37, lng: 44.20 }, isMock: true, },
    { id: 'store-5', storeId: 'store-5', name_ar: 'عسل دوعن', city_id: 'mukalla', is_active: true, is_open: true, filter_ids: ['other'], logo_url: 'https://picsum.photos/seed/store5/200', rating: 5.0, ownerUid: 'mock-vendor-uid-5', storeOwnerUid: 'mock-vendor-uid-5', location: { lat: 14.55, lng: 49.14 }, isMock: true, },
];

export const mockAppointments: Omit<Appointment, 'id' | 'appointmentId' | 'isMock'>[] = [
    // 1. Feast Request (Today)
    { clientUid: 'mock-user-uid-1', clientName: 'سالم باوزير', clientPhone: '777555111', storeId: 'store-1', storeName: 'مطعم الفاروق', items: [{ productId: 'mandi-lamb', productName_ar: 'مندي لحم (5 نفر)', quantity: 5, price: 9000 }], totalPrice: 45000, paymentMethod: 'cash', appointmentDate: set(new Date(), { hours: 14, minutes: 0, seconds: 0 }).toISOString(), clientAddress: 'المكلا - الديس', status: 'scheduled', createdAt: new Date().toISOString() },
    // 2. Gift Request (Tonight)
    { clientUid: 'mock-user-uid-2', clientName: 'أحمد العمودي', clientPhone: '777555222', storeId: 'store-4', storeName: 'حلويات الرائد', items: [ { productId: 'cake-1', productName_ar: 'تورتة عيد ميلاد', quantity: 1, price: 8000 }, { productId: 'flowers-1', productName_ar: 'باقة ورد', quantity: 1, price: 4000 } ], totalPrice: 12000, paymentMethod: 'wallet', appointmentDate: set(new Date(), { hours: 21, minutes: 0, seconds: 0 }).toISOString(), clientAddress: 'الشحر', status: 'confirmed', createdAt: new Date().toISOString() },
    // 3. Groceries Request (Next Week)
    { clientUid: 'mock-user-uid-3', clientName: 'عائلة باوزير', clientPhone: '777555333', storeId: 'store-3', storeName: 'سوبرماركت المدينة', items: [ { productId: 'water-box', productName_ar: 'كرتون ماء', quantity: 2, price: 1500 }, { productId: 'rice-10kg', productName_ar: 'أرز 10كغ', quantity: 1, price: 7000 } ], totalPrice: 10000, paymentMethod: 'cash', appointmentDate: nextSaturday(new Date()).toISOString(), clientAddress: 'غيل باوزير', status: 'scheduled', createdAt: new Date().toISOString() },
    // 4. Dinner Request (Tomorrow)
    { clientUid: 'mock-user-uid-4', clientName: 'فاطمة خالد', clientPhone: '777555444', storeId: 'store-1', storeName: 'مطعم حضرموت', items: [ { productId: 'pizza-1', productName_ar: 'بيتزا', quantity: 2, price: 2500 }, { productId: 'pastries-1', productName_ar: 'معجنات مشكلة', quantity: 1, price: 1500 } ], totalPrice: 6500, paymentMethod: 'wallet', appointmentDate: addDays(new Date(), 1).toISOString(), clientAddress: 'المكلا - فوه', status: 'scheduled', createdAt: new Date().toISOString() },
    // 5. Completed Request (Past)
    { clientUid: 'mock-user-uid-5', clientName: 'سارة أحمد', clientPhone: '777555666', storeId: 'store-5', storeName: 'عسل دوعن', items: [{ productId: 'oud-1', productName_ar: 'بخور وعطور فاخرة', quantity: 1, price: 25000 }], totalPrice: 25000, paymentMethod: 'cash', appointmentDate: subDays(new Date(), 1).toISOString(), clientAddress: 'غيل باوزير', status: 'completed', createdAt: subDays(new Date(), 1).toISOString() }
];


export const mockProducts: Product[] = [];
export const mockOrders: Order[] = [];
export const mockTransactions: FinanceTransaction[] = [];
