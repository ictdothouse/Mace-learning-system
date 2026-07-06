import React from 'react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Dashboard Atlet</h1>
            <p className="text-gray-500 text-sm mt-1">Pantau kemajuan pembelajaran anda di sini.</p>
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
            Keluar
          </button>
        </header>
        
        <main className="bg-white rounded-3xl p-8 border border-gray-100 shadow-md">
          <p className="text-gray-600">Selamat datang ke portal MACE. Pembelajaran anda akan dipaparkan di sini.</p>
        </main>
      </div>
    </div>
  );
}
