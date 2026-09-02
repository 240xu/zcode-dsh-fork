/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict'
const LexicalInternalFormatDevWarningMessage = process.env.NODE_ENV !== 'production' ? require('./LexicalInternalFormatDevWarningMessage.dev.js') : require('./LexicalInternalFormatDevWarningMessage.prod.js');
module.exports = LexicalInternalFormatDevWarningMessage;