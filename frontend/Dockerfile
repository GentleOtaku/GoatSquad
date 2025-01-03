FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install tailwindcss and typography plugin globally
RUN npm install -g tailwindcss
RUN npm install -D @tailwindcss/typography

# Copy configuration files
COPY tailwind.config.js .
COPY postcss.config.js .

# Copy source files
COPY . .

# Create the styles directory and CSS file
RUN mkdir -p src/styles && \
    echo "@tailwind base; @tailwind components; @tailwind utilities;" > src/styles/tailwind.css && \
    npx tailwindcss -i ./src/styles/tailwind.css -o ./src/styles/output.css

# Set permissions
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Update the start command
CMD ["npm", "run", "dev"]
