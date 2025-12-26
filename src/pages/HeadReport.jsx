import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { LayoutDashboard, FileText, Database, TrendingUp, CreditCard, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeadReport = () => {
    const [stats, setStats] = useState({ daily: 0, adminFeeTotal: 0, trxCount: 0 });

    useEffect(() => {
        const fetchReport = async () => {
            const q = query(collection(db, "orders"));
            const snapshot = await getDocs(q);

            let totalOmzet = 0;
            let totalFees = 0;
            let count = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.paymentStatus === 'paid') {
                    totalOmzet += (data.total || 0);
                    totalFees += (data.uniqueCode || 0);
                    count++;
                }
            });

            setStats({
                daily: totalOmzet,
                adminFeeTotal: totalFees,
                trxCount: count
            });
        };
        fetchReport();
    }, []);

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <LayoutDashboard className="text-orange-600" size={32} />
                        DASHBOARD EKSEKUTIF
                    </h1>
                    <p className="text-gray-500 mt-1">Ringkasan operasional dan akses cepat manajemen toko.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                        <div className="bg-blue-100 p-4 rounded-2xl text-blue-600"><TrendingUp size={28} /></div>
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Omzet</p>
                            <h2 className="text-2xl font-black text-slate-800">Rp {stats.daily.toLocaleString()}</h2>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                        <div className="bg-green-100 p-4 rounded-2xl text-green-600"><CreditCard size={28} /></div>
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Unique Code Revenue</p>
                            <h2 className="text-2xl font-black text-slate-800">Rp {stats.adminFeeTotal.toLocaleString()}</h2>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                        <div className="bg-purple-100 p-4 rounded-2xl text-purple-600"><ShoppingBag size={28} /></div>
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Transaksi</p>
                            <h2 className="text-2xl font-black text-slate-800">{stats.trxCount} Order</h2>
                        </div>
                    </div>
                </div>

                <h3 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-widest">Menu Navigasi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link to="/head/history" className="group bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:border-orange-500 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 text-gray-50 group-hover:text-orange-50 transition-colors">
                            <FileText size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="bg-orange-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
                                <FileText size={24} />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 mb-2">Riwayat Order</h4>
                            <p className="text-gray-500 text-sm mb-6 max-w-[240px]">Lihat, filter, detail, dan export PDF seluruh transaksi pelanggan.</p>
                            <div className="flex items-center gap-2 text-orange-600 font-bold text-sm">
                                Buka Riwayat <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    <Link to="/head/database" className="group bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:border-blue-500 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 text-gray-50 group-hover:text-blue-50 transition-colors">
                            <Database size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                                <Database size={24} />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 mb-2">Manajemen Database</h4>
                            <p className="text-gray-500 text-sm mb-6 max-w-[240px]">Akses data mentah User, Produk, dan Order serta export ke Excel.</p>
                            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                                Buka Database <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default HeadReport;