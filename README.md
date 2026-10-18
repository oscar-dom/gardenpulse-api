# GardenPulse API

REST API for monitoring a vegetable garden. Sensors measure soil moisture, temperature,
light or air humidity; every reading is stored and the server flags it as **anomalous**
when it crosses the sensor's threshold.

- Sign up and log in with JWT; passwords hashed with bcrypt.
- Two roles: **admin** manages the sensor catalog, **user** reads sensors and records readings.
- Reading history with pagination, filters (sensor, type, anomaly, dates) and sorting, all combinable.
- Consistent JSON responses and validation errors that name every wrong field.
- Interactive OpenAPI documentation and integration tests.

## Tech stack

Node.js 22 · TypeScript · Express 5 · MongoDB Atlas + Mongoose · Zod · JWT · bcrypt ·
Swagger UI · Vitest + Supertest

## Getting started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) 22 or later (includes npm). Works on Windows, macOS and Linux.
- A free MongoDB Atlas account (next step). No local database is needed.

### 2. Create a MongoDB Atlas database

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register) and
   create a project.
2. **Create a cluster:** choose the free **M0** tier, any provider (e.g. AWS) and a region
   close to you.
3. **Create a database user:** in *Database Access*, add a user with a username and
   password, and the *Read and write to any database* role. Keep the password.
4. **Allow your IP:** in *Network Access*, add your current IP address
   (or `0.0.0.0/0` to allow any IP, for testing only).
5. **Get the connection string:** in *Clusters*, click **Connect** → **Drivers** and copy
   the URI. It looks like:

   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `<user>` and `<password>`, and add the database name `gardenpulse` before the
   `?`:

   ```
   mongodb+srv://ada:s3cret@cluster0.abcde.mongodb.net/gardenpulse?retryWrites=true&w=majority
   ```

   The database and its collections are created automatically on first use.

### 3. Install and configure

```bash
git clone https://github.com/oscar-dom/gardenpulse-api.git
cd gardenpulse-api
npm install
cp .env.example .env        # Windows (cmd): copy .env.example .env
```

Edit `.env`:

| Variable | Description |
|---|---|
| `MONGODB_URI` | The Atlas connection string from step 2 |
| `JWT_SECRET` | Random string of 32+ characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1h` (default) |
| `PORT` | HTTP port, `3000` by default |
| `NODE_ENV` | `development` (default), `test` or `production` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin account, used only by `npm run seed:admin` |

If a variable is missing or invalid, the server stops at startup and says which one.

### 4. Create the first admin and start

```bash
npm run seed:admin   # creates the admin from ADMIN_* (safe to rerun)
npm run dev          # starts the API with auto-reload
```

You should see `MongoDB connected: ...` and
`GardenPulse API listening on http://localhost:3000`. Check it with
`curl http://localhost:3000/api/health`.

For a production-like run: `npm run build` and then `npm start`.

## Trying the API

### Interactive documentation

Open **http://localhost:3000/api/docs** (Swagger UI). Every endpoint is described with
its body, parameters and possible responses, and can be tried from the browser:

1. `POST /auth/login` with the admin email and password from `.env` → copy the `token`.
2. Click **Authorize**, paste the token and confirm.
3. Try the protected endpoints, e.g. `POST /sensors`, then
   `POST /sensors/{id}/readings` and `GET /readings`.

The raw spec is at `/api/docs/openapi.json`.

### REST Client file

[`docs/api.http`](docs/api.http) has ready-to-send requests for every endpoint, in the
order of a typical session: sign up, log in (the token is saved automatically), create a
sensor, record normal and anomalous readings, and query the history. Open it in VS Code
with the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
extension and click **Send Request** above each request. Set `@adminEmail` and
`@adminPassword` at the top of the file to the `ADMIN_*` values of your `.env`.

### A typical flow

1. **Sign up** (`POST /api/auth/register`). New accounts are always `user`. Add
   `"requestAdmin": true` to ask for the admin role.
2. **Log in** (`POST /api/auth/login`) and send the token as
   `Authorization: Bearer <token>` from then on.
3. An **admin** reviews requests (`GET /api/users/admin-requests`,
   `PATCH /api/users/:id/admin-request`) and manages sensors (`POST`, `PATCH`,
   `DELETE /api/sensors`).
4. Any logged-in user **records readings** (`POST /api/sensors/:id/readings`) and queries
   the **history**, for example:

   ```
   GET /api/readings?type=soil_moisture&anomalous=true&sort=-timestamp&page=1&limit=10
   ```

## Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Service status |
| POST | `/api/auth/register` | Public | Sign up |
| POST | `/api/auth/login` | Public | Log in, returns a JWT |
| GET | `/api/auth/me` | Logged in | Current user |
| GET | `/api/users/admin-requests` | Admin | Pending admin requests |
| PATCH | `/api/users/:id/admin-request` | Admin | Approve or reject a request |
| GET | `/api/sensors` | Logged in | List sensors (paginated, filter by `type`, `active`) |
| GET | `/api/sensors/:id` | Logged in | Sensor detail |
| POST | `/api/sensors` | Admin | Create a sensor |
| PATCH | `/api/sensors/:id` | Admin | Update a sensor |
| DELETE | `/api/sensors/:id` | Admin | Delete a sensor (`?cascade=true` also deletes its readings) |
| POST | `/api/sensors/:id/readings` | Logged in | Record a reading |
| GET | `/api/readings` | Logged in | Reading history (`page`, `limit`, `sensor`, `type`, `anomalous`, `from`, `to`, `sort`) |
| GET | `/api/readings/:id` | Logged in | Reading detail |

### Response format

```jsonc
// Success
{ "status": "success", "data": { "sensor": { "id": "...", "name": "..." } } }

// Paginated list
{ "status": "success", "data": { "readings": [] },
  "meta": { "page": 1, "limit": 20, "totalItems": 57, "totalPages": 3,
            "hasNextPage": true, "hasPrevPage": false } }

// Error (4xx → "fail", 5xx → "error")
{ "status": "fail", "error": "Forbidden",
  "message": "You do not have permission to perform this action." }

// Validation error
{ "status": "fail", "error": "ValidationError", "message": "The request data is not valid.",
  "details": [{ "location": "body", "field": "threshold", "message": "threshold must be a number" }] }
```

Status codes: `200` OK · `201` created (with a `Location` header) · `204` deleted ·
`400` invalid input · `401` not logged in · `403` role not allowed · `404` not found ·
`409` conflict with the current state.

## Tests

```bash
npm test
```

Integration tests with Vitest and Supertest run against an in-memory MongoDB
([mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server)), so they
need no Atlas connection and never touch real data. The first run downloads a MongoDB
binary, which can take a minute. CI runs type checking, linting, formatting, tests and
the build on every pull request.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the server in watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run seed:admin` | Create the first admin account from `.env` (safe to rerun) |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run the tests in watch mode |
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
├── routes/         # URL → middlewares → controller
├── controllers/    # HTTP in/out: read the request, send the response
├── services/       # business logic (anomaly rule, pagination, ...)
├── models/         # Mongoose schemas: User, Sensor, Reading
└── types/          # type augmentations (req.user)
tests/
└── integration/    # Vitest + Supertest
docs/
└── api.http        # REST Client requests
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
