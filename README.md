# MLB Fan Feed

A personalized MLB news feed that delivers AI-powered updates about your favorite team and player.

## Features

- 🏃‍♂️ Real-time MLB updates
- 🤖 AI-powered news digests using Gemini
- 📊 Team and player statistics
- 🎥 MLB video highlights
- 📱 Mobile-friendly design

## Quick Start

### Prerequisites

- Node.js 16+
- Python 3.9+
- Docker

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/GentleOtaku/GoatSquad
   cd GoatSquad
   ```
2. Edit .env files (there should be 2) 
   
3. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. Start the backend:
   ```bash
   cd backend
   python app.py
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm start
   ```

### Docker Setup

1. Build the Docker image:
   ```bash
   docker-compose build
   ```

2. Run the Docker containers:
   ```bash
   docker-compose up
   ```

### Running Test Cases

#### Frontend
```bash
npm test                           # Run all tests
npm test -- --coverage            # Run tests with coverage
npm test -- --watch              # Watch mode
npm test -- ComponentName.test.js # Test specific file
```

#### Backend
```bash
pytest                           # Run all tests
pytest -v                        # Verbose output
pytest --cov=.                   # Coverage report
pytest tests/test_file.py        # Test specific file
```
