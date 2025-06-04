import express from "express";
import db from "./db/client.js";

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

//GET /files
app.get("/files", async (req, res, next) => {
  try {
    const result = await db.query(`
            SELECT files.*, folders.name AS folder_name
            FROM files
            JOIN folders ON files.folder_id = folders.id
            `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

//GET /folders
app.get("/folders", async (req, res, next) => {
  try {
    const result = await db.query(`SELECT * FROM folders`);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

//GET /folders/:id
app.get("/folders/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await db.query(
      `
            SELECT folders.*,
              COALESCE(json_agg(files) FILTER (WHERE files.id IS NOT NULL), '[]') AS files
            FROM folders
            LEFT JOIN files ON folders.id = files.folder_id
            WHERE folders.id = $1
            GROUP BY folders.id
            `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

//POST /folders/:id/files
app.post("/folders/:id/files", async (req, res, next) => {
  try {
    const folderId = Number(req.params.id);

    // Check if folder exists
    const folderCheck = await db.query(`SELECT * FROM folders WHERE id = $1`, [
      folderId,
    ]);
    if (folderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Validate request body
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Missing request body" });
    }

    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "Missing required field: name" });
    }

    const result = await db.query(
      `INSERT INTO files (name, size, folder_id)
   VALUES ($1, $2, $3)
   RETURNING *`,
      [name, req.body.size, folderId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

//error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
