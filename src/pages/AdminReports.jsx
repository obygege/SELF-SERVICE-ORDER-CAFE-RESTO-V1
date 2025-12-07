import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Calendar, TrendingUp, DollarSign, Archive } from 'lucide-react';

const AdminReports = () => {
    const [orders, setOrders] = useState([]);
    const [summary, setSummary] = useState({
        daily: 0, weekly: 0, monthly: 0, yearly: 0,
        dailyCount: 0, weeklyCount: 0, monthlyCount: 0, yearlyCount: 0
    });

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        // Ambil SEMUA order yang statusnya COMPLETED (atau paid)
        // Di aplikasi nyata dengan ribuan data, gunakan query range date di Firestore.
        // Untuk skala ini, kita ambil semua dan filter di JS agar real-time dan mudah.
        const q = query(collection(db, "orders"), where("paymentStatus", "==", "paid"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ ...doc.data(), date: new Date(doc.data().createdAt.seconds * 1000) }));
        setOrders(data);
        calculateSummary(data);
    };

    const calculateSummary = (data) => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const calc = (startDate) => {
            const filtered = data.filter(o => o.date >= startDate);
            return {
                total: filtered.reduce((acc, curr) => acc + (curr.total || 0), 0),
                count: filtered.length
            };
        };

        setSummary({
            daily: calc(startOfDay).total, dailyCount: calc(startOfDay).count,
            weekly: calc(startOfWeek).total, weeklyCount: calc(startOfWeek).count,
            monthly: calc(startOfMonth).total, monthlyCount: calc(startOfMonth).count,
            yearly: calc(startOfYear).total, yearlyCount: calc(startOfYear).count,
        });
    };

    const Card = ({ title, amount, count, icon: Icon, color }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-4 opacity-10 ${color}`}><Icon size={64} /></div>
            <p className="text-gray-500 text-sm font-medium uppercase mb-2">{title}</p>
            <h3 className="text-3xl font-bold text-gray-800">Rp {amount.toLocaleString()}</h3>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Archive size={12} /> {count} Transaksi Berhasil
            </p>
        </div>
    );

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
                <h3 className="font-bold text-lg mb-4 text-gray-700">Detail Transaksi Masuk</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b">
                            <tr>
                                <th className="p-3">Waktu</th>
                                <th className="p-3">Order ID</th>
                                <th className="p-3">Pelanggan</th>
                                <th className="p-3 text-right">Subtotal</th>
                                <th className="p-3 text-right">Fee Admin</th>
                                <th className="p-3 text-right">Total Bersih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {orders.sort((a, b) => b.date - a.date).slice(0, 10).map((order, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-500">{order.date.toLocaleString()}</td>
                                    <td className="p-3 font-mono">{order.orderId}</td>
                                    <td className="p-3 font-bold">{order.customerName}</td>
                                    <td className="p-3 text-right">Rp {order.subTotal?.toLocaleString()}</td>
                                    <td className="p-3 text-right text-green-600">+ Rp {order.adminFee?.toLocaleString()}</td>
                                    <td className="p-3 text-right font-bold">Rp {order.total?.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="text-center text-gray-400 text-xs mt-4">Menampilkan 10 transaksi terakhir</p>
                </div>
            </div>
        </div>
    );
};

export default AdminReports;