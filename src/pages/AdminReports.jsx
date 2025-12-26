import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Calendar, TrendingUp, DollarSign, Archive, Loader2, AlertCircle, FileText, Filter, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminReports = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('00:00');
    const [endTime, setEndTime] = useState('23:59');

    const [summary, setSummary] = useState({
        totalRevenue: 0,
        totalTransactions: 0,
        averageOrderValue: 0
    });

    useEffect(() => {
        fetchReports();
    }, []);

    useEffect(() => {
        applyFilter();
    }, [allOrders, selectedDate, startTime, endTime]);

    const fetchReports = async () => {
        try {
            const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    ...d,
                    id: doc.id,
                    total: parseInt(d.total) || 0,
                    subTotal: parseInt(d.subTotal) || 0,
                    adminFee: parseInt(d.adminFee) || 0,
                    date: d.createdAt ? new Date(d.createdAt.seconds * 1000) : new Date(),
                    status: d.status || 'pending',
                    paymentStatus: d.paymentStatus || 'unpaid'
                };
            });

            const validData = data.filter(o => o.status === 'completed' || o.paymentStatus === 'paid');
            setAllOrders(validData);
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilter = () => {
        if (!selectedDate) return;

        const startDateTime = new Date(`${selectedDate}T${startTime}:00`);
        const endDateTime = new Date(`${selectedDate}T${endTime}:59`);

        const result = allOrders.filter(o => {
            return o.date >= startDateTime && o.date <= endDateTime;
        });

        setFilteredOrders(result);

        const totalRev = result.reduce((acc, curr) => acc + curr.total, 0);
        setSummary({
            totalRevenue: totalRev,
            totalTransactions: result.length,
            averageOrderValue: result.length > 0 ? totalRev / result.length : 0
        });
    };

    const downloadPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Laporan Keuangan Harian - Taki Coffee & Eatery", 14, 20);

        doc.setFontSize(10);
        doc.text(`Tanggal: ${new Date(selectedDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}`, 14, 28);
        doc.text(`Waktu Filter: ${startTime} s/d ${endTime}`, 14, 34);
        doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 40);

        doc.setDrawColor(200);
        doc.setFillColor(245, 247, 250);
        doc.rect(14, 46, 180, 25, 'F');

        doc.setFontSize(12);
        doc.text(`Total Omzet: Rp ${summary.totalRevenue.toLocaleString('id-ID')}`, 20, 56);
        doc.text(`Total Transaksi: ${summary.totalTransactions}`, 20, 64);

        const tableColumn = ["No", "Jam", "Order ID", "Pelanggan", "Metode", "Total"];
        const tableRows = [];

        filteredOrders.forEach((order, index) => {
            const row = [
                index + 1,
                order.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                order.orderId,
                order.customerName || 'Guest',
                order.paymentMethod,
                `Rp ${order.total.toLocaleString('id-ID')}`
            ];
            tableRows.push(row);
        });

        autoTable(doc, {
            startY: 76,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [234, 88, 12] },
            styles: { fontSize: 8 }
        });

        const finalY = (doc.lastAutoTable?.finalY || 76) + 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`GRAND TOTAL: Rp ${summary.totalRevenue.toLocaleString('id-ID')}`, 140, finalY, { align: 'right' });

        doc.save(`Laporan_Harian_${selectedDate}_${startTime}-${endTime}.pdf`);
    };

    if (loading) return (
        <div className="flex flex-col h-screen items-center justify-center gap-2">
            <Loader2 className="animate-spin text-orange-600" size={32} />
            <p className="text-gray-400 text-sm">Memuat Data Laporan...</p>
        </div>
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="text-green-600" /> Laporan Keuangan & Transaksi
                </h1>
                <button onClick={downloadPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition">
                    <FileText size={18} /> Download PDF (Filtered)
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center flex-wrap">
                    <div className="flex items-center gap-2 text-gray-700 font-bold mr-2">
                        <Filter size={18} /> Filter Waktu:
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">Tanggal</label>
                        <div className="flex items-center gap-2 border p-2 rounded-lg bg-gray-50">
                            <Calendar size={16} className="text-gray-400" />
                            <input
                                type="date"
                                className="bg-transparent outline-none text-sm font-medium"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">Jam Mulai</label>
                        <div className="flex items-center gap-2 border p-2 rounded-lg bg-gray-50">
                            <Clock size={16} className="text-gray-400" />
                            <input
                                type="time"
                                className="bg-transparent outline-none text-sm font-medium"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">Jam Selesai</label>
                        <div className="flex items-center gap-2 border p-2 rounded-lg bg-gray-50">
                            <Clock size={16} className="text-gray-400" />
                            <input
                                type="time"
                                className="bg-transparent outline-none text-sm font-medium"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500"><DollarSign size={64} /></div>
                    <p className="text-gray-500 text-sm font-medium uppercase mb-2">Total Omzet</p>
                    <h3 className="text-3xl font-bold text-gray-800">Rp {summary.totalRevenue.toLocaleString('id-ID')}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-orange-500"><Archive size={64} /></div>
                    <p className="text-gray-500 text-sm font-medium uppercase mb-2">Total Transaksi</p>
                    <h3 className="text-3xl font-bold text-gray-800">{summary.totalTransactions} Order</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-green-500"><TrendingUp size={64} /></div>
                    <p className="text-gray-500 text-sm font-medium uppercase mb-2">Rata-rata Order</p>
                    <h3 className="text-3xl font-bold text-gray-800">Rp {summary.averageOrderValue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</h3>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-bold text-lg mb-4 text-gray-700 flex justify-between items-center">
                    <span>Detail Transaksi Harian</span>
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">{filteredOrders.length} Data Ditampilkan</span>
                </h3>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b sticky top-0 z-10">
                            <tr>
                                <th className="p-3">Jam</th>
                                <th className="p-3">Order ID</th>
                                <th className="p-3">Pelanggan</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Subtotal</th>
                                <th className="p-3 text-right">Fee</th>
                                <th className="p-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle size={24} />
                                            <span>Tidak ada transaksi pada rentang waktu ini.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-500">{order.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="p-3 font-mono font-bold text-orange-600">{order.orderId}</td>
                                        <td className="p-3 font-medium">{order.customerName || 'Guest'}</td>
                                        <td className="p-3">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">Rp {order.subTotal?.toLocaleString('id-ID')}</td>
                                        <td className="p-3 text-right text-green-600">+ Rp {order.adminFee?.toLocaleString('id-ID')}</td>
                                        <td className="p-3 text-right font-bold">Rp {order.total?.toLocaleString('id-ID')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminReports;