/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig } from 'lexical';
import { ElementNode } from './LexicalElementNode';
/** @internal */
export declare class ArtificialNode__DO_NOT_USE extends ElementNode {
    $config(): import("lexical").BaseStaticNodeConfig & {
        readonly artificial?: {
            readonly extends: typeof ElementNode;
        } | undefined;
    } & import("lexical").StaticNodeTypeAccessor<"artificial"> & import("lexical").StaticNodeConfigAccessor<{
        readonly extends: typeof ElementNode;
    }>;
    createDOM(config: EditorConfig): HTMLElement;
}
