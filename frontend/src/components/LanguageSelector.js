import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  const handleChange = (e) => {
    console.log('Language selector changed to:', e.target.value);
    setLanguage(e.target.value);
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' }
  ];

  return (
    <select 
      value={language}
      onChange={handleChange}
      className="p-2 rounded border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
};

export default LanguageSelector; 