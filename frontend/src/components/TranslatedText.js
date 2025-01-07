import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const TranslatedText = ({ text }) => {
  const { language, t } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    const translate = async () => {
      console.log('Translating text:', text, 'to language:', language);
      const result = await t(text);
      console.log('Translation result:', result);
      setTranslatedText(result);
    };
    translate();
  }, [text, t, language]);

  return <>{translatedText}</>;
};

export default TranslatedText; 