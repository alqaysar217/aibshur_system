'use client';
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, setDoc, updateDoc, query, where, getDocs, collection } from 'firebase/firestore';
import type { AppConfig, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Settings, DollarSign, Palette, Shield, Image as ImageIcon, Link as LinkIcon, Users, SlidersHorizontal, Bell, KeyRound, Search, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const CONFIG_DOC_ID = "app_config";
const CONFIG_COLLECTION_ID = "settings";

const initialConfig: AppConfig = {
    financial: {
        platform_fee_percentage: 10,
        default_delivery_fee: 500,
        min_order_for_free_delivery: 10000,
    },
    identity: {
        app_logo_url: 'https://picsum.photos/seed/logo/200',
        main_slider_images: [
            'https://picsum.photos/seed/slider1/1200/400',
            'https://picsum.photos/seed/slider2/1200/400',
        ],
    },
    maintenance: {
        is_maintenance_mode: false,
        maintenance_message: 'التطبيق تحت الصيانة حالياً. نعود قريباً!',
    },
    support: {
        whatsapp_number: '+967777123456',
        facebook_url: 'https://facebook.com/absher',
        email: 'support@absher.com',
    },
    order_control: {
        max_delivery_distance: 25,
        default_preparation_time: '20-30 دقيقة',
        is_receiving_orders: true,
    },
    pricing: {
        is_dynamic_pricing_enabled: false,
    },
    integrations: {
        google_maps_api_key: '',
        sms_gateway_api_key: '',
    }
};

const SectionCard = ({ icon, title, description, children, isLoading }: { icon: React.ElementType, title: string, description: string, children: React.ReactNode, isLoading: boolean }) => (
    <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader>
            <CardTitle className="flex items-center gap-3 font-black text-lg">
                <div className="bg-primary/10 p-2 rounded-lg">
                    {React.createElement(icon, { className: "h-5 w-5 text-primary" })}
                </div>
                {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : children}
        </CardContent>
    </Card>
);

export default function SettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userData: adminUser } = useUser();
  const configDocRef = useMemo(() => firestore ? doc(firestore, CONFIG_COLLECTION_ID, CONFIG_DOC_ID) : null, [firestore]);
  
  const { data: fetchedConfig, loading: configLoading, error: configError } = useDoc<AppConfig>(configDocRef);
  const adminsQuery = useMemo(() => firestore ? query(collection(firestore, 'users'), where('roles.is_admin', '==', true)) : null, [firestore]);
  const { data: admins, loading: adminsLoading, error: adminsError } = useCollection<User>(adminsQuery);


  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for adding a new admin
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [isSearchingAdmin, setIsSearchingAdmin] = useState(false);
  const [foundUserForAdmin, setFoundUserForAdmin] = useState<User | null>(null);


  useEffect(() => {
    if (fetchedConfig) {
      // Deep merge fetched config with initial config to ensure all new fields are present
      const mergedConfig = {
        ...initialConfig,
        ...fetchedConfig,
        financial: { ...initialConfig.financial, ...fetchedConfig.financial },
        identity: { ...initialConfig.identity, ...fetchedConfig.identity },
        maintenance: { ...initialConfig.maintenance, ...fetchedConfig.maintenance },
        support: { ...initialConfig.support, ...fetchedConfig.support },
        order_control: { ...initialConfig.order_control, ...fetchedConfig.order_control },
        pricing: { ...initialConfig.pricing, ...fetchedConfig.pricing },
        integrations: { ...initialConfig.integrations, ...fetchedConfig.integrations },
      };
      setConfig(mergedConfig);
    } else if (!configLoading && !configError) {
      // If doc doesn't exist, set initial config in Firestore
      const setInitialConfig = async () => {
        if(configDocRef) {
          try {
            await setDoc(configDocRef, initialConfig);
            setConfig(initialConfig);
          } catch(e) { console.error("Failed to set initial config", e); }
        }
      }
      setInitialConfig();
    }
  }, [fetchedConfig, configLoading, configError, configDocRef]);

  const handleInputChange = (section: keyof AppConfig, key: string, value: any) => {
    setConfig(prev => ({
        ...prev,
        [section]: {
            // @ts-ignore
            ...prev[section],
            [key]: value
        }
    }));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const urls = e.target.value.split('\n').map(url => url.trim()).filter(Boolean);
    handleInputChange('identity', 'main_slider_images', urls);
  }
  
  const handleSearchUser = async () => {
    if (!firestore || !newAdminPhone) return;
    setIsSearchingAdmin(true);
    setFoundUserForAdmin(null);
    try {
        const userQuery = query(collection(firestore, 'users'), where('phone', '==', newAdminPhone), limit(1));
        const userSnapshot = await getDocs(userQuery);
        if (userSnapshot.empty) {
            toast({ variant: 'destructive', title: 'مستخدم غير موجود' });
        } else {
            const user = { uid: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data()} as User;
            setFoundUserForAdmin(user);
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'خطأ في البحث' });
    } finally {
        setIsSearchingAdmin(false);
    }
  }

  const handleAddAdmin = async () => {
    if (!firestore || !foundUserForAdmin) return;
    setIsSubmitting(true);
    const userDocRef = doc(firestore, 'users', foundUserForAdmin.uid);
    try {
      await updateDoc(userDocRef, { 'roles.is_admin': true });
      toast({ title: 'تمت ترقية المستخدم إلى مدير بنجاح' });
      setFoundUserForAdmin(null);
      setNewAdminPhone('');
      // Manually refetch admins or optimistically update UI
    } catch (error) {
        toast({ variant: 'destructive', title: 'فشلت عملية الترقية' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSendNotification = async (message: string) => {
    if (!message) return;
    toast({ title: 'جاري إرسال الإشعار...', description: 'هذه الميزة قيد التطوير.' });
    // Placeholder for actual FCM implementation
    console.log("Sending notification:", message);
    // In a real scenario, you would call a server function here
    // e.g., await sendPushNotificationToAll(message);
  }

  const handleSave = async () => {
    if (!firestore || !configDocRef) return;
    setIsSubmitting(true);
    try {
        await setDoc(configDocRef, config, { merge: true });
        toast({ title: 'تم حفظ الإعدادات بنجاح' });
    } catch (error: any) {
        console.error("Error saving settings:", error);
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: configDocRef.path,
                operation: 'update',
                requestResourceData: config
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: "خطأ في الحفظ", description: error.message });
        }
    } finally {
        setIsSubmitting(false);
    }
  }
  
  if (configError || adminsError) return <SetupFirestoreMessage />;
  if (!firestore || !adminUser) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-2xl font-black text-gray-900">إعدادات النظام العامة</h1>
            <p className="text-gray-400 text-sm font-bold mt-1">تحكم في المتغيرات الأساسية لمنصة أبشر.</p>
            </div>
            <Button onClick={handleSave} disabled={isSubmitting || configLoading} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'حفظ جميع التغييرات'}
            </Button>
        </div>
        
        <Tabs defaultValue="permissions" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
                <TabsTrigger value="permissions"><Users className="ml-1 h-4 w-4"/>الصلاحيات</TabsTrigger>
                <TabsTrigger value="order_control"><SlidersHorizontal className="ml-1 h-4 w-4"/>الطلبات</TabsTrigger>
                <TabsTrigger value="financial"><DollarSign className="ml-1 h-4 w-4"/>المالية</TabsTrigger>
                <TabsTrigger value="notifications"><Bell className="ml-1 h-4 w-4"/>الإشعارات</TabsTrigger>
                <TabsTrigger value="integrations"><KeyRound className="ml-1 h-4 w-4"/>الربط التقني</TabsTrigger>
                <TabsTrigger value="maintenance"><Shield className="ml-1 h-4 w-4"/>الصيانة</TabsTrigger>
            </TabsList>
            
            <TabsContent value="permissions">
                <SectionCard icon={Users} title="إدارة الصلاحيات" description="إدارة صلاحيات مدراء لوحة التحكم." isLoading={adminsLoading}>
                     <div className="space-y-4">
                        <h3 className="font-bold">إضافة مدير جديد</h3>
                        <div className="flex gap-2">
                             <Input placeholder="ابحث برقم هاتف المستخدم..." value={newAdminPhone} onChange={e => setNewAdminPhone(e.target.value)} dir="ltr"/>
                             <Button onClick={handleSearchUser} disabled={isSearchingAdmin || !newAdminPhone}><Search className="h-4 w-4" /></Button>
                        </div>
                        {foundUserForAdmin && (
                             <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                                 <p className="font-bold text-green-800">العضو: {foundUserForAdmin.full_name}</p>
                                 <Button onClick={handleAddAdmin} disabled={isSubmitting || foundUserForAdmin.roles.is_admin} size="sm">
                                    {foundUserForAdmin.roles.is_admin ? 'مدير بالفعل' : 'ترقية إلى مدير'}
                                 </Button>
                             </div>
                        )}
                        <h3 className="font-bold pt-4">المدراء الحاليون</h3>
                        <Table>
                             <TableHeader><TableRow><TableHead className="text-right">الاسم</TableHead><TableHead className="text-center">رقم الهاتف</TableHead></TableRow></TableHeader>
                             <TableBody>
                                 {admins?.map(admin => (
                                     <TableRow key={admin.uid}>
                                         <TableCell className="font-bold text-right">{admin.full_name}</TableCell>
                                         <TableCell className="text-center font-mono text-muted-foreground" dir="ltr">{admin.phone}</TableCell>
                                     </TableRow>
                                 ))}
                             </TableBody>
                        </Table>
                     </div>
                </SectionCard>
            </TabsContent>

            <TabsContent value="order_control">
                <SectionCard icon={SlidersHorizontal} title="إعدادات التحكم بالطلبات" description="تحكم في سلوك استلام ومعالجة الطلبات في النظام." isLoading={configLoading}>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <Label htmlFor="is_receiving_orders" className="font-bold text-lg">النظام يستقبل الطلبات حالياً</Label>
                            <Switch id="is_receiving_orders" checked={config.order_control?.is_receiving_orders} onCheckedChange={c => handleInputChange('order_control', 'is_receiving_orders', c)} dir="ltr"/>
                        </div>
                        <div className="space-y-2">
                            <Label>أقصى مسافة توصيل (بالكيلومتر)</Label>
                            <Input type="number" value={config.order_control?.max_delivery_distance} onChange={e => handleInputChange('order_control', 'max_delivery_distance', e.target.valueAsNumber)} />
                        </div>
                        <div className="space-y-2">
                            <Label>وقت التحضير التقديري (نص حر)</Label>
                            <Input value={config.order_control?.default_preparation_time} onChange={e => handleInputChange('order_control', 'default_preparation_time', e.target.value)} placeholder="مثال: 20-30 دقيقة"/>
                        </div>
                    </div>
                </SectionCard>
                <SectionCard icon={DollarSign} title="إعدادات التسعير الديناميكي" description="تفعيل التسعير المعتمد على المسافة بدلاً من السعر الثابت." isLoading={configLoading} >
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <Label htmlFor="is_dynamic_pricing_enabled" className="font-bold text-lg">تفعيل التسعير حسب المسافة</Label>
                        <Switch id="is_dynamic_pricing_enabled" checked={config.pricing?.is_dynamic_pricing_enabled} onCheckedChange={c => handleInputChange('pricing', 'is_dynamic_pricing_enabled', c)} dir="ltr"/>
                    </div>
                </SectionCard>
            </TabsContent>
            
            <TabsContent value="financial">
                <SectionCard icon={DollarSign} title="الإعدادات المالية" description="تحديد العمولات والرسوم الأساسية في المنصة." isLoading={configLoading}>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2"><Label>نسبة المنصة (%)</Label><Input type="number" value={config.financial.platform_fee_percentage} onChange={e => handleInputChange('financial', 'platform_fee_percentage', e.target.valueAsNumber)} /></div>
                        <div className="space-y-2"><Label>سعر التوصيل الافتراضي (ر.ي)</Label><Input type="number" value={config.financial.default_delivery_fee} onChange={e => handleInputChange('financial', 'default_delivery_fee', e.target.valueAsNumber)} /></div>
                        <div className="space-y-2"><Label>الحد الأدنى للطلب (للشحن المجاني)</Label><Input type="number" value={config.financial.min_order_for_free_delivery} onChange={e => handleInputChange('financial', 'min_order_for_free_delivery', e.target.valueAsNumber)} /></div>
                    </div>
                </SectionCard>
            </TabsContent>

             <TabsContent value="notifications">
                <SectionCard icon={Bell} title="إشعارات عامة" description="إرسال إشعار فوري لجميع مستخدمي التطبيق." isLoading={configLoading}>
                    <div className="space-y-4">
                        <Label htmlFor="notification_message">نص الرسالة</Label>
                        <Textarea id="notification_message" placeholder="اكتب هنا محتوى الإشعار الذي سيصل للمستخدمين..." rows={4} />
                        <Button onClick={(e) => {
                            const textarea = (e.currentTarget.previousSibling as HTMLTextAreaElement);
                            handleSendNotification(textarea.value);
                         }} className="w-full">إرسال الإشعار للجميع</Button>
                    </div>
                </SectionCard>
            </TabsContent>

            <TabsContent value="integrations">
                <SectionCard icon={KeyRound} title="الربط مع الخدمات الخارجية" description="إدارة مفاتيح API الخاصة بالخدمات الأخرى." isLoading={configLoading}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>مفتاح خرائط جوجل (Google Maps API Key)</Label>
                            <Input type="password" dir="ltr" value={config.integrations?.google_maps_api_key} onChange={e => handleInputChange('integrations', 'google_maps_api_key', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>مفتاح بوابة الرسائل (SMS Gateway API Key)</Label>
                            <Input type="password" dir="ltr" value={config.integrations?.sms_gateway_api_key} onChange={e => handleInputChange('integrations', 'sms_gateway_api_key', e.target.value)} />
                        </div>
                    </div>
                </SectionCard>
            </TabsContent>

             <TabsContent value="maintenance">
                <SectionCard icon={Shield} title="صيانة التطبيق" description="تفعيل/إلغاء تفعيل وضع الصيانة للتطبيق." isLoading={configLoading}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <Label htmlFor="maintenance-mode" className="font-bold text-lg">تفعيل وضع الصيانة</Label>
                            <Switch id="maintenance-mode" checked={config.maintenance.is_maintenance_mode} onCheckedChange={c => handleInputChange('maintenance', 'is_maintenance_mode', c)} dir="ltr"/>
                        </div>
                        <div className="space-y-2">
                            <Label>رسالة الصيانة</Label>
                            <Input value={config.maintenance.maintenance_message} onChange={e => handleInputChange('maintenance', 'maintenance_message', e.target.value)} />
                        </div>
                    </div>
                </SectionCard>
            </TabsContent>
        </Tabs>
    </div>
  );
}
