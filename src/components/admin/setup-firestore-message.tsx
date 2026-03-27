import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function SetupFirestoreMessage() {
    const firestoreConsoleUrl = "https://console.firebase.google.com/project/studio-493831327-52b75/firestore";

    return (
        <Card className="border-destructive/50 border-2 max-w-2xl mx-auto my-10 animate-in fade-in-50">
            <CardHeader>
                <CardTitle className="text-destructive font-black">خطوة أخيرة: تفعيل قاعدة البيانات</CardTitle>
                <CardDescription className="font-bold text-base text-gray-600">
                    لتشغيل لوحة التحكم، يجب تفعيل خدمة Firestore في حسابك على Firebase.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-right">
                <p className="font-bold text-gray-800">هذه خطوة لمرة واحدة فقط ولن تستغرق سوى دقيقة واحدة.</p>
                <ol className="list-decimal list-inside space-y-2 font-semibold">
                    <li>اضغط على الرابط أدناه للانتقال مباشرة إلى صفحة الإعداد.</li>
                    <li>اضغط على زر **"Create database"** (إنشاء قاعدة بيانات).</li>
                    <li>اختر **"Start in production mode"** (البدء في وضع الإنتاج).</li>
                    <li>اختر الموقع الجغرافي (Location) ثم اضغط **"Enable"** (تفعيل).</li>
                </ol>
                <Button asChild className="w-full font-black text-lg h-12 shadow-md hover:shadow-lg transition-shadow">
                    <a href={firestoreConsoleUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-5 h-5 ml-3" />
                        الذهاب إلى Firebase لتفعيل قاعدة البيانات
                    </a>
                </Button>
                 <p className="text-xs text-muted-foreground pt-4 text-center">
                    بعد التفعيل، قم بتحديث هذه الصفحة وسيختفي هذا التنبيه لتبدأ باستخدام لوحة التحكم.
                </p>
            </CardContent>
        </Card>
    )
}
