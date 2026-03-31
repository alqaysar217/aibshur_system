'use client';
import { useState, useEffect } from 'react';
import { useFirestore, useDoc, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { AppConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Settings, DollarSign, Palette, Shield, Image as ImageIcon, LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import Image from 'next/image';

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
    }
};

export default function SettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const configDocRef = useMemo(() => firestore ? doc(firestore, CONFIG_COLLECTION_ID, CONFIG_DOC_ID) : null, [firestore]);
  
  const { data: fetchedConfig, loading: configLoading, error: configError } = useDoc<AppConfig>(configDocRef);

  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (fetchedConfig) {
      setConfig(fetchedConfig);
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
            ...prev[section],
            [key]: value
        }
    }));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const urls = e.target.value.split('\n').map(url => url.trim()).filter(Boolean);
    handleInputChange('identity', 'main_slider_images', urls);
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
  
  if (configError) return <SetupFirestoreMessage />;
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-2xl font-black text-gray-900">إعدادات النظام العامة</h1>
            <p className="text-gray-400 text-sm font-bold mt-1">تحكم في المتغيرات الأساسية لمنصة أبشر.</p>
            </div>
            <Button onClick={handleSave} disabled={isSubmitting || configLoading} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'حفظ التغييرات'}
            </Button>
        </div>
        
        {configLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-64" />)
        ) : (
        <>
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="text-primary"/>الإعدادات المالية</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2"><Label>نسبة المنصة (%)</Label><Input type="number" value={config.financial.platform_fee_percentage} onChange={e => handleInputChange('financial', 'platform_fee_percentage', e.target.valueAsNumber)} /></div>
                    <div className="space-y-2"><Label>سعر التوصيل الافتراضي (ر.ي)</Label><Input type="number" value={config.financial.default_delivery_fee} onChange={e => handleInputChange('financial', 'default_delivery_fee', e.target.valueAsNumber)} /></div>
                    <div className="space-y-2"><Label>الحد الأدنى للطلب (للشحن المجاني)</Label><Input type="number" value={config.financial.min_order_for_free_delivery} onChange={e => handleInputChange('financial', 'min_order_for_free_delivery', e.target.valueAsNumber)} /></div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="text-primary"/>الهوية والبصمة المرئية</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>رابط شعار التطبيق</Label>
                        <Input value={config.identity.app_logo_url} onChange={e => handleInputChange('identity', 'app_logo_url', e.target.value)} dir="ltr"/>
                        {config.identity.app_logo_url && <Image src={config.identity.app_logo_url} alt="logo" width={100} height={100} className="mt-2 p-2 border rounded-xl" />}
                    </div>
                     <div className="space-y-2">
                        <Label>روابط صور السلايدر الرئيسي (كل رابط في سطر)</Label>
                        <Textarea value={config.identity.main_slider_images.join('\n')} onChange={handleSliderChange} dir="ltr" rows={4}/>
                        <div className="flex gap-2 mt-2">
                            {config.identity.main_slider_images.map((url, i) => (
                                <Image key={i} src={url} alt={`slider-${i}`} width={150} height={75} className="rounded-lg object-cover" />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="text-primary"/>صيانة التطبيق</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <Label htmlFor="maintenance-mode" className="font-bold text-lg">تفعيل وضع الصيانة</Label>
                        <Switch id="maintenance-mode" checked={config.maintenance.is_maintenance_mode} onCheckedChange={c => handleInputChange('maintenance', 'is_maintenance_mode', c)} dir="ltr"/>
                    </div>
                    <div className="space-y-2">
                        <Label>رسالة الصيانة</Label>
                        <Input value={config.maintenance.maintenance_message} onChange={e => handleInputChange('maintenance', 'maintenance_message', e.target.value)} />
                    </div>
                </CardContent>
            </Card>
        </>
        )}
    </div>
  );
}
