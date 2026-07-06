import React from 'react';

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-6">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-md text-center">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Login Portal MACE</h2>
        <p className="text-gray-500 text-sm mt-2">Sila log masuk untuk memulakan pembelajaran.</p>
        <div className="mt-8">
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-md">
            Log Masuk (Contoh)
          </button>
        </div>
      </div>
    </div>
  );
}
