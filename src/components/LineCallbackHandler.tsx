import React, { useEffect, useState } from 'react';
import { useDuty } from '../context/DutyContext';
import { CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export const LineCallbackHandler: React.FC = () => {
  const { loginWithLine } = useDuty();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  // 1. Listen for postMessage from popup window (if this is the parent window)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'LINE_LOGIN_SUCCESS' && event.data.profile) {
        const profile = event.data.profile;
        try {
          const res = await loginWithLine({
            lineUserId: profile.lineUserId,
            displayName: profile.displayName || 'LINE User',
            pictureUrl: profile.pictureUrl,
          });

          if (!res.isNewUser && res.user) {
            setStatus('success');
            setUserName(res.user.name || profile.displayName);
            setMessage(`เข้าสู่ระบบผ่าน LINE OA สำเร็จ! ยินดีต้อนรับคุณ ${res.user.name || profile.displayName}`);

            setTimeout(() => {
              setStatus('idle');
            }, 4000);
          } else {
            // New user: LineProfileSetupModal opens automatically
            setStatus('idle');
          }
        } catch (err: any) {
          console.warn('LINE login handling error:', err);
          setStatus('idle');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loginWithLine]);

  // 2. Handle OAuth authorization code callback in current window / popup window
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');

    if (!code) return;

    setStatus('loading');
    setMessage('กำลังตรวจสอบรหัสยืนยันตัวตนกับ LINE OA...');

    const redirectUri = `${window.location.origin}/auth/line/callback`;

    fetch('/api/line/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(async ({ ok, data }) => {
        if (ok && data.success) {
          const profile = {
            lineUserId: data.lineUserId,
            displayName: data.displayName || 'LINE User',
            pictureUrl: data.pictureUrl,
          };

          // If this is running in a popup window with an opener, post back to parent window & close popup
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage(
                { type: 'LINE_LOGIN_SUCCESS', profile },
                '*'
              );
              window.close();
              return;
            } catch (err) {
              console.warn('Failed to postMessage to opener:', err);
            }
          }

          // Otherwise handle login directly in this window
          const res = await loginWithLine(profile);

          if (!res.isNewUser && res.user) {
            setStatus('success');
            setUserName(res.user.name || data.displayName);
            setMessage(`เข้าสู่ระบบผ่าน LINE OA สำเร็จ! ยินดีต้อนรับคุณ ${res.user.name || data.displayName}`);

            // Clean URL params cleanly
            const cleanPath = window.location.pathname.replace('/auth/line/callback', '/');
            window.history.replaceState({}, document.title, cleanPath || '/');

            // Auto hide banner after 4 seconds
            setTimeout(() => {
              setStatus('idle');
            }, 4000);
          } else {
            // Clean URL params and open LineProfileSetupModal
            const cleanPath = window.location.pathname.replace('/auth/line/callback', '/');
            window.history.replaceState({}, document.title, cleanPath || '/');
            setStatus('idle');
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'ไม่สามารถยืนยันตัวตนกับ LINE ได้ กรุณาลองใหม่อีกครั้ง');
          const cleanPath = window.location.pathname.replace('/auth/line/callback', '/');
          window.history.replaceState({}, document.title, cleanPath || '/');
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ LINE: ' + err.message);
        const cleanPath = window.location.pathname.replace('/auth/line/callback', '/');
        window.history.replaceState({}, document.title, cleanPath || '/');
      });
  }, [loginWithLine]);

  if (status === 'idle') return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in slide-in-from-top-4 duration-300">
      <div
        className={`p-4 rounded-2xl shadow-2xl border-2 flex items-center gap-3.5 backdrop-blur-md ${
          status === 'loading'
            ? 'bg-white/95 text-neutral-800 border-emerald-400'
            : status === 'success'
            ? 'bg-emerald-600 text-white border-emerald-400'
            : 'bg-red-600 text-white border-red-400'
        }`}
      >
        {status === 'loading' && (
          <Loader2 className="w-6 h-6 text-[#06C755] animate-spin shrink-0" />
        )}
        {status === 'success' && (
          <CheckCircle2 className="w-6 h-6 text-white shrink-0 animate-bounce" />
        )}
        {status === 'error' && (
          <AlertCircle className="w-6 h-6 text-white shrink-0" />
        )}

        <div className="flex-1 text-xs">
          <div className="flex items-center gap-1.5 font-extrabold text-sm mb-0.5">
            <Sparkles className="w-4 h-4" />
            <span>
              {status === 'loading'
                ? 'LINE OA Authentication'
                : status === 'success'
                ? `ต้อนรับคุณ ${userName}`
                : 'ข้อผิดพลาดในการเข้าสู่ระบบ'}
            </span>
          </div>
          <p className="font-semibold opacity-95 leading-relaxed">{message}</p>
        </div>

        {status !== 'loading' && (
          <button
            onClick={() => setStatus('idle')}
            className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            ปิด
          </button>
        )}
      </div>
    </div>
  );
};
