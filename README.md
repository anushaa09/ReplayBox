# 🚀 ReplayBox — Fintech API Reliability Platform

**ReplayBox** is a Node.js and Express-based API reliability platform that records sanitised API interactions, replays requests against test services, detects response regressions, and stores results in MongoDB.

> This is a simulated fintech portfolio project inspired by backend engineering challenges. It is not affiliated with Niyo and does not connect to real banking systems or process real transactions.

## ✨ Features

- **API Capture:** Records API requests and responses after sanitising sensitive information.
- **Request Replay:** Replays captured requests against a test API.
- **Regression Detection:** Compares original and replayed responses to identify unexpected changes.
- **JSON Response Diffing:** Highlights changed and added fields and HTTP status changes.
- **Version Tracking:** Tracks response behaviour across application versions.
- **MongoDB Persistence:** Stores projects, API captures, and replay results using MongoDB Atlas and Mongoose.
- **Secure API Access:** Uses API-key authentication and replay-target restrictions.
- **Interactive Dashboard:** Displays captures, replay results, and regression history.
- **Automated Testing:** Tests authentication, validation, sanitisation, response comparison, and replay security.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| API | REST APIs |
| Testing | Node.js Test Runner, Supertest |
| Frontend | HTML, CSS, JavaScript |
| Security | API-key authentication, data sanitisation, target-host validation |

## 🏗️ How It Works

1. **Capture:** Record a request and its response from a simulated API.
2. **Sanitise:** Remove sensitive information from captured data.
3. **Replay:** Send the captured request to a test service.
4. **Compare:** Compare the original response with the replayed response.
5. **Detect:** Identify changes in response fields, values, or HTTP status codes.
6. **Persist:** Save projects, captures, and replay results in MongoDB.

## ⚙️ Installation and Setup

### Prerequisites

- Node.js 20 or newer
- npm
- MongoDB Atlas account for persistent storage

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd replaybox-niyo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create your local environment file:

```powershell
Copy-Item .env.example .env
```

Configure `MONGODB_URI` in `.env` using your MongoDB Atlas connection string.

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE?retryWrites=true&w=majority
```

Replace the placeholders with your actual database credentials and cluster details. URL-encode special characters in the username or password.

**Never commit your `.env` file or expose database credentials on GitHub.**

### 4. Start ReplayBox

```bash
npm run dev
```

Open the dashboard at:

http://localhost:8000

### 5. Start the simulated target API

Open a second terminal:

```powershell
$env:PORT="9000"
npm run demo
```

Keep both services running during replay demonstrations.

### 6. Seed demo captures

Create a project through the dashboard using the configured development admin token, then copy its generated API key.

Run:

```bash
npm run seed -- --api-key rb_YOUR_API_KEY
```

Replace the placeholder with your generated API key.

## 🧪 Testing

Run the automated test suite:

```bash
npm test
```

**Latest verified result: 8 tests passed, 0 failed.**

The tests cover:

- Project authentication
- Request validation
- Sensitive-data sanitisation
- JSON response differences
- HTTP status changes
- Stable fingerprints
- Replay-target restrictions

### MongoDB Integration Test

Run the dedicated integration smoke test:

```bash
node scripts/mongo-smoke-test.js
```

The test verifies project creation and retrieval, capture persistence, replay creation and updates, retrieval, listing, and statistics using the configured storage connection.

The integration test has successfully passed against the configured MongoDB connection.

## 🔍 Example Use Case

Suppose an API originally returns an HTTP `500` error. After a fix, replaying the same request returns HTTP `200`.

ReplayBox compares the two responses and stores the replay result and response differences.

Example regression diff:

```json
[
  {
    "path": "$.tax",
    "type": "changed",
    "before": 21.12,
    "after": 21.6
  },
  {
    "path": "$.total",
    "type": "changed",
    "before": 141.12,
    "after": 141.6
  }
]
```

This demonstrates how an unexpected change in a simulated order response can be identified during API testing.

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/me` | Retrieve project details |
| POST | `/api/ingest` | Record a sanitised API capture |
| GET | `/api/captures` | List captures |
| GET | `/api/captures/:id` | Retrieve a capture |
| GET | `/api/captures/:id/regression` | View regression history |
| POST | `/api/captures/:id/replay` | Replay a captured request |
| GET | `/api/replays` | List replay results |
| GET | `/api/replays/:id` | Retrieve a replay result |
| GET | `/api/stats` | Retrieve dashboard statistics |
| GET | `/health` | Health check |

## 📂 Project Structure

```text
replaybox-niyo/
├── src/                     # Express application and backend logic
├── demo/                    # Simulated target API
├── public/                  # Dashboard interface
├── scripts/                 # Seed and MongoDB integration scripts
├── sdk/                     # Optional capture middleware
├── tests/                   # Automated tests
├── .github/workflows/       # CI workflow
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🔐 Security Considerations

- Uses simulated transactions only.
- Sanitises sensitive information before storing captures.
- Protects project endpoints with API-key authentication.
- Restricts replay targets to reduce SSRF risks.
- Keeps environment variables and database credentials out of version control.
- Does not connect to real payment processors or banking systems.

Redis/BullMQ and Docker configuration are present in the project, but their runtime setup has not yet been verified.

## 🎯 What I Learned

- Designing REST APIs with Node.js and Express.
- Integrating MongoDB Atlas for persistent data storage.
- Implementing API authentication and request validation.
- Sanitising sensitive information in API logs.
- Comparing API responses to detect regressions.
- Writing automated tests and integration checks.
- Debugging DNS, database connectivity, and authentication issues.

## 💼 Resume Summary

**ReplayBox — Fintech API Reliability Platform**  
*Node.js, Express.js, MongoDB Atlas, REST APIs, Supertest*

- Developed an API reliability platform to record sanitised requests, replay API interactions, and identify response regressions across application versions.
- Integrated MongoDB Atlas to persist projects, API captures, replay results, and regression differences.
- Implemented structured JSON response comparison and HTTP status-change detection.
- Created automated tests for authentication, request validation, sanitisation, and replay-target restrictions.

## 🏷️ GitHub Topics

`nodejs` `express` `mongodb` `mongodb-atlas` `mongoose` `rest-api` `api-testing` `api-replay` `regression-testing` `backend-development` `fintech` `javascript` `supertest`

## #️⃣ Hashtags

#NodeJS #ExpressJS #MongoDB #MongoDBAtlas #BackendDevelopment #RESTAPI #APITesting #RegressionTesting #Fintech #JavaScript #SoftwareEngineering #PortfolioProject