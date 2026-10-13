import React from 'react';
import { useDuty } from '../context/DutyContext';
import { Settings, LogOut, MessageSquare } from 'lucide-react';
import { triggerLineLogin } from '../utils/lineAuthUtils';

interface HeaderProps {
  onOpenBackend: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBackend,
  onOpenAuth,
}) => {
  const { currentUser, logout } = useDuty();

  const handleLineClick = () => {
    triggerLineLogin(onOpenAuth);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#FFC067]/60 px-4 sm:px-8 py-3 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand: BojoiDuty */}
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-neutral-900">
              BojoiDuty
            </h1>
          </div>
        </div>

        {/* User Auth & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            /* Logged-in User Badge & Actions */
            <div className="flex items-center bg-[#FFF8EE] p-1 rounded-xl border border-[#FFC067]/70 shadow-xs">
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-neutral-900 shadow-xs border border-[#FFC067]/50 text-xs font-semibold cursor-pointer hover:border-[#FFC067] transition-colors"
                onClick={onOpenAuth}
                title="คลิกเพื่อแก้ไขโปรไฟล์"
              >
                <span className="text-sm">{currentUser.icon || '🐶'}</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentUser.color }}
                />
                <span className="font-bold">{currentUser.username || currentUser.name}</span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-600 hover:text-red-600 hover:bg-white/80 rounded-lg transition-colors ml-1 font-semibold cursor-pointer"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ออก</span>
              </button>
            </div>
          ) : (
            /* Unauthenticated State: Single Login LINE button */
            <button
              type="button"
              onClick={handleLineClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#06C755] hover:bg-[#00B900] active:scale-95 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer border border-emerald-600 hover:shadow-md"
              title="Login LINE"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-white" />
              <span>Login LINE</span>
            </button>
          )}

          {/* Backend / Admin Settings Icon in Swap Duty tone */}
          <button
            type="button"
            onClick={onOpenBackend}
            title="Admin Center"
            className="p-2 rounded-xl bg-[#FFF8EE] hover:bg-[#FFC067]/40 active:bg-[#FFC067]/60 text-neutral-950 border border-[#FFC067]/70 transition-all shadow-xs flex items-center justify-center group cursor-pointer font-bold"
          >
            <Settings className="w-4 h-4 text-neutral-950 group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </header>
  );
};
