FROM node:20-slim

# Install necessary requirements for Playwright and basic toolsets
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && npx -y playwright@1.49.0 install --with-deps chromium \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install TSX and other global requirements needed for MCP processes
RUN npm install -g tsx npx

COPY package*.json ./
RUN npm install --ignore-scripts

COPY . .

# Expose the express port so cloud providers don't kill the container thinking it crashed
EXPOSE 8080
ENV PORT=8080

CMD ["tsx", "src/index.ts"]
