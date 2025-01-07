import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { usePreferences } from '../hooks/usePreferences';

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { preferences } = usePreferences();

  useEffect(() => {
    const fetchGames = async () => {
      if (!preferences?.teams?.length) return;
      
      setLoading(true);
      try {
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        // Fetch games for all followed teams
        const gamePromises = preferences.teams.map(team => 
          axios.get(`https://statsapi.mlb.com/api/v1/schedule`, {
            params: {
              startDate,
              endDate,
              sportId: 1,
              teamId: team.id,
              hydrate: 'team,venue'
            }
          })
        );

        const responses = await Promise.all(gamePromises);
        
        // Combine and transform all games
        const allEvents = responses.flatMap(response => {
          const teamId = response.config.params.teamId;
          const team = preferences.teams.find(t => t.id === teamId);
          
          return response.data.dates.flatMap(date => 
            date.games.map(game => ({
              id: game.gamePk,
              title: `${game.teams.away.team.name} @ ${game.teams.home.team.name}`,
              date: new Date(game.gameDate),
              venue: game.venue.name,
              time: format(new Date(game.gameDate), 'h:mm a'),
              isHome: game.teams.home.team.id === team.id,
              opponent: game.teams.home.team.id === team.id 
                ? game.teams.away.team.name 
                : game.teams.home.team.name,
              teamName: team.name,
              teamColor: getTeamColor(team.name) // Add team color for visual distinction
            }))
          );
        });

        // Sort events by date and time
        const sortedEvents = allEvents.sort((a, b) => a.date - b.date);
        setEvents(sortedEvents);
      } catch (error) {
        console.error('Error fetching MLB games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [currentDate, preferences?.teams]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Helper function to get team color (you can expand this with actual team colors)
  const getTeamColor = (teamName) => {
    const colors = {
      'New York Yankees': 'navy',
      'Boston Red Sox': 'red',
      'Los Angeles Dodgers': 'blue',
      // Add more team colors as needed
      'default': 'gray'
    };
    return colors[teamName] || colors.default;
  };

  if (!preferences?.teams?.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No teams selected</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please select teams in your profile preferences to view their schedules.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Team Schedules
          </h2>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={previousMonth} 
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            
            <button 
              onClick={nextMonth} 
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
          {/* Events List */}
          <div className="col-span-1 space-y-4">
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No games scheduled for {format(currentDate, 'MMMM yyyy')}.
                </p>
              </div>
            ) : (
              events.map(event => (
                <div 
                  key={event.id} 
                  className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border ${
                    event.isHome 
                      ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        event.isHome 
                          ? 'bg-green-100 dark:bg-green-900/40' 
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <span className="text-xs font-medium" style={{ color: event.teamColor }}>
                          {event.teamName.substring(0, 3).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.teamName} {event.isHome ? 'vs' : '@'} {event.opponent}
                      </h4>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {format(event.date, 'MMM d, yyyy')} at {event.time}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {event.venue}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Calendar Grid */}
          <div className="col-span-1 lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="grid grid-cols-7 gap-px border-b border-gray-200 dark:border-gray-700">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="px-2 py-3">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">{day}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
                {daysInMonth.map(day => {
                  const dayEvents = events.filter(event => 
                    format(event.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                  );
                  
                  return (
                    <div
                      key={day.toString()}
                      className={`
                        min-h-[100px] bg-white dark:bg-gray-800 p-2
                        ${!isSameMonth(day, currentDate) ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-100'}
                        ${isToday(day) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      `}
                    >
                      <div className="text-right text-sm">{format(day, 'd')}</div>
                      <div className="space-y-1">
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            className="mt-1 text-xs truncate rounded p-1 flex items-center space-x-1"
                            style={{
                              backgroundColor: `${event.teamColor}20`,
                              borderLeft: `3px solid ${event.teamColor}`
                            }}
                          >
                            <span className="font-medium" style={{ color: event.teamColor }}>
                              {event.teamName.substring(0, 3).toUpperCase()}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {event.time} {event.isHome ? 'vs' : '@'} {event.opponent}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Calendar; 