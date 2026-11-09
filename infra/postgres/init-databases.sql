-- Create independent databases for microservices
CREATE DATABASE identity_db;
CREATE DATABASE memory_db;
CREATE DATABASE media_db;
CREATE DATABASE collab_db;
CREATE DATABASE book_db;
CREATE DATABASE commerce_db;
CREATE DATABASE notification_db;

-- Dedicated least-privilege application role (no superuser privileges)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'memoria_app') THEN
    CREATE ROLE memoria_app WITH LOGIN PASSWORD 'memoria_app_secret_pass';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE identity_db TO memoria_app;
GRANT ALL PRIVILEGES ON DATABASE memory_db TO memoria_app;
GRANT ALL PRIVILEGES ON DATABASE media_db TO memoria_app;
GRANT ALL PRIVILEGES ON DATABASE collab_db TO memoria_app;
GRANT ALL PRIVILEGES ON DATABASE book_db TO memoria_app;
GRANT ALL PRIVILEGES ON DATABASE commerce_db TO memoria_app;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO memoria_app;
