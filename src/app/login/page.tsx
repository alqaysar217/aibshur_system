'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

declare global {
    interface Window {
        recaptchaVerifier: RecaptchaVerifier;
        confirmationResult: ConfirmationResult;
    }
}

export default function LoginPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    const setupRecaptcha = () => {
        if (!auth) return;
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                }
            });
        }
    };

    const onSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (!auth) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم تهيئة المصادقة' });
            setLoading(false);
            return;
        }

        try {
            setupRecaptcha();
            const appVerifier = window.recaptchaVerifier;
            // Make sure to use international format for phone number
            const formattedPhone = phone.startsWith('+') ? phone : `+967${phone.replace(/^0/, '')}`;
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            window.confirmationResult = confirmationResult;
            setOtpSent(true);
            toast({ title: 'نجاح', description: 'تم إرسال رمز التحقق إلى هاتفك.' });
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'حدث خطأ', description: error.message });
            if (window.recaptchaVerifier) {
                 window.recaptchaVerifier.render().then(function(widgetId) {
                    // @ts-ignore
                    grecaptcha.reset(widgetId);
                 });
            }
        } finally {
            setLoading(false);
        }
    };
    
    const onVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (!window.confirmationResult) {
             toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم إرسال رمز التحقق أولاً' });
             setLoading(false);
             return;
        }
        try {
            const result = await window.confirmationResult.confirm(otp);
            const user = result.user;
            
            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(firestore!, 'users', user.uid));
            
            toast({ title: 'أهلاً بك', description: 'تم تسجيل الدخول بنجاح' });
            
            if (userDoc.exists()) {
                router.push('/admin'); // Redirect to admin dashboard after login
            } else {
                router.push('/register'); // New user, redirect to registration
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'خطأ في التحقق', description: 'رمز التحقق غير صحيح.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
             <div id="recaptcha-container"></div>
             <Card className="w-full max-w-sm">
                 <CardHeader className="text-right">
                    <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
                    <CardDescription>أدخل رقم هاتفك لتسجيل الدخول أو لإنشاء حساب جديد</CardDescription>
                </CardHeader>
                <CardContent>
                    {!otpSent ? (
                        <form onSubmit={onSendOtp} className="space-y-4">
                            <div className="space-y-2 text-right">
                                <Label htmlFor="phone">رقم الهاتف</Label>
                                <Input 
                                    id="phone" 
                                    type="tel" 
                                    placeholder="777xxxxxx"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required 
                                    dir="ltr"
                                    className="text-left"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={onVerifyOtp} className="space-y-4">
                            <div className="space-y-2 text-right">
                                <Label htmlFor="otp">رمز التحقق</Label>
                                <Input 
                                    id="otp" 
                                    type="text" 
                                    placeholder="xxxxxx"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                    dir="ltr"
                                     className="text-center tracking-[0.5em]"
                                />
                            </div>
                             <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'جاري التحقق...' : 'تحقق وتسجيل الدخول'}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    {otpSent && (
                        <Button variant="link" size="sm" onClick={() => setOtpSent(false)} disabled={loading}>
                            تغيير رقم الهاتف
                        </Button>
                    )}
                 </CardFooter>
             </Card>
        </div>
    );
}
