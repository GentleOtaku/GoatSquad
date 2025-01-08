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
      className="h-9 px-2 rounded-md text-sm font-medium
        bg-white dark:bg-gray-700
        text-gray-700 dark:text-gray-200
        border border-gray-300 dark:border-gray-600
        hover:border-gray-400 dark:hover:border-gray-500
        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
        transition-colors duration-200"
    >
      {languages.map(lang => (
        <option 
          key={lang.code} 
          value={lang.code}
          className="text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700"
        >
          {lang.name}
        </option>
      ))}
    </select>
  );
};

export default LanguageSelector; 