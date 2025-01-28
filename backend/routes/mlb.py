from fastapi import APIRouter, HTTPException
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/api/mlb/teams")
async def get_teams():
    try:
        logger.info("Fetching MLB teams...")
        response = requests.get('https://statsapi.mlb.com/api/v1/teams?sportId=1')
        response.raise_for_status()
        data = response.json()
        logger.info(f"Successfully fetched {len(data.get('teams', []))} teams")
        return data
    except requests.RequestException as e:
        logger.error(f"Error fetching teams: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching teams: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/mlb/roster/{team_id}")
async def get_roster(team_id: int):
    try:
        logger.info(f"Fetching roster for team {team_id}...")
        response = requests.get(
            f'https://statsapi.mlb.com/api/v1/teams/{team_id}/roster?season=2024'
        )
        response.raise_for_status()
        data = response.json()
        logger.info(f"Successfully fetched roster with {len(data.get('roster', []))} players")
        return data
    except requests.RequestException as e:
        logger.error(f"Error fetching roster: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching roster: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 