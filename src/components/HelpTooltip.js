'use client';
import { useState } from 'react';

export default function HelpTooltip({ text }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block ml-2">
      <button 
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="size-4 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-[10px] font-black hover:bg-orange-500 hover:text-white transition-all"
      > ? </button>
      {show && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-2xl z-[500] leading-relaxed border border-white/10 animate-in fade-in zoom-in duration-200">
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
          {text}
        </div>
      )}
    </div>
  );
}