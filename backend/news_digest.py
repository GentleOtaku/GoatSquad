import os
# pip install -U -q google-genai
# pip install python-dotenv
from dotenv import load_dotenv
from google import genai
from google.genai import types
import logging
from bs4 import BeautifulSoup

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    logger.error("No GOOGLE_API_KEY found in environment variables")
    raise ValueError("GOOGLE_API_KEY is required")

def get_news_digest(team_name, player_name):
    """
    Generate a news digest about a specific MLB team and player using Gemini API with search
    """
    try:
        # Create a client with search capability
        client = genai.Client(api_key=api_key)
        
        # Configure search tool
        search_tool = {'google_search': {}}
        
        # Create the content structure with search-enabled prompt
        prompt = f"""
        Using real-time information from search:

        # {team_name} Team Update
        [Search for and provide current team standings, recent game results, and key statistics]

        # {player_name} Spotlight
        [Search for and share latest performance metrics, recent games, and any news]

        # Upcoming Games & Milestones
        [Search for and list upcoming games, potential milestones, and key matchups]

        Format requirements:
        - Use markdown formatting
        - Start each section directly with content
        - Use bullet points for lists
        - Include statistics where relevant
        - Bold (**) key numbers and achievements
        - Use blockquotes (>) for notable quotes or highlights
        """

        # Generate content with search enabled
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[search_tool],
                response_modalities=["TEXT"],
            )
        )

        logger.info("Successfully generated news digest")
        
        # Get search metadata
        search_content = None
        if hasattr(response.candidates[0], 'grounding_metadata') and \
           hasattr(response.candidates[0].grounding_metadata, 'search_entry_point'):
            search_content = response.candidates[0].grounding_metadata.search_entry_point.rendered_content

        return {
            'success': True,
            'digest': response.text,
            'sources': search_content or "Generated using Google Gemini AI with web search"
        }

    except Exception as e:
        logger.error(f"Error generating news digest: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        } 

def clean_source_links(sources_html):
    """Clean and extract source links from Google's HTML"""
    soup = BeautifulSoup(sources_html, 'html.parser')
    links = soup.select('a.chip')
    
    cleaned_sources = []
    for link in links:
        cleaned_sources.append({
            'text': link.get_text(),
            'url': link.get('href')
        })
    
    return cleaned_sources 