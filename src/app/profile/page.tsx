import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mockUsers } from '@/lib/mock-data';
import { Camera } from 'lucide-react';

export default function ProfilePage() {
  const currentUser = mockUsers.length > 0 ? mockUsers[0] : null;

  if (!currentUser) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-right">
        <h1 className="text-3xl font-bold">الملف الشخصي</h1>
        <p className="text-muted-foreground">إدارة معلومات حسابك.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المعلومات الشخصية</CardTitle>
          <CardDescription>قم بتحديث اسمك وصورة ملفك الشخصي ورقم هاتفك.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={currentUser.profile_image} />
                <AvatarFallback>{currentUser.full_name ? currentUser.full_name.charAt(0) : 'U'}</AvatarFallback>
              </Avatar>
              <Button size="icon" className="absolute bottom-0 left-0 w-8 h-8 rounded-full">
                <Camera className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2 text-right">
            <Label htmlFor="fullName">الاسم الكامل</Label>
            <Input id="fullName" defaultValue={currentUser.full_name} />
          </div>
          <div className="space-y-2 text-right">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input id="phone" defaultValue={currentUser.phone} disabled />
          </div>
           <div className="space-y-2 text-right">
            <Label htmlFor="city">المدينة</Label>
            <Input id="city" defaultValue="الرياض" disabled />
          </div>
          <div className="flex justify-start">
             <Button>حفظ التغييرات</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الأمان</CardTitle>
           <CardDescription>تغيير كلمة المرور الخاصة بك.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="space-y-2 text-right">
                <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                <Input id="current-password" type="password" />
            </div>
             <div className="space-y-2 text-right">
                <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                <Input id="new-password" type="password" />
            </div>
            <div className="flex justify-start">
             <Button>تغيير كلمة المرور</Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
