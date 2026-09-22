'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/ardis', icon: 'today', label: 'Hoy' },
  { href: '/ardis/proyectos', icon: 'bar_chart', label: 'Proyectos' },
  { href: '/ardis/hablar', icon: 'mic', label: 'Hablar', center: true },
  { href: '/ardis/inbox', icon: 'inbox', label: 'Inbox' },
  { href: '/ardis/ajustes', icon: 'settings', label: 'Ajustes' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-navy/95 backdrop-blur
                 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md items-end justify-between px-2 pb-2 pt-1.5">
        {ITEMS.map((item) => {
          const active = item.href === '/ardis' ? pathname === '/ardis' : pathname.startsWith(item.href);

          if (item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex -translate-y-3 flex-col items-center gap-0.5"
              >
                <span
                  className={`material-symbols-outlined flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white shadow-lg shadow-primary/30 ${
                    active ? 'bg-primary' : 'bg-primary/90'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium text-white/70">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1"
            >
              <span
                className={`material-symbols-outlined text-[22px] ${active ? 'text-primary' : 'text-white/50'}`}
              >
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-white/50'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
