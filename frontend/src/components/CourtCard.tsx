import React, { useState, useEffect } from 'react';
import { Play, Square, Clock, Users, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Court, Session } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CourtCardProps {
  court: Court;
  activeSession?: Session;
  onStartSession: (courtId: string) => void;
  onStopSession: (courtId: string) => void;
}

export const CourtCard: React.FC<CourtCardProps> = ({ 
  court, 
  activeSession, 
  onStartSession, 
  onStopSession 
}) => {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [currentCost, setCurrentCost] = useState(0);

  useEffect(() => {
    let interval: any;
    if (activeSession && activeSession.status === 'active') {
      const startTime = new Date(activeSession.startTime).getTime();
      
      interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = now - startTime;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
        
        // Calculate cost based on duration
        const hoursDecimal = diff / (1000 * 60 * 60);
        setCurrentCost(hoursDecimal * court.pricePerHour);
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
      setCurrentCost(0);
    }
    
    return () => clearInterval(interval);
  }, [activeSession, court.pricePerHour]);

  const statusColors = {
    available: 'bg-tennis-green/10 text-tennis-green border-tennis-green/30',
    active: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    reserved: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    maintenance: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden group rounded-2xl border transition-all duration-300",
        "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]",
        court.status === 'active' && "border-tennis-green/20 ring-1 ring-tennis-green/10"
      )}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border mb-2 inline-block",
              statusColors[court.status]
            )}>
              {court.status}
            </span>
            <h3 className="text-xl font-bold tracking-tight">{court.name}</h3>
            <p className="text-xs text-white/40 mt-1 capitalize">{court.type} Court</p>
          </div>
          
          <div className="bg-white/5 p-2 rounded-lg">
             <Users size={18} className="text-white/40" />
          </div>
        </div>

        <div className="space-y-4">
          {court.status === 'active' ? (
            <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-white/30 font-medium">RUNNING TIME</span>
                <Clock size={14} className="text-tennis-green animate-pulse" />
              </div>
              <div className="text-2xl font-mono font-bold tracking-wider mb-3">
                {elapsedTime}
              </div>
              <div className="flex justify-between items-end">
                <div>
                    <span className="text-[10px] text-white/30 block">CURRENT COST</span>
                    <span className="text-lg font-bold text-tennis-green">${currentCost.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => onStopSession(court.id)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-lg transition-colors"
                >
                  <Square size={18} fill="currentColor" />
                </button>
              </div>
            </div>
          ) : (
            <div className="h-[120px] flex flex-col justify-center items-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
                <p className="text-white/40 text-sm mb-4">Ready for next session</p>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onStartSession(court.id)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Play size={16} fill="black" />
                        Start Session
                    </button>
                    {court.status === 'available' && (
                        <button className="bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors border border-white/5">
                             <ArrowUpRight size={18} className="text-white/60" />
                        </button>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Decorative gradient */}
      <div className={cn(
        "absolute -bottom-1 -right-1 w-24 h-24 blur-3xl opacity-20 pointer-events-none transition-colors duration-500",
        court.status === 'active' ? "bg-tennis-green" : "bg-white"
      )} />
    </motion.div>
  );
};
