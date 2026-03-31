'use client';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, Store, Order, WalletTopupRequest, City, OrderStatus, Appointment } from '@/lib/types';
import { mockUsers, mockStores } from '@/lib/mock-data';
import { addDays, addHours, nextSaturday, set, subDays } from 'date-fns';

function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function DataSeederPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isInjecting, setIsInjecting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleInjectData = async () => {
        if (!firestore) return;
        setIsInjecting(true);

        try {
            const batch = writeBatch(firestore);

            // --- 1. Seed Users and Stores from mock-data.ts ---
            toast({ title: 'بدء الحقن', description: `جاري إضافة ${mockUsers.length} مستخدم و ${mockStores.length} متجر...` });
            mockUsers.forEach(user => {
                const userRef = doc(firestore, 'users', user.uid);
                batch.set(userRef, user);
            });
            mockStores.forEach(store => {
                const storeRef = doc(firestore, 'stores', store.storeId);
                batch.set(storeRef, store);
            });

            // --- 2. Use newly available mock data for subsequent seeding ---
            const clients = mockUsers.filter(u => u.roles.is_user && !u.roles.is_admin && !u.roles.is_driver && !u.roles.is_store_owner);
            const drivers = mockUsers.filter(u => u.roles.is_driver);
            const stores = mockStores;
            
            if (clients.length === 0 || stores.length === 0) {
                 throw new Error('لا يوجد عملاء أو متاجر لإضافة بيانات تجريبية لها.');
            }


            // --- 3. Add 15 mock orders with varied statuses ---
            for (let i = 0; i < 15; i++) {
                const orderRef = doc(collection(firestore, 'orders'));
                const client = getRandomElement(clients);
                const driver = drivers.length > 0 ? getRandomElement(drivers) : undefined;
                const store = getRandomElement(stores);
                const subtotal = getRandomNumber(1500, 25000);
                const deliveryFee = 500;
                
                let status: OrderStatus;
                if (i < 7) {
                    status = 'pending'; // 7 pending orders
                } else if (i < 11) {
                    status = 'preparing'; // 4 preparing orders
                } else {
                    status = 'delivered'; // 4 delivered orders
                }

                const orderData: Omit<Order, 'id'> = {
                    orderId: orderRef.id,
                    clientUid: client.uid,
                    storeId: store.storeId,
                    items: [{ productId: 'mockProd', productName_ar: 'منتج تجريبي', quantity: 1, price: subtotal }],
                    subtotal_price: subtotal,
                    delivery_fee: deliveryFee,
                    total_price: subtotal + deliveryFee,
                    status: status,
                    payment_method: getRandomElement(['cash', 'wallet']),
                    delivery_location: store.location,
                    delivery_address_text: 'عنوان تجريبي',
                    created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                    storeOwnerUid: store.storeOwnerUid,
                    isMock: true
                };

                if (driver) {
                    orderData.driverUid = driver.uid;
                }

                batch.set(orderRef, orderData);
            }

            // --- 4. Add 5 mock wallet transactions ---
            for (let i = 0; i < 5; i++) {
                 const walletRef = doc(collection(firestore, 'wallet_transactions'));
                 const client = getRandomElement(clients);
                 const walletData: Omit<WalletTopupRequest, 'id'> = {
                    transactionId: walletRef.id,
                    userId: client.uid,
                    user_name: client.full_name || '',
                    user_phone: client.phone,
                    amount: getRandomElement([5000, 10000, 15000]),
                    bank_id: 'mockBank',
                    status: 'approved',
                    timestamp: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000).toISOString(),
                    type: 'manual_topup',
                    isMock: true
                 };
                 batch.set(walletRef, walletData);
            }

            // --- 5. Add 5 mock appointments ---
            toast({ title: 'الحقن مستمر', description: 'جاري إضافة مواعيد مجدولة...' });
            const now = new Date();
            
            const appointmentsToSeed: Omit<Appointment, 'id'>[] = [
                 // 1. طلب عزومة
                {
                    appointmentId: '', clientUid: getRandomElement(clients).uid, clientName: 'سالم باوزير', clientPhone: '777555111',
                    storeId: 'store-1', storeName: 'مطعم الفاروق',
                    items: [{ productId: 'mandi-lamb', productName_ar: 'مندي لحم (5 نفر)', quantity: 5, price: 9000 }],
                    totalPrice: 45000, paymentMethod: 'cash', appointmentDate: set(addDays(now, 1), { hours: 14, minutes: 0, seconds: 0 }).toISOString(),
                    clientAddress: 'المكلا - الديس', status: 'scheduled', createdAt: now.toISOString(), isMock: true
                },
                // 2. طلب حلويات
                {
                    appointmentId: '', clientUid: getRandomElement(clients).uid, clientName: 'أحمد العمودي', clientPhone: '777555222',
                    storeId: 'store-4', storeName: 'حلويات الرائد',
                    items: [ { productId: 'cake-1', productName_ar: 'تورتة', quantity: 1, price: 8000 }, { productId: 'sweets-mix', productName_ar: 'حلويات مشكلة', quantity: 1, price: 4000 } ],
                    totalPrice: 12000, paymentMethod: 'wallet', appointmentDate: set(now, { hours: 21, minutes: 0, seconds: 0 }).toISOString(),
                    clientAddress: 'الشحر', status: 'scheduled', createdAt: now.toISOString(), isMock: true
                },
                // 3. طلب تموين
                {
                    appointmentId: '', clientUid: getRandomElement(clients).uid, clientName: 'عائلة باوزير', clientPhone: '777555333',
                    storeId: 'store-3', storeName: 'سوبرماركت المدينة',
                    items: [ { productId: 'water-box', productName_ar: 'كرتون ماء', quantity: 2, price: 1500 }, { productId: 'rice-10kg', productName_ar: 'أرز 10كغ', quantity: 1, price: 7000 } ],
                    totalPrice: 10000, paymentMethod: 'cash', appointmentDate: nextSaturday(now).toISOString(),
                    clientAddress: 'غيل باوزير', status: 'scheduled', createdAt: now.toISOString(), isMock: true
                },
                 // 4. طلب هدية
                {
                    appointmentId: '', clientUid: getRandomElement(clients).uid, clientName: 'فاطمة خالد', clientPhone: '777555222',
                    storeId: 'store-4', storeName: 'كافيه أرابيكا',
                    items: [ { productId: 'cake-1', productName_ar: 'تورتة عيد ميلاد', quantity: 1, price: 8000 }, { productId: 'flowers-1', productName_ar: 'باقة ورد', quantity: 1, price: 5000 } ],
                    totalPrice: 13000, paymentMethod: 'wallet', appointmentDate: set(addDays(now, 1), { hours: 20, minutes: 0, seconds: 0 }).toISOString(),
                    clientAddress: 'الشحر', status: 'confirmed', createdAt: now.toISOString(), isMock: true
                },
                // 5. طلب مكتمل
                {
                    appointmentId: '', clientUid: getRandomElement(clients).uid, clientName: 'سارة أحمد', clientPhone: '777555666',
                    storeId: 'store-5', storeName: 'عسل دوعن',
                    items: [{ productId: 'oud-1', productName_ar: 'بخور وعطور فاخرة', quantity: 1, price: 25000 }],
                    totalPrice: 25000, paymentMethod: 'cash', appointmentDate: subDays(now, 1).toISOString(),
                    clientAddress: 'غيل باوزير', status: 'completed', createdAt: subDays(now, 1).toISOString(), isMock: true
                }
            ];

            appointmentsToSeed.forEach(appData => {
                const appRef = doc(collection(firestore, 'appointments'));
                // @ts-ignore
                appData.appointmentId = appRef.id;
                batch.set(appRef, appData);
            });


            await batch.commit();
            toast({ title: 'نجاح', description: 'تم حقن البيانات التجريبية بنجاح!' });
        } catch (error: any) {
            console.error("Error injecting data:", error);
            toast({ variant: 'destructive', title: "خطأ", description: error.message });
        } finally {
            setIsInjecting(false);
        }
    };

    const handleDeleteData = async () => {
        if (!firestore || !confirm('هل أنت متأكد؟ سيتم حذف جميع البيانات التي تم إنشاؤها تجريبياً (طلبات، مواعيد، معاملات، مستخدمون، ومتاجر).')) return;
        setIsDeleting(true);

        try {
            const batch = writeBatch(firestore);
            
            // Define collections to purge
            const collectionsToPurge = ['users', 'stores', 'orders', 'wallet_transactions', 'appointments'];

            for(const col of collectionsToPurge) {
                const q = query(collection(firestore, col), where('isMock', '==', true));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => batch.delete(doc.ref));
            }

            await batch.commit();
            toast({ title: 'نجاح', description: 'تم حذف جميع البيانات التجريبية بنجاح.' });
        } catch (error: any) {
            console.error("Error deleting data:", error);
            toast({ variant: 'destructive', title: "خطأ", description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };


    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="text-primary"/>
                        أدوات المطورين
                    </CardTitle>
                    <CardDescription>
                        استخدم هذه الأداة لملء قاعدة البيانات ببيانات وهمية (Mock Data) لتسهيل اختبار وتطوير واجهات التقارير.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border-l-4 border-blue-500 bg-blue-50 text-blue-800 rounded-r-lg">
                        <h4 className="font-bold">ماذا سيحدث عند حقن البيانات؟</h4>
                        <ul className="list-disc list-inside text-sm mt-2">
                           <li>إضافة مستخدمين (عملاء، مناديب، أصحاب متاجر).</li>
                           <li>إضافة متاجر متنوعة.</li>
                           <li>إضافة طلبات بحالات مختلفة (جديدة، قيد التجهيز، مكتملة).</li>
                           <li>إضافة مواعيد مجدولة لتعبئة واجهة المواعيد.</li>
                           <li>تعبئة بيانات أداء المناديب (عمولات، مديونية).</li>
                        </ul>
                    </div>
                     <Button 
                        onClick={handleInjectData}
                        disabled={isInjecting || isDeleting}
                        className="w-full font-black text-base h-12"
                    >
                        {isInjecting ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <Database className="ml-2 h-5 w-5" />}
                        حقن البيانات التجريبية الآن
                    </Button>
                </CardContent>
            </Card>

             <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle />
                        منطقة الخطر
                    </CardTitle>
                    <CardDescription className="font-bold">
                       سيقوم هذا الإجراء بحذف جميع البيانات التي تم إنشاؤها بواسطة هذه الأداة فقط (التي تحمل علامة `isMock`).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button 
                        variant="destructive"
                        onClick={handleDeleteData}
                        disabled={isInjecting || isDeleting}
                        className="w-full font-black text-base h-12"
                    >
                        {isDeleting ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <Trash2 className="ml-2 h-5 w-5" />}
                        حذف جميع البيانات التجريبية
                    </Button>
                </CardContent>
            </Card>

        </div>
    )
}
