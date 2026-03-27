import type { City, User, CategoryFilter, Store, Product, Order, FinanceTransaction, UserRole } from './types';

export const mockAdminUser: User = {
  uid: 'mock-admin-uid',
  phone: '+967777777777',
  role: 'admin',
  full_name: 'المدير العام',
  email: 'admin@absher.com',
  profile_image: 'https://picsum.photos/seed/admin/200/200',
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
  account_status: {
    is_blocked: false,
  },
};


export const mockCities: City[] = [
  { cityId: 'sanaa', name_ar: 'صنعاء', name_en: 'Sana\'a', country_code: 'YE', is_active: true },
  { cityId: 'aden', name_ar: 'عدن', name_en: 'Aden', country_code: 'YE', is_active: true },
  { cityId: 'mukalla', name_ar: 'المكلا', name_en: 'Al Mukalla', country_code: 'YE', is_active: true },
  { cityId: 'taiz', name_ar: 'تعز', name_en: 'Taiz', country_code: 'YE', is_active: true },
];

export const mockUsers: User[] = [mockAdminUser];

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
