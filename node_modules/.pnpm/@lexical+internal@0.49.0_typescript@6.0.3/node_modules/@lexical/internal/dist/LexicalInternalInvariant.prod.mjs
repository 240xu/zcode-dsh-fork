/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function e(e,r="Internal Lexical error: invariant() called without a message",...a){if(!e)throw new Error(a.reduce((e,r)=>e.replace("%s",String(r)),r))}export{e as default};
