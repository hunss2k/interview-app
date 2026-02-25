// 하단 탭바 (홈/녹음/팀장/광고주)
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', icon: '🏠', label: '홈' },
  { href: '/interview', icon: '🎙️', label: '녹음' },
  { href: '/leaders', icon: '👥', label: '팀장' },
  { href: '/clients', icon: '🏢', label: '광고주' },
];

export default function TabNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-40
        bg-slate-900/95 backdrop-blur-sm
        border-t border-slate-800
        safe-area-bottom
      "
    >
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex flex-col items-center py-2 px-4 min-w-[64px]
                transition-colors
                ${isActive ? 'text-blue-400' : 'text-slate-500'}
              `}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs mt-0.5">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
