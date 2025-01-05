FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Expose the port from environment variable
EXPOSE ${BACKEND_PORT}

# Use environment variables in the command
CMD ["sh", "-c", "python app.py --host ${HOST} --port ${BACKEND_PORT}"]