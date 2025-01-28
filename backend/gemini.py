import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
import logging
import time
from tenacity import retry, stop_after_attempt, wait_exponential
import threading
from datetime import datetime, timedelta
from functools import lru_cache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiting settings
RATE_LIMIT = 60  # requests per minute
RATE_WINDOW = 60  # seconds
request_times = []
rate_limit_lock = threading.Lock()

# Cache settings
CACHE_TTL = 3600  # 1 hour in seconds
description_cache = {}

load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    logger.error("No GOOGLE_API_KEY found in environment variables")
    raise ValueError("GOOGLE_API_KEY is required")

def check_rate_limit():
    """Check if we're within rate limits"""
    with rate_limit_lock:
        now = time.time()
        # Remove old requests from tracking
        global request_times
        request_times = [t for t in request_times if now - t < RATE_WINDOW]
        
        if len(request_times) >= RATE_LIMIT:
            return False
            
        request_times.append(now)
        return True

def get_cached_description(title: str) -> tuple[str, bool]:
    """Get description from cache if available"""
    now = time.time()
    if title in description_cache:
        timestamp, description = description_cache[title]
        if now - timestamp < CACHE_TTL:
            return description, True
    return None, False

def cache_description(title: str, description: str):
    """Cache a description"""
    description_cache[title] = (time.time(), description)

def generate_fallback_description(title: str) -> str:
    """Generate a fallback description when API is unavailable"""
    # Remove parentheses and their contents
    clean_title = title.split('(')[0].strip()
    
    # Extract key components
    parts = clean_title.split()
    if len(parts) >= 2:
        player_name = ' '.join(parts[:-1])
        action = parts[-1]
        return f"Watch {player_name} make an impressive {action} in this highlight clip."
    
    return f"Watch this exciting baseball moment featuring {clean_title}."

@retry(
    stop=stop_after_attempt(2),  # Reduced retries due to rate limiting
    wait=wait_exponential(multiplier=1, min=4, max=10),
    reraise=True
)
def run_gemini_prompt(prompt):
    """
    Run a prompt through the Gemini API with retry logic and rate limiting
    Will retry up to 2 times with exponential backoff
    """
    try:
        logger.info(f"Running prompt: {prompt[:50]}...")
        
        # Check cache first
        if prompt.startswith("Generate a short and engaging description for"):
            title = prompt.split(": ", 1)[1].split(".")[0]
            cached_description, found = get_cached_description(title)
            if found:
                logger.info("Using cached description")
                return cached_description
        
        # Check rate limit
        if not check_rate_limit():
            logger.warning("Rate limit exceeded, using fallback description")
            if "baseball video titled:" in prompt:
                title = prompt.split("baseball video titled:", 1)[1].split(".")[0].strip()
                return generate_fallback_description(title)
            raise Exception("Rate limit exceeded")
        
        client = genai.Client(api_key=api_key)
        search_tool = {'google_search': {}}
        
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[search_tool],
                response_modalities=["TEXT"],
            )
        )
        
        if not response or not response.text:
            logger.error("Empty response from Gemini API")
            return None
            
        result = response.text.strip()
        if not result:
            logger.error("Empty result after stripping whitespace")
            return None
            
        # Cache the result if it's a description
        if "baseball video titled:" in prompt:
            title = prompt.split("baseball video titled:", 1)[1].split(".")[0].strip()
            cache_description(title, result)
            
        return result
        
    except Exception as e:
        logger.error(f"Error running Gemini prompt: {str(e)}", exc_info=True)
        # If this was a description request, return a fallback
        if "baseball video titled:" in prompt:
            title = prompt.split("baseball video titled:", 1)[1].split(".")[0].strip()
            return generate_fallback_description(title)
        raise

def generate_embeddings(text):
    try:
        logger.info(f"Generating embeddings for text: {text[:50]}...")

        genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
        result = genai.embed_content(
                model="models/text-embedding-004",
                content="What is the meaning of life?")

        embedded = result['embedding']
        logger.info(f"Embeddings generated successfully: {embedded}...")
        return embedded
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}", exc_info=True)
        return None



