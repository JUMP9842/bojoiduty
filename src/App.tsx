import React, { useState } from 'react';
import { DutyProvider } from './context/DutyContext';
import { Header } from './components/Header';
import { AnnouncementBoard } from './components/AnnouncementBoard';
import { CalendarView } from './components/CalendarView';
import { MyScheduleSection } from './components/MyScheduleSection';
import { ActivityHistorySection } from './components/ActivityHistorySection';
import { BackendModal } from './components/BackendModal';
import { SwapModal } from './components/SwapModal';
import { AuthModal } from './components/AuthModal';
import { DeviceVerificationModal } from './components/DeviceVerificationModal';
import { LineCallbackHandler } from './components/LineCallbackHandler';
import { LineProfileSetupModal } from './components/LineProfileSetupModal';
import { LineFriendModal } from './components/LineFriendModal';
import { useDuty } from './context/DutyContext';

function MainApp() {
  const { isLineFriendModalOpen, closeLineFriendModal, currentUser } = useDuty();
  const [isBackendOpen, setIsBackendOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  // Swap prefill data
  const [swapPrefill, setSwapPrefill] = useState<{
    fromDate?: string;
    fromShiftPart?: 'morning' | 'evening' | 'full_day' | 'bathing';
    toUserId?: string;
    toDate?: string;
  }>({});

  const handleOpenSwapModal = (
    fromDate?: string,
    fromShiftPart: 'morning' | 'evening' | 'full_day' | 'bathing' = 'morning',
    toUserId?: string,
    toDate?: string
  ) => {
    setSwapPrefill({
      fromDate,
      fromShiftPart,
      toUserId,
      toDate,
    });
    setIsSwapModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-neutral-800 flex flex-col selection:bg-[#FFC067] selection:text-neutral-950">
      {/* LINE OAuth Callback Handler */}
      <LineCallbackHandler />

      {/* LINE Profile Setup Modal for initial signup */}
      <LineProfileSetupModal />

      {/* Device Verification Modal on New Devices */}
      <DeviceVerificationModal />

      {/* Top Header */}
      <Header
        onOpenBackend={() => setIsBackendOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Top: Announcements Board */}
        <AnnouncementBoard />

        {/* Center: Main Booking Calendar with Quota & Multi-selection */}
        <CalendarView
          onOpenSwapWithDate={(date, toUserId) =>
            handleOpenSwapModal(date, 'morning', toUserId)
          }
        />

        {/* Section 2: Personal Schedule & My Shifts */}
        <MyScheduleSection
          onOpenSwap={(fromDate, fromPart) =>
            handleOpenSwapModal(fromDate, fromPart)
          }
        />

        {/* Bottom: Activity Log / History */}
        <ActivityHistorySection />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#FFC067]/40 py-6 text-center text-xs text-neutral-400 bg-white/60">
        <p className="max-w-md mx-auto">
          BojoiDuty &bull; Dog Care Duty Management System
        </p>
      </footer>

      {/* Modals */}
      <BackendModal
        isOpen={isBackendOpen}
        onClose={() => setIsBackendOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        prefillFromDate={swapPrefill.fromDate}
        prefillFromShiftPart={swapPrefill.fromShiftPart}
        prefillToUserId={swapPrefill.toUserId}
        prefillToDate={swapPrefill.toDate}
      />

      <LineFriendModal
        isOpen={isLineFriendModalOpen}
        onClose={closeLineFriendModal}
        userName={currentUser?.nickname || currentUser?.name || currentUser?.username}
      />
    </div>
  );
}

export default function App() {
  return (
    <DutyProvider>
      <MainApp />
    </DutyProvider>
  );
}
