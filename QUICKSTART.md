# Quick Start Guide

## Prerequisites

### Option 1: Docker (Recommended - Easiest)
- **Docker** (v20.10+) - [Download here](https://www.docker.com/get-started)
- **Docker Compose** (included with Docker Desktop)
- **Google Geocoding API Key** - [Get one here](https://developers.google.com/maps/documentation/geocoding/get-api-key)

### Option 2: Local Development
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Google Geocoding API Key** - [Get one here](https://developers.google.com/maps/documentation/geocoding/get-api-key)

## Quick Start with Docker (Recommended)

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd test-project
   cp .env.example .env
   ```

2. **Add your API key to `.env`:**
   ```env
   GOOGLE_GEOCODING_API_KEY=your_google_api_key_here
   ```

3. **Start everything:**
   ```bash
   docker-compose up -d
   ```

4. **That's it!** The API is running at `http://localhost:3000`

**Useful Docker commands:**
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Development mode (with hot reload)
docker-compose -f docker-compose.dev.yml up
```

## Local Development Setup

## Step-by-Step Instructions

### 1. Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required packages listed in `package.json`.

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# On macOS/Linux
touch .env

# On Windows
type nul > .env
```

Then add the following content to `.env`:

```env
PORT=3000
NODE_ENV=development
GOOGLE_GEOCODING_API_KEY=your_google_api_key_here
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Redis Configuration (Optional)
# Leave REDIS_HOST empty to use in-memory cache (default)
# Set REDIS_HOST to use Redis for distributed caching
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
REDIS_TTL=3600
```

**Important**: Replace `your_google_api_key_here` with your actual Google Geocoding API key.

### 3. Get a Google Geocoding API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Geocoding API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key and paste it in the `.env` file

### 4. Run the Application

#### Development Mode (Recommended)
```bash
npm run start:dev
```

This will:
- Start the server in watch mode (auto-restarts on file changes)
- Run on `http://localhost:3000` (or the PORT you specified)
- Show detailed error messages

#### Production Mode
```bash
npm run build
npm run start:prod
```

### 5. Verify It's Running

You should see:
```
Application is running on: http://localhost:3000
```

### 6. Test the API

#### Using cURL:
```bash
curl -X POST http://localhost:3000/validate-address \
  -H "Content-Type: application/json" \
  -d '{"address": "1600 Amphitheatre Parkway, Mountain View, CA"}'
```

#### Using the test file:
If you have the REST Client extension in VS Code, open `test-example.http` and click "Send Request" on any of the examples.

#### Using Postman:
1. Create a new POST request
2. URL: `http://localhost:3000/validate-address`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

## Troubleshooting

### "Cannot find module" errors
- Make sure you ran `npm install`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

### "GOOGLE_GEOCODING_API_KEY not found" warning
- Make sure your `.env` file is in the root directory
- Check that the API key is set correctly (no quotes needed)
- Restart the server after creating/updating `.env`

### Port already in use
- Change the `PORT` in `.env` to a different number (e.g., 3001)
- Or stop the process using port 3000

### API returns errors
- Verify your Google API key is valid
- Check that Geocoding API is enabled in Google Cloud Console
- Ensure you have billing enabled (Google requires it even for free tier)

## Available Scripts

### Local Development
- `npm run start:dev` - Start in development mode with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Run production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests

### Docker Commands
- `npm run docker:build` - Build Docker images
- `npm run docker:up` - Start services in background
- `npm run docker:down` - Stop services
- `npm run docker:dev` - Start in development mode with hot reload
- `npm run docker:logs` - View logs
- `npm run docker:clean` - Stop and remove volumes

## Redis Configuration (Optional)

The application uses in-memory caching by default. To use Redis:

1. **Install Redis** (if not already installed):
   ```bash
   # macOS
   brew install redis && brew services start redis
   
   # Linux
   sudo apt-get install redis-server
   
   # Docker
   docker run -d --name redis -p 6379:6379 redis:latest
   ```

2. **Configure Redis in `.env`**:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. **Restart the application** - You should see:
   ```
   ✅ Redis cache connected at localhost:6379
   ```

For detailed Redis setup instructions, see [REDIS_SETUP.md](./REDIS_SETUP.md).

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [REDIS_SETUP.md](./REDIS_SETUP.md) for Redis configuration guide
- Check out [test-example.http](./test-example.http) for API examples
- Explore the code in the `src/` directory

