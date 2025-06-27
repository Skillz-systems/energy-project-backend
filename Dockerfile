# Step 1: Build the NestJS application
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Step 2: Create a lightweight image for production
FROM node:20
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

RUN npm install @css-inline/css-inline-linux-x64-gnu

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/main"]
