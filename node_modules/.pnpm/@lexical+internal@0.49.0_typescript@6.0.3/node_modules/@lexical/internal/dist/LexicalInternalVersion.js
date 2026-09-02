/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict'
const LexicalInternalVersion = process.env.NODE_ENV !== 'production' ? require('./LexicalInternalVersion.dev.js') : require('./LexicalInternalVersion.prod.js');
module.exports = LexicalInternalVersion;