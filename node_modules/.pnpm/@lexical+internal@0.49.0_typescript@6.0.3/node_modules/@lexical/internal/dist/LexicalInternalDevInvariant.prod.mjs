/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function e(e,r="Internal Lexical error: devInvariant() called without a message",...a){if(e)return;const n=a.reduce((e,r)=>e.replace("%s",String(r)),r);console.warn(n)}export{e as default};
