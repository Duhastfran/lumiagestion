import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const today = startOfToday();

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <span className="font-medium text-sm capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
        {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map(d => <span key={d}>{d}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isPast = isBefore(day, today);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={day.toString()}
              onClick={() => !isPast && onDateSelect(day)}
              disabled={isPast}
              className={cn(
                "py-2 text-sm rounded-lg transition-all relative group",
                !isCurrentMonth && "text-slate-200",
                isPast && "text-slate-200 cursor-not-allowed",
                !isSelected && !isPast && isCurrentMonth && "hover:bg-slate-100",
                isSelected && "bg-primary text-white font-bold"
              )}
              style={idx === 0 ? { gridColumnStart: (day.getDay() === 0 ? 7 : day.getDay()) } : {}}
            >
              {format(day, 'd')}
              {isSameDay(day, today) && !isSelected && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
