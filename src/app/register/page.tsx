'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { User as AppUser, UserRole } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function RegisterPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) {
        toast({variant: "destructive", title: "خطأ", description: "يجب تسجيل الدخول أولاً."});
        return;
    }
    if (!fullName) {
        toast({variant: "destructive", title: "خطأ", description: "الرجاء إدخال الاسم الكامل."});
        return;
    }
    
    setLoading(true);

    try {
        const newUser: Omit<AppUser, 'uid'> = {
            phone: user.phoneNumber!,
            role: role,
            full_name: fullName,
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString(),
            profile_image: PlaceHolderImages.find(p => p.id === 'user-yusuf')?.imageUrl,
            account_status: {
                is_blocked: false,
            },
        };

        if(role === 'driver') {
            newUser.driver_details = {
                vehicle_type: 'motorcycle',
                license_plate: '',
                id_card_image: '',
                status: 'pending',
                is_online: false,
                rating: 0,
                wallet_balance: 0,
            }
        }
        
        await setDoc(doc(firestore, 'users', user.uid), newUser);
        toast({title: "اكتمل التسجيل", description: "تم إنشاء حسابك بنجاح."});

        // if role is admin create a user with that role
        if(fullName === 'Admin User' && process.env.NODE_ENV === 'development') {
          await setDoc(doc(firestore, 'users', user.uid), {...newUser, role: 'admin'});
        }


        router.push('/');
    } catch (error: any) {
        console.error(error);
        toast({variant: "destructive", title: "خطأ", description: "فشل إنشاء الحساب: " + error.message});
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-right">
          <CardTitle>إكمال التسجيل</CardTitle>
          <CardDescription>أخبرنا المزيد عن نفسك.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
            <div className="space-y-2 text-right">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                />
            </div>
            <div className="space-y-2 text-right">
                <Label>أرغب في التسجيل كـ:</Label>
                <RadioGroup
                    dir='rtl'
                    defaultValue="client"
                    className="flex justify-end gap-4 pt-2"
                    value={role}
                    onValueChange={(value: UserRole) => setRole(value)}
                >
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="client" id="r1" />
                        <Label htmlFor="r1">عميل</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="driver" id="r2" />
                        <Label htmlFor="r2">مندوب توصيل</Label>
                    </div>
                </RadioGroup>
            </div>
             <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'جاري التسجيل...' : 'إكمال التسجيل'}
            </Button>
            </CardContent>
        </form>
      </Card>
    </div>
  );
}
