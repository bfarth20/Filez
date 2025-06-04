import app from "#app";
import db from "#db/client";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  test,
} from "vitest";

beforeAll(async () => {
  await db.connect();
});
afterAll(async () => {
  await db.end();
});

let folder;

test("GET /files sends array of files with folder_name", async () => {
  const sql = `
  SELECT
    files.*,
    folders.name AS folder_name
  FROM
    files
    JOIN folders ON files.folder_id = folders.id
  `;
  const response = await request(app).get("/files");
  const { rows: files } = await db.query(sql);
  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual(files);
});

test("GET /folders sends array of folders", async () => {
  const { rows: folders } = await db.query("SELECT * FROM folders");
  const response = await request(app).get("/folders");
  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual(folders);
});

describe("GET /folders/:id", () => {
  beforeAll(async () => {
    const { rows } = await db.query("SELECT * FROM folders ORDER BY id DESC");
    folder = rows[0];
  });

  it("sends 404 if folder doesn't exist", async () => {
    await db.query("BEGIN");
    const response = await request(app).get("/folders/" + (folder.id + 1));
    expect(response.statusCode).toBe(404);
    await db.query("ROLLBACK");
  });

  describe("if folder exists", () => {
    let response;
    beforeAll(async () => {
      response = await request(app).get("/folders/" + folder.id);
    });

    it("sends back folder info with status 200", () => {
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.objectContaining(folder));
    });

    it("sends all files in the folder under the 'files' key", async () => {
      expect(response.body).toHaveProperty("files");

      const sql = `SELECT * FROM files WHERE folder_id = $1`;
      const { rows: files } = await db.query(sql, [folder.id]);
      expect(response.body.files).toEqual(files);
    });
  });
});

describe("POST /folders/:id/files", () => {
  const newFile = { name: "new file", size: 9001 };

  beforeEach(async () => {
    await db.query("BEGIN");
  });
  afterEach(async () => {
    await db.query("ROLLBACK");
  });

  it("sends 404 if folder doesn't exist", async () => {
    const response = await request(app)
      .post(`/folders/${folder.id + 1}/files`)
      .send(newFile);
    expect(response.statusCode).toBe(404);
  });

  it("sends 400 if request body not provided", async () => {
    const response = await request(app)
      .post(`/folders/${folder.id}/files`)
      .send();
    expect(response.statusCode).toBe(400);
  });

  it("sends 400 if request body is missing required fields", async () => {
    const response = await request(app)
      .post(`/folders/${folder.id}/files`)
      .send({});
    expect(response.statusCode).toBe(400);
  });

  it("creates a new file and sends it back with status 201", async () => {
    const response = await request(app)
      .post(`/folders/${folder.id}/files`)
      .send(newFile);
    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual(expect.objectContaining(newFile));
  });
});
