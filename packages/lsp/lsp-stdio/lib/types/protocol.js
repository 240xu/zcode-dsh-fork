/**
 * The subset of LSP wire types this generic host reads and writes: initialize capabilities, the four
 * request results (`Location`, `LocationLink`, `Hover`), and the `textDocumentSync` shapes used to
 * decide transient-open support. Types only. Fields absent from a real server payload stay optional;
 * the translation layer normalizes them into the seam's closed unions.
 * @module @deepseek-ai/dsh-lsp-stdio/protocol
 */
export {};
//# sourceMappingURL=protocol.js.map