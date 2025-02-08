 # Energy project backend

## Table of Contents

- [Project Features](#project-features)
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Database Seeding](#database-seeding)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Testing](#testing)

## Project Features

- **All required Endpoints**

  - Comprehensive implementations of all required endpoints and workflows.

- **Swagger Documentation**

  - Comprehensive API documentation using Swagger.

- **Automated Testing**
  - Unit tests for services and controllers.
  - e2e tests to cover API endpoints and middleware.

## Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/en/download/) (v14 or later)
- [MongoDB](https://www.mongodb.com/try/download/community) (can be local or cloud-based like MongoDB Atlas)
- [NestJS CLI](https://docs.nestjs.com/cli/overview) (optional but useful for development)
- [Prisma](https://www.prisma.io/) (ORM for MongoDB)

## Project Setup

1. **Clone the repository:**

   ```bash
   git clone git@github.com:Skillz-systems/energy-project-backend.git
   cd energy-project-backend
   ```

2. **Install Dependencies**

```bash
  pnpm i
  npx prisma generate
```

3. **Configure MongoDB**
   You need a MongoDB instance running. If you don't have MongoDB installed locally, you can either:

- Install it locally
- Use MongoDB Atlas, a cloud-hosted MongoDB solution: MongoDB Atlas Setup Guide

Once your MongoDB instance is ready, make sure you have your connection string.

4. **Set Up Environment Variables**

   ```bash
    cp .env.example .env
   ```

   Edit the .env file with your MongoDB connection string and other configurations

5. **Run the Application** 
   ```bash
    npm run start:dev
   ```

## Database Seeding

A seed.ts file has been made availble in the prisma folder to help seed the database. Add your custom logic and run

```bash
 npx prisma db seed
```

## API Documentation

Swagger is integrated into this project for automatic API documentation. After running the application, you can access the Swagger UI to view and interact with the API endpoints:

```bash
    http://localhost:3000/api-docs
```

The Swagger documentation will include all the available routes and their respective methods, parameters, and expected responses.

## Contributing

If you wish to contribute to the project:

Create a new feature branch (git checkout -b feature-branch).
Commit your changes (git commit -m 'Add new feature').
Push the branch (git push origin feature-branch).
Open a pull request.

## Testing

Ensure all independently developed units of software work correctly when they are connected to each other by running tests.

for unit tests

```bash
    pnpm test
```

for integration/e2e tests

```bash
    pnpm test:e2e
```
