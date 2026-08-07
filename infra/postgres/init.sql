-- PostgreSQL initialization script
-- Creates the Keycloak database alongside the main application database.
-- The main acsa_eval database is already created by POSTGRES_DB env var.

CREATE DATABASE acsa_keycloak;
GRANT ALL PRIVILEGES ON DATABASE acsa_keycloak TO acsa;
