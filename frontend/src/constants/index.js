export const API_ENDPOINTS = {
  MLB_TEAMS: 'https://statsapi.mlb.com/api/v1/teams?sportId=1',
  MLB_ROSTER: (teamId) => `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=2024`,
  TEAM_LOGO: (teamId) => `https://www.mlbstatic.com/team-logos/${teamId}.svg`
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  FOLLOWED_TEAMS: 'followedTeams',
  FOLLOWED_PLAYERS: 'followedPlayers',
  SELECTED_TEAM: 'selectedTeam',
  SELECTED_PLAYER: 'selectedPlayer'
};

export const VIDEO_URL = "https://mlb-cuts-diamond.mlb.com/FORGE/2024/2024-10/25/1f63eb4b-5d716856-889ba75a-csvm-diamondgcp-asset_1280x720_59_4000K.mp4"; 