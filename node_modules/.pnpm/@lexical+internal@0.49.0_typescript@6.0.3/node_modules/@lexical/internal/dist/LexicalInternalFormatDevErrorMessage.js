/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict'
const LexicalInternalFormatDevErrorMessage = process.env.NODE_ENV !== 'production' ? require('./LexicalInternalFormatDevErrorMessage.dev.js') : require('./LexicalInternalFormatDevErrorMessage.prod.js');
module.exports = LexicalInternalFormatDevErrorMessage;