import os
from dotenv import load_dotenv
from google import genai

# Set up logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    logger.error("No GOOGLE_API_KEY found in environment variables")
    raise ValueError("GOOGLE_API_KEY is required")

genai.configure(api_key=api_key)

def get_news_digest(team_name, player_name):
    """
    Generate a news digest about a specific MLB team and player using Gemini API
    """
    logger.info(f"Generating news digest for team: {team_name}, player: {player_name}")
    
    try:
        client = genai.Client()
        model = client.models.get_model('gemini-2.0-flash-exp')

        prompt = f"""
        Create a brief news digest about the MLB team {team_name} and player {player_name}. 
        Include:
        1. Latest team performance and standings
        2. Recent news about {player_name}
        3. Any upcoming significant games or milestones
        
        Format the response in clear sections with headlines.
        """

        response = client.generate_content(
            model=model,
            contents=prompt,
            generation_config={
                "temperature": 0.7,
                "top_p": 0.8,
                "top_k": 40
            }
        )
        
        logger.info("Successfully generated news digest")
        
        return {
            'success': True,
            'digest': response.text,
            'sources': "Generated using Google Gemini AI"
        }
    except Exception as e:
        logger.error(f"Error generating news digest: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        } 