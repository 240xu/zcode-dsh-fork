/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function e(e,...r){const n=new URL("https://lexical.dev/docs/error"),o=new URLSearchParams;o.append("code",e);for(const e of r)o.append("v",e);throw n.search=o.toString(),Error(`Minified Lexical error #${e}; visit ${n.toString()} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`)}export{e as default};
