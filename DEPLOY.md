# Deploy to Railway

1. Go to https://railway.app/new
2. Choose "Deploy from GitHub repo"
3. Select `Deliver-Different-Testing/sales-report`
4. Add these environment variables:

| Variable | Value |
|----------|-------|
| DB_SERVER | urgent-couriers-sql-server-urgent-prod.c9wsc8ywswov.ap-southeast-2.rds.amazonaws.com |
| DB_PORT | 1433 |
| DB_NAME | Despatch-Urgent-Prod |
| DB_USER | admin |
| DB_PASS | (from secrets) |
| SESSION_SECRET | (any random string) |

5. Deploy — Railway auto-detects Node.js and runs `npm start`
6. Get the generated URL (e.g. sales-report-production.up.railway.app)
