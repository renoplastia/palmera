"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface CustomizerContextType {
  isCustomizerActive: boolean;
  toggleCustomizer: () => void;
  t: (key: string, defaultValue: string) => string;
  updateText: (key: string, value: string) => void;
}

const CustomizerContext = createContext<CustomizerContextType | undefined>(undefined);

export function CustomizerProvider({ children }: { children: React.ReactNode }) {
  const [isCustomizerActive, setIsCustomizerActive] = useState(false);
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("palmera_custom_ui_texts");
    if (saved) {
      try {
        setCustomTexts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom UI texts", e);
      }
    }
  }, []);

  // Toggle editor mode
  const toggleCustomizer = () => {
    setIsCustomizerActive((prev) => !prev);
  };

  // Get localized custom text or fallback to default
  const t = (key: string, defaultValue: string): string => {
    return customTexts[key] !== undefined ? customTexts[key] : defaultValue;
  };

  // Update a specific localized string
  const updateText = (key: string, value: string) => {
    const updated = { ...customTexts, [key]: value };
    setCustomTexts(updated);
    localStorage.setItem("palmera_custom_ui_texts", JSON.stringify(updated));
  };

  return (
    <CustomizerContext.Provider
      value={{
        isCustomizerActive,
        toggleCustomizer,
        t,
        updateText,
      }}
    >
      {children}
    </CustomizerContext.Provider>
  );
}

export function useCustomizer() {
  const context = useContext(CustomizerContext);
  if (!context) {
    throw new Error("useCustomizer must be used within a CustomizerProvider");
  }
  return context;
}
