import React from 'react';
import { Appointment } from '../types';
import { formatTime } from '../lib/utils';
import { cn } from '../lib/utils';

interface SlotSelectorProps {
  slots: Appointment[];
  selectedSlotId: string | null;
  onSlotSelect: (id: string) => void;
  loading: boolean;
}

export const SlotSelector: React.FC<SlotSelectorProps> = ({ slots, selectedSlotId, onSlotSelect, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-10 bg-slate-100 animate-pulse rounded"></div>
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
        <p className="text-sm text-slate-400">No hay horarios disponibles para este día.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {slots.map((slot) => {
        const isSelected = selectedSlotId === slot.id;
        
        return (
          <button
            key={slot.id}
            onClick={() => onSlotSelect(slot.id)}
            className={cn(
              "py-2 px-3 border rounded text-sm text-center transition-all",
              isSelected 
                ? "border-primary bg-[#E1E8E5] font-semibold text-primary" 
                : "border-slate-100 bg-slate-50 hover:border-primary text-slate-600"
            )}
          >
            {formatTime(slot.time)}
          </button>
        );
      })}
    </div>
  );
};
