package com.propertypro.property_platform.security;

import java.util.Set;

/** Paths of the admin dashboard's cookie session, shared by the cookie writer, token resolver and CSRF rules. */
public final class AdminCookiePaths {

	/** The access token cookie is sent to every admin endpoint and nowhere else. */
	public static final String ADMIN_API = "/api/v1/admin";
	public static final String LOGIN = ADMIN_API + "/login";
	/** The refresh token cookie is sent to this endpoint only. */
	public static final String REFRESH = ADMIN_API + "/refresh";
	public static final String LOGOUT = ADMIN_API + "/logout";
	public static final String CSRF = ADMIN_API + "/csrf";

	/** Public endpoints: a stale access token cookie must never turn these into 401s. */
	static final Set<String> PUBLIC = Set.of(LOGIN, REFRESH, CSRF);

	private AdminCookiePaths() {
	}

	static boolean isAdminApi(String path) {
		return path.equals(ADMIN_API) || path.startsWith(ADMIN_API + "/");
	}

}
