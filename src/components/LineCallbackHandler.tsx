import React, { useEffect, useState } from 'react';
import { useDuty } from '../context/DutyContext';
import { CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { getApiUrl } from '../utils/apiUtils';
import { getActiveLineCallbackUrl } from '../utils/lineAuthUtils';

export const LineCallbackHandler: React.FC = () => {
  const { loginWithLine } = useDuty();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const handleProfileSuccess = async (profile: { lineUserId: string; displayName?: string; pictureUrl?: string }) => {
    try {
      setStatus('loading');
      setMessage('กำลังประมวลผลข้อมูลสมาชิก LINE...');
      const res = await loginWithLine({
        lineUserId: profile.lineUserId,
        displayName: profile.displayName || 'LINE User',
        pictureUrl: profile.pictureUrl,
      });

      if (!res.isNewUser && res.user) {
        setStatus('success');
        setUserName(res.user.name || profile.displayName || 'สมาชิก');
        setMessage(`เข้าสู่ระบบผ่าน LINE สำเร็จ! ยินดีต้อนรับคุณ ${res.user.name || profile.displayName}`);

        setTimeout(() => {
          setStatus('idle');
        }, 4000);
      } else {
        // New user: LineProfileSetupModal opens automatically in DutyContext
        setStatus('idle');
      }
    } catch (err: any) {
      console.warn('LINE login handling error:', err);
      setStatus('error');
      setMessage('ไม่สามารถเข้าสู่ระบบผ่าน LINE ได้: ' + (err.message || String(err)));
    }
  };

  // 1. Listen for postMessage from popup window, BroadcastChannel, and localStorage
  useEffect(() => {
    // A. postMessage handler
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'LINE_LOGIN_SUCCESS' && event.data.profile) {
        await handleProfileSuccess(event.data.profile);
      }
    };
    window.addEventListener('message', handleMessage);

    // B. BroadcastChannel handler
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('line_oauth_channel');
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'LINE_LOGIN_SUCCESS' && event.data.profile) {
          handleProfileSuccess(event.data.profile);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    // C. Storage listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'line_oauth_success' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.profile) {
            localStorage.removeItem('line_oauth_success');
            handleProfileSuccess(parsed.profile);
          }
        } catch (err) {
          console.warn('Failed to parse line_oauth_success from storage:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // D. Initial check on mount for localStorage item
    try {
      const stored = localStorage.getItem('line_oauth_success');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.profile && Date.now() - (parsed.ts || 0) < 60000) {
          localStorage.removeItem('line_oauth_success');
          handleProfileSuccess(parsed.profile);
        }
      }
    } catch (e) {
      console.warn('Failed to check initial line_oauth_success:', e);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [loginWithLine]);

  // 2. Handle line_login_profile redirect or OAuth code directly in current window
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const lineProfileParam = searchParams.get('line_login_profile');
    if (lineProfileParam) {
      try {
        const profile = JSON.parse(decodeURIComponent(lineProfileParam));
        if (profile && profile.lineUserId) {
          // Clean URL parameters cleanly
          const cleanSearch = window.location.search.replace(/([?&])line_login_profile=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
          window.history.replaceState({}, document.title, window.location.pathname + (cleanSearch ? '?' + cleanSearch : ''));
          handleProfileSuccess(profile);
          return;
        }
      } catch (err) {
        console.warn('Failed to parse line_login_profile from URL:', err);
      }
    }

    const code = searchParams.get('code');

    if (!code) return;

    setStatus('loading');
    setMessage('กำลังตรวจสอบรหัสยืนยันตัวตนกับ LINE OA...');

    const redirectUri = getActiveLineCallbackUrl();

    fetch(getApiUrl('/api/line/callback'), {
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

          // Clean URL parameters cleanly
          const cleanPath = window.location.pathname.replace('/auth/line/callback', '/');
          window.history.replaceState({}, document.title, cleanPath || '/');

          // If popup with opener, notify and close
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({ type: 'LINE_LOGIN_SUCCESS', profile }, '*');
              window.close();
              return;
            } catch (err) {
              console.warn('Failed to postMessage to opener:', err);
            }
          }

          await handleProfileSuccess(profile);
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
