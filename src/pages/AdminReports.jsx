import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Calendar, TrendingUp, DollarSign, Archive, Loader2 } from 'lucide-react';

const AdminReports = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        daily: 0, weekly: 0, monthly: 0, yearly: 0,
        dailyCount: 0, weeklyCount: 0, monthlyCount: 0, yearlyCount: 0
    });

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            // AMBIL SEMUA ORDER YANG SUDAH SELESAI (Completed)
            // Kita gunakan client-side filtering untuk tanggal agar query tidak kompleks
            const q = query(collection(db, "orders"), where("status", "==", "completed"));
            const snapshot = await getDocs(q);

            const data = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                // Konversi Timestamp Firestore ke Date Object JS
                date: doc.data().createdAt ? new Date(doc.data().createdAt.seconds * 1000) : new Date()
            }));

            setOrders(data);
            calculateSummary(data);
        } catch (error) {
            console.error("Error reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateSummary = (data) => {
        const now = new Date();

        // Reset jam ke 00:00:00 untuk perbandingan akurat
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const weekStart = new Date(todayStart);
        weekStart.setDate(todayStart.getDate() - 7);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const yearStart = new Date(now.getFullYear(), 0, 1);

        const calc = (startDate) => {
            const filtered = data.filter(o => o.date >= startDate);
            return {
                total: filtered.reduce((acc, curr) => acc + (curr.total || 0), 0),
                count: filtered.length
            };
        };

        setSummary({
            daily: calc(todayStart).total,
            dailyCount: calc(todayStart).count,

            weekly: calc(weekStart).total,
            weeklyCount: calc(weekStart).count,

            monthly: calc(monthStart).total,
            monthlyCount: calc(monthStart).count,

            yearly: calc(yearStart).total,
            yearlyCount: calc(yearStart).count,
        });
    };

    const Card = ({ title, amount, count, icon: Icon, color }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden transition hover:shadow-md">
            <div className={`absolute top-0 right-0 p-4 opacity-10 ${color}`}><Icon size={64} /></div>
            <p className="text-gray-500 text-sm font-medium uppercase mb-2">{title}</p>
            <h3 className="text-3xl font-bold text-gray-800">Rp {amount.toLocaleString('id-ID')}</h3>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Archive size={12} /> {count} Transaksi Selesai
            </p>
        </div>
    );

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-orange-600" /></div>;

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <TrendingUp className="text-green-600" /> Laporan Keuangan Real-Time
            </h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card title="Omzet Hari Ini" amount={summary.daily} count={summary.dailyCount} icon={DollarSign} color="text-blue-500" />
                <Card title="7 Hari Terakhir" amount={summary.weekly} count={summary.weeklyCount} icon={Calendar} color="text-orange-500" />
                <Card title="Bulan Ini" amount={summary.monthly} count={summary.monthlyCount} icon={TrendingUp} color="text-purple-500" />
                <Card title="Tahun Ini" amount={summary.yearly} count={summary.yearlyCount} icon={Archive} color="text-green-500" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-bold text-lg mb-4 text-gray-700">10 Transaksi Terakhir</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b">
                            <tr>
                                <th className="p-3">Waktu</th>
                                <th className="p-3">Order ID</th>
                                <th className="p-3">Pelanggan</th>
                                <th className="p-3 text-right">Subtotal</th>
                                <th className="p-3 text-right">Fee</th>
                                <th className="p-3 text-right">Total Bersih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {orders.sort((a, b) => b.date - a.date).slice(0, 10).map((order, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-500">{order.date.toLocaleString('id-ID')}</td>
                                    <td className="p-3 font-mono font-bold text-orange-600">{order.orderId}</td>
                                    <td className="p-3 font-bold">{order.customerName}</td>
                                    <td className="p-3 text-right">Rp {order.subTotal?.toLocaleString('id-ID')}</td>
                                    <td className="p-3 text-right text-green-600">+ Rp {order.adminFee?.toLocaleString('id-ID')}</td>
                                    <td className="p-3 text-right font-bold">Rp {order.total?.toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                            {orders.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-400">Belum ada data keuangan.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminReports;