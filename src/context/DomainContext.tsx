'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

const DomainContext = createContext<{
  selectedDomain: string;
  setSelectedDomain: (d: string) => void;
}>({ selectedDomain: 'All Domains', setSelectedDomain: () => {} });

export function DomainProvider({ children }: { children: ReactNode }) {
  const [selectedDomain, setSelectedDomain] = useState('All Domains');
  return (
    <DomainContext.Provider value={{ selectedDomain, setSelectedDomain }}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  return useContext(DomainContext);
}
