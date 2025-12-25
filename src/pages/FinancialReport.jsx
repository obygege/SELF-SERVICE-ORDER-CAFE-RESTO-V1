import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { FileBarChart, Calendar } from 'lucide-react';

const FinancialReport = () => {
    const { currentUser } = useAuth();
    const role = currentUser?.role;

    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, cash: 0, qris: 0 });

    useEffect(() => {
        fetchReport();
    }, [startDate, endDate]);

    const fetchReport = async () => {
        let start = new Date(startDate);
        let end = new Date(endDate);

        if (role === 'admin') {
            start = new Date(); // Force Today
            end = new Date();   // Force Today
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const q = query(
            collection(db, "orders"),
            where("createdAt", ">=", start),
            where("createdAt", "<=", end),
            where("paymentStatus", "==", "paid"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data());
        setReportData(data);

        const totalIncome = data.reduce((acc, curr) => acc + curr.total, 0);
        const cash = data.filter(o => o.paymentMethod === 'Cash').reduce((acc, curr) => acc + curr.total, 0);
        const qris = data.filter(o => o.paymentMethod === 'QRIS Transfer').reduce((acc, curr) => acc + curr.total, 0);

        setSummary({ totalIncome, cash, qris });
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileBarChart className="text-orange-600" /> Laporan Keuangan
                </h1>

                {(role === 'manager' || role === 'head') ? (
                    <div className="flex gap-2 items-center bg-white p-2 rounded-xl shadow-sm border">
                        <Calendar size={18} className="text-gray-500" />
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="outline-none text-sm" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="outline-none text-sm" />
                    </div>
                ) : (
                    <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold border border-orange-200">
                        View: Hari Ini (Admin)
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
                    <p className="text-slate-400 text-sm mb-1">Total Pendapatan</p>
                    <h2 className="text-3xl font-bold">Rp {summary.totalIncome.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">QRIS</p>
                    <h2 className="text-2xl font-bold text-blue-600">Rp {summary.qris.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Tunai</p>
                    <h2 className="text-2xl font-bold text-green-600">Rp {summary.cash.toLocaleString()}</h2>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">Rincian Transaksi</div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                        <tr>
                            <th className="p-3">ID Trx</th>
                            <th className="p-3">Waktu</th>
                            <th className="p-3">Metode</th>
                            <th className="p-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((item, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono">{item.orderId}</td>
                                <td className="p-3">{new Date(item.createdAt.seconds * 1000).toLocaleTimeString()}</td>
                                <td className="p-3"><span className="px-2 py-1 rounded bg-gray-100 text-xs font-bold">{item.paymentMethod}</span></td>
                                <td className="p-3 text-right font-bold">Rp {item.total.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinancialReport;