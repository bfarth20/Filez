import db from "#db/client";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

beforeAll(async () => {
  await db.connect();
});
afterAll(async () => {
  await db.end();
});

describe("Database schema", () => {
  test("folders table is created with correct columns and constraints", async () => {
    const columns = await getColumns("folders");
    expect(columns).toEqual(
      expect.arrayContaining([
        { column_name: "id", data_type: "integer", is_nullable: "NO" },
        { column_name: "name", data_type: "text", is_nullable: "NO" },
      ]),
    );
  });

  test(`"name" column of "folders" table is unique`, async () => {
    const isNameUnique = await isColumnConstrained("folders", "name", "unique");
    expect(isNameUnique).toBe(true);
  });

  test("files table is created with correct columns and constraints", async () => {
    const columns = await getColumns("files");
    expect(columns).toEqual(
      expect.arrayContaining([
        { column_name: "id", data_type: "integer", is_nullable: "NO" },
        { column_name: "name", data_type: "text", is_nullable: "NO" },
        { column_name: "size", data_type: "integer", is_nullable: "NO" },
        { column_name: "folder_id", data_type: "integer", is_nullable: "NO" },
      ]),
    );
  });

  test(`unique constraint on "name" and "folder_id" column of "files"`, async () => {
    const isNameUnique = await isColumnConstrained("files", "name", "unique");
    expect(isNameUnique).toBe(true);

    const isFolderIdUnique = await isColumnConstrained(
      "files",
      "folder_id",
      "unique",
    );
    expect(isFolderIdUnique).toBe(true);
  });

  test(`"folder_id" column of "files" table is a foreign key`, async () => {
    const isFolderIdForeignKey = await isColumnConstrained(
      "files",
      "folder_id",
      "foreign key",
    );
    expect(isFolderIdForeignKey).toBe(true);
  });

  test(`folder deletion cascades to related files`, async () => {
    const sql = `
    SELECT *
    FROM information_schema.referential_constraints
    WHERE
      delete_rule = 'CASCADE'
      AND constraint_name ILIKE '%folder_id%'
    `;
    const { rowCount } = await db.query(sql);
    expect(rowCount).toBeGreaterThan(0);
  });
});

describe("Database is seeded with", () => {
  test("at least 3 folders", async () => {
    const { rowCount } = await db.query("SELECT * FROM folders");
    expect(rowCount).toBeGreaterThanOrEqual(3);
  });

  test("at least 5 files in each folder", async () => {
    const { rowCount: numFolders } = await db.query("SELECT * FROM folders");
    const { rowCount: numFoldersWithFiles } = await db.query(
      "SELECT count(*) FROM files GROUP BY folder_id HAVING count(*) >= 5",
    );
    expect(numFoldersWithFiles).toBe(numFolders);
  });
});

async function getColumns(table) {
  const sql = `
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = $1
  `;
  const { rows } = await db.query(sql, [table]);
  return rows;
}

async function isColumnConstrained(table, column, constraint) {
  const sql = `
  SELECT *
  FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON kcu.constraint_name = tc.constraint_name
  WHERE
    tc.table_name = $1
    AND kcu.column_name = $2
    AND tc.constraint_type ilike $3
  `;
  const { rowCount } = await db.query(sql, [table, column, constraint]);
  return rowCount > 0;
}
