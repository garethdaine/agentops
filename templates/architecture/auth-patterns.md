# Architecture Pattern: Authentication and Authorisation

## When to Use

- Any system that serves multiple users or exposes APIs
- Services that need role-based or attribute-based access control
- APIs consumed by third-party clients requiring OAuth2 flows
- Systems where audit trails and permission boundaries are compliance requirements

## Pattern Description

Authentication verifies identity (who are you?). Authorisation verifies permissions (what can you do?). These are separate concerns and should be implemented as distinct middleware layers. Token-based authentication with JWT is the dominant pattern for stateless APIs, while session-based auth remains appropriate for server-rendered applications.

## JWT Structure and Validation

```typescript
/**
 * JWT payload structure. Keep claims minimal — the token
 * travels with every request.
 */
export interface TokenPayload {
  sub: string;         // User ID
  email: string;
  roles: string[];
  tenantId: string;
  iat: number;         // Issued at (seconds since epoch)
  exp: number;         // Expiration (seconds since epoch)
  jti: string;         // Unique token ID for revocation
}

export function verifyToken(token: string, secret: string): TokenPayload {
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      clockTolerance: 5, // 5 seconds tolerance for clock skew
    }) as TokenPayload;

    // Additional validation beyond signature check
    if (!payload.sub || !payload.tenantId) {
      throw new AuthenticationError('Token missing required claims');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    }
    throw error;
  }
}
```

## Authentication Middleware

```typescript
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or malformed Authorization header');
  }

  const token = header.slice(7);
  const payload = verifyToken(token, config.jwtSecret);

  // Attach to request for downstream use
  req.user = {
    id: payload.sub,
    email: payload.email,
    roles: payload.roles,
    tenantId: payload.tenantId,
  };

  next();
}
```

## OAuth2 Flows

### Authorization Code Flow (User-Facing Applications)

```typescript
/**
 * Step 1: Redirect user to identity provider
 * Step 2: IDP redirects back with authorization code
 * Step 3: Exchange code for tokens server-side (never in the browser)
 */
export async function handleOAuthCallback(req: Request, res: Response) {
  const { code, state } = req.query;

  // Verify state parameter to prevent CSRF
  const savedState = await sessionStore.get(`oauth_state:${state}`);
  if (!savedState) {
    throw new AuthenticationError('Invalid OAuth state parameter');
  }

  // Exchange authorization code for tokens
  const tokenResponse = await httpClient.post(config.oauth.tokenEndpoint, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.oauth.redirectUri,
    client_id: config.oauth.clientId,
    client_secret: config.oauth.clientSecret,
  });

  const { access_token, refresh_token, expires_in } = tokenResponse.data;

  // Store refresh token securely server-side
  await tokenStore.save(savedState.userId, {
    refreshToken: refresh_token,
    expiresAt: new Date(Date.now() + expires_in * 1000),
  });

  // Set access token in HTTP-only cookie or return to client
  res.cookie('access_token', access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: expires_in * 1000,
  });

  res.redirect(savedState.returnUrl);
}
```

### Client Credentials Flow (Service-to-Service)

```typescript
/**
 * For machine-to-machine authentication where no user is involved.
 * The service authenticates with its own credentials.
 */
export async function getServiceToken(): Promise<string> {
  const cached = tokenCache.get('service_token');
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const response = await httpClient.post(config.oauth.tokenEndpoint, {
    grant_type: 'client_credentials',
    client_id: config.serviceClientId,
    client_secret: config.serviceClientSecret,
    scope: 'read:orders write:orders',
  });

  tokenCache.set('service_token', {
    accessToken: response.data.access_token,
    expiresAt: Date.now() + response.data.expires_in * 1000,
  });

  return response.data.access_token;
}
```

## Token Refresh Strategy

