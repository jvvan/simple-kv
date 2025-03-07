import Database from "better-sqlite3";
import { resolve } from "path";
import { stringify, parse } from "better-serialize";
import { dirname } from "path";
import { existsSync, mkdirSync } from "fs";

export interface SimpleKVOptions {
  name: string;
  path?: string;
}

export class SimpleKV<Value> {
  public name: string;
  public path: string;
  public db: Database.Database;

  constructor(options: SimpleKVOptions) {
    if (/[^a-zA-Z0-9_]/.test(options.name)) {
      throw new Error(`Invalid table name: ${options.name}`);
    }

    this.name = options.name;
    this.path = options.path || resolve(process.cwd(), "data", "kv.db");

    this.ensurePath(this.path);
    this.db = new Database(this.path);

    this.db.pragma("synchronous = 1");
    this.db.pragma("journal_mode = wal");

    this.db.exec(
      `CREATE TABLE IF NOT EXISTS 'internal::autonum' (name TEXT PRIMARY KEY, value INTEGER)`,
    );

    this.db.exec(
      `CREATE TABLE IF NOT EXISTS ${options.name} (key TEXT PRIMARY KEY, value TEXT)`,
    );

    process.on("exit", () => {
      this.db.close();
    });
  }

  private ensurePath(path: string) {
    if (path === ":memory:") return;

    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  public get(key: string): Value | undefined {
    const row = this.db
      .prepare<
        [string],
        { value: string }
      >(`SELECT value FROM ${this.name} WHERE key = ?`)
      .get(key);

    if (!row) return undefined;

    return parse(row.value) as Value;
  }

  public set(key: string, value: Value): void {
    this.db
      .prepare<
        [string, string]
      >(`INSERT OR REPLACE INTO ${this.name} (key, value) VALUES (?, ?)`)
      .run(key, stringify(value));
  }

  public ensure(key: string, value: Value): Value {
    if (!this.has(key)) {
      this.set(key, value);
    }

    return this.get(key)!;
  }

  public delete(key: string): void {
    this.db
      .prepare<[string]>(`DELETE FROM ${this.name} WHERE key = ?`)
      .run(key);
  }

  public clear(): void {
    this.db.exec(`DELETE FROM ${this.name}`);
  }

  public keys(): string[] {
    return this.db
      .prepare<[], { key: string }>(`SELECT key FROM ${this.name}`)
      .all()
      .map((row) => row.key);
  }

  public values(): Value[] {
    return this.db
      .prepare<[], { value: string }>(`SELECT value FROM ${this.name}`)
      .all()
      .map((row) => parse(row.value) as Value);
  }

  public entries(): [string, Value][] {
    return this.db
      .prepare<[], { key: string; value: string }>(
        `SELECT key, value FROM ${this.name}`,
      )
      .all()
      .map((row) => [row.key, parse(row.value) as Value]);
  }

  public has(key: string): boolean {
    return !!this.db
      .prepare<
        [string],
        { key: string }
      >(`SELECT key FROM ${this.name} WHERE key = ?`)
      .get(key);
  }

  public get size(): number {
    return this.db
      .prepare<
        [],
        { count: number }
      >(`SELECT COUNT(*) as count FROM ${this.name}`)
      .get()!.count;
  }
}
