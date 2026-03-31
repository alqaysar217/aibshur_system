'use client';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, Store, Order, WalletTopupRequest } from '@/lib/types';

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
            const usersSnapshot = await getDocs(query(collection(firestore, 'users'), where('role', '==', 'client')));
            const driversSnapshot = await getDocs(query(collection(firestore, 'users'), where('role', '==', 'driver')));
            const storesSnapshot = await getDocs(collection(firestore, 'stores'));

            const clients = usersSnapshot.docs.map(d => d.data() as User);
            const drivers = driversSnapshot.docs.map(d => d.data() as User);
            const stores = storesSnapshot.docs.map(d => d.data() as Store);

            if (clients.length === 0 || stores.length === 0) {
                throw new Error('لا يوجد عملاء أو متاجر لإضافة بيانات تجريبية لها. يرجى إضافة بعض العملاء والمتاجر أولاً.');
            }

            const batch = writeBatch(firestore);

            // 1. Add 15 mock orders
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
                    driverUid: driver?.uid,
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
                batch.set(orderRef, orderData);
            }

            // 2. Add 5 mock wallet transactions
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
        if (!firestore || !confirm('هل أنت متأكد؟ سيتم حذف جميع الطلبات والمعاملات التي تم إنشاؤها تجريبياً.')) return;
        setIsDeleting(true);

        try {
            const batch = writeBatch(firestore);
            
            // Delete mock orders
            const ordersQuery = query(collection(firestore, 'orders'), where('isMock', '==', true));
            const ordersSnapshot = await getDocs(ordersQuery);
            ordersSnapshot.forEach(doc => batch.delete(doc.ref));

            // Delete mock wallet transactions
            const walletQuery = query(collection(firestore, 'wallet_transactions'), where('isMock', '==', true));
            const walletSnapshot = await getDocs(walletQuery);
            walletSnapshot.forEach(doc => batch.delete(doc.ref));

            await batch.commit();
            toast({ title: 'نجاح', description: 'تم حذف البيانات التجريبية بنجاح.' });
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
                        حقن (15) طلب و (5) عمليات شحن
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
