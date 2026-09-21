FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.server.json vite.config.ts vitest.config.ts ./
COPY server ./server
COPY ui ./ui
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=8787
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8787
CMD ["node", "dist/server/index.js"]
