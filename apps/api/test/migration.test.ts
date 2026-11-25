import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, describe, expect, it } from 'vitest';
import { createDb } from '../src/db/client.ts';
import { createTestDb, testDatabaseUrl } from './database.ts';

const migrationsFolder = new URL('../drizzle', import.meta.url).pathname;
const QUIZ_OWNERSHIP = '0005_quiz-ownership';

/** A copy of the migrations folder that stops before the given migration. */
function migrationsBefore(tag: string) {
  const folder = mkdtempSync(join(tmpdir(), 'migrations-'));
  cpSync(migrationsFolder, folder, { recursive: true });
  const journalPath = join(folder, 'meta', '_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: { tag: string }[];
  };
  const index = journal.entries.findIndex((entry) => entry.tag === tag);
  journal.entries = journal.entries.slice(0, index);
  writeFileSync(journalPath, JSON.stringify(journal));
  return folder;
}

describe('migration 0005: Quiz ownership', () => {
  const admin = createTestDb();
  const name = `yunakquiz_migration_${process.pid}`;
  const url = new URL(testDatabaseUrl);
  url.pathname = `/${name}`;
  const scratch = createDb(url.toString());

  afterAll(async () => {
    await scratch.close();
    await admin.db.execute(sql.raw(`drop database if exists ${name}`));
    await admin.close();
  });

  it('marks every existing Quiz published and ownerless, and keeps its content', async () => {
    await admin.db.execute(sql.raw(`drop database if exists ${name}`));
    await admin.db.execute(sql.raw(`create database ${name}`));
    await migrate(scratch.db, { migrationsFolder: migrationsBefore(QUIZ_OWNERSHIP) });
    await scratch.db.execute(sql`
      insert into quizzes (slug, title, description, language, questions)
      values ('old-one', 'Old', 'An existing Quiz', 'uk', '[{"prompt":"p"}]'::jsonb),
             ('old-two', 'Old 2', 'Another', 'en', '[]'::jsonb)`);

    await migrate(scratch.db, { migrationsFolder });

    const rows = (
      await scratch.db.execute(
        sql`select slug, title, status, author_id, version, published_at, updated_at, questions
            from quizzes order by slug`,
      )
    ).rows;
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toMatchObject({ status: 'published', author_id: null, version: 1 });
      expect(row.published_at).not.toBeNull();
      expect(row.updated_at).not.toBeNull();
    }
    expect(rows[0]).toMatchObject({ title: 'Old', questions: [{ prompt: 'p' }] });
  });

  it('gives new rows no default status, so a Quiz is never published by accident', async () => {
    await expect(
      scratch.db.execute(
        sql`insert into quizzes (slug, title, description, language, questions)
            values ('no-status', 't', 'd', 'uk', '[]'::jsonb)`,
      ),
    ).rejects.toThrow();
  });
});
