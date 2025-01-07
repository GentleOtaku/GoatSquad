import React, { createContext, useContext, useState, useCallback } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const t = useCallback(async (text) => {
    if (language === 'en') return text;
    if (!text) return '';
    
    try {
      console.log('Making translation request for:', text, 'to:', language);
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          target_language: language,
        }),
      });
      
      if (!response.ok) {
        console.error('Translation request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return text;
      }

      const data = await response.json();
      console.log('Translation API response:', data);
      
      if (!data.success) {
        console.error('Translation failed:', data.error);
        return text;
      }
      
      return data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, [language]);

  const handleLanguageChange = useCallback((newLanguage) => {
    console.log('Changing language to:', newLanguage);
    setLanguage(newLanguage);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleLanguageChange, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 