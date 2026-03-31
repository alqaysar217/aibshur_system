'use client';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, Store, Order, WalletTopupRequest, City } from '@/lib/types';

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

            // --- 1. Fetch prerequisite data (Cities, Users, Stores) ---
            const citiesSnapshot = await getDocs(collection(firestore, 'cities'));
            if (citiesSnapshot.empty) {
                throw new Error('يرجى إضافة مدينة واحدة على الأقل من صفحة "المدن" قبل حقن البيانات.');
            }
            const cities = citiesSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as City));
            const randomCity = getRandomElement(cities);

            const existingClientsSnapshot = await getDocs(query(collection(firestore, 'users'), where('role', '==', 'client')));
            const existingStoresSnapshot = await getDocs(collection(firestore, 'stores'));
            const existingDriversSnapshot = await getDocs(query(collection(firestore, 'users'), where('role', '==', 'driver')));

            let clients = existingClientsSnapshot.docs.map(d => ({ ...d.data(), uid: d.id } as User));
            let stores = existingStoresSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Store));
            let drivers = existingDriversSnapshot.docs.map(d => ({...d.data(), uid: d.id } as User));

            // --- 2. Create mock data if it doesn't exist ---
            if (clients.length === 0) {
                const mockClientsData = [
                    { full_name: 'عميل تجريبي ١', phone: '777111222' },
                    { full_name: 'عميل تجريبي ٢', phone: '777333444' },
                ];
                for (const clientData of mockClientsData) {
                    const userRef = doc(collection(firestore, 'users'));
                    const newClient: User = {
                        uid: userRef.id,
                        full_name: clientData.full_name,
                        phone: clientData.phone,
                        role: 'client',
                        city_id: randomCity.cityId,
                        created_at: new Date().toISOString(),
                        last_login_at: new Date().toISOString(),
                        account_status: { is_blocked: false },
                        isMock: true,
                    };
                    batch.set(userRef, newClient);
                    clients.push(newClient); // Add to local array for immediate use
                }
            }

            if (stores.length === 0) {
                 const ownerRef = doc(collection(firestore, 'users'));
                 const newOwner: User = {
                    uid: ownerRef.id,
                    full_name: 'صاحب متجر تجريبي',
                    phone: '777555666',
                    role: 'store_owner',
                    created_at: new Date().toISOString(),
                    last_login_at: new Date().toISOString(),
                    account_status: { is_blocked: false },
                    isMock: true,
                 };
                 
                 const storeRef = doc(collection(firestore, 'stores'));
                 
                 // Link owner to store
                 newOwner.store_id = storeRef.id;
                 batch.set(ownerRef, newOwner);

                 const newStore: Store = {
                    storeId: storeRef.id,
                    name_ar: 'متجر تجريبي',
                    ownerUid: newOwner.uid,
                    storeOwnerUid: newOwner.uid,
                    city_id: randomCity.cityId,
                    is_active: true,
                    is_open: true,
                    rating: 4.5,
                    logo_url: 'https://picsum.photos/seed/mockstore/200',
                    location: { latitude: 15.3694, longitude: 44.1910 }, // Sana'a coordinates
                    filter_ids: ['restaurant'],
                 };
                 batch.set(storeRef, newStore);
                 stores.push({...newStore, id: storeRef.id}); // Add to local array
            }
            
            if (drivers.length === 0) {
                const driverRef = doc(collection(firestore, 'users'));
                const newDriver: User = {
                    uid: driverRef.id,
                    full_name: 'مندوب توصيل تجريبي',
                    phone: '777999888',
                    role: 'driver',
                    city_id: randomCity.cityId,
                    created_at: new Date().toISOString(),
                    last_login_at: new Date().toISOString(),
                    account_status: { is_blocked: false },
                    driver_details: {
                        status: 'approved',
                        is_online: true,
                        vehicle_type: 'motorcycle',
                        license_plate: '12345',
                        id_card_image: '',
                        rating: 4.8,
                        wallet_balance: 0,
                    },
                    isMock: true,
                };
                batch.set(driverRef, newDriver);
                drivers.push(newDriver); // Add to local array for immediate use
            }


            // --- 3. Add 15 mock orders ---
            for (let i = 0; i < 15; i++) {
                const orderRef = doc(collection(firestore, 'orders'));
                const client = getRandomElement(clients);
                const driver = drivers.length > 0 ? getRandomElement(drivers) : null;
                const store = getRandomElement(stores);
                const subtotal = getRandomNumber(1500, 25000);
                const deliveryFee = 500;
                
                const orderData: Omit<Order, 'id'> = {
                    orderId: orderRef.id,
                    clientUid: client.uid,
                    storeId: store.storeId,
                    items: [{ productId: 'mockProd', productName_ar: 'منتج تجريبي', quantity: 1, price: subtotal }],
                    subtotal_price: subtotal,
                    delivery_fee: deliveryFee,
                    total_price: subtotal + deliveryFee,
                    status: 'delivered',
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
        if (!firestore || !confirm('هل أنت متأكد؟ سيتم حذف جميع البيانات التي تم إنشاؤها تجريبياً (طلبات، معاملات، مستخدمون، ومتاجر).')) return;
        setIsDeleting(true);

        try {
            const batch = writeBatch(firestore);
            
            // Define collections to purge
            const collectionsToPurge = ['users', 'stores', 'orders', 'wallet_transactions'];

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
                        أداة حقن البيانات التجريبية
                    </CardTitle>
                    <CardDescription>
                        استخدم هذه الأداة لملء قاعدة البيانات ببيانات وهمية (Mock Data) لتسهيل اختبار وتطوير واجهات التقارير.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Button 
                        onClick={handleInjectData}
                        disabled={isInjecting || isDeleting}
                        className="w-full font-black text-base h-12"
                    >
                        {isInjecting ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <Database className="ml-2 h-5 w-5" />}
                        حقن البيانات التجريبية
                    </Button>
                </CardContent>
            </Card>

             <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle />
                        منطقة الخطر
                    </CardTitle>
                    <CardDescription>
                       سيقوم هذا الإجراء بحذف جميع البيانات التي تم إنشاؤها بواسطة هذه الأداة. لا يمكن التراجع عن هذا الإجراء.
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