```typescript
/**
 * Refresh tokens before they expire. Use a buffer window
 * to avoid race conditions where a token expires mid-request.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const stored = await tokenStore.get(userId);
  if (!stored) {
    throw new AuthenticationError('No token found — user must re-authenticate');
  }

  const bufferMs = 60_000; // Refresh 60 seconds before expiry
  if (stored.expiresAt.getTime() - Date.now() > bufferMs) {
    return stored.accessToken;
  }

  const response = await httpClient.post(config.oauth.tokenEndpoint, {
    grant_type: 'refresh_token',
    refresh_token: stored.refreshToken,
    client_id: config.oauth.clientId,
    client_secret: config.oauth.clientSecret,
  });

  await tokenStore.save(userId, {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token ?? stored.refreshToken,
    expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
  });

  return response.data.access_token;
}
```

## RBAC vs ABAC

### Role-Based Access Control (Simpler, Start Here)

```typescript
/**
 * Use RBAC when permissions map cleanly to job functions.
 * Roles: admin, manager, member, viewer
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.user.roles;
    const hasRole = roles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      throw new AuthorisationError(`Requires one of: ${roles.join(', ')}`);
    }
    next();
  };
}

// Usage
router.delete('/projects/:id', requireRole('admin', 'manager'), deleteProject);
```

### Attribute-Based Access Control (More Flexible, More Complex)

```typescript
/**
 * Use ABAC when access depends on resource attributes, time,
 * location, or other contextual factors beyond simple roles.
 */
export interface AccessPolicy {
  effect: 'allow' | 'deny';
  condition: (context: AccessContext) => boolean;
}

export interface AccessContext {
  user: { id: string; roles: string[]; department: string };
  resource: { type: string; ownerId: string; status: string };
  action: string;
  environment: { time: Date; ipAddress: string };
}

export function evaluatePolicies(
  policies: AccessPolicy[],
  context: AccessContext,
): boolean {
  // Deny takes precedence
  const denied = policies.some(
    (p) => p.effect === 'deny' && p.condition(context),
  );
  if (denied) return false;

  // At least one allow must match
  return policies.some(
    (p) => p.effect === 'allow' && p.condition(context),
  );
}

// Example policy: users can only edit their own resources
const ownerOnlyEdit: AccessPolicy = {
  effect: 'allow',
  condition: (ctx) =>
    ctx.action === 'edit' && ctx.resource.ownerId === ctx.user.id,
};
```

## Permission System Architecture

```typescript
/**
 * Permissions as granular capabilities, grouped into roles.
 * Stored in the database, cached aggressively.
 */
export const PERMISSIONS = {
  'projects:read': 'View projects',
  'projects:write': 'Create and edit projects',
  'projects:delete': 'Delete projects',
  'billing:read': 'View billing information',
  'billing:manage': 'Manage billing and subscriptions',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function requirePermission(...permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = await permissionCache.getForUser(req.user.id);
    const hasAll = permissions.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      throw new AuthorisationError(`Missing permissions: ${permissions.join(', ')}`);
    }
    next();
  };
}
```

## Trade-offs

- **JWT size:** Every claim increases token size and bandwidth. Keep payloads lean.
- **Stateless vs revocation:** JWTs cannot be revoked without a blocklist, which reintroduces state.
- **RBAC simplicity vs ABAC flexibility:** RBAC is easy to reason about but rigid. ABAC handles complex policies but requires more infrastructure.
- **Token lifetime:** Short-lived tokens are more secure but increase refresh traffic.

## Common Pitfalls

1. **Storing sensitive data in JWT payload** — JWTs are encoded, not encrypted. Never include passwords, PII, or secrets.
2. **No token revocation strategy** — If a user is compromised, you need a way to invalidate their tokens before expiry. Maintain a short blocklist in Redis.
3. **Checking roles instead of permissions** — `if (user.role === 'admin')` scattered through code is unmaintainable. Check permissions, map roles to permissions centrally.
4. **Missing CSRF protection on cookie-based auth** — HTTP-only cookies need SameSite flags and CSRF tokens for state-changing requests.
5. **Symmetric JWT signing in multi-service setups** — Use asymmetric keys (RS256) so services can verify tokens without knowing the signing secret.
6. **Hardcoded roles** — Store role-permission mappings in the database so they can be updated without deployments.
