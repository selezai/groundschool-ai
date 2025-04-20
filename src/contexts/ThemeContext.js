import React, { createContext, useContext, useState } from 'react';

// Default theme colors
const defaultTheme = {
  colors: {
    primary: '#3498db',
    secondary: '#2ecc71',
    background: '#FFFFFF',
    card: '#F9FAFB',
    text: '#1F2937',
    border: '#E5E7EB',
    notification: '#FF9500',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
};

// Create the context
const ThemeContext = createContext(defaultTheme);

// Provider component
export const ThemeProvider = ({ children, initialTheme = defaultTheme }) => {
  const [theme, setTheme] = useState(initialTheme);

  const updateTheme = (newTheme) => {
    setTheme((prevTheme) => ({
      ...prevTheme,
      ...newTheme,
    }));
  };

  return (
    <ThemeContext.Provider value={{ ...theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using the theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
