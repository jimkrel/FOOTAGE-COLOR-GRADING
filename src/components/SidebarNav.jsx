import React from 'react';
import {
  Film,
  FolderOpen,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Folder,
  Layers,
  Sparkles
} from 'lucide-react';
import { ISSUE_THEME } from '../theme/tokens.js';

export default function SidebarNav({
  clips = [],
  folderPath = '',
  activeFilter = 'all',
  onSelectFilter,
  onSelectFolder,
  onSelectFiles,
  onRefresh,
  isScanning = false,
  className = ''
}) {
  // Statistics calculations
  const totalClips = clips.length;
  const analyzedClips = clips.filter(c => c.isAnalyzed);
  const unanalyzedClips = clips.filter(c => !c.isAnalyzed);
  const warningClips = analyzedClips.filter(c => (c.stats?.issuePercentage || 0) > 15);

  // Calculate issue counts
  const issueCounts = {
    normal: 0,
    overexposed: 0,
    underexposed: 0,
    cool_cast: 0,
    warm_cast: 0
  };

  analyzedClips.forEach(clip => {
    if (clip.dominantIssue && issueCounts[clip.dominantIssue] !== undefined) {
      issueCounts[clip.dominantIssue]++;
    } else if (clip.stats?.issuePercentage <= 15) {
      issueCounts.normal++;
    } else if (clip.segments && clip.segments.length > 0) {
      const dominant = clip.segments.find(s => s.issueType !== 'normal')?.issueType || 'normal';
      if (issueCounts[dominant] !== undefined) {
        issueCounts[dominant]++;
      }
    }
  });

  // Calculate total storage
  const totalBytes = clips.reduce((acc, c) => acc + (c.fileSize || 0), 0);
  const formatTotalSize = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  // Nav Item Component
  const NavItem = ({ id, label, icon: Icon, count, dotColor }) => {
    const isActive = activeFilter === id;
    return (
      <button
        onClick={() => onSelectFilter(id)}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition select-none text-left cursor-pointer group ${
          isActive
            ? 'bg-cyan-500/15 text-cyan-300 font-medium border border-cyan-500/30 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {dotColor ? (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: dotColor }}
            />
          ) : Icon ? (
            <Icon
              size={14}
              className={`shrink-0 ${
                isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
              }`}
            />
          ) : null}
          <span className="truncate">{label}</span>
        </div>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
            isActive
              ? 'bg-cyan-500/25 text-cyan-200 font-bold'
              : 'bg-slate-900 text-slate-500 group-hover:text-slate-400 border border-slate-800/80'
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <aside className={`w-56 h-full bg-[#0a0d16] border-r border-[#1a2337] flex flex-col justify-between shrink-0 select-none overflow-hidden ${className}`}>
      {/* Top Header & Navigation Tree */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar p-3 space-y-4">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#1a2337]/80">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
            <Layers size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black tracking-wider text-slate-100 uppercase truncate">
              FOOTAGE STUDIO
            </div>
            <div className="text-[10px] text-slate-500 truncate font-medium">
              Thư viện màu & footage
            </div>
          </div>
        </div>

        {/* Quick Actions (Add file & folder buttons) */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            onClick={onSelectFiles}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 text-[11px] font-medium transition cursor-pointer active:scale-95 shadow-xs"
            title="Thêm một hoặc nhiều file video riêng lẻ"
          >
            <Plus size={13} className="text-cyan-400" />
            <span>Thêm file</span>
          </button>
          <button
            onClick={onSelectFolder}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 text-[11px] font-medium transition cursor-pointer active:scale-95 shadow-xs"
            title="Chọn thư mục video (quét đệ quy)"
          >
            <FolderOpen size={13} className="text-cyan-400" />
            <span>Thư mục</span>
          </button>
        </div>

        {/* SECTION 1: KHÔNG GIAN CỦA BẠN */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 pb-1">
            Không gian của bạn
          </div>
          <NavItem
            id="all"
            label="Tất cả footage"
            icon={Film}
            count={totalClips}
          />
          <NavItem
            id="analyzed"
            label="Đã phân tích"
            icon={CheckCircle2}
            count={analyzedClips.length}
          />
          <NavItem
            id="unanalyzed"
            label="Chưa phân tích"
            icon={Clock}
            count={unanalyzedClips.length}
          />
          <NavItem
            id="warning"
            label="Có cảnh báo màu"
            icon={AlertTriangle}
            count={warningClips.length}
          />
        </div>

        {/* SECTION 2: PHÂN LOẠI MÀU SẮC */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 pb-1">
            Phân loại màu sắc
          </div>
          <NavItem
            id="normal"
            label="Cân bằng tốt"
            dotColor={ISSUE_THEME.normal.bg}
            count={issueCounts.normal}
          />
          <NavItem
            id="overexposed"
            label="Cháy sáng (Over)"
            dotColor={ISSUE_THEME.overexposed.bg}
            count={issueCounts.overexposed}
          />
          <NavItem
            id="underexposed"
            label="Thiếu sáng (Under)"
            dotColor={ISSUE_THEME.underexposed.bg}
            count={issueCounts.underexposed}
          />
          <NavItem
            id="cool_cast"
            label="Ám xanh (Cool)"
            dotColor={ISSUE_THEME.cool_cast.bg}
            count={issueCounts.cool_cast}
          />
          <NavItem
            id="warm_cast"
            label="Ám vàng (Warm)"
            dotColor={ISSUE_THEME.warm_cast.bg}
            count={issueCounts.warm_cast}
          />
        </div>

        {/* SECTION 3: THƯ MỤC THEO DÕI */}
        {folderPath && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 pb-1">
              <span>Thư mục theo dõi</span>
              <button
                onClick={onRefresh}
                disabled={isScanning}
                className="hover:text-cyan-400 transition cursor-pointer"
                title="Quét lại thư mục"
              >
                <RefreshCw size={11} className={isScanning ? 'animate-spin text-cyan-400' : ''} />
              </button>
            </div>
            <div
              className="px-2.5 py-1.5 rounded-md bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2 group cursor-pointer hover:border-slate-700"
              onClick={onRefresh}
              title={folderPath}
            >
              <Folder size={13} className="text-cyan-400 shrink-0" />
              <span className="truncate font-mono text-[10px] flex-1">
                {folderPath.split(/[/\\]/).pop() || folderPath}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Đang theo dõi tự động" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer: Library Storage Info */}
      <div className="p-3 border-t border-[#1a2337] bg-[#070910]/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span className="text-[10px]">Dung lượng thư viện</span>
        <span className="text-slate-300 font-semibold">{formatTotalSize(totalBytes)}</span>
      </div>
    </aside>
  );
}
