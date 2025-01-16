import axios from 'axios';

export const translationService = {
  translate: async (text, targetLanguage = 'en') => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/translate`, {
        text,
        target_language: targetLanguage
      });
      return response.data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  }
}; 