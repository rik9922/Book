import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createDatabaseClient } from "@memory-capsule/database";
import { createBackup, resolvePgConnectionDefaults, BackupManifest } from "../scripts/backup.ts";
import { restoreBackup } from "../scripts/restore.ts";

describe("Phase C — Backup Fail-Closed Verification & Isolated Restore Rehearsal", () => {
  const createdTempDirs: string[] = [];
  const createdTempDbs: string[] = [];

  after(async () => {
    const { pgUser, pgPass, pgHost, pgPort } = resolvePgConnectionDefaults();
    const auth = pgPass ? `${pgUser}:${pgPass}` : pgUser;
    if (createdTempDbs.length > 0) {
      const admin = createDatabaseClient(`postgres://${auth}@${pgHost}:${pgPort}/postgres`);
      for (const dbName of createdTempDbs) {
        await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`).catch(() => {});
      }
      await admin.close().catch(() => {});
    }
    for (const dir of createdTempDirs) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  test("1. Full backup, manifest verification, isolated restore rehearsal, and machine-readable report", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "memoria-dr-rehearsal-"));
    createdTempDirs.push(tmpRoot);
    const backupsRoot = path.join(tmpRoot, "backups");
    const storageRoot = path.join(tmpRoot, "storage_data");
    const restoredStorageRoot = path.join(tmpRoot, "restored_storage");
    const reportPath = path.join(tmpRoot, "restoration-report.json");

    // Seed representative original media files
    const samplePhotoPath = path.join(storageRoot, "originals", "sample-space", "sample-media", "heirloom.png");
    await fs.mkdir(path.dirname(samplePhotoPath), { recursive: true });
    const sampleBytes = Buffer.from("89504e470d0a1a0a-representative-heirloom-original", "utf8");
    await fs.writeFile(samplePhotoPath, sampleBytes);

    const testDbs = [
      { name: "memory_db", envVar: "MEMORY_DATABASE_URL" },
      { name: "media_db", envVar: "MEDIA_DATABASE_URL" },
    ] as const;

    const backupDir = await createBackup({
      backupsRoot,
      storageLocal: storageRoot,
      databases: testDbs,
    });

    const manifest: BackupManifest = JSON.parse(
      await fs.readFile(path.join(backupDir, "manifest.json"), "utf8")
    );
    assert.equal(manifest.status, "COMPLETE");
    assert.equal(manifest.verificationResult.verified, true);
    assert.equal(manifest.mediaArchive.fileCount, 1);
    assert.equal(manifest.assetManifest.length, 1);
    assert.ok(manifest.schemaVersion.endsWith(".sql"));

    // Verify-only dry-run
    const verifyReport = await restoreBackup({
      backupDir,
      verifyOnly: true,
    });
    assert.equal(verifyReport.status, "SUCCESS");
    assert.equal(verifyReport.checksumsVerified, true);
    assert.equal(verifyReport.archiveInspected, true);
    assert.equal(verifyReport.mediaRestored.actualFileCount, 1);

    // Isolated restore into suffix DBs & isolated storage dir
    const suffix = `_rehearsal_${Date.now()}`;
    createdTempDbs.push(`memory_db${suffix}`, `media_db${suffix}`);

    const restoreReport = await restoreBackup({
      backupDir,
      targetDbSuffix: suffix,
      targetStorageDir: restoredStorageRoot,
      createTargetDbs: true,
      reportPath,
    });

    assert.equal(restoreReport.status, "SUCCESS");
    assert.equal(restoreReport.mode, "isolated_restore");
    assert.equal(restoreReport.databasesRestored.length, 2);
    for (const dbRes of restoreReport.databasesRestored) {
      assert.equal(dbRes.countsMatch, true, `Record counts must match for ${dbRes.sourceDb}`);
    }
    assert.equal(restoreReport.mediaRestored.actualFileCount, 1);
    assert.equal(restoreReport.mediaRestored.checksumMismatches.length, 0);
    assert.equal(restoreReport.mediaRestored.missingFiles.length, 0);

    // Inspect representative restored original file
    const restoredFile = await fs.readFile(
      path.join(restoredStorageRoot, "originals", "sample-space", "sample-media", "heirloom.png")
    );
    assert.deepEqual(restoredFile, sampleBytes);

    // Machine-readable report exists
    const reportJson = JSON.parse(await fs.readFile(reportPath, "utf8"));
    assert.equal(reportJson.backupId, manifest.backupId);
    assert.equal(reportJson.status, "SUCCESS");
  });

  test("2. Backup fails closed when required media storage directory is missing", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "memoria-dr-missing-storage-"));
    createdTempDirs.push(tmpRoot);
    const backupsRoot = path.join(tmpRoot, "backups");
    const missingStorage = path.join(tmpRoot, "does-not-exist");

    await assert.rejects(
      () =>
        createBackup({
          backupsRoot,
          storageLocal: missingStorage,
          databases: [{ name: "memory_db", envVar: "MEMORY_DATABASE_URL" }],
        }),
      /Required media storage directory does not exist/
    );

    const dirs = await fs.readdir(backupsRoot);
    assert.equal(dirs.length, 1);
    const manifest: BackupManifest = JSON.parse(
      await fs.readFile(path.join(backupsRoot, dirs[0], "manifest.json"), "utf8")
    );
    assert.equal(manifest.status, "FAILED");
    assert.equal(manifest.verificationResult.verified, false);
  });

  test("3. Restore refuses destructive live overwrite without explicit authorization and fails on corrupted/missing artifacts", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "memoria-dr-failures-"));
    createdTempDirs.push(tmpRoot);
    const backupsRoot = path.join(tmpRoot, "backups");
    const storageRoot = path.join(tmpRoot, "storage_data");

    await fs.mkdir(path.join(storageRoot, "originals"), { recursive: true });
    await fs.writeFile(path.join(storageRoot, "originals", "a.txt"), "hello-memoria");

    const backupDir = await createBackup({
      backupsRoot,
      storageLocal: storageRoot,
      databases: [{ name: "memory_db", envVar: "MEMORY_DATABASE_URL" }],
    });

    // 3a. Destructive live restore guard
    await assert.rejects(
      () => restoreBackup({ backupDir }),
      /Refusing destructive live restore without explicit authorization/
    );

    // 3b. Corrupted archive
    const copyCorrupt = path.join(tmpRoot, "corrupt-backup");
    await fs.cp(backupDir, copyCorrupt, { recursive: true });
    await fs.writeFile(path.join(copyCorrupt, "media-storage.tar.gz"), "corrupted-tarball");
    await assert.rejects(
      () => restoreBackup({ backupDir: copyCorrupt, verifyOnly: true }),
      /Media archive checksum mismatch/
    );

    // 3c. Missing archive
    const copyMissingArchive = path.join(tmpRoot, "missing-archive-backup");
    await fs.cp(backupDir, copyMissingArchive, { recursive: true });
    await fs.rm(path.join(copyMissingArchive, "media-storage.tar.gz"));
    await assert.rejects(
      () => restoreBackup({ backupDir: copyMissingArchive, verifyOnly: true }),
      /Required media archive is missing/
    );

    // 3d. Incorrect SQL checksum
    const copyBadSql = path.join(tmpRoot, "bad-sql-checksum");
    await fs.cp(backupDir, copyBadSql, { recursive: true });
    const manifestPath = path.join(copyBadSql, "manifest.json");
    const m = JSON.parse(await fs.readFile(manifestPath, "utf8")) as BackupManifest;
    m.databases[0].sha256 = crypto.createHash("sha256").update("wrong").digest("hex");
    await fs.writeFile(manifestPath, JSON.stringify(m, null, 2));
    await assert.rejects(
      () => restoreBackup({ backupDir: copyBadSql, verifyOnly: true }),
      /Checksum mismatch/
    );

    // 3e. Incomplete / empty SQL dump
    const copyEmptySql = path.join(tmpRoot, "empty-sql");
    await fs.cp(backupDir, copyEmptySql, { recursive: true });
    await fs.writeFile(path.join(copyEmptySql, "databases", "memory_db.sql"), "");
    await assert.rejects(
      () => restoreBackup({ backupDir: copyEmptySql, verifyOnly: true }),
      /empty \(0 bytes\)/
    );
  });
});
