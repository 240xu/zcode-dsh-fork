"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oidcFederationProvider = oidcFederationProvider;
const types_1 = require("./types.js");
const time_1 = require("../../internal/utils/time.js");
const version_1 = require("../../version.js");
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
function oidcFederationProvider(config) {
    return async () => {
        (0, types_1.requireSecureTokenEndpoint)(config.baseURL);
        const jwt = await config.identityTokenProvider();
        // The token endpoint enforces a 16 KiB assertion limit; surface a clear
        // client-side error so misconfigured projected-token sources are
        // diagnosable without a server round-trip.
        if (jwt.length > 16 * 1024) {
            throw new types_1.WorkloadIdentityError(`Identity token is ${Math.ceil(jwt.length / 1024)} KiB, exceeds the 16 KiB assertion limit`);
        }
        const body = {
            grant_type: types_1.GRANT_TYPE_JWT_BEARER,
            assertion: jwt,
            federation_rule_id: config.federationRuleId,
            organization_id: config.organizationId,
        };
        if (config.serviceAccountId) {
            body['service_account_id'] = config.serviceAccountId;
        }
        const url = `${config.baseURL}${types_1.TOKEN_ENDPOINT}`;
        let resp;
        try {
            resp = await config.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-beta': `${types_1.OAUTH_API_BETA_HEADER},${types_1.FEDERATION_BETA_HEADER}`,
                    'User-Agent': config.userAgent || `anthropic-sdk-typescript/${version_1.VERSION} oidcFederationProvider`,
                },
                body: JSON.stringify(body),
            });
        }
        catch (err) {
            throw new types_1.WorkloadIdentityError(`Failed to reach token endpoint ${url}: ${err}`);
        }
        const requestId = resp.headers.get('Request-Id');
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            const redacted = (0, types_1.redactSensitive)(text);
            throw new types_1.WorkloadIdentityError(`Token exchange failed with status ${resp.status}${requestId ? ` (request-id ${requestId})` : ''}: ${redacted}`, resp.status, redacted, requestId);
        }
        const data = await (0, types_1.parseTokenResponse)(resp, requestId);
        const expiresIn = Number(data.expires_in);
        if (!Number.isFinite(expiresIn)) {
            throw new types_1.WorkloadIdentityError(`Token endpoint response missing required fields: ${JSON.stringify((0, types_1.redactSensitive)(data))}`, resp.status, (0, types_1.redactSensitive)(data), requestId);
        }
        return {
            token: data.access_token,
            expiresAt: (0, time_1.nowAsSeconds)() + expiresIn,
        };
    };
}
//# sourceMappingURL=oidc-federation.js.map