-- PostgreSQL initialization SQL

-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE notification_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notification_db')\gexec

\c notification_db;

-- Create the 'user' role if it doesn't exist and set password
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'user') THEN
      CREATE ROLE "user" WITH LOGIN PASSWORD 'password';
   END IF;
END
$do$;

-- Grant privileges to the 'user' role
GRANT ALL PRIVILEGES ON DATABASE notification_db TO "user";

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    type VARCHAR(50) NOT NULL, -- e.g., 'email', 'push'
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, language, type, version)
);

-- Add a function to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to use the function
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;

CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
