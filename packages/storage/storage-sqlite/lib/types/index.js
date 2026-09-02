/**
 * SQLite storage backend for the storage hub: one database file hosts every
 * routed unit, document-per-row (`key TEXT` / `value TEXT` JSON). Registers
 * as backend `sqlite`; the disposer unregisters first, then closes the medium.
 * @module @deepseek-ai/dsh-storage-sqlite
 */
import z from '@deepseek-ai/schemastery';
import { StorageError, UNIT_NAME_RE, storageBackendServiceKey } from '@deepseek-ai/dsh-storage';
import { openDatabase, recordTableName } from "./schema.js";
import { SqliteKvUnit } from "./unit.js";
export { STORAGE_SQLITE_SCHEMA_VERSION } from "./schema.js";
/** Cordis plugin name. */
export const name = 'storage-sqlite';
/** The backend registers on the storage hub. */
export const inject = ['storage'];
/** Schemastery validator for {@link Config}. */
export const Config = z.object({
    path: z.string().required(),
    journalMode: z.union(['wal', 'delete', 'truncate', 'persist']).default('wal'),
});
/**
 * The SQLite {@link StorageBackend}. Owns one `DatabaseSync` connection and
 * the open-unit table; `kv.open` validates names, enforces the per-unit
 * version stamp in `units`, and ensures the unit's record tables.
 */
export class SqliteStorageBackend {
    /** The key-value facet; the only shape this backend serves. */
    kv = { open: descriptor => this.openUnit(descriptor) };
    ready;
    /** Open (or still-opening) units by name; presence is the double-open guard. */
    units = new Map();
    closing;
    /**
     * @param config - Validated plugin configuration.
     */
    constructor(config) {
        this.ready = openDatabase(config.path, config.journalMode);
        // Mark the rejection handled: every primitive re-awaits `ready`, so an
        // open failure still surfaces to each caller; this guard only prevents an
        // unhandled-rejection crash when the failure precedes the first use.
        this.ready.catch(() => { });
    }
    openUnit(descriptor) {
        if (this.closing !== undefined) {
            return Promise.reject(new StorageError('closed', 'sqlite storage backend is closed'));
        }
        if (!UNIT_NAME_RE.test(descriptor.name)) {
            return Promise.reject(new Error(`kv unit name '${descriptor.name}' violates ${UNIT_NAME_RE}`));
        }
        for (const table of descriptor.tables) {
            if (!UNIT_NAME_RE.test(table)) {
                return Promise.reject(new Error(`kv table name '${table}' in unit '${descriptor.name}' violates ${UNIT_NAME_RE}`));
            }
        }
        if (this.units.has(descriptor.name)) {
            return Promise.reject(new Error(`kv unit '${descriptor.name}' is already open (double-open is a caller bug)`));
        }
        // Reserve the name synchronously so a concurrent second open of the same
        // name rejects instead of racing past the guard during the awaits below.
        const pending = this.materializeUnit(descriptor);
        this.units.set(descriptor.name, pending);
        pending.catch(() => this.units.delete(descriptor.name));
        return pending;
    }
    async materializeUnit(descriptor) {
        const db = await this.ready;
        const row = db.prepare('SELECT version FROM units WHERE name = ?').get(descriptor.name);
        if (row === undefined) {
            db.prepare('INSERT INTO units (name, version) VALUES (?, ?)').run(descriptor.name, descriptor.version);
        }
        else if (row.version !== descriptor.version) {
            throw new StorageError('version-mismatch', `kv unit '${descriptor.name}' is stamped version ${row.version} on the medium, incompatible with descriptor version ${descriptor.version}`);
        }
        for (const table of descriptor.tables) {
            // Both segments passed UNIT_NAME_RE, so the identifier is safe in DDL.
            db.exec(`
        CREATE TABLE IF NOT EXISTS "${recordTableName(descriptor.name, table)}" (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        ) STRICT
      `);
        }
        return new SqliteKvUnit(db, descriptor, () => {
            this.units.delete(descriptor.name);
        });
    }
    /**
     * Close every open unit and release the database. Idempotent; concurrent
     * and repeated calls resolve once teardown finishes.
     * @returns resolution after the medium is released.
     */
    close() {
        this.closing ??= this.doClose();
        return this.closing;
    }
    async doClose() {
        let db;
        try {
            db = await this.ready;
        }
        catch {
            // The medium never opened; that failure already rejected the opener and
            // every unit call, so there is nothing left to release here.
            return;
        }
        for (const pending of [...this.units.values()]) {
            const unit = await pending.catch(() => undefined);
            await unit?.close();
        }
        db.close();
    }
}
/**
 * Register the SQLite backend as `sqlite` on the storage hub. The disposer
 * unregisters the name first, then closes the backend.
 * @param ctx - Plugin context (must inject `storage`).
 * @param config - Validated plugin configuration.
 */
export function apply(ctx, config) {
    const backend = new SqliteStorageBackend(config);
    ctx.effect(() => {
        const dispose = ctx.storage.backend.register('sqlite', backend);
        return async () => {
            dispose();
            await backend.close();
        };
    }, 'storage-sqlite.registerBackend');
    ctx.provide(storageBackendServiceKey('sqlite'), backend);
}
//# sourceMappingURL=index.js.map