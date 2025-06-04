import db from "#db/client";

await db.connect();
await seed();
await db.end();
console.log("🌱 Database seeded.");

async function seed() {
  // Clear existing data
  await db.query("DELETE FROM files");
  await db.query("DELETE FROM folders");

  const folderNames = ["Projects", "Pictures", "Music"];

  for (const folderName of folderNames) {
    const folderResult = await db.query(
      "INSERT INTO folders(name) VALUES ($1) RETURNING id;",
      [folderName]
    );

    const folderId = folderResult.rows[0].id;

    for (let i = 1; i <= 5; i++) {
      await db.query(
        "INSERT INTO files(name, size, folder_id) VALUES ($1, $2, $3);",
        [`file_${i}.txt`, i * 100, folderId]
      );
    }
  }
}
