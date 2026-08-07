# ACSA Self-Evaluation Portal — Developer Makefile
# Run `make help` to see all available commands.

.DEFAULT_GOAL := help
DOCKER_COMPOSE := docker compose
BACKEND_DIR    := ./backend
MOBILE_DIR     := ./mobile

.PHONY: help up down restart logs ps \
        db-shell redis-shell \
        migrate migrate-create \
        seed-questionnaire \
        backend-install backend-lint backend-test backend-typecheck \
        mobile-install mobile-start mobile-web mobile-lint \
        clean nuke

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  ACSA Self-Evaluation Portal — Make commands"
	@echo "  ─────────────────────────────────────────────"
	@echo "  Infrastructure:"
	@echo "    make up                   Start all Docker services"
	@echo "    make down                 Stop all Docker services"
	@echo "    make restart              Restart all Docker services"
	@echo "    make logs                 Follow logs from all containers"
	@echo "    make ps                   Show container status"
	@echo ""
	@echo "  Database:"
	@echo "    make db-shell             Open psql shell"
	@echo "    make redis-shell          Open redis-cli shell"
	@echo "    make migrate              Apply all pending Alembic migrations"
	@echo "    make migrate-create m=X   Create a new migration named X"
	@echo "    make seed-questionnaire   Seed questionnaire v1.0.0 from catalogue.json"
	@echo ""
	@echo "  Backend:"
	@echo "    make backend-install      Install Python dependencies"
	@echo "    make backend-lint         Run ruff + mypy"
	@echo "    make backend-test         Run pytest"
	@echo "    make backend-typecheck    Run mypy"
	@echo ""
	@echo "  Mobile:"
	@echo "    make mobile-install       Install Node dependencies"
	@echo "    make mobile-start         Start Expo dev server"
	@echo "    make mobile-web           Start Expo web target"
	@echo "    make mobile-lint          Run ESLint"
	@echo ""
	@echo "  Housekeeping:"
	@echo "    make clean                Remove Python __pycache__ files"
	@echo "    make nuke                 Down + remove all volumes (DESTRUCTIVE)"
	@echo ""

# ── Infrastructure ────────────────────────────────────────────────────────────
up:
	$(DOCKER_COMPOSE) up -d --build

down:
	$(DOCKER_COMPOSE) down

restart:
	$(DOCKER_COMPOSE) down && $(DOCKER_COMPOSE) up -d --build

logs:
	$(DOCKER_COMPOSE) logs -f

ps:
	$(DOCKER_COMPOSE) ps

# ── Database ──────────────────────────────────────────────────────────────────
db-shell:
	$(DOCKER_COMPOSE) exec db psql -U acsa -d acsa_eval

redis-shell:
	$(DOCKER_COMPOSE) exec redis redis-cli

migrate:
	$(DOCKER_COMPOSE) exec api alembic upgrade head

migrate-create:
	@if [ -z "$(m)" ]; then echo "Usage: make migrate-create m=description_here"; exit 1; fi
	$(DOCKER_COMPOSE) exec api alembic revision --autogenerate -m "$(m)"

seed-questionnaire:
	$(DOCKER_COMPOSE) exec api python -m app.db.seeds.questionnaire

# ── Backend ───────────────────────────────────────────────────────────────────
backend-install:
	cd $(BACKEND_DIR) && pip install -e ".[dev]"

backend-lint:
	cd $(BACKEND_DIR) && ruff check . && ruff format --check .

backend-test:
	cd $(BACKEND_DIR) && pytest -v

backend-typecheck:
	cd $(BACKEND_DIR) && mypy app

# ── Mobile ────────────────────────────────────────────────────────────────────
mobile-install:
	cd $(MOBILE_DIR) && npm install

mobile-start:
	cd $(MOBILE_DIR) && npx expo start

mobile-web:
	cd $(MOBILE_DIR) && npx expo start --web

mobile-lint:
	cd $(MOBILE_DIR) && npm run lint

# ── Housekeeping ──────────────────────────────────────────────────────────────
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true

nuke:
	@echo "WARNING: This will remove ALL Docker volumes including database data."
	@read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ]
	$(DOCKER_COMPOSE) down -v
