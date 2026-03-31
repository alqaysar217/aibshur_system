'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useDoc, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import type { AppConfig, Complaint } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare, Phone, Facebook, Mail, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';


const CONFIG_DOC_ID = "app_config";
const CONFIG_COLLECTION_ID = "settings";

const initialConfig: AppConfig = {
    financial: { platform_fee_percentage: 10, default_delivery_fee: 500, min_order_for_free_delivery: 10000 },
    identity: { app_logo_url: '', main_slider_images: [] },
    maintenance: { is_maintenance_mode: false, maintenance_message: '' },
    support: { whatsapp_number: '', facebook_url: '', email: '' }
};

export default function SupportPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const configDocRef = useMemo(() => firestore ? doc(firestore, CONFIG_COLLECTION_ID, CONFIG_DOC_ID) : null, [firestore]);
  
  const { data: fetchedConfig, loading: configLoading, error: configError } = useDoc<AppConfig>(configDocRef);
  const { data: complaints, loading: complaintsLoading, error: complaintsError } = useCollection<Complaint>(useMemo(() => firestore ? collection(firestore, 'complaints') : null, [firestore]), 'complaints');

  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string|null>(null);

  useEffect(() => {
    if (fetchedConfig) {
      setConfig(fetchedConfig);
    }
  }, [fetchedConfig]);

  const handleInputChange = (key: string, value: string) => {
    setConfig(prev => ({
        ...prev,
        support: {
            ...prev.support,
            [key]: value
        }
    }));
  };

  const handleSave = async () => {
    if (!firestore || !configDocRef) return;
    setIsSubmitting(true);
    try {
        await updateDoc(configDocRef, { support: config.support });
        toast({ title: 'تم حفظ معلومات الدعم' });
    } catch (error: any) {
        console.error("Error saving support settings:", error);
        toast({ variant: 'destructive', title: "خطأ في الحفظ", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleResolveComplaint = async (complaintId: string) => {
    if(!firestore) return;
    setResolvingId(complaintId);
    const complaintDocRef = doc(firestore, 'complaints', complaintId);
    try {
        await updateDoc(complaintDocRef, { status: 'resolved' });
        toast({ title: 'تم حل الشكوى بنجاح' });
    } catch(err: any) {
        toast({variant: 'destructive', title: 'فشل تحديث الشكوى'});
    } finally {
        setResolvingId(null);
    }
  }
  
  const dbError = configError || complaintsError;
  if (dbError) return <SetupFirestoreMessage />;
  if (!firestore) return <SetupFirestoreMessage />;


  return (
    <div className="space-y-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-2xl font-black text-gray-900">مركز الدعم الفني</h1>
            <p className="text-gray-400 text-sm font-bold mt-1">إدارة شكاوى العملاء وتحديث معلومات التواصل.</p>
            </div>
            <Button onClick={handleSave} disabled={isSubmitting || configLoading} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'حفظ التغييرات'}
            </Button>
        </div>

        <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="text-primary"/>جدول الشكاوى والتذاكر</CardTitle></CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                            <TableHead>العميل</TableHead>
                            <TableHead>نص الشكوى</TableHead>
                            <TableHead className="text-center">التاريخ</TableHead>
                            <TableHead className="text-center">الحالة</TableHead>
                            <TableHead className="text-center">إجراء</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {complaintsLoading ? (
                             Array.from({ length: 2 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow>)
                        ) : complaints && complaints.length > 0 ? (
                            complaints.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-bold text-xs">{c.userName}<br/><span className="font-mono text-gray-400">{c.userPhone}</span></TableCell>
                                    <TableCell className="text-xs text-gray-600 max-w-sm">{c.issueText}</TableCell>
                                    <TableCell className="text-center font-mono text-xs">{format(new Date(c.createdAt), 'dd/MM/yy', { locale: ar })}</TableCell>
                                    <TableCell className="text-center"><Badge variant={c.status === 'resolved' ? 'secondary' : 'destructive'}>{c.status === 'resolved' ? 'تم الحل' : 'جديدة'}</Badge></TableCell>
                                    <TableCell className="text-center">
                                        {c.status === 'pending' && (
                                            <Button size="sm" onClick={() => handleResolveComplaint(c.id!)} disabled={resolvingId === c.id}>
                                                {resolvingId === c.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">لا توجد شكاوى حالياً.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader><CardTitle className="flex items-center gap-2">معلومات التواصل مع الدعم</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {configLoading ? Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-24 w-full"/>) : <>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Phone className="h-4 w-4"/>رقم واتساب الدعم</Label>
                        <Input dir="ltr" value={config.support.whatsapp_number} onChange={e => handleInputChange('whatsapp_number', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Facebook className="h-4 w-4"/>رابط صفحة الفيسبوك</Label>
                        <Input dir="ltr" value={config.support.facebook_url} onChange={e => handleInputChange('facebook_url', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Mail className="h-4 w-4"/>البريد الإلكتروني</Label>
                        <Input dir="ltr" type="email" value={config.support.email} onChange={e => handleInputChange('email', e.target.value)} />
                    </div>
                </>}
            </CardContent>
        </Card>
    </div>
  );
}
