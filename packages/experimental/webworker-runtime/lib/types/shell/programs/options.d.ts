/**
 * Argument splitting shared by the command table: short flags (bundled or
 * separate), long flags, `--`, and the operands that follow.
 * @module @deepseek-ai/dsh-experimental-webworker-runtime/src/shell/programs/options
 */
/** One parsed argv: which flags were given, and what is left to act on. */
export interface ParsedOptions {
    /** Every short letter and long name seen, without their dashes. */
    readonly flags: ReadonlySet<string>;
    /** Values of flags that take one (`-n 5` and `--name=x` both land here). */
    readonly values: ReadonlyMap<string, string>;
    /** Everything that is not a flag, in order. */
    readonly operands: readonly string[];
}
/**
 * Split one program's arguments.
 *
 * A short letter listed in `valued` consumes the rest of its token (`-n5`) or
 * the next argument (`-n 5`); every other letter is a plain flag, so `-rn`
 * sets both `r` and `n`.
 * @param argv - the program's argv, including its name at index 0.
 * @param valued - short letters that take a value.
 * @returns the flags, their values, and the operands.
 */
export declare function parseOptions(argv: readonly string[], valued?: ReadonlySet<string>): ParsedOptions;
/**
 * Read a numeric flag value.
 * @param options - the parsed options.
 * @param flag - the short letter to read.
 * @param fallback - value to use when the flag is absent or unparsable.
 * @returns the number the caller should use.
 */
export declare function numberOption(options: ParsedOptions, flag: string, fallback: number): number;
/**
 * Split text into lines for the line-oriented utilities.
 * @param text - the text to split.
 * @returns its lines, without the trailing empty line a final newline creates.
 */
export declare function toLines(text: string): string[];
//# sourceMappingURL=options.d.ts.map