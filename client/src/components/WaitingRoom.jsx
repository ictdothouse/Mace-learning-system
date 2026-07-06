import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function WaitingRoom({ queueData, onEnter, lang }) {
  const [countdown, setCountdown] = useState(15);
  const [status, setStatus] = useState(queueData);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let tickTimer;
    if (!checking && !status.success) {
      tickTimer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(tickTimer);
            checkQueueStatus();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(tickTimer);
  }, [checking, status.success]);

  const checkQueueStatus = async () => {
    setChecking(true);
    try {
      const res = await axios.get('/api/queue-status');
      const data = res.data;
      if (data.canEnter) {
        setStatus({ ...data, success: true });
        setTimeout(() => {
          onEnter();
        }, 1500);
      } else {
        setStatus(data);
        setCountdown(15);
        setChecking(false);
      }
    } catch (err) {
      console.error('Queue check error:', err);
      setCountdown(15);
      setChecking(false);
    }
  };

  const pct = Math.round(((15 - countdown) / 15) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 text-center backdrop-blur-xl shadow-2xl animate-fade-in">
        
        <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold px-4 py-1.5 rounded-full mb-8 tracking-wide">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          {lang === 'en' ? 'You are in the Queue' : 'Anda dalam Barisan'}
        </div>

        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-6 relative group">
          <div className="absolute inset-[-4px] rounded-full border-2 border-transparent bg-gradient-to-br from-blue-500 to-indigo-500 [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:destination-out] animate-[spin_3s_linear_infinite]"></div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 6v6l4 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5"/>
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-100 mb-3 leading-tight">
          {lang === 'en' ? "Almost There! You're in the Queue" : "Hampir Sampai! Anda dalam Barisan"}
        </h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          {lang === 'en'
            ? 'Our system is managing access to ensure a smooth and stable experience for all athletes. You will be admitted automatically when a slot opens.'
            : 'Sistem kami sedang mengurus akses untuk memastikan pengalaman yang lancar dan stabil untuk semua atlet. Anda akan dimasukkan secara automatik apabila slot tersedia.'}
        </p>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 mb-8">
          <div className="text-[52px] font-black text-blue-400 leading-none mb-1 tabular-nums tracking-tight">
            {status.queuePosition > 0 ? status.queuePosition : '...'}
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            {lang === 'en' ? 'Your position in queue' : 'Kedudukan anda dalam barisan'}
          </div>
          
          <div className="flex justify-between gap-3">
            <div className="flex-1 bg-white/5 rounded-xl p-3">
              <div className="text-lg font-bold text-slate-200">
                {status.estimatedWaitSeconds ? Math.ceil(status.estimatedWaitSeconds / 60) : '~'} min
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">
                {lang === 'en' ? 'Est. wait' : 'Anggaran'}
              </div>
            </div>
            <div className="flex-1 bg-white/5 rounded-xl p-3">
              <div className="text-lg font-bold text-slate-200">
                {status.activeCount || '~'}/200
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">
                {lang === 'en' ? 'Active' : 'Aktif'}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: status.success ? '100%' : `${pct}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className={`font-medium ${status.success ? 'text-emerald-400' : 'text-slate-400'}`}>
              {status.success
                ? (lang === 'en' ? '? Slot available! Redirecting you now...' : '? Slot tersedia! Mengalihkan anda sekarang...')
                : checking
                  ? (lang === 'en' ? 'Checking for available slots...' : 'Menyemak slot yang tersedia...')
                  : (lang === 'en' ? 'Still waiting for a slot...' : 'Masih menunggu slot...')}
            </span>
            {!status.success && !checking && (
              <span className="text-slate-500 font-mono">
                {lang === 'en' ? 'Check in ' : 'Semak dalam '} {countdown}s
              </span>
            )}
          </div>
        </div>

        <div className="text-left bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-3">
            {lang === 'en' ? 'While you wait...' : 'Semasa menunggu...'}
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-400 mb-2">
            <span className="text-emerald-400">?</span>
            <span>{lang === 'en' ? 'Your data and progress are safe. No need to re-register.' : 'Data dan kemajuan anda selamat. Tidak perlu daftar semula.'}</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-400 mb-2">
            <span className="text-blue-400">??</span>
            <span>{lang === 'en' ? 'The system will automatically let you in when your turn comes.' : 'Sistem akan memasukkan secara automatik apabila giliran tiba.'}</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-400">
            <span className="text-rose-400">??</span>
            <span>{lang === 'en' ? 'Please do not close or refresh this page.' : 'Sila jangan tutup atau muat semula halaman ini.'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
