import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    // Load saved preferences
    const savedTeam = JSON.parse(localStorage.getItem('selectedTeam'));
    setSelectedTeam(savedTeam);
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      if (!selectedTeam) return;
      
      setLoading(true);
      try {
        const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        const response = await axios.get(`https://statsapi.mlb.com/api/v1/schedule`, {
          params: {
            startDate,
            endDate,
            sportId: 1,
            teamId: selectedTeam.id,
            hydrate: 'team,venue'
          }
        });

        // Transform the MLB data into our event format
        const transformedEvents = response.data.dates.flatMap(date => 
          date.games.map(game => ({
            id: game.gamePk,
            title: `${game.teams.away.team.name} @ ${game.teams.home.team.name}`,
            date: new Date(game.gameDate),
            venue: game.venue.name,
            time: format(new Date(game.gameDate), 'h:mm a'),
            isHome: game.teams.home.team.id === selectedTeam.id,
            opponent: game.teams.home.team.id === selectedTeam.id 
              ? game.teams.away.team.name 
              : game.teams.home.team.name
          }))
        );

        setEvents(transformedEvents);
      } catch (error) {
        console.error('Error fetching MLB games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [currentDate, selectedTeam]);

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

  if (!selectedTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">No team selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select a team in your profile preferences to view the calendar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {selectedTeam.name} Schedule
          </h2>
          
          <div className="flex items-center space-x-4">
            <button onClick={previousMonth} className="p-2 text-gray-600 hover:text-gray-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h3 className="text-xl font-medium text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            
            <button onClick={nextMonth} className="p-2 text-gray-600 hover:text-gray-900">
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
                  <div key={i} className="bg-gray-100 p-4 rounded-lg">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <p className="text-gray-500 text-sm">
                  No games scheduled for {format(currentDate, 'MMMM yyyy')}.
                </p>
              </div>
            ) : (
              events.map(event => (
                <div 
                  key={event.id} 
                  className={`bg-white p-4 rounded-lg shadow-sm border ${
                    event.isHome ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        event.isHome ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <svg className={`w-6 h-6 ${
                          event.isHome ? 'text-green-600' : 'text-gray-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d={event.isHome 
                              ? "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                              : "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                            }
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        {event.isHome ? 'vs' : '@'} {event.opponent}
                      </h4>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {format(event.date, 'MMM d, yyyy')} at {event.time}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
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
            <div className="bg-white rounded-lg shadow">
              <div className="grid grid-cols-7 gap-px border-b border-gray-200">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="px-2 py-3">
                    <div className="text-xs font-medium text-gray-500 text-center">{day}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {daysInMonth.map(day => {
                  const dayEvents = events.filter(event => 
                    format(event.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                  );
                  
                  return (
                    <div
                      key={day.toString()}
                      className={`
                        min-h-[100px] bg-white p-2
                        ${!isSameMonth(day, currentDate) ? 'text-gray-400' : ''}
                        ${isToday(day) ? 'bg-blue-50' : ''}
                      `}
                    >
                      <div className="text-right text-sm">{format(day, 'd')}</div>
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          className={`mt-1 text-xs truncate rounded p-1 ${
                            event.isHome 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {event.time} - {event.isHome ? 'vs' : '@'} {event.opponent}
                        </div>
                      ))}
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