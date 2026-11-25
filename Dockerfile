FROM node:24-bookworm-slim
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package*.json ./
RUN npm ci --include=dev
COPY --chown=node:node . .
EXPOSE 8080
ENV PORT=8080
CMD ["npm", "start"]
