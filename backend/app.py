from fastapi import FastAPI, Depends, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import requests
from datetime import datetime
import os
from google.cloud import translate_v2 as translate
from auth import AuthService, get_current_user, User, init_admin
import grpc
from database import get_db, engine, Base, get_database_url
from news_digest import get_news_digest
from cfknn import recommend_reels, build_and_save_model, run_main
from db import load_data, add, remove, get_video_url, get_follow_vid
from sqlalchemy import create_engine, text
from gemini import run_gemini_prompt
import re
from pydantic import BaseModel
from routes.mlb import router as mlb_router

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ORIGINAL_DIR = os.path.dirname(os.path.abspath(__file__))

# Create FastAPI app
app = FastAPI(
    title='MLB Fan Feed API',
    description='API for MLB fan feed features',
    version='1.0'
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize admin user
@app.on_event("startup")
async def startup_event():
    db = next(get_db())
    init_admin(db)

# Pydantic models for request/response validation
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    firstName: str
    lastName: str
    username: str
    timezone: Optional[str] = 'UTC'
    avatarUrl: Optional[str] = '/images/default-avatar.jpg'
    teams: Optional[List[dict]] = []
    players: Optional[List[dict]] = []

class UserUpdateRequest(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    timezone: Optional[str] = None
    avatarUrl: Optional[str] = None
    teams: Optional[List[dict]] = None
    players: Optional[List[dict]] = None

# Auth routes
@app.post("/auth/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    return AuthService.register_user(request.dict(), db)

@app.post("/auth/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    return AuthService.login_user(request.email, request.password, db)

@app.get("/auth/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {'success': True, 'user': current_user.to_dict()}

@app.put("/auth/profile")
async def update_profile(
    request: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AuthService.update_user_profile(current_user.client_id, request.dict(exclude_unset=True), db)

# News routes
@app.get("/news/digest")
@app.get("/api/news/digest")
async def news_digest(
    teams: List[str] = Query(default=[]),
    players: List[str] = Query(default=[])
):
    """
    Get news digest for teams and players
    
    Query Parameters:
    - teams: List of team names
    - players: List of player names
    """
    try:
        logger.info(f"Received news digest request with teams: {teams}, players: {players}")
        
        # Clean and validate the parameters
        teams = [t.strip() for t in teams if t and t.strip()]
        players = [p.strip() for p in players if p and p.strip()]
        
        logger.info(f"Cleaned parameters - teams: {teams}, players: {players}")
        
        if not teams and not players:
            raise HTTPException(
                status_code=400, 
                detail="At least one team or player must be specified"
            )
            
        result = get_news_digest(teams=teams, players=players)
        
        if result.get('success'):
            return result
        else:
            raise HTTPException(
                status_code=500, 
                detail=result.get('error', 'Unknown error occurred')
            )
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error in news_digest: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )

# MLB routes
@app.get("/api/mlb/highlights")
async def get_highlights(team_id: Optional[str] = None, player_id: Optional[str] = None):
    """Proxy endpoint for MLB highlights"""
    try:
        logger.info(f"Fetching highlights for team {team_id} and player {player_id}")

        all_highlights = []
        
        if team_id:
            # First get schedule to find recent games for team
            schedule_url = 'https://statsapi.mlb.com/api/v1/schedule'
            
            # Try spring training games first
            schedule_params = {
                'teamId': team_id,
                'season': 2024,
                'sportId': 1,
                'gameType': 'S'  # Spring training games
            }
            
            schedule_response = requests.get(schedule_url, params=schedule_params)
            if schedule_response.status_code == 200:
                schedule_data = schedule_response.json()
                all_highlights.extend(process_schedule_data(schedule_data, player_id))

            # Then try regular season games
            schedule_params['gameType'] = 'R'  # Regular season games
            schedule_response = requests.get(schedule_url, params=schedule_params)
            if schedule_response.status_code == 200:
                schedule_data = schedule_response.json()
                all_highlights.extend(process_schedule_data(schedule_data, player_id))
                
        elif player_id:
            # For players, we need to search in a different way
            content_url = f'https://statsapi.mlb.com/api/v1/people/{player_id}/stats/game/current'
            try:
                content_response = requests.get(content_url)
                if content_response.status_code == 200:
                    player_data = content_response.json()
                    if player_data and 'stats' in player_data:
                        # Get recent games the player appeared in
                        game_ids = [stat.get('gameId') for stat in player_data.get('stats', [])][:10]
                        
                        # Get highlights for each game
                        for game_id in game_ids:
                            content_url = f'https://statsapi.mlb.com/api/v1/game/{game_id}/content'
                            content_response = requests.get(content_url)
                            if content_response.status_code == 200:
                                content_data = content_response.json()
                                if content_data:
                                    highlights = process_game_highlights(content_data, player_id)
                                    all_highlights.extend(highlights)
            except Exception as e:
                logger.error(f"Error fetching player highlights: {str(e)}")

        if not all_highlights:
            logger.warning(f"No highlights found for team {team_id} or player {player_id}")
            return {'highlights': []}

        sorted_highlights = sorted(
            all_highlights,
            key=lambda x: datetime.strptime(x['date'], '%Y-%m-%d') if x['date'] else datetime.min,
            reverse=True
        )[:5]

        logger.info(f"Found {len(sorted_highlights)} recent highlights")
        return {'highlights': sorted_highlights}

    except requests.exceptions.RequestException as e:
        logger.error(f"Error making request to MLB API: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch highlights from MLB")
    except Exception as e:
        logger.error(f"Error fetching highlights: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch highlights")

def process_game_highlights(content_data, player_id):
    """Process highlights from a single game's content data"""
    highlights = []
    
    # Look for highlights in game content
    game_highlights = content_data.get('highlights', {}).get('highlights', {}).get('items', [])
    if not game_highlights:
        # Try alternate path for highlights
        game_highlights = content_data.get('highlights', {}).get('live', {}).get('items', [])

    for highlight in game_highlights:
        # If player_id is specified, check if highlight involves the player
        if player_id and not any(keyword.get('type') == 'player_id' and 
                               keyword.get('value') == str(player_id) 
                               for keyword in highlight.get('keywordsAll', [])):
            continue
            
        # Get the best quality playback URL
        playbacks = highlight.get('playbacks', [])
        if playbacks:
            best_playback = max(playbacks, key=lambda x: int(x.get('height', 0) or 0))
            highlights.append({
                'title': highlight.get('title', ''),
                'description': highlight.get('description', ''),
                'url': best_playback.get('url'),
                'date': highlight.get('date'),
                'blurb': highlight.get('blurb', ''),
                'timestamp': highlight.get('date')
            })
    
    return highlights

def process_schedule_data(schedule_data, player_id):
    """Helper function to process schedule data and extract highlights"""
    highlights = []
    for date in schedule_data.get('dates', [])[:10]:
        for game in date.get('games', []):
            game_pk = game.get('gamePk')
            
            # Get game content
            content_url = f'https://statsapi.mlb.com/api/v1/game/{game_pk}/content'
            content_response = requests.get(content_url)
            if content_response.status_code != 200:
                continue
                
            content_data = content_response.json()
            if content_data:
                game_highlights = process_game_highlights(content_data, player_id)
                for highlight in game_highlights:
                    highlight['date'] = date.get('date')  # Add the date from schedule data
                highlights.extend(game_highlights)
    
    return highlights

@app.post("/recommend/add")
async def add_rating(
    user_id: str,
    reel_id: str,
    rating: float,
    table: str = 'user_ratings_db'
):
    try:
        if not all([user_id, reel_id, rating]):
            raise HTTPException(status_code=400, detail="Missing required fields")

        if not (0 <= rating <= 5):
            raise HTTPException(status_code=400, detail="Rating must be between 0 and 5")

        add(user_id, reel_id, rating, table)
        return {'success': True, 'message': 'Rating added successfully'}
    except Exception as e:
        logger.error(f"Error adding rating: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/recommend/remove")
async def remove_rating(
    user_id: str,
    reel_id: str,
    table: str = 'user_ratings_db'
):
    try:
        if not all([user_id, reel_id]):
            raise HTTPException(status_code=400, detail="Missing required fields")

        remove(user_id, reel_id, table)
        return {'success': True, 'message': 'Rating removed successfully'}
    except Exception as e:
        logger.error(f"Error removing rating: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommend/predict")
async def get_model_recommendations(
    user_id: int,
    page: int = 1,
    per_page: int = 5,
    table: str = 'user_ratings_db'
):
    """
    Get personalized video recommendations for a user.
    Falls back to popular videos if no personalized recommendations are available.
    """
    try:
        logger.info(f"Getting recommendations for user {user_id}, page {page}, per_page {per_page}")
        offset = (page - 1) * per_page
        
        recommendations, has_more = run_main(table, user_id=user_id, num_recommendations=per_page, offset=offset)
        
        if recommendations:
            logger.info(f"Found {len(recommendations)} recommendations for user {user_id}")
            return {
                'success': True,
                'recommendations': recommendations,
                'has_more': has_more
            }
        else:
            logger.warning(f"No recommendations found for user {user_id}")
            # Instead of raising a 404, return an empty list with success=true
            return {
                'success': True,
                'recommendations': [],
                'has_more': False,
                'message': 'No recommendations available at this time'
            }
        
    except Exception as e:
        logger.error(f"Error getting model recommendations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommend/follow")
async def get_follow_recommendations(
    current_user: User = Depends(get_current_user),
    table: str = 'mlb_highlights',
    page: int = 1,
    per_page: int = 5
):
    try:
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Extract team names and player names from the JSON objects
        followed_teams = [team.get('name', '') for team in (current_user.followed_teams or [])]
        followed_players = [player.get('fullName', '') for player in (current_user.followed_players or [])]

        if not followed_teams and not followed_players:
            raise HTTPException(status_code=400, detail="No teams or players followed")

        # Calculate offset for pagination
        offset = (page - 1) * per_page

        # Get multiple videos for followed teams/players with pagination
        engine = create_engine(get_database_url())
        query = text(f"""
            SELECT id as reel_id FROM {table} 
            WHERE player = ANY(:players) OR home_team = ANY(:teams) OR away_team = ANY(:teams)
            ORDER BY RANDOM()
            OFFSET :offset
            LIMIT :limit
        """)

        with engine.connect() as connection:
            results = connection.execute(query, {
                "players": followed_players, 
                "teams": followed_teams,
                "offset": offset,
                "limit": per_page + 1  # Get one extra to check if there are more
            }).fetchall()
            
            if results:
                has_more = len(results) > per_page
                recommendations = [{"reel_id": row[0]} for row in results[:per_page]]
                return {
                    'success': True,
                    'recommendations': recommendations,
                    'has_more': has_more
                }
            
            raise HTTPException(status_code=404, detail="No matching videos found")
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error fetching follow recommendations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Pydantic model for blurb request
class BlurbRequest(BaseModel):
    title: str

@app.post("/api/generate-blurb")
async def generate_blurb(request: BlurbRequest):
    """Generate a short blurb description for a video title"""
    try:
        logger.info(f"Generating blurb for title: {request.title}")
        
        if not request.title:
            raise HTTPException(status_code=400, detail="Title is required")

        title = re.sub(r"\s*\([^)]*\)$", "", request.title)

        prompt = f"Generate a short and engaging description for the baseball video titled: {title}. Keep your response to under 20 words. Your response should start with the content and just one sentence. Do not include filler like OK, here is a short and engaging description."
        description = run_gemini_prompt(prompt)
        
        if not description:
            raise HTTPException(status_code=500, detail="Failed to generate description")
            
        if ':' in description:
            description = description.split(':', 1)[1].strip()
            
        return {
            "success": True,
            "description": description
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in generating description: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Translation routes
translate_client = translate.Client()

@app.post("/api/translate")
async def translate_text(text: str, target_language: str = 'en'):
    try:
        if not text:
            raise HTTPException(status_code=400, detail="No text provided for translation")

        # Perform translation
        result = translate_client.translate(
            text,
            target_language=target_language
        )

        return {
            'success': True,
            'translatedText': result['translatedText'],
            'sourceLanguage': result['detectedSourceLanguage']
        }

    except Exception as e:
        logger.error(f"Translation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Translation failed")

@app.get("/api/mlb/schedule")
async def get_mlb_schedule(
    teamId: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None
):
    try:
        response = requests.get(
            'https://statsapi.mlb.com/api/v1/schedule',
            params={
                'teamId': teamId,
                'startDate': startDate,
                'endDate': endDate,
                'sportId': 1,
                'hydrate': 'team,venue'
            }
        )
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preferences")
async def get_preferences(current_user: User = Depends(get_current_user)):
    return {
        'success': True,
        'preferences': {
            'teams': current_user.followed_teams or [],
            'players': current_user.followed_players or []
        }
    }

@app.put("/api/preferences")
async def update_preferences(
    teams: List[dict],
    players: List[dict],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        current_user.followed_teams = teams
        current_user.followed_players = players
        db.commit()
        
        return {
            'success': True,
            'message': 'Preferences updated successfully',
            'preferences': {
                'teams': current_user.followed_teams,
                'players': current_user.followed_players
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/mlb/teams")
async def get_mlb_teams():
    try:
        logger.info("Attempting to fetch MLB teams...")
        response = requests.get(
            'https://statsapi.mlb.com/api/v1/teams',
            params={'sportId': 1},
            timeout=15,
            headers={
                'Accept': 'application/json',
                'User-Agent': 'MLBFanFeed/1.0'
            }
        )
        logger.info(f"MLB API Response Status: {response.status_code}")
        
        response_data = response.json()
        return {
            'teams': response_data.get('teams', []),
            'copyright': response_data.get('copyright', '')
        }
        
    except requests.exceptions.Timeout:
        logger.error("Timeout while fetching MLB teams")
        raise HTTPException(
            status_code=504,
            detail="Request to MLB API timed out. Please try again."
        )
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching MLB teams: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch teams from MLB API: {str(e)}"
        )
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.get("/api/mlb/video")
async def get_video_url_endpoint(play_id: str):
    """Get video URL and metadata from database using play ID"""
    try:
        if not play_id:
            raise HTTPException(status_code=400, detail="Play ID is required")

        video_data = get_video_url(play_id)
        if not video_data:
            raise HTTPException(status_code=404, detail="Video not found")

        return {
            'success': True,
            'video_url': video_data['video_url'],
            'title': video_data['title'],
            'blurb': video_data['blurb']
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error fetching video URL: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test")
async def test():
    """Test endpoint to verify server is running"""
    return {
        'success': True,
        'message': 'Backend server is running',
        'timestamp': datetime.utcnow().isoformat()
    }

# Add MLB routes
app.include_router(mlb_router)