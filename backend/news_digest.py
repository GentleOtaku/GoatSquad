import os
# pip install -U -q google-genai
# pip install python-dotenv
from dotenv import load_dotenv
from google import genai
from google.genai import types
import logging
from bs4 import BeautifulSoup
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    logger.error("No GOOGLE_API_KEY found in environment variables")
    raise ValueError("GOOGLE_API_KEY is required")

def get_news_digest(teams=None, players=None):
    """
    Generate news digests for multiple MLB teams and players using Gemini API with search
    """
    logger.info(f"Received request for teams: {teams}, players: {players}")
    
    try:
        # Validate inputs
        if teams is None and players is None:
            return {
                'success': False,
                'error': 'At least one team or player must be specified'
            }
        
        if (teams is not None and len(teams) == 0) and (players is not None and len(players) == 0):
            return {
                'success': False,
                'error': 'Empty teams and players lists provided'
            }

        # Create a client with search capability
        client = genai.Client(api_key=api_key)
        
        # Configure search tool
        search_tool = {'google_search': {}}
        
        digests = []
        
        # Generate content for teams
        if teams:
            logger.info(f"Generating content for teams: {teams}")
            for team in teams[:3]:  # Limit to 3 teams
                prompt = f"""
                Generate a concise MLB update focusing on {team}. Include:

                # Team Update
                - Current standings
                - Recent performance
                - Key statistics

                # Looking Ahead
                - Upcoming games
                - Key matchups
                - Potential milestones

                Format in markdown, use bullet points, and bold (**) key numbers. Remove any introductory phrases and start directly with the content.
                """

                response = client.models.generate_content(
                    model='gemini-2.0-flash-exp',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[search_tool],
                        response_modalities=["TEXT"],
                    )
                )
                
                digests.append({
                    'type': 'team',
                    'subject': team,
                    'content': clean_content(response.text),
                    'sources': get_search_content(response)
                })

        # Generate content for players
        if players:
            logger.info(f"Generating content for players: {players}")
            for player in players[:3]:  # Limit to 3 players
                prompt = f"""
                Generate a concise MLB player spotlight for {player}. Include:

                # Player Spotlight
                - Recent performance
                - Season statistics
                - Notable achievements
                - Upcoming milestones

                Format in markdown, use bullet points, and bold (**) key numbers. Remove any introductory phrases and start directly with the content.
                """

                response = client.models.generate_content(
                    model='gemini-2.0-flash-exp',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[search_tool],
                        response_modalities=["TEXT"],
                    )
                )
                
                digests.append({
                    'type': 'player',
                    'subject': player,
                    'content': clean_content(response.text),
                    'sources': get_search_content(response)
                })

        if not digests:
            return {
                'success': False,
                'error': 'No content could be generated'
            }

        logger.info(f"Generated {len(digests)} digests successfully")
        return {
            'success': True,
            'digests': digests,
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error generating news digest: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        }

def clean_content(content):
    """Clean up the response text by removing introductory phrases"""
    intro_phrases = [
        "Here's the requested information",
        "Based on the latest information",
        "Here's a summary",
        "Let me provide you with",
        "Here's what I found",
        "Using real-time search",
        "Based on real-time data",
        "Here's the current information"
    ]
    
    for phrase in intro_phrases:
        if content.lower().startswith(phrase.lower()):
            content = content[len(phrase):].lstrip(',:.\n ')
    
    return content

def get_search_content(response):
    """Extract search content from response"""
    if hasattr(response.candidates[0], 'grounding_metadata') and \
       hasattr(response.candidates[0].grounding_metadata, 'search_entry_point'):
        return response.candidates[0].grounding_metadata.search_entry_point.rendered_content
    return "Generated using Google Gemini AI with web search"

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