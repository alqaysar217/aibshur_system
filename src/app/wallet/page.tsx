import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { mockTransactions, mockUsers } from '@/lib/mock-data';
import { ArrowDown, ArrowUp, DollarSign, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { FinanceTransaction, TransactionType } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'top-up':
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'order_payment':
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      case 'withdrawal':
        return <ArrowDown className="w-4 h-4 text-blue-500" />;
    }
  };
  
  const getTransactionText = (transaction: FinanceTransaction) => {
    switch (transaction.type) {
      case 'top-up':
        return 'إضافة رصيد';
      case 'order_payment':
        return `دفع طلب #${transaction.transactionId.slice(-4)}`;
      case 'withdrawal':
        return 'سحب رصيد';
    }
  };
  
  const getAmountColor = (type: TransactionType) => {
    return type === 'top-up' ? 'text-green-600' : 'text-red-600';
  };

export default function WalletPage() {
  const currentUser = mockUsers.length > 0 ? mockUsers[0] : null;
  const userTransactions = currentUser ? mockTransactions.filter((t) => t.userUid === currentUser.uid) : [];

  const balance = userTransactions.reduce((acc, t) => acc + t.amount, 0);

  if (!currentUser) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-right">
        <h1 className="text-3xl font-bold">المحفظة</h1>
        <p className="text-muted-foreground">إدارة رصيدك وسجل معاملاتك.</p>
      </div>

      <Card className="text-center bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="text-lg">الرصيد الحالي</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold">
            {balance.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إضافة رصيد للمحفظة</CardTitle>
          <CardDescription>اختر مبلغًا أو أدخل مبلغًا مخصصًا.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {[25, 50, 100, 200].map((amount) => (
              <Button key={amount} variant="outline" className="flex-1">
                {amount} ر.س
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="أو أدخل مبلغًا" type="number" className="text-right" />
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              إضافة
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>سجل المعاملات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {userTransactions.map((transaction, index) => (
              <>
              <div key={transaction.transactionId} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                        {getTransactionIcon(transaction.type)}
                    </div>
                  <div>
                    <p className="font-semibold">{getTransactionText(transaction)}</p>
                    <p className="text-sm text-muted-foreground">{new Date(transaction.created_at).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`font-mono font-semibold ${getAmountColor(transaction.type)}`}>
                    {transaction.amount.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })}
                  </p>
                  <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                    {transaction.status === 'completed' ? 'مكتملة' : 'قيد الانتظار'}
                  </Badge>
                </div>
              </div>
              {index < userTransactions.length - 1 && <Separator />}
              </>
            ))}
             {userTransactions.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">لا توجد معاملات لعرضها.</p>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
