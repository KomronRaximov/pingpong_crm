import { Clock, MoreHorizontal } from 'lucide-react';
import type { Reservation } from '../types';
import { format } from 'date-fns';

const MOCK_RESERVATIONS: Reservation[] = [
  { id: 'res1', courtId: '1', clientName: 'John Doe', clientPhone: '+1-234-567-89', startTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), durationMinutes: 60 },
  { id: 'res2', courtId: '3', clientName: 'Alice Smith', clientPhone: '+1-555-123-44', startTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(), durationMinutes: 90 },
];

export const ReservationList: React.FC = () => {
    return (
        <div className="space-y-4">
            {MOCK_RESERVATIONS.map(res => (
                <div key={res.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between group">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                            <span className="font-bold text-lg">{format(new Date(res.startTime), 'd')}</span>
                        </div>
                        <div>
                            <h4 className="font-bold tracking-tight">{res.clientName}</h4>
                            <p className="text-xs text-white/40">{res.clientPhone}</p>
                        </div>
                    </div>

                    <div className="flex gap-8 items-center pr-4">
                        <div className="text-right">
                            <div className="flex items-center gap-1.5 justify-end text-white/60 text-xs mb-0.5">
                                <Clock size={12} />
                                <span>{format(new Date(res.startTime), 'HH:mm')}</span>
                            </div>
                            <span className="text-xs font-medium text-white/30 uppercase tracking-tighter italic">{res.durationMinutes} min</span>
                        </div>
                        
                        <div className="text-right">
                            <span className="text-[10px] text-white/20 uppercase tracking-widest block font-bold mb-0.5 transition-colors group-hover:text-amber-500/60">Court</span>
                            <span className="font-black text-white/80">#{res.courtId}</span>
                        </div>

                        <button className="p-2 text-white/20 hover:text-white transition-colors">
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
