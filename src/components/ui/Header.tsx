'use client';

import { Settings, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  selectedDomain: string;
  onDomainChange: (domain: string) => void;
}

const domains = [
  'All Domains',
  'printerpix.co.uk',
  'printerpix.com',
  'printerpix.it',
  'printerpix.es',
  'printerpix.fr',
  'printerpix.de',
  'printerpix.nl',
  'printerpix.in',
  'printerpix.ae',
];

export function Header({ selectedDomain, onDomainChange }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <h1 className="text-lg font-semibold text-white">
            SEO & GEO Command Center
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Domain Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
          >
            <span className="text-zinc-300">{selectedDomain}</span>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg z-50">
              {domains.map((domain) => (
                <button
                  key={domain}
                  onClick={() => {
                    onDomainChange(domain);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg ${
                    selectedDomain === domain ? 'text-blue-400' : 'text-zinc-300'
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <button className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
          <Settings className="w-5 h-5 text-zinc-400" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-zinc-800 transition-colors">
          <Bell className="w-5 h-5 text-zinc-400" />
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            3
          </span>
        </button>

        {/* Sign Out */}
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5 text-zinc-400" />
          </button>
        </form>
      </div>
    </header>
  );
}
