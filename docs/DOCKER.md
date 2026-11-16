# Local Docker run

1. Copy the root `.env.example` to `.env`.
2. Replace `JWT_SECRET_KEY` with a long random secret. Do not commit `.env`.
3. From the repository root run `docker compose up --build`.
4. Open the frontend at http://localhost:8080 and API docs at http://localhost:8000/docs.
5. Stop with `docker compose down`. Persistent SQLite data stays in the named `qa_data` volume.

The frontend image embeds the API URL at build time. For a hosted deployment, set the frontend build argument to the public HTTPS API URL and update `FRONTEND_ORIGINS` to the exact deployed frontend origin. Use PostgreSQL and managed secrets for production; the SQLite volume is intended for local demonstration.
