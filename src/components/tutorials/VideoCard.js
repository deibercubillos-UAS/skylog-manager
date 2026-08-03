'use client';

import { useState } from 'react';

// Facade: miniatura estática + botón de play, sin cargar el iframe/JS de YouTube
// hasta que el usuario haga clic — evita pagar el costo de rendimiento de N
// reproductores embebidos cargando de entrada en una sola página.
export default function VideoCard({ video }) {
  const [playing, setPlaying] = useState(false);

  if (!video.youtubeId) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 aspect-video flex flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="material-symbols-outlined text-3xl text-slate-300">schedule</span>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Próximamente</p>
        <p className="text-sm font-bold text-slate-500 leading-snug">{video.title}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-black aspect-video relative group">
      {playing ? (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 w-full h-full cursor-pointer"
          aria-label={`Reproducir: ${video.title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- facade externo de YouTube, sin necesidad de next/image */}
          <img
            src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="size-14 md:size-16 rounded-full bg-primary/95 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-white text-3xl">play_arrow</span>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
