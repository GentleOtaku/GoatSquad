import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import TeamPlayerSelector from '../TeamPlayerSelector';

// Mock axios
jest.mock('axios');

// Mock TranslatedText component
jest.mock('../TranslatedText', () => {
  return function MockTranslatedText({ text }) {
    return <span data-testid={`translated-${text.toLowerCase().replace(/\s+/g, '-')}`}>{text}</span>;
  };
});

describe('TeamPlayerSelector', () => {
  const mockTeams = {
    teams: [
      { id: 1, name: 'New York Yankees' },
      { id: 2, name: 'Boston Red Sox' }
    ]
  };

  const mockRoster = {
    roster: [
      { 
        person: { id: 1, fullName: 'John Doe' },
        position: { abbreviation: 'P' }
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    axios.get.mockResolvedValueOnce({ data: mockTeams });
    render(<TeamPlayerSelector onSelect={() => {}} />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders teams after loading', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTeams });
    
    await act(async () => {
      render(<TeamPlayerSelector onSelect={() => {}} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('New York Yankees')).toBeInTheDocument();
      expect(screen.getByText('Boston Red Sox')).toBeInTheDocument();
    });
  });

  it('filters teams based on search query', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTeams });
    
    await act(async () => {
      render(<TeamPlayerSelector onSelect={() => {}} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('New York Yankees')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'Yankees' } });

    expect(screen.getByText('New York Yankees')).toBeInTheDocument();
    expect(screen.queryByText('Boston Red Sox')).not.toBeInTheDocument();
  });

  it('calls onSelect when a team is clicked', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTeams });
    const mockOnSelect = jest.fn();
    
    await act(async () => {
      render(<TeamPlayerSelector onSelect={mockOnSelect} followedTeams={[]} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('New York Yankees')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New York Yankees'));
    
    expect(mockOnSelect).toHaveBeenCalledWith({
      team: expect.objectContaining({ id: 1, name: 'New York Yankees' })
    });
  });

  it('prevents selecting already followed teams', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTeams });
    const mockOnSelect = jest.fn();
    const followedTeams = [{ id: 1, name: 'New York Yankees' }];
    
    await act(async () => {
      render(
        <TeamPlayerSelector 
          onSelect={mockOnSelect} 
          followedTeams={followedTeams}
        />
      );
    });
    
    await waitFor(() => {
      const yankeeButton = screen.getByText('New York Yankees').closest('button');
      expect(yankeeButton).toBeDisabled();
    });
  });

  it('handles error state when fetching teams fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('Failed to fetch teams'));
    
    await act(async () => {
      render(<TeamPlayerSelector onSelect={() => {}} />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('translated-failed-to-fetch-teams')).toBeInTheDocument();
      expect(screen.getByTestId('translated-retry')).toBeInTheDocument();
    });
  });

  it('fetches roster when team is selected', async () => {
    axios.get
      .mockResolvedValueOnce({ data: mockTeams })
      .mockResolvedValueOnce({ data: mockRoster });

    await act(async () => {
      render(<TeamPlayerSelector onSelect={() => {}} />);
    });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('translated-players')).toBeInTheDocument();
    });

    // Switch to players view
    await act(async () => {
      fireEvent.click(screen.getByTestId('translated-players'));
    });

    // Select a team from dropdown
    const teamSelect = await screen.findByRole('combobox');
    await act(async () => {
      fireEvent.change(teamSelect, { target: { value: '1' } });
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/roster/1'));
    });
  });

  it('filters players based on search query', async () => {
    axios.get
      .mockResolvedValueOnce({ data: mockTeams })
      .mockResolvedValueOnce({ data: mockRoster });

    await act(async () => {
      render(<TeamPlayerSelector onSelect={() => {}} />);
    });

    // Wait for initial load and switch to players view
    await waitFor(() => {
      expect(screen.getByTestId('translated-players')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('translated-players'));
    });

    // Select a team
    const teamSelect = await screen.findByRole('combobox');
    await act(async () => {
      fireEvent.change(teamSelect, { target: { value: '1' } });
    });

    // Search for player
    const searchInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('handles player selection', async () => {
    const mockOnSelect = jest.fn();
    axios.get
      .mockResolvedValueOnce({ data: mockTeams })
      .mockResolvedValueOnce({ data: mockRoster });

    await act(async () => {
      render(<TeamPlayerSelector onSelect={mockOnSelect} followedPlayers={[]} />);
    });

    // Switch to players view
    await act(async () => {
      fireEvent.click(screen.getByTestId('translated-players'));
    });

    // Select a team
    const teamSelect = await screen.findByRole('combobox');
    await act(async () => {
      fireEvent.change(teamSelect, { target: { value: '1' } });
    });

    // Wait for player to appear and click it
    await waitFor(() => {
      fireEvent.click(screen.getByText('John Doe'));
    });

    expect(mockOnSelect).toHaveBeenCalledWith({
      player: expect.objectContaining({ id: 1, fullName: 'John Doe' })
    });
  });

  it('prevents selecting already followed players', async () => {
    axios.get
      .mockResolvedValueOnce({ data: mockTeams })
      .mockResolvedValueOnce({ data: mockRoster });

    const followedPlayers = [{ id: 1, fullName: 'John Doe' }];
    
    await act(async () => {
      render(
        <TeamPlayerSelector 
          onSelect={() => {}} 
          followedPlayers={followedPlayers}
        />
      );
    });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('translated-players')).toBeInTheDocument();
    });

    // Switch to players view
    await act(async () => {
      fireEvent.click(screen.getByTestId('translated-players'));
    });

    // Select a team and wait for roster to load
    const teamSelect = await screen.findByRole('combobox');
    await act(async () => {
      fireEvent.change(teamSelect, { target: { value: '1' } });
    });

    // Wait for roster to load and verify button is disabled
    await waitFor(() => {
      const playerButton = screen.getByText('John Doe').closest('button');
      expect(playerButton).toHaveAttribute('disabled');
    });
  });

  it('handles roster loading state', async () => {
    axios.get
      .mockResolvedValueOnce({ data: mockTeams })
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    await act(async () => {
      render(<TeamPlayerSelector onSelect={() => {}} />);
    });

    // Switch to players view
    await act(async () => {
      fireEvent.click(screen.getByTestId('translated-players'));
    });

    // Select a team
    const teamSelect = await screen.findByRole('combobox');
    await act(async () => {
      fireEvent.change(teamSelect, { target: { value: '1' } });
    });

    // Check for loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
}); 