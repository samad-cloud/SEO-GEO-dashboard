'use client';

import * as Tabs from '@radix-ui/react-tabs';

interface TabNavigationProps {
  activeTab: 'seo' | 'geo';
  onTabChange: (tab: 'seo' | 'geo') => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="px-6 py-4 border-b border-zinc-800">
      <Tabs.Root value={activeTab} onValueChange={(v) => onTabChange(v as 'seo' | 'geo')}>
        <Tabs.List className="inline-flex rounded-lg bg-zinc-800/50 p-1">
          <Tabs.Trigger
            value="seo"
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'seo'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            SEO
          </Tabs.Trigger>
          <Tabs.Trigger
            value="geo"
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'geo'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            GEO
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
    </div>
  );
}
