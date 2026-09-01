import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PLATFORM_SUBDOMAINS = new Set(["app", "platform", "superadmin", "www"]);

function getHostnameParts(hostHeader: string): string[] {
  return hostHeader.split(":")[0]?.split(".").filter(Boolean) ?? [];
}

function getPlatformUrl(req: NextRequest, pathname: string): URL {
  if (process.env.PALMERA_PLATFORM_URL) {
    return new URL(pathname, process.env.PALMERA_PLATFORM_URL);
  }

  const url = new URL(pathname, req.url);
  const host = req.headers.get("host") || "";
  const parts = getHostnameParts(host);

  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    url.hostname = "localhost";
    return url;
  }

  if (parts.length > 2) {
    url.hostname = parts.slice(1).join(".");
  }

  return url;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host") || "";
  const hostnameParts = getHostnameParts(hostname);
  const firstHostPart = hostnameParts[0] ?? "";

  // 1. Resolve Tenant Slug from Subdomain
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  
  let tenantSlug = "";
  let isPlatformRoute = false;

  if (isLocalhost) {
    // If it's like gastroshows.localhost:3000
    if (hostnameParts.length > 1 && firstHostPart !== "localhost" && !PLATFORM_SUBDOMAINS.has(firstHostPart)) {
      tenantSlug = firstHostPart;
    } else {
      // localhost:3000 without subdomain → Platform management portal
      isPlatformRoute = true;
    }
  } else {
    // Production domain parsing
    // If it is gastroshows.palmera.io, parts would be ['gastroshows', 'palm-erp', 'com']
    if (hostnameParts.length > 2 && !PLATFORM_SUBDOMAINS.has(firstHostPart)) {
      tenantSlug = firstHostPart;
    } else {
      // Base domain (palmera.io) → Platform management portal
      isPlatformRoute = true;
    }
  }

  // Define route protection
  const isAdminRoute = url.pathname.startsWith("/admin");
  const isSuperadminRoute = url.pathname.startsWith("/superadmin");
  const isLoginRoute = url.pathname === "/login";
  const isRegisterRoute = url.pathname === "/register";

  // 2. Fetch the session token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Inject the resolved tenant slug into request headers so server actions / page components can read it
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-slug", tenantSlug);
  requestHeaders.set("x-is-platform", String(isPlatformRoute));

  // 3. Handle Platform Routes (localhost:3000 without subdomain)
  if (isPlatformRoute) {
    // Allow access to /admin, /superadmin, /login, /register, and root page
    // /admin is the platform's own admin panel
    // /superadmin is the global console for managing all instances
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 4. Handle Tenant Routes (subdomain.localhost:3000)

  // Block tenant access to superadmin console
  if (isSuperadminRoute) {
    return NextResponse.redirect(getPlatformUrl(req, url.pathname));
  }

  if (isAdminRoute) {
    if (!token) {
      // Not logged in → Redirect to login page on the same subdomain
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Logged in → Ensure user belongs to the current subdomain's tenant
    if (token.tenantSlug !== tenantSlug) {
      // User is logged into another tenant. Force logout / redirect to login page.
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "TenantMismatch");
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users trying to access login/register back to admin panel
  if ((isLoginRoute || isRegisterRoute) && token) {
    if (token.tenantSlug === tenantSlug) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // Continue request with modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Matching paths
export const config = {
  matcher: [
    "/admin/:path*",
    "/superadmin/:path*",
    "/superadmin",
    "/login",
    "/register",
  ],
};
