import React from 'react';
import { Loader2, AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

/**
 * Standardized 3-state render component (Loading / Empty / Error).
 * Every async component (ClipList, PlayerPanel, ColorTimeline) MUST use these states.
 */

export function LoadingView({ message = 'Đang tải dữ liệu...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center text-slate-400 select-none ${className}`}>
      <Loader2 size={24} className="animate-spin text-cyan-400 mb-2.5" />
      <span className="text-xs font-medium text-slate-300">{message}</span>
    </div>
  );
}

export function EmptyView({
  icon: Icon = Inbox,
  title = 'Không có dữ liệu',
  description = 'Chưa có thông tin hoặc nội dung cần hiển thị.',
  actionText,
  onAction,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center text-slate-400 select-none ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
        <Icon size={24} />
      </div>
      <div className="text-xs font-semibold text-slate-200">{title}</div>
      {description && <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed">{description}</p>}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-3.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export function ErrorView({
  title = 'Đã xảy ra lỗi',
  message = 'Không thể nạp hoặc xử lý dữ liệu.',
  onRetry,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center text-red-400 select-none ${className}`}>
      <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-2.5">
        <AlertTriangle size={20} />
      </div>
      <div className="text-xs font-semibold text-red-300">{title}</div>
      <p className="text-[11px] text-slate-400 max-w-xs mt-1 mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
        >
          <RefreshCw size={12} />
          <span>Thử lại</span>
        </button>
      )}
    </div>
  );
}
