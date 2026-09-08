FROM node:20-alpine
WORKDIR /app

# Install production dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy the rest of the project
COPY . .

# Regenerate the static HTML pages from generator/ into public/
RUN node generator/build.js

ENV PORT=3000
EXPOSE 3000
CMD ["node", "src/server.js"]
