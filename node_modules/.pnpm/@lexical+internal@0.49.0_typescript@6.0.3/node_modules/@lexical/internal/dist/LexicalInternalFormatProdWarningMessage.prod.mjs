/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function e(e,...n){const o=new URL("https://lexical.dev/docs/error"),r=new URLSearchParams;r.append("code",e);for(const e of n)r.append("v",e);o.search=r.toString(),console.warn(`Minified Lexical warning #${e}; visit ${o.toString()} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`)}export{e as default};
