# Docker Desktop Setup

EARTH local PostgreSQL requires Docker Desktop on macOS.

1. Install Docker Desktop from <https://www.docker.com/products/docker-desktop/>.
2. Open Docker Desktop and wait for the dashboard to report that the engine is running.
3. In the EARTH repository, verify the daemon:

```sh
docker info
```

4. Run the VS Code task `EARTH: Full verification (Docker required)`.

That task verifies Docker Compose and PostgreSQL health before it runs migrations and API tests. Passing local checks does not make EARTH production-ready.
