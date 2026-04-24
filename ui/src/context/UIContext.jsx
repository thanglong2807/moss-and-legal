import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [ultraCollapsed, setUltraCollapsed] = useState(
    () => localStorage.getItem('ui_ultra_collapsed') === 'true'
  );

  const setUltra = (val) => {
    setUltraCollapsed(val);
    localStorage.setItem('ui_ultra_collapsed', String(val));
  };

  return (
    <UIContext.Provider value={{ ultraCollapsed, setUltraCollapsed: setUltra }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);
