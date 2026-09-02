/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

"use strict";exports.default=function(e,r="Internal Lexical error: devInvariant() called without a message",...t){if(e)return;const n=t.reduce((e,r)=>e.replace("%s",String(r)),r);console.warn(n)};
