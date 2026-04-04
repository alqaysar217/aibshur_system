'use client';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, where, Timestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, Store, Order, WalletTopupRequest, City, OrderStatus, Appointment, AppBank, Donation, LoyaltyTransaction, LoyaltyPointsConfig, FinanceTransaction, Complaint, VipPlan } from '@/lib/types';
import { mockUsers, mockStores, mockBanks, mockDonations, mockLoyaltyTransactions, mockLoyaltyConfig, mockAppointments, mockComplaints, mockVipPlans } from '@/lib/mock-data';
import { addDays, subDays } from 'date-fns';

function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const COLLECTIONS_TO_PURGE = ['users', 'stores', 'orders', 'wallet_transactions', 'appointments', 'app_banks', 'donations', 'financeTransactions', 'loyalty_transactions', 'settings', 'complaints', 'vip_plans'];

export default function DataSeederPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isInjecting, setIsInjecting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleInjectData = async () => {
        if (!firestore) return;
        setIsInjecting(true);
        toast({ title: 'بدء الحقن', description: 'يرجى الانتظار، قد تستغرق العملية دقيقة...' });

        try {
            const batch = writeBatch(firestore);

            // --- 1. Seed Users, Stores, Banks ---
            mockUsers.forEach(user => batch.set(doc(firestore, 'users', user.uid), user));
            mockStores.forEach(store => batch.set(doc(firestore, 'stores', store.storeId), store));
            mockBanks.forEach(bank => batch.set(doc(firestore, 'app_banks', bank.bankId), bank));
            
            // --- 2. Seed Loyalty Config & VIP Plans ---
            batch.set(doc(firestore, 'settings', 'points_config'), mockLoyaltyConfig);
            
            const seededPlans: {id: string, data: Omit<VipPlan, 'id' | 'planId' | 'isMock'>}[] = [];
            mockVipPlans.forEach(plan => {
                const planRef = doc(collection(firestore, 'vip_plans'));
                const fullPlanData = { ...plan, planId: planRef.id, isMock: true };
                batch.set(planRef, fullPlanData);
                seededPlans.push({ id: planRef.id, data: plan });
            });

            // --- 3. Seed VIP Subscriptions for some users ---
            if (seededPlans.length > 0) {
                const goldenPlan = seededPlans.find(p => p.data.name === 'الباقة الذهبية');
                if (goldenPlan) {
                    batch.update(doc(firestore, 'users', 'mock-user-uid-1'), {
                        'vip_details': { isActive: true, planId: goldenPlan.id, planName: goldenPlan.data.name, startDate: subDays(new Date(), 10).toISOString(), expiryDate: addDays(new Date(), 20).toISOString(), receiptImageUrl: 'https://picsum.photos/seed/receipt-vip1/400' }
                    });
                }
                const silverPlan = seededPlans.find(p => p.data.name === 'الباقة الفضية');
                if (silverPlan) {
                    batch.update(doc(firestore, 'users', 'mock-user-uid-2'), {
                         'vip_details': { isActive: true, planId: silverPlan.id, planName: silverPlan.data.name, startDate: subDays(new Date(), 2).toISOString(), expiryDate: addDays(new Date(), 28).toISOString(), receiptImageUrl: 'https://picsum.photos/seed/receipt-vip2/400' }
                    });
                }
            }


            const clients = mockUsers.filter(u => u.roles.is_user && !u.roles.is_admin);
            
            if (clients.length === 0 || mockStores.length === 0) {
                 throw new Error('لا يوجد عملاء أو متاجر لإضافة بيانات تجريبية لها.');
            }
            
            // --- 4. Seed Orders ---
            for (let i = 0; i < 15; i++) {
                const orderRef = doc(collection(firestore, 'orders'));
                const client = getRandomElement(clients);
                const store = getRandomElement(mockStores);
                const status: OrderStatus = i < 7 ? 'pending' : (i < 11 ? 'preparing' : 'delivered');
                const orderData: Omit<Order, 'id'> = {
                    orderId: orderRef.id, clientUid: client.uid, storeId: store.storeId,
                    items: [{ productId: 'mockProd', productName_ar: 'منتج تجريبي', quantity: 1, price: getRandomNumber(1500, 25000) }],
                    subtotal_price: getRandomNumber(1500, 25000), delivery_fee: 500, total_price: 0, status: status,
                    payment_method: getRandomElement(['cash', 'wallet']), delivery_location: { lat: 0, lng: 0 },
                    delivery_address_text: 'عنوان تجريبي', created_at: new Date(Date.now() - i * 86400000).toISOString(),
                    updated_at: new Date().toISOString(), storeOwnerUid: store.storeOwnerUid, isMock: true
                };
                orderData.total_price = orderData.subtotal_price + orderData.delivery_fee;
                batch.set(orderRef, orderData);
            }

            // --- 5. Seed Appointments ---
            mockAppointments.forEach(appData => {
                const appRef = doc(collection(firestore, 'appointments'));
                batch.set(appRef, { ...appData, appointmentId: appRef.id, isMock: true });
            });
            
            // --- 6. Seed Donations & Loyalty Transactions ---
            mockDonations.forEach(donation => {
                const donationRef = doc(collection(firestore, 'donations'));
                batch.set(donationRef, { ...donation, donationId: donationRef.id, timestamp: new Date().toISOString(), isMock: true });
                const financeRef = doc(collection(firestore, 'financeTransactions'));
                batch.set(financeRef, { transactionId: financeRef.id, userUid: donation.userId || 'anonymous', amount: donation.amount, type: 'donation', status: 'completed', description: `تبرع: ${donation.donationType}`, created_at: new Date().toISOString(), isMock: true });
            });

            mockLoyaltyTransactions.forEach(tx => {
                const txRef = doc(collection(firestore, 'loyalty_transactions'));
                batch.set(txRef, { ...tx, transactionId: txRef.id, timestamp: new Date().toISOString(), isMock: true });
            });

            // --- 7. Seed Wallet Topups ---
             for (let i = 0; i < 5; i++) {
                 const walletRef = doc(collection(firestore, 'wallet_transactions'));
                 batch.set(walletRef, {
                    transactionId: walletRef.id, userId: getRandomElement(clients).uid,
                    user_name: 'مستخدم تجريبي', user_phone: '777xxxxxx', amount: getRandomElement([5000, 10000, 15000]),
                    bank_id: 'mockBank', status: 'approved', timestamp: new Date(Date.now() - i * 259200000).toISOString(),
                    type: 'manual_topup', isMock: true
                 });
            }

            // --- 8. Seed Complaints ---
            mockComplaints.forEach(complaint => {
                const complaintRef = doc(collection(firestore, 'complaints'));
                batch.set(complaintRef, { ...complaint, complaintId: complaintRef.id, isMock: true });
            });

            await batch.commit();
            toast({ title: 'نجاح', description: 'تم حقن جميع البيانات التجريبية بنجاح!' });
        } catch (error: any) {
            console.error("Error injecting data:", error);
            toast({ variant: 'destructive', title: "خطأ", description: error.message });
        } finally {
            setIsInjecting(false);
        }
    };

    const handleDeleteData = async () => {
        if (!firestore || !confirm('هل أنت متأكد؟ سيتم حذف جميع البيانات التجريبية التي تم إنشاؤها عبر هذه الأداة من جميع المجموعات.')) return;
        setIsDeleting(true);

        try {
            const batch = writeBatch(firestore);
            
            for(const col of COLLECTIONS_TO_PURGE) {
                // Special handling for the single config document
                if (col === 'settings') {
                    const configDocRef = doc(firestore, 'settings', 'app_config');
                    const pointsConfigDocRef = doc(firestore, 'settings', 'points_config');
                    try {
                        // It's okay if these don't exist, so we don't need to check existence first
                        batch.delete(configDocRef);
                        batch.delete(pointsConfigDocRef);
                    } catch (e) {
                         // Ignore if doc doesn't exist
                    }
                    continue;
                }
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
                        أدوات المطورين (حقن البيانات)
                    </CardTitle>
                    <CardDescription>
                        استخدم هذا الزر لملء قاعدة البيانات ببيانات وهمية (Mock Data) لتسهيل اختبار وتطوير جميع واجهات لوحة التحكم.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border-l-4 border-blue-500 bg-blue-50 text-blue-800 rounded-r-lg">
                        <h4 className="font-bold">ماذا سيحدث عند حقن البيانات؟</h4>
                        <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                           <li>إضافة مستخدمين (عملاء، مناديب، أصحاب متاجر، مدراء).</li>
                           <li>إضافة متاجر، بنوك، وإعدادات نقاط الولاء.</li>
                           <li>إضافة باقات VIP وتفعيل اشتراكات لبعض المستخدمين.</li>
                           <li>تعبئة واجهة الطلبات بطلبات ذات حالات مختلفة.</li>
                           <li>تعبئة واجهة المواعيد بـ 5 طلبات مجدولة واقعية (عزومة، هدية، إلخ).</li>
                           <li>تعبئة تقرير أداء المناديب ببيانات مالية (عمولات ومديونية).</li>
                           <li>تعبئة واجهات التبرعات ونقاط الولاء وسجل الشكاوى بسجلات تجريبية.</li>
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
