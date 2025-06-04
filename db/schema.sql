-- Drop tables is re-running
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS folders;

-- create folders table
CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- create files table
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    size INT NOT NULL,
    folder_id INT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    UNIQUE (name, folder_id)
);
