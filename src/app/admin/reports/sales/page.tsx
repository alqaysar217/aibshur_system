'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { TrendingUp, ShoppingBag, PieChart, BadgePercent, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { mockOrders } from '@/lib/mock-data';

// Mock KPI data
const kpiData = {
    totalSales: 12543000,
    completedOrders: 312,
    netProfit: 2508600,
    totalDiscounts: 150000,
};

export default function SalesReportPage() {
    const [date, setDate] = useState<DateRange | undefined>({
      from: new Date(2024, 0, 20),
      to: addDays(new Date(2024, 0, 20), 20),
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-black text-gray-900">تقارير المبيعات</h1>
                <p className="text-gray-400 text-sm font-bold mt-1">تحليل مفصل للمبيعات والأداء المالي.</p>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card><CardHeader><CardTitle>إجمالي المبيعات</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{kpiData.totalSales.toLocaleString()} ر.ي</p></CardContent></Card>
                <Card><CardHeader><CardTitle>الطلبات المكتملة</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{kpiData.completedOrders}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>صافي الربح</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{kpiData.netProfit.toLocaleString()} ر.ي</p></CardContent></Card>
                <Card><CardHeader><CardTitle>إجمالي الخصومات</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-500">{kpiData.totalDiscounts.toLocaleString()} ر.ي</p></CardContent></Card>
            </div>
            
            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-wrap items-center gap-2">
                    <Button variant="secondary">اليوم</Button>
                    <Button variant="secondary">هذا الأسبوع</Button>
                    <Button variant="secondary">هذا الشهر</Button>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (
                                <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                            ) : (
                            <span>اختر تاريخاً</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                    <Button className="mr-auto">تطبيق الفلتر</Button>
                </CardContent>
            </Card>

            {/* Sales Table */}
            <Card>
                <CardHeader>
                    <CardTitle>سجل المبيعات</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>رقم الطلب</TableHead>
                                <TableHead>العميل</TableHead>
                                <TableHead>المبلغ</TableHead>
                                <TableHead>طريقة الدفع</TableHead>
                                <TableHead>التاريخ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {mockOrders.slice(0, 10).map(order => (
                               <TableRow key={order.orderId}>
                                   <TableCell className="font-mono">#{order.orderId.slice(-6)}</TableCell>
                                   <TableCell>{order.clientUid.slice(0,10)}...</TableCell>
                                   <TableCell>{order.total_price.toLocaleString()} ر.ي</TableCell>
                                   <TableCell>
                                        <span className={cn("px-2 py-1 rounded-full text-xs font-bold", order.payment_method === 'wallet' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800')}>
                                            {order.payment_method === 'wallet' ? 'المحفظة' : 'عند الاستلام'}
                                        </span>
                                   </TableCell>
                                   <TableCell>{format(new Date(order.created_at), "yyyy/MM/dd")}</TableCell>
                               </TableRow>
                           ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    )
}
