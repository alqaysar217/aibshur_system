'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import type { User, Store, City } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Loader2, Users, Search, X, ShieldCheck, Truck, User as UserIcon, Store as StoreIcon, Crown, RefreshCw, Eye, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const RowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={6} className="p-0">
            <Skeleton className="w-full h-[70px]"/>
        </TableCell>
    </TableRow>
);

export default function AdminUsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);

  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<Error | null>(null);

  const [activeTab, setActiveTab] = useState('clients');
 
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDocsViewerOpen, setDocsViewerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToViewDocs, setUserToViewDocs] = useState<User | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);
  
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
        toast({
            variant: "destructive",
            title: "خاصية غير مدعومة",
            description: "متصفحك لا يدعم تحديد الموقع الجغرافي.",
        });
        return;
    }

    toast({ title: "جاري تحديد الموقع...", description: "الرجاء الانتظار..." });
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentUser(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    location: {
                        ...prev.location,
                        lat: latitude,
                        lng: longitude,
                    }
                }
            });
            toast({
                title: "نجاح",
                description: "تم تحديث إحداثيات الموقع بنجاح.",
            });
        },
        (error) => {
            toast({
                variant: "destructive",
                title: "خطأ في تحديد الموقع",
                description: "لا يمكن الحصول على الموقع الحالي. تأكد من منح الأذونات اللازمة للمتصفح.",
            });
            console.error("Geolocation error:", error);
        }
    );
  };
  
    const handleLocationAction = () => {
        if (currentUser?.location?.lat && currentUser?.location?.lng) {
            const url = `https://www.google.com/maps?q=${currentUser.location.lat},${currentUser.location.lng}`;
            window.open(url, '_blank');
        } else {
            handleGetLocation();
        }
    };


  useEffect(() => {
    if (!firestore) return;
    const fetchData = async () => {
        setLoading(true);
        setDbError(null);
        try {
            const [usersSnapshot, storesSnapshot, citiesSnapshot] = await Promise.all([
                getDocs(collection(firestore, 'users')),
                getDocs(collection(firestore, 'stores')),
                getDocs(collection(firestore, 'cities')),
            ]);
            setUsers(usersSnapshot.docs.map(d => ({...d.data(), id: d.id, uid: d.id } as User)));
            setStores(storesSnapshot.docs.map(d => ({...d.data(), id: d.id } as Store)));
            setCities(citiesSnapshot.docs.map(d => ({...d.data(), id: d.id } as City)));
        } catch (err: any) {
            setDbError(err);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [firestore, refreshKey]);

  const { admins, storeOwners, drivers, clients } = useMemo(() => {
    return {
        admins: users?.filter(u => u.roles?.is_admin) || [],
        storeOwners: users?.filter(u => u.roles?.is_store_owner) || [],
        drivers: users?.filter(u => u.roles?.is_driver) || [],
        clients: users?.filter(u => u.roles?.is_user && !u.roles.is_admin && !u.roles.is_driver && !u.roles.is_store_owner) || [],
    }
  }, [users]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pickerRef]);

  const handleOpenDialog = (user: Partial<User> | null = null) => {
    setCurrentUser(user ? { ...user } : { account_status: { is_blocked: false }, roles: { is_user: true } });
    setSearchQuery('');
    setIsPickerOpen(false);
    setDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleOpenDocsViewer = (user: User) => {
    setUserToViewDocs(user);
    setDocsViewerOpen(true);
  }
  
  const handleToggleBlock = async (user: User) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
        const currentStatus = user.account_status.is_blocked;
        await updateDoc(userDocRef, { 'account_status.is_blocked': !currentStatus });
        toast({ title: `تم ${currentStatus ? 'رفع الحظر' : 'حظر'} المستخدم`});
        handleRefresh();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'فشل تغيير الحالة' });
    }
  }

  const handleDriverApproval = async (driver: User, newStatus: 'approved' | 'rejected') => {
      if (!firestore || !driver.driver_details) return;
      const userDocRef = doc(firestore, 'users', driver.uid);
      try {
          await updateDoc(userDocRef, { 'driver_details.status': newStatus });
          toast({ title: `تم ${newStatus === 'approved' ? 'قبول' : 'رفض'} المندوب` });
          handleRefresh();
      } catch (e: any) {
           toast({ variant: 'destructive', title: 'فشل تحديث حالة المندوب' });
      }
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !currentUser) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const userData: Partial<User> = {
        ...currentUser,
        full_name: formData.get('full_name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        roles: currentUser.roles,
        location: {
            province: currentUser.location?.province,
            address_text: formData.get('address_text') as string,
            lat: currentUser.location?.lat,
            lng: currentUser.location?.lng,
        },
        auth_docs: {
            self_img: formData.get('self_img') as string,
            id_front: formData.get('id_front') as string,
            id_back: formData.get('id_back') as string,
        }
    };

    if(currentUser.roles?.is_store_owner && !currentUser.store_id) {
        toast({variant: 'destructive', title: 'خطأ', description: 'الرجاء ربط صاحب المتجر بمتجر.'});
        setIsSubmitting(false);
        return;
    } else if (!currentUser.roles?.is_store_owner) {
        delete userData.store_id;
    }

    let docRef;

    try {
      if (currentUser.uid) { // Editing existing user
        docRef = doc(firestore, 'users', currentUser.uid);
        await updateDoc(docRef, userData);
        toast({ title: "تم التحديث بنجاح" });
      } else { // Adding new user (Note: This won't create a Firebase Auth user)
        const uid = `manual_${Date.now()}`;
        docRef = doc(firestore, 'users', uid);
        const fullData: User = {
            ...userData,
            uid: uid,
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString(),
        } as User;
        await setDoc(docRef, fullData);
        toast({ title: "تمت الإضافة بنجاح" });
      }
      setDialogOpen(false);
      handleRefresh();
    } catch (error: any) {
      console.error("Error saving user:", error);
       if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef!.path,
          operation: currentUser.uid ? 'update' : 'create',
          requestResourceData: userData
        }));
      } else {
        toast({ variant: 'destructive', title: "حدث خطأ", description: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!firestore || !userToDelete) return;
    const docRef = doc(firestore, 'users', userToDelete.uid);
    try {
      await deleteDoc(docRef);
      toast({ title: "تم الحذف بنجاح" });
      handleRefresh();
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
      } else {
        toast({ variant: 'destructive', title: "خطأ في الحذف" });
      }
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const getStoreName = useCallback((storeId?: string) => {
    if (!storeId) return <span className="text-red-500">غير مربوط</span>;
    if (loading) return '...';
    return stores.find(s => s.id === storeId)?.name_ar || <span className="text-gray-400">متجر محذوف</span>;
  }, [stores, loading]);
  
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    return stores.filter(s => s.name_ar.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, stores]);
  
    const handleSingleRoleChange = (role: 'is_user' | 'is_driver' | 'is_store_owner' | 'is_admin') => {
        const newRoles = {
            is_user: role === 'is_user',
            is_driver: role === 'is_driver',
            is_store_owner: role === 'is_store_owner',
            is_admin: role === 'is_admin',
        };
        setCurrentUser(prev => ({...prev, roles: newRoles}));
    }

    const getSingleRole = (roles?: User['roles']): string => {
        if (!roles) return 'is_user';
        if (roles.is_admin) return 'is_admin';
        if (roles.is_store_owner) return 'is_store_owner';
        if (roles.is_driver) return 'is_driver';
        return 'is_user';
    }

  const renderUserTable = (userData: User[], type: 'admin' | 'client' | 'driver' | 'store_owner') => {
      return (
        <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <TableHead className="text-right">الاسم الكامل</TableHead>
                <TableHead className="text-center">الهاتف</TableHead>
                {type === 'store_owner' && <TableHead className="text-center">المتجر المرتبط</TableHead>}
                {type === 'driver' && <TableHead className="text-center">حالة القبول</TableHead>}
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center w-[200px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {loading ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : userData.map((user) => (
                    <TableRow key={user.uid} className="hover:bg-muted/50">
                        <TableCell className="font-bold text-xs text-gray-700">
                          <div className="flex items-center gap-3">
                            <div className='flex items-center gap-1'>
                                {user.vip_details?.isActive && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-400" />}
                                <span>{user.full_name}</span>
                            </div>
                            {user.location?.lat && <MapPin className="w-4 h-4 text-gray-400 cursor-pointer hover:text-primary"/>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-gray-500" dir="ltr">{user.phone}</TableCell>
                        {type === 'store_owner' && <TableCell className="text-center font-bold text-xs">{getStoreName(user.store_id)}</TableCell>}
                        {type === 'driver' && (
                            <TableCell className="text-center font-bold text-xs">
                                {user.driver_details?.status === 'pending' ? (
                                    <div className="flex gap-2 justify-center">
                                        <Button size="sm" className="h-7 bg-green-500 hover:bg-green-600" onClick={() => handleDriverApproval(user, 'approved')}>قبول</Button>
                                        <Button size="sm" className="h-7" variant="destructive" onClick={() => handleDriverApproval(user, 'rejected')}>رفض</Button>
                                    </div>
                                ) : (
                                   <Badge className={cn(user.driver_details?.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{user.driver_details?.status === 'approved' ? 'معتمد' : 'مرفوض'}</Badge>
                                )}
                            </TableCell>
                        )}
                        <TableCell className="text-center align-middle">
                            <Badge
                                onClick={() => handleToggleBlock(user)}
                                variant={"outline"}
                                className={cn(
                                    "cursor-pointer font-bold transition-colors",
                                    !user.account_status.is_blocked
                                        ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                                        : "border-red-500 bg-red-50 text-red-700 hover:bg-red-100"
                                )}
                            >
                                {!user.account_status.is_blocked ? 'فعال' : 'محظور'}
                            </Badge>
                        </TableCell>
                        <TableCell className="align-middle">
                            <div className="flex items-center justify-center gap-1">
                                {type === 'driver' && <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => handleOpenDocsViewer(user)}><Eye className="w-4 h-4"/></Button>}
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenDialog(user)}><Edit className="w-4 h-4 text-gray-400" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleOpenDeleteDialog(user)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
          </Table>
      )
  }

  if (dbError) {
    if (dbError.message.includes('database (default) does not exist') || dbError.message.includes('permission-denied')) {
      return <SetupFirestoreMessage />;
    }
    return <p className="text-destructive text-center">خطأ: {dbError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة المستخدمين</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">تحكم في صلاحيات وحسابات جميع مستخدمي النظام.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={loading}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")}/></Button>
            <Button onClick={() => handleOpenDialog()} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
            <PlusCircle /> إضافة مستخدم جديد
            </Button>
        </div>
      </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clients">العملاء</TabsTrigger>
          <TabsTrigger value="drivers">المناديب</TabsTrigger>
          <TabsTrigger value="store_owners">أصحاب المتاجر</TabsTrigger>
          <TabsTrigger value="admins">المدراء</TabsTrigger>
        </TabsList>
        <TabsContent value="clients">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader><CardTitle className="text-sm font-black flex items-center gap-2"><UserIcon className="h-4 w-4 text-primary" /> قائمة العملاء ({clients.length})</CardTitle></CardHeader>
                <CardContent className="p-0">{renderUserTable(clients, 'client')}</CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="drivers">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader><CardTitle className="text-sm font-black flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> قائمة المناديب ({drivers.length})</CardTitle></CardHeader>
                <CardContent className="p-0">{renderUserTable(drivers, 'driver')}</CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="store_owners">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader><CardTitle className="text-sm font-black flex items-center gap-2"><StoreIcon className="h-4 w-4 text-primary" /> قائمة أصحاب المتاجر ({storeOwners.length})</CardTitle></CardHeader>
                <CardContent className="p-0">{renderUserTable(storeOwners, 'store_owner')}</CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="admins">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardHeader><CardTitle className="text-sm font-black flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> قائمة المدراء والمشرفين ({admins.length})</CardTitle></CardHeader>
                <CardContent className="p-0">{renderUserTable(admins, 'admin')}</CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="font-black text-gray-900">{currentUser?.uid ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-6 max-h-[70vh] overflow-y-auto pr-4">
              
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>الاسم الكامل</Label><Input name="full_name" defaultValue={currentUser?.full_name} required className="rounded-lg bg-gray-50"/></div>
                    <div className="space-y-2"><Label>رقم الهاتف</Label><Input name="phone" defaultValue={currentUser?.phone} required className="rounded-lg bg-gray-50" dir="ltr"/></div>
                </div>
                 <div className="space-y-2"><Label>البريد الإلكتروني</Label><Input name="email" type="email" defaultValue={currentUser?.email} className="rounded-lg bg-gray-50" dir="ltr"/></div>
                 <div className="space-y-2">
                    <Label className="font-bold">الصلاحيات</Label>
                    <RadioGroup
                        value={getSingleRole(currentUser?.roles)}
                        onValueChange={(value) => handleSingleRoleChange(value as any)}
                        className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50"
                    >
                        <div className="flex items-center gap-2"><RadioGroupItem value="is_user" id="role-user" /><Label htmlFor="role-user">عميل</Label></div>
                        <div className="flex items-center gap-2"><RadioGroupItem value="is_driver" id="role-driver" /><Label htmlFor="role-driver">مندوب</Label></div>
                        <div className="flex items-center gap-2"><RadioGroupItem value="is_store_owner" id="role-owner" /><Label htmlFor="role-owner">صاحب متجر</Label></div>
                        <div className="flex items-center gap-2"><RadioGroupItem value="is_admin" id="role-admin" /><Label htmlFor="role-admin">مدير</Label></div>
                    </RadioGroup>
                </div>

                {currentUser?.roles?.is_user && !currentUser.roles.is_admin && !currentUser.roles.is_driver && !currentUser.roles.is_store_owner && (
                     <div className="p-4 border rounded-xl space-y-4 animate-in fade-in duration-300">
                        <Label className="font-bold">بيانات العميل</Label>
                        <div className="space-y-2">
                            <Label>المحافظة</Label>
                            <select
                                value={currentUser?.location?.province || ''}
                                onChange={(e) =>
                                    setCurrentUser((prev) => {
                                        if (!prev) return null;
                                        const newLocation = {
                                            lat: prev.location?.lat,
                                            lng: prev.location?.lng,
                                            address_text: prev.location?.address_text,
                                            province: e.target.value
                                        };
                                        return { ...prev, location: newLocation };
                                    })
                                }
                                className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                                dir="rtl"
                            >
                                <option value="" disabled>اختر المحافظة</option>
                                {loading ? (
                                    <option value="loading" disabled>جاري جلب قائمة المدن...</option>
                                ) : cities && cities.length > 0 ? (
                                    cities.map((city) => (
                                        <option key={city.id} value={city.name_ar}>
                                            {city.name_ar}
                                        </option>
                                    ))
                                ) : (
                                    <option disabled>لا توجد مدن مضافة حالياً.</option>
                                )}
                            </select>
                        </div>
                        <div className="space-y-2"><Label>العنوان الوصفي</Label><Input name="address_text" value={currentUser?.location?.address_text || ''} onChange={e => setCurrentUser(p => p ? ({ ...p, location: { ...(p.location as any), address_text: e.target.value } }) : null)} className="rounded-lg bg-gray-50"/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="lat-client">خط العرض (Latitude)</Label>
                                <Input id="lat-client" name="lat" type="number" step="any" placeholder="15.3694" dir="ltr"
                                    value={currentUser?.location?.lat || ''} 
                                    onChange={(e) => setCurrentUser(p => p ? ({...p, location: {...p.location, lat: e.target.valueAsNumber}}) : null)}
                                    className="rounded-lg bg-gray-50"
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="lng-client">خط الطول (Longitude)</Label>
                                <Input id="lng-client" name="lng" type="number" step="any" placeholder="44.1910" dir="ltr"
                                    value={currentUser?.location?.lng || ''} 
                                    onChange={(e) => setCurrentUser(p => p ? ({...p, location: {...p.location, lng: e.target.valueAsNumber}}) : null)}
                                    className="rounded-lg bg-gray-50"
                                />
                            </div>
                        </div>
                        <Button type="button" variant="outline" onClick={handleLocationAction}>
                            {currentUser?.location?.lat && currentUser?.location?.lng ? 'عرض الموقع على الخريطة' : 'تحديد الموقع من الخريطة'} <MapPin className="mr-2 h-4 w-4"/>
                        </Button>
                    </div>
                )}
                
                {currentUser?.roles?.is_driver && (
                    <>
                        <div className="p-4 border rounded-xl space-y-4 animate-in fade-in duration-300">
                            <Label className="font-bold">بيانات توثيق المندوب</Label>
                            <div className="space-y-2">
                                <Label>رابط الصورة الشخصية</Label>
                                <Input name="self_img" value={currentUser?.auth_docs?.self_img || ''} onChange={(e) => setCurrentUser(p => p ? ({ ...p, auth_docs: { ...(p.auth_docs as any), self_img: e.target.value } }) : null)} className="rounded-lg bg-gray-50" dir="ltr"/>
                                {currentUser?.auth_docs?.self_img && <div className="flex justify-center p-2 mt-2 border rounded-xl"><Image src={currentUser.auth_docs.self_img} alt="معاينة" width={100} height={100} className="rounded-lg object-contain h-24"/></div>}
                            </div>
                            <div className="space-y-2">
                                <Label>رابط صورة الهوية (وجه)</Label>
                                <Input name="id_front" value={currentUser?.auth_docs?.id_front || ''} onChange={(e) => setCurrentUser(p => p ? ({ ...p, auth_docs: { ...(p.auth_docs as any), id_front: e.target.value } }) : null)} className="rounded-lg bg-gray-50" dir="ltr"/>
                                {currentUser?.auth_docs?.id_front && <div className="flex justify-center p-2 mt-2 border rounded-xl"><Image src={currentUser.auth_docs.id_front} alt="معاينة" width={150} height={100} className="rounded-lg object-contain h-24"/></div>}
                            </div>
                            <div className="space-y-2">
                                <Label>رابط صورة الهوية (ظهر)</Label>
                                <Input name="id_back" value={currentUser?.auth_docs?.id_back || ''} onChange={(e) => setCurrentUser(p => p ? ({ ...p, auth_docs: { ...(p.auth_docs as any), id_back: e.target.value } }) : null)} className="rounded-lg bg-gray-50" dir="ltr"/>
                                {currentUser?.auth_docs?.id_back && <div className="flex justify-center p-2 mt-2 border rounded-xl"><Image src={currentUser.auth_docs.id_back} alt="معاينة" width={150} height={100} className="rounded-lg object-contain h-24"/></div>}
                            </div>
                        </div>
                         <div className="p-4 border rounded-xl space-y-4 animate-in fade-in duration-300">
                            <Label className="font-bold">موقع المندوب</Label>
                            <div className="space-y-2">
                                <Label>المحافظة</Label>
                                <select
                                    value={currentUser?.location?.province || ''}
                                    onChange={(e) =>
                                        setCurrentUser((prev) => {
                                            if (!prev) return null;
                                            const newLocation = {
                                                lat: prev.location?.lat,
                                                lng: prev.location?.lng,
                                                address_text: prev.location?.address_text,
                                                province: e.target.value
                                            };
                                            return { ...prev, location: newLocation };
                                        })
                                    }
                                    className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                                    dir="rtl"
                                >
                                    <option value="" disabled>اختر المحافظة</option>
                                    {loading ? (
                                        <option value="loading" disabled>جاري جلب قائمة المدن...</option>
                                    ) : cities && cities.length > 0 ? (
                                        cities.map((city) => (
                                            <option key={city.id} value={city.name_ar}>
                                                {city.name_ar}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>لا توجد مدن مضافة حالياً.</option>
                                    )}
                                </select>
                            </div>
                            <div className="space-y-2"><Label>العنوان الوصفي</Label><Input name="address_text" value={currentUser?.location?.address_text || ''} onChange={e => setCurrentUser(p => p ? ({ ...p, location: { ...(p.location as any), address_text: e.target.value } }) : null)} className="rounded-lg bg-gray-50"/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="lat-driver">خط العرض (Latitude)</Label>
                                    <Input id="lat-driver" name="lat" type="number" step="any" placeholder="15.3694" dir="ltr"
                                        value={currentUser?.location?.lat || ''} 
                                        onChange={(e) => setCurrentUser(p => p ? ({...p, location: {...p.location, lat: e.target.valueAsNumber}}) : null)}
                                        className="rounded-lg bg-gray-50"
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="lng-driver">خط الطول (Longitude)</Label>
                                    <Input id="lng-driver" name="lng" type="number" step="any" placeholder="44.1910" dir="ltr"
                                        value={currentUser?.location?.lng || ''} 
                                        onChange={(e) => setCurrentUser(p => p ? ({...p, location: {...p.location, lng: e.target.valueAsNumber}}) : null)}
                                        className="rounded-lg bg-gray-50"
                                    />
                                </div>
                            </div>
                            <Button type="button" variant="outline" onClick={handleLocationAction}>
                               {currentUser?.location?.lat && currentUser?.location?.lng ? 'عرض الموقع على الخريطة' : 'تحديد الموقع الحالي'} <MapPin className="mr-2 h-4 w-4"/>
                            </Button>
                        </div>
                    </>
                )}
                
                 {currentUser?.roles?.is_store_owner && (
                     <div className="p-4 border rounded-xl space-y-4 animate-in fade-in duration-300">
                        <Label className="font-bold">ربط بمتجر</Label>
                         {!currentUser?.store_id ? (
                            <div ref={pickerRef} className="space-y-2 relative">
                                <Label>ابحث عن المتجر</Label>
                                <div className="relative">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="ابحث بالاسم..." className="pr-10" onFocus={() => setIsPickerOpen(true)} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
                                </div>
                                {isPickerOpen && searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {searchResults.map((item) => (
                                            <button key={item.id} type="button" onClick={() => { setCurrentUser(prev => ({ ...prev, store_id: item.id })); setSearchQuery(''); setIsPickerOpen(false); }} className="flex items-center w-full text-right p-2 gap-3 hover:bg-gray-100">
                                                <Image src={item.logo_url} alt={item.name_ar} width={40} height={40} className="w-10 h-10 rounded-md object-cover bg-gray-100" />
                                                <p className="font-bold text-sm">{item.name_ar}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 border rounded-lg bg-primary/5 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <Image src={stores.find(s=>s.id === currentUser.store_id)?.logo_url || ''} alt="Selected item" width={40} height={40} className="w-10 h-10 rounded-md object-cover bg-gray-100" />
                                    <div>
                                        <Label className="text-xs text-muted-foreground">المتجر المرتبط</Label>
                                        <p className="font-bold text-sm text-primary">{getStoreName(currentUser.store_id)}</p>
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setCurrentUser(prev => ({...prev, store_id: ''}))}>
                                    <X className="w-4 h-4"/>
                                </Button>
                            </div>
                        )}
                    </div>
                 )}

            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || loading} className="rounded-lg font-black">{isSubmitting ? <Loader2 className="animate-spin"/> : 'حفظ'}</Button>
              <DialogClose asChild><Button type="button" variant="secondary" className="rounded-lg font-bold">إلغاء</Button></DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

       <Dialog open={isDocsViewerOpen} onOpenChange={setDocsViewerOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>وثائق المندوب: {userToViewDocs?.full_name}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
                    <div className="space-y-2 text-center">
                        <Label>الصورة الشخصية</Label>
                        <Image src={userToViewDocs?.auth_docs?.self_img || '/placeholder.png'} alt="Personal" width={200} height={200} className="rounded-lg border object-cover w-full aspect-square" />
                    </div>
                    <div className="space-y-2 text-center">
                        <Label>الهوية (وجه)</Label>
                        <Image src={userToViewDocs?.auth_docs?.id_front || '/placeholder.png'} alt="ID Front" width={200} height={200} className="rounded-lg border object-cover w-full aspect-square" />
                    </div>
                    <div className="space-y-2 text-center">
                        <Label>الهوية (ظهر)</Label>
                        <Image src={userToViewDocs?.auth_docs?.id_back || '/placeholder.png'} alt="ID Back" width={200} height={200} className="rounded-lg border object-cover w-full aspect-square" />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف حساب "{userToDelete?.full_name}" بشكل نهائي.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">نعم، قم بالحذف</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
