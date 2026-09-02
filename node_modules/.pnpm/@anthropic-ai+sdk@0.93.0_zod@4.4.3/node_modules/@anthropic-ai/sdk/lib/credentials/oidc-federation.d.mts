import type { Fetch } from "../../internal/builtin-types.mjs";
import type { AccessTokenProvider, IdentityTokenProvider } from "./types.mjs";
export type OIDCFederationConfig = {
    identityTokenProvider: IdentityTokenProvider;
    federationRuleId: string;
    organizationId: string;
    serviceAccountId?: string | undefined;
    baseURL: string;
    fetch: Fetch;
    /**
     * Overrides the outgoing User-Agent header on the token exchange. When
     * empty, sends an SDK-identified UA so the token endpoint's access logs
     * identify the caller.
     */
    userAgent?: string | undefined;
};
/**
 * Exchanges an external OIDC JWT for an Anthropic access token via the
 * RFC 7523 jwt-bearer grant.
 *
 * Each invocation performs a fresh token exchange. Wrap in a
 * {@link TokenCache} to avoid exchanging on every request.
 *
 * Federation grants do not return a refresh token — callers re-exchange
 * their assertion on expiry.
 */
export declare function oidcFederationProvider(config: OIDCFederationConfig): AccessTokenProvider;
//# sourceMappingURL=oidc-federation.d.mts.map