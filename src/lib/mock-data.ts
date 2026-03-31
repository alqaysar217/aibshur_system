import type { City, User, Store, Product, Order, FinanceTransaction, CategoryFilter } from './types';

export const mockMasterUser1: User = {
  uid: 'mock-master-uid-1',
  phone: '775258830',
  full_name: 'محمود حساني',
  email: 'mahmoud@absher.com',
  profile_image: 'https://picsum.photos/seed/mahmoud/200/200',
  roles: {
    is_admin: true,
    is_driver: true,
    is_store_owner: true,
    is_user: true,
  },
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
  account_status: { is_blocked: false },
};

export const mockMasterUser2: User = {
  uid: 'mock-master-uid-2',
  phone: '770636008',
  full_name: 'عمر دعكيك',
  email: 'omar@absher.com',
  profile_image: 'https://picsum.photos/seed/omar/200/200',
  roles: {
    is_admin: true,
    is_driver: true,
    is_store_owner: true,
    is_user: true,
  },
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
  account_status: { is_blocked: false },
};


export const mockAdminUser: User = mockMasterUser1;
export const mockUsers: User[] = [mockMasterUser1, mockMasterUser2];


export const mockCities: City[] = [
  { cityId: 'sanaa', name_ar: 'صنعاء', name_en: 'Sana\'a', country_code: 'YE', is_active: true, support_number: '777636008' },
  { cityId: 'aden', name_ar: 'عدن', name_en: 'Aden', country_code: 'YE', is_active: true, support_number: '777636008' },
  { cityId: 'mukalla', name_ar: 'المكلا', name_en: 'Al Mukalla', country_code: 'YE', is_active: true, support_number: '777636008' },
  { cityId: 'taiz', name_ar: 'تعز', name_en: 'Taiz', country_code: 'YE', is_active: true, support_number: '777636008' },
];

export const mockCategories: CategoryFilter[] = [
    { filterId: 'restaurant', name_ar: 'مطعم', name_en: 'Restaurant', type: 'restaurant' },
    { filterId: 'pharmacy', name_ar: 'صيدلية', name_en: 'Pharmacy', type: 'pharmacy' },
    { filterId: 'market', name_ar: 'سوبر ماركت', name_en: 'Market', type: 'market' },
    { filterId: 'other', name_ar: 'أخرى', name_en: 'Other', type: 'other' },
];

export const mockStores: Store[] = [];

export const mockProducts: Product[] = [];

export const mockOrders: Order[] = [];

export const mockTransactions: FinanceTransaction[] = [];
