/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/**
 * If `!cond`, throw in `__DEV__` like an invariant and warn in prod.
 *
 * A production build rewrites call sites via `transformErrorMessages`
 * (throwing dev message in dev, `formatProdWarningMessage` in prod), so this
 * body is only reached when consumed as untransformed source. It interpolates
 * `%s` placeholders and throws outside production, otherwise warns.
 */
export default function devInvariant(cond?: boolean, message?: string, ...args: string[]): void;
