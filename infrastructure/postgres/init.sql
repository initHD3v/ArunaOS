-- Enable pgcrypto for cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Full-text search configuration
CREATE TEXT SEARCH CONFIGURATION arunaos_search (COPY = english);
