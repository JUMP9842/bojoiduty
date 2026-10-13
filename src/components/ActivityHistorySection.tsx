import React, { useState } from 'react';
import { useDuty } from '../context/DutyContext';
import {
  History,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  Megaphone,
  Bath,
  Calendar,
  Sparkles,
  Filter,
} from 'lucide-react';
import { ActivityLog } from '../types';

export const ActivityHistorySection: React.FC = () => {
  const { activityLogs, users } = useDuty();
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');

  const filteredLogs = activityLogs.filter((log) => {
    if (selectedUserFilter === 'all') return true;
    return log.userId === selectedUserFilter;
  });

  const getActionIcon = (type: ActivityLog['actionType']) => {
    switch (type) {
      case 'book_shift':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'cancel_shift':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'swap_request':
      case 'swap_accept':
      case 'swap_decline':
        return <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />;
      case 'announcement_create':
      case 'announcement_delete':
        return <Megaphone className="w-3.5 h-3.5 text-purple-600" />;
      case 'bathing_update':
        return <Bath className="w-3.5 h-3.5 text-sky-600" />;
      case 'auto_distribute':
        return <Sparkles className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Calendar className="w-3.5 h-3.5 text-neutral-500" />;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <section className="mt-10 pt-8 border-t border-neutral-200/80">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FFC067] text-neutral-950 flex items-center justify-center text-xs shadow-xs border border-[#F5B153] font-bold">
            <History className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-neutral-900 uppercase">
            Activity History
          </h2>
        </div>

        {/* Filter by user */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#FFC067]/60 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="text-xs text-neutral-700 bg-transparent border-none focus:outline-hidden font-medium"
            >
              <option value="all">All Members ({activityLogs.length})</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.icon} {u.username || u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Feed */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            No activity records found
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
            {filteredLogs.map((log) => {
              const userObj = users.find((u) => u.id === log.userId);
              return (
                <div
                  key={log.id}
                  className="px-4 sm:px-5 py-3 flex items-start sm:items-center justify-between gap-3 hover:bg-[#FFF8EE]/40 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      {getActionIcon(log.actionType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{userObj?.icon || '🐶'}</span>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: userObj?.color || '#6B7280' }}
                        />
                        <span className="text-xs font-semibold text-neutral-900">
                          {log.userName}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 mt-0.5">{log.description}</p>
                    </div>
                  </div>

                  <span className="text-[11px] text-neutral-400 font-medium whitespace-nowrap self-start sm:self-auto shrink-0">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
