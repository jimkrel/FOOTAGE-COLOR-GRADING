import React, { useState } from 'react';
import { X, Check, Sliders, RotateCcw, AlertCircle } from 'lucide-react';
import { PRESETS, DEFAULT_THRESHOLDS } from '../../analysis-engine/thresholdConfig.js';

export default function ThresholdSettings({
  isOpen,
  onClose,
  thresholds = DEFAULT_THRESHOLDS,
  onChangeThresholds,
  activePreset = 'standard',
  onSelectPreset,
  onReanalyzeCurrent
}) {
  const [validationError, setValidationError] = useState(null);

  if (!isOpen) return null;

  const handlePresetClick = (key) => {
    setValidationError(null);
    const preset = PRESETS[key];
    if (preset) {
      if (onSelectPreset) onSelectPreset(key);
      if (onChangeThresholds) {
        onChangeThresholds({
          yOver: preset.yOver,
          yUnder: preset.yUnder,
          castThresholdPercent: preset.castThresholdPercent
        });
      }
    }
  };

  const handleYOverChange = (val) => {
    const num = parseInt(val, 10);
    if (num <= thresholds.yUnder + 15) {
      setValidationError('Ngưỡng Cháy sáng (Y Over) phải lớn hơn Ngưỡng Thiếu sáng ít nhất 15 đơn vị.');
      return;
    }
    setValidationError(null);
    if (onSelectPreset) onSelectPreset('custom');
    if (onChangeThresholds) onChangeThresholds({ ...thresholds, yOver: num });
  };

  const handleYUnderChange = (val) => {
    const num = parseInt(val, 10);
    if (num >= thresholds.yOver - 15) {
      setValidationError('Ngưỡng Thiếu sáng (Y Under) phải nhỏ hơn Ngưỡng Cháy sáng ít nhất 15 đơn vị.');
      return;
    }
    setValidationError(null);
    if (onSelectPreset) onSelectPreset('custom');
    if (onChangeThresholds) onChangeThresholds({ ...thresholds, yUnder: num });
  };

  const handleCastThresholdChange = (val) => {
    const num = parseFloat(val);
    setValidationError(null);
    if (onSelectPreset) onSelectPreset('custom');
    if (onChangeThresholds) onChangeThresholds({ ...thresholds, castThresholdPercent: num });
  };

  const resetToDefault = () => {
    handlePresetClick('standard');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#111726] border border-slate-700/80 rounded-xl w-full max-w-md p-5 shadow-2xl text-slate-200 select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Sliders size={16} className="text-cyan-400" />
            <span>Cấu Hình Ngưỡng (Threshold Settings)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Presets Selection */}
        <div className="my-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Presets Profile
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePresetClick(key)}
                className={`p-2 rounded-lg text-left border transition text-xs ${
                  activePreset === key
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-xs'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>{preset.name}</span>
                  {activePreset === key && <Check size={12} className="text-cyan-400" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight line-clamp-2">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4 my-4 bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
          {/* Overexposed */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Ngưỡng Cháy Sáng (Y Overexposed)</span>
              <span className="font-mono text-orange-400 font-bold">{thresholds.yOver} / 255</span>
            </div>
            <input
              type="range"
              min="160"
              max="245"
              step="1"
              value={thresholds.yOver}
              onChange={(e) => handleYOverChange(e.target.value)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="text-[10px] text-slate-500 mt-0.5">Luma Y trung bình lớn hơn ngưỡng này sẽ được gắn cờ Cháy sáng</div>
          </div>

          {/* Underexposed */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Ngưỡng Thiếu Sáng (Y Underexposed)</span>
              <span className="font-mono text-indigo-400 font-bold">{thresholds.yUnder} / 255</span>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              step="1"
              value={thresholds.yUnder}
              onChange={(e) => handleYUnderChange(e.target.value)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="text-[10px] text-slate-500 mt-0.5">Luma Y trung bình nhỏ hơn ngưỡng này sẽ được gắn cờ Thiếu sáng</div>
          </div>

          {/* Color Cast */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Độ lệch Ám Màu (Color Cast Threshold)</span>
              <span className="font-mono text-cyan-400 font-bold">{Math.round(thresholds.castThresholdPercent * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.35"
              step="0.01"
              value={thresholds.castThresholdPercent}
              onChange={(e) => handleCastThresholdChange(e.target.value)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="text-[10px] text-slate-500 mt-0.5">Mức chênh lệch % giữa các kênh màu RGB để phát hiện ám xanh / ám vàng</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw size={12} />
            <span>Khôi phục mặc định</span>
          </button>

          <div className="flex items-center gap-2">
            {onReanalyzeCurrent && (
              <button
                onClick={() => {
                  onClose();
                  onReanalyzeCurrent();
                }}
                className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
              >
                Phân tích lại video hiện tại
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
