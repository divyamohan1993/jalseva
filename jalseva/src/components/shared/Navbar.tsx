'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, ChevronDown, User, Droplet } from 'lucide-react';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
  { code: 'ta', label: 'தமிழ்', short: 'த' },
  { code: 'te', label: 'తెలుగు', short: 'తె' },
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕ' },
  { code: 'mr', label: 'मराठी', short: 'म' },
  { code: 'bn', label: 'বাংলা', short: 'বা' },
  { code: 'gu', label: 'ગુજરાતી', short: 'ગુ' },
];

export interface NavbarProps {
  showBack?: boolean;
  title?: string;
  language?: string;
  onLanguageChange?: (lang: string) => void;
  userAvatar?: string;
  userName?: string;
  onProfileClick?: () => void;
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({
  showBack = false,
  title,
  language = 'en',
  onLanguageChange,
  userAvatar,
  userName,
  onProfileClick,
  className,
}) => {
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLang = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav
      className={cn(
        'sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100',
        'flex items-center justify-between px-4 h-14',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Droplet size={18} className="text-white" fill="currentColor" />
            </div>
            <span className="text-lg font-bold text-blue-600">JalSeva</span>
          </div>
        )}

        {title && showBack && (
          <h1 className="text-base font-semibold text-gray-900 truncate">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1 px-2.5 min-h-[44px] text-sm rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors border border-gray-200"
            aria-label="Select language"
            aria-expanded={langOpen}
            aria-haspopup="listbox"
          >
            <span className="font-medium text-gray-700">
              {selectedLang.short}
            </span>
            <ChevronDown
              size={14}
              className={cn(
                'text-gray-500 transition-transform',
                langOpen && 'rotate-180'
              )}
            />
          </button>

          {langOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px] z-50" role="listbox">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onLanguageChange?.(lang.code);
                    setLangOpen(false);
                  }}
                  role="option"
                  aria-selected={lang.code === language}
                  className={cn(
                    'w-full text-left px-3 py-2 min-h-[44px] text-sm hover:bg-blue-50 focus:outline-none focus:bg-blue-50 transition-colors flex items-center justify-between',
                    lang.code === language &&
                      'bg-blue-50 text-blue-700 font-medium'
                  )}
                >
                  <span>{lang.label}</span>
                  {lang.code === language && (
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onProfileClick}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors overflow-hidden"
          aria-label="Profile"
        >
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={userName || 'User'}
              width={44}
              height={44}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <User size={18} className="text-gray-600" />
          )}
        </button>
      </div>
    </nav>
  );
};

Navbar.displayName = 'Navbar';

export { Navbar };
