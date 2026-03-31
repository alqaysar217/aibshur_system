'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFirestore, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import type { User, Store } from '@/lib/types';
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
import { PlusCircle, Edit, Trash2, Loader2, Users, Search, X, ShieldCheck, Truck, User as UserIcon, Store as StoreIcon, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SetupFirestoreMessage from '@/components/admin/setup-firestore-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';


const RowSkeleton = () => (
    <TableRow>
        <TableCell colSpan={5} className="p-0">
            <Skeleton className="w-full h-[70px]"/>
        </TableCell>
    </TableRow>
);

export default function AdminUsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [activeTab, setActiveTab] = useState('clients');
 
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  const [stores, setStores] = useState<Store[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Search/Picker State for Store Owners
  const [searchQuery, setSearchQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, loading: usersLoading, error: usersError } = useCollection<User>(usersQuery, 'users');

  const { admins, storeOwners, drivers, clients } = useMemo(() => {
    return {
        admins: users?.filter(u => u.roles?.is_admin) || [],
        storeOwners: users?.filter(u => u.roles?.is_store_owner) || [],
        drivers: users?.filter(u => u.roles?.is_driver) || [],
        clients: users?.filter(u => u.roles?.is_user && !u.roles.is_admin && !u.roles.is_driver && !u.roles.is_store_owner) || [],
    }
  }, [users]);


  useEffect(() => {
    if (!firestore) {
      setDataLoading(false);
      return;
    }
    const fetchStoresData = async () => {
      try {
        const storesSnapshot = await getDocs(collection(firestore, 'stores'));
        setStores(storesSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Store)));
      } catch (error) {
        console.error("Error fetching stores:", error);
        toast({ variant: 'destructive', title: "خطأ في جلب بيانات المتاجر" });
      } finally {
        setDataLoading(false);
      }
    };
    fetchStoresData();
  }, [firestore, toast]);
  
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
    setIsDeleteDialogOpen(true);
  };
  
  const handleToggleBlock = async (user: User) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
        const currentStatus = user.account_status.is_blocked;
        await updateDoc(userDocRef, { 'account_status.is_blocked': !currentStatus });
        toast({ title: `تم ${currentStatus ? 'رفع الحظر' : 'حظر'} المستخدم`});
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
      } catch (e: any)          {
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
        roles: currentUser.roles
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
    if (dataLoading) return '...';
    return stores.find(s => s.id === storeId)?.name_ar || <span className="text-gray-400">متجر محذوف</span>;
  }, [stores, dataLoading]);
  
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    return stores.filter(s => s.name_ar.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, stores]);
  
  const handleRoleChange = (role: keyof User['roles'], checked: boolean) => {
    setCurrentUser(prev => {
        const newRoles = { ...prev?.roles, [role]: checked };
        // Ensure a user is always at least a 'user'
        if (role !== 'is_user' && !newRoles.is_user && !newRoles.is_admin && !newRoles.is_driver && !newRoles.is_store_owner) {
            newRoles.is_user = true;
        }
        return { ...prev, roles: newRoles };
    });
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
                <TableHead className="text-center w-[150px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {usersLoading ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : userData.map((user) => (
                    <TableRow key={user.uid} className="hover:bg-muted/50">
                        <TableCell className="font-bold text-xs text-gray-700">
                          <div className="flex items-center gap-2">
                           {user.vip_details?.isActive && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-400" />}
                           <span>{user.full_name}</span>
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
                            <Switch checked={!user.account_status.is_blocked} onCheckedChange={() => handleToggleBlock(user)} />
                             <span className="text-xs font-bold ml-2">{!user.account_status.is_blocked ? 'فعال' : 'محظور'}</span>
                        </TableCell>
                        <TableCell className="align-middle">
                            <div className="flex items-center justify-center gap-2">
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

  if (usersError) {
    if (usersError.message.includes('database (default) does not exist') || usersError.message.includes('permission-denied')) {
      return <SetupFirestoreMessage />;
    }
    return <p className="text-destructive text-center">خطأ: {usersError.message}</p>;
  }
  if (!firestore) return <SetupFirestoreMessage />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">إدارة المستخدمين</h1>
          <p className="text-gray-400 text-sm font-bold mt-1">تحكم في صلاحيات وحسابات جميع مستخدمي النظام.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-lg font-black gap-2 h-11 shadow-lg shadow-primary/20">
          <PlusCircle /> إضافة مستخدم جديد
        </Button>
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
            <div className="grid gap-4 py-6">
              
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>الاسم الكامل</Label><Input name="full_name" defaultValue={currentUser?.full_name} required className="rounded-lg bg-gray-50"/></div>
                    <div className="space-y-2"><Label>رقم الهاتف</Label><Input name="phone" defaultValue={currentUser?.phone} required className="rounded-lg bg-gray-50" dir="ltr"/></div>
                </div>
                 <div className="space-y-2"><Label>البريد الإلكتروني</Label><Input name="email" type="email" defaultValue={currentUser?.email} className="rounded-lg bg-gray-50" dir="ltr"/></div>
                 <div className="space-y-2">
                    <Label className="font-bold">الصلاحيات</Label>
                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2"><Checkbox id="role-user" checked={currentUser?.roles?.is_user} onCheckedChange={checked => handleRoleChange('is_user', !!checked)} /><Label htmlFor="role-user">عميل</Label></div>
                        <div className="flex items-center gap-2"><Checkbox id="role-driver" checked={currentUser?.roles?.is_driver} onCheckedChange={checked => handleRoleChange('is_driver', !!checked)} /><Label htmlFor="role-driver">مندوب</Label></div>
                        <div className="flex items-center gap-2"><Checkbox id="role-owner" checked={currentUser?.roles?.is_store_owner} onCheckedChange={checked => handleRoleChange('is_store_owner', !!checked)} /><Label htmlFor="role-owner">صاحب متجر</Label></div>
                        <div className="flex items-center gap-2"><Checkbox id="role-admin" checked={currentUser?.roles?.is_admin} onCheckedChange={checked => handleRoleChange('is_admin', !!checked)} /><Label htmlFor="role-admin">مدير</Label></div>
                    </div>
                </div>
                
                 {currentUser?.roles?.is_store_owner && (
                     <div className="p-4 border rounded-xl space-y-4">
                        <Label className="font-bold">ربط بمتجر</Label>
                         {!currentUser?.store_id ? (
                            <div ref={pickerRef} className="space-y-2 animate-in fade-in duration-300 relative">
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
                            <div className="p-3 border rounded-lg bg-primary/5 flex items-center justify-between animate-in fade-in duration-300">
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
              <Button type="submit" disabled={isSubmitting || dataLoading} className="rounded-lg font-black">{isSubmitting ? <Loader2 className="animate-spin"/> : 'حفظ'}</Button>
              <DialogClose asChild><Button type="button" variant="secondary" className="rounded-lg font-bold">إلغاء</Button></DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
