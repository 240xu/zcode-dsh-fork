/** Node filesystem watching over the active in-memory VFS. */
import { Buffer } from 'buffer';
import { EventEmitter } from './events.ts';
import type { VfsBigIntStats, VfsStats } from '../../../storage/types.ts';
type PathArg = string | URL | Uint8Array;
type WatchListener = (eventType: 'rename' | 'change', filename: string | Buffer | null) => void;
type WatchStats = VfsStats | VfsBigIntStats;
type StatListener = (current: WatchStats, previous: WatchStats) => void;
/** Options shared by the callback and promise watch faces. */
export interface WatchOptions {
    persistent?: boolean;
    recursive?: boolean;
    encoding?: BufferEncoding | 'buffer';
    signal?: AbortSignal;
}
/** Poll-style watch options. */
export interface WatchFileOptions {
    persistent?: boolean;
    interval?: number;
    bigint?: boolean;
}
/** `fs.FSWatcher` over VFS mutations. */
export declare class FSWatcher extends EventEmitter {
    private readonly target;
    private readonly directory;
    private readonly options;
    private readonly disposeMutation;
    private readonly signal;
    private readonly onAbort;
    private closed;
    private referenced;
    constructor(target: string, directory: boolean, options: WatchOptions, listener?: WatchListener);
    private matches;
    private filename;
    /** Stop observing and publish `close` once. */
    close(): void;
    /**
     * Mark this watcher as process-liveness-bearing.
     * @returns This watcher.
     */
    ref(): this;
    /**
     * Clear the process-liveness flag; dedicated Workers have no ref-counted event loop.
     * @returns This watcher.
     */
    unref(): this;
    /**
     * Read the retained process-liveness flag.
     * @returns Whether this watcher is marked as keeping its owner alive.
     */
    hasRef(): boolean;
}
/**
 * Watch one path through the active VFS.
 * @param path - File or directory path.
 * @param optionsOrListener - Watch options, encoding, or the change listener.
 * @param maybeListener - Change listener when the second argument carries options.
 * @returns The closeable watcher.
 */
export declare function watch(path: PathArg, optionsOrListener?: WatchOptions | BufferEncoding | 'buffer' | WatchListener, maybeListener?: WatchListener): FSWatcher;
/** `fs.StatWatcher` returned from `watchFile`. */
export declare class StatWatcher extends EventEmitter {
    readonly path: string;
    private readonly disposeMutation;
    private timer;
    private previous;
    private stopped;
    private referenced;
    private readonly context;
    private readonly interval;
    private readonly bigint;
    constructor(path: string, options: WatchFileOptions);
    private schedule;
    /** Stop polling and release the VFS subscription. */
    stop(): void;
    /** Alias used by callers treating the watcher as a closeable handle. */
    close(): void;
    /**
     * Mark this watcher as process-liveness-bearing.
     * @returns This watcher.
     */
    ref(): this;
    /**
     * Mark this watcher as not keeping its owner alive.
     * @returns This watcher.
     */
    unref(): this;
    /**
     * Read the retained process-liveness flag.
     * @returns Whether this watcher is marked as keeping its owner alive.
     */
    hasRef(): boolean;
}
/**
 * Register a stat-poll watcher for one path.
 * @param path - File or directory path, including a currently missing path.
 * @param optionsOrListener - Polling options or the change listener.
 * @param maybeListener - Change listener when the second argument carries options.
 * @returns The path's shared stat watcher.
 */
export declare function watchFile(path: PathArg, optionsOrListener: WatchFileOptions | StatListener, maybeListener?: StatListener): StatWatcher;
/**
 * Remove one listener or every listener for a path.
 * @param path - Watched path.
 * @param listener - Specific registration to remove; omission removes all registrations.
 */
export declare function unwatchFile(path: PathArg, listener?: StatListener): void;
/**
 * Create the promise-based watch iterator over the callback watcher.
 * @param path - File or directory path.
 * @param options - Watch options and cancellation signal.
 * @returns An iterator of change records that closes its watcher on return or failure.
 */
export declare function watchAsync(path: PathArg, options?: WatchOptions): AsyncIterableIterator<{
    eventType: 'rename' | 'change';
    filename: string | Buffer | null;
}>;
export {};
//# sourceMappingURL=fs-watch.d.ts.map