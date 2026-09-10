FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["node", "backend/src/server.js"]
