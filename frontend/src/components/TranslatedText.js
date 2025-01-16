import React, { useState, useEffect } from 'react';
import { translationService } from '../services/translationService';
import { useLanguage } from '../contexts/LanguageContext';

function TranslatedText({ text, ...props }) {
  const [translatedText, setTranslatedText] = useState(text);
  const { language } = useLanguage();

  useEffect(() => {
    const translateText = async () => {
      if (language !== 'en') {
        const translated = await translationService.translate(text, language);
        setTranslatedText(translated);
      } else {
        setTranslatedText(text);
      }
    };

    translateText();
  }, [text, language]);

  return <span {...props}>{translatedText}</span>;
}

export default TranslatedText; 