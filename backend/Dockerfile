FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "migrate", "&&", "npm", "start"]
