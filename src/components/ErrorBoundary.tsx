import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component Tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-amber-200 max-w-md w-full">
            <div className="text-5xl mb-4">🐶⚠️</div>
            <h1 className="text-xl font-bold text-amber-900 mb-2">เกิดข้อผิดพลาดในการแสดงผล</h1>
            <p className="text-sm text-neutral-600 mb-6">
              {this.state.error?.message || 'ระบบเกิดข้อผิดพลาดชั่วคราว กรุณากดปุ่มด้านล่างเพื่อรีโหลดหน้าเว็บ'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow transition"
            >
              🔄 โหลดหน้าเว็บใหม่ (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
