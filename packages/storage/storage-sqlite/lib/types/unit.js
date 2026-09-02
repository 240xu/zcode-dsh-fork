/**
 * One opened SQLite KV unit: prepared per-table statements over the
 * `u_<unit>_<table>` record tables plus this unit's row in the shared
 * `unit_globals` table. Each primitive is a single statement, so atomicity
 * comes from SQLite itself — no explicit transactions, and no write queue
 * (write ordering is the caller's responsibility per the KV contract).
 * @module @deepseek-ai/dsh-storage-sqlite/unit
 */
import { StorageError } from '@deepseek-ai/dsh-storage';
import { recordTableName } from "./schema.js";
/**
 * The SQLite {@link KvUnit}. Constructed by the backend AFTER the unit's
 * record tables exist; statements are prepared once here and reused for every
 * primitive. Values are stored as JSON text in the `value` column.
 */
export class SqliteKvUnit {
    descriptor;
    onClose;
    tables = new Map();
    globalUpsert;
    globalSelect;
    closed = false;
    /**
     * @param db - Open database handle owned by the backend (never closed here).
     * @param descriptor - Validated descriptor whose record tables already exist.
     * @param onClose - Backend callback releasing this unit's open-name slot.
     */
    constructor(db, descriptor, onClose) {
        this.descriptor = descriptor;
        this.onClose = onClose;
        for (const table of descriptor.tables) {
            // Both name segments are validated against UNIT_NAME_RE by the backend,
            // so the physical identifier is safe to interpolate into statement text.
            const physical = recordTableName(descriptor.name, table);
            this.tables.set(table, {
                upsert: db.prepare(`INSERT INTO "${physical}" (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`),
                remove: db.prepare(`DELETE FROM "${physical}" WHERE key = ?`),
                selectAll: db.prepare(`SELECT key, value FROM "${physical}"`),
            });
        }
        this.globalUpsert = descriptor.hasGlobal
            ? db.prepare('INSERT INTO unit_globals (unit, value) VALUES (?, ?) ON CONFLICT(unit) DO UPDATE SET value = excluded.value')
            : undefined;
        this.globalSelect = descriptor.hasGlobal
            ? db.prepare('SELECT value FROM unit_globals WHERE unit = ?')
            : undefined;
    }
    loadAll() {
        return this.settle(() => {
            const tables = {};
            for (const [name, statements] of this.tables) {
                // Null prototype: record keys are arbitrary strings, so '__proto__'
                // must land as an own property instead of mutating the prototype.
                const records = Object.create(null);
                for (const row of statements.selectAll.all()) {
                    records[row.key] = this.parseValue(row.value, `table '${name}' key '${row.key}'`);
                }
                tables[name] = records;
            }
            let global = null;
            if (this.globalSelect !== undefined) {
                const row = this.globalSelect.get(this.descriptor.name);
                if (row !== undefined)
                    global = this.parseValue(row.value, 'global slot');
            }
            return { tables, global };
        });
    }
    /** Parse one stored value column, mapping bad JSON to `malformed-medium`. */
    parseValue(text, slot) {
        try {
            return JSON.parse(text);
        }
        catch (error) {
            throw new StorageError('malformed-medium', `kv unit '${this.descriptor.name}' holds unparsable JSON at ${slot}`, { cause: error });
        }
    }
    putRecord(table, key, value) {
        return this.settle(() => {
            this.statementsFor(table).upsert.run(key, JSON.stringify(value));
        });
    }
    deleteRecord(table, key) {
        return this.settle(() => {
            this.statementsFor(table).remove.run(key);
        });
    }
    setGlobal(value) {
        return this.settle(() => {
            if (this.globalUpsert === undefined) {
                throw new Error(`kv unit '${this.descriptor.name}' declared no global slot`);
            }
            this.globalUpsert.run(this.descriptor.name, JSON.stringify(value));
        });
    }
    close() {
        if (!this.closed) {
            this.closed = true;
            this.onClose();
        }
        return Promise.resolve();
    }
    /**
     * Run one synchronous primitive behind the closed guard, mapping a throw to
     * a rejection so the Promise-returning contract never throws synchronously.
     */
    settle(operation) {
        try {
            this.ensureOpen();
            return Promise.resolve(operation());
        }
        catch (error) {
            // Non-Error throws can only enter through JSON.stringify propagating a
            // value's own toJSON throw; wrap those, preserve every real Error.
            return Promise.reject(error instanceof Error ? error : new Error(String(error)));
        }
    }
    ensureOpen() {
        if (this.closed) {
            throw new StorageError('closed', `kv unit '${this.descriptor.name}' is closed`);
        }
    }
    statementsFor(table) {
        const statements = this.tables.get(table);
        if (statements === undefined) {
            throw new Error(`kv unit '${this.descriptor.name}' declared no table '${table}'`);
        }
        return statements;
    }
}
//# sourceMappingURL=unit.js.map