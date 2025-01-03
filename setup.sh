#!/bin/bash

# Check if required tools are installed
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl is required but not installed. Aborting." >&2; exit 1; }

# Create required directories
mkdir -p .github/workflows

# Create GitHub Actions workflow file
cat > .github/workflows/docker-build.yml << 'EOF'
name: Build and Push Docker Images

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  BACKEND_IMAGE_NAME: ${{ github.repository }}-backend
  FRONTEND_IMAGE_NAME: ${{ github.repository }}-frontend

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v2

      - name: Log in to the Container registry
        uses: docker/login-action@v1
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Backend image
        uses: docker/build-push-action@v2
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.BACKEND_IMAGE_NAME }}:latest

      - name: Build and push Frontend image
        uses: docker/build-push-action@v2
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.FRONTEND_IMAGE_NAME }}:latest

      - name: Create webhook event
        if: success()
        run: |
          curl -X POST ${{ secrets.PORTAINER_WEBHOOK_URL }}
EOF

echo "Setup complete! Remember to:"
echo "1. Add PORTAINER_WEBHOOK_URL to your GitHub repository secrets"
echo "2. Enable read/write permissions for GitHub Actions"
echo "3. Configure your Portainer stack with the provided docker-compose.yml" 