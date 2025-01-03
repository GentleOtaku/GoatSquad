import os
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    logger.error("No GOOGLE_API_KEY found in environment variables")
    raise ValueError("GOOGLE_API_KEY is required")

# Configure the Gemini API
genai.configure(api_key=api_key)

def get_news_digest(team_name, player_name):
    """
    Generate a news digest about a specific MLB team and player using Gemini API
    """
    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-1.5-pro')

        # Create the content structure
        contents = [{
            "role": "user",
            "parts": [{
                "text": f"""Create a brief news digest about the MLB team {team_name} and player {player_name}. 
                Format your response in markdown with the following sections:

                # Team Update: {team_name}
                [Include latest team performance and standings]

                # Player Spotlight: {player_name}
                [Include recent news and performance updates]

                # Upcoming Games & Milestones
                [Include significant upcoming games and potential milestones]

                Use proper markdown formatting including:
                - Headers (# for main sections)
                - Bold (**) for important information
                - Lists (- or *) for multiple points
                - > for notable quotes or statistics
                """
            }]
        }]

        # Set generation configuration
        generation_config = GenerationConfig(
            temperature=0.7,
            top_p=0.9,
            top_k=40,
            max_output_tokens=2048,
        )

        # Generate content
        response = model.generate_content(
            contents,
            generation_config=generation_config,
            stream=False
        )

        logger.info("Successfully generated news digest")
        
        if response.prompt_feedback:
            logger.info(f"Prompt feedback: {response.prompt_feedback}")

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