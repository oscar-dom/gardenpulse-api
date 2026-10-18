# GardenPulse API

REST API for monitoring a garden: sensors, their readings and automatic anomaly detection.

> Work in progress. This README grows with the project.

## Tech stack

Node.js 22 · TypeScript · Express 5 · MongoDB + Mongoose · Zod · Vitest + Supertest

## Getting started

### Prerequisites

- Node.js 22 or later
- A free MongoDB Atlas cluster (step-by-step guide coming soon)

### Setup

```bash
npm install
cp .env.example .env   # then edit the values
npm run seed:admin     # creates the first admin from ADMIN_* in .env (once)
npm run dev
```

New accounts always get the `user` role. Someone can ask for the admin role when
signing up (`"requestAdmin": true`), and an existing admin approves or rejects the request.

The API listens on `http://localhost:3000` by default. Check it with:

```bash
curl http://localhost:3000/api/health
```

### API documentation

With the server running, open **http://localhost:3000/api/docs** for the interactive
OpenAPI documentation (Swagger UI). Log in with `POST /auth/login`, click **Authorize**
and paste the token to try the protected endpoints. The raw spec is at
`/api/docs/openapi.json`.

### Trying the API

[`docs/api.http`](docs/api.http) contains ready-to-send requests for every endpoint.
Open it in VS Code with the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
extension and click **Send Request** above any request.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the server in watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run seed:admin` | Create the first admin account from `.env` (safe to rerun) |
| `npm test` | Run the test suite |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format code with Prettier |

## Project structure

```
src/
├── app.ts          # Express app (middlewares, routes); does not start the server
├── server.ts       # connects to MongoDB and starts the server
├── seed-admin.ts   # creates the first admin (npm run seed:admin)
├── config/         # environment variables and database connection
├── errors/         # application error class
├── schemas/        # Zod input validation schemas
├── middlewares/    # authentication, authorization, validation, error handling
├── docs/           # OpenAPI specification (openapi.json, served at /api/docs)
├── routes/
├── controllers/
├── services/
├── models/
└── types/
tests/
└── integration/    # Vitest + Supertest
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
