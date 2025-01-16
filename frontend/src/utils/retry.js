export const retry = async (fn, { retries = 3, delay = 1000, onRetry = () => {} } = {}) => {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < retries - 1) {
        onRetry(error, attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }
  
  throw lastError;
}; 