import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const HeadReport = () => {
    const [stats, setStats] = useState({ daily: 0, monthly: 0, adminFeeTotal: 0 });

    useEffect(() => {
        const fetchReport = async () => {
            // Dalam aplikasi nyata, gunakan query 'where' dengan tanggal spesifik
            // Di sini kita ambil semua untuk demo kalkulasi
            const q = query(collection(db, "orders"));
            const snapshot = await getDocs(q);

            let totalOmzet = 0;
            let totalFees = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                totalOmzet += data.total;
                totalFees += (data.adminFee || 0);
            });

            setStats({
                daily: totalOmzet, // Simplifikasi untuk demo
                monthly: totalOmzet,
                adminFeeTotal: totalFees
            });
        };
        fetchReport();
    }, []);

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Laporan Eksekutif</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-blue-500">
                    <p className="text-gray-500 text-sm">Total Omzet (Kotor)</p>
                    <h2 className="text-3xl font-bold text-gray-800">Rp {stats.daily.toLocaleString()}</h2>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-green-500">
                    <p className="text-gray-500 text-sm">Pendapatan Admin (App Fee)</p>
                    <h2 className="text-3xl font-bold text-green-600">Rp {stats.adminFeeTotal.toLocaleString()}</h2>
                    <p className="text-xs text-gray-400 mt-2">*Rp 500 per transaksi</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-purple-500">
                    <p className="text-gray-500 text-sm">Total Transaksi</p>
                    <h2 className="text-3xl font-bold text-gray-800">{stats.adminFeeTotal / 500}x</h2>
                </div>
            </div>

            {/* Chart Diagram bisa ditambahkan disini menggunakan Recharts */}
            <div className="mt-8 bg-white p-6 rounded-xl shadow-sm">
                <h3 className="font-bold mb-4">Grafik Penjualan</h3>
                <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-400">


                    [Image of Sales Chart Placeholder]

                </div>
            </div>
        </div>
    );
};

export default HeadReport;