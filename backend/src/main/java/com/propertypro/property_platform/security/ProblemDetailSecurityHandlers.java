package com.propertypro.property_platform.security;

import com.propertypro.property_platform.activitylog.service.SystemLogEntry;
import com.propertypro.property_platform.activitylog.service.SystemLogModules;
import com.propertypro.property_platform.activitylog.service.SystemLogService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;

import java.io.IOException;

/**
 * 401/403 responses from the security filter chain in the same ProblemDetail format as the rest
 * of the API, keeping the standard {@code WWW-Authenticate} header.
 */
final class ProblemDetailSecurityHandlers {

	private ProblemDetailSecurityHandlers() {
	}

	static AuthenticationEntryPoint authenticationEntryPoint() {
		BearerTokenAuthenticationEntryPoint delegate = new BearerTokenAuthenticationEntryPoint();
		return (request, response, ex) -> {
			delegate.commence(request, response, ex);
			write(response, 401, "Unauthorized", "Authentication is required or the token is invalid.", "unauthorized");
		};
	}

	static AccessDeniedHandler accessDeniedHandler(SystemLogService systemLog) {
		BearerTokenAccessDeniedHandler delegate = new BearerTokenAccessDeniedHandler();
		return (request, response, ex) -> {
			delegate.handle(request, response, ex);
			if (ex instanceof CsrfException) {
				// The dashboard fetches a fresh token from GET /api/v1/admin/csrf and retries once.
				write(response, 403, "Forbidden", "The CSRF token is missing or invalid.", "csrf_invalid");
				systemLog.record(SystemLogEntry.warning(SystemLogModules.PERMISSIONS, "Request rejected: missing or invalid CSRF token"));
				return;
			}
			write(response, 403, "Forbidden", "Access denied.", "forbidden");
			systemLog.record(SystemLogEntry.warning(SystemLogModules.PERMISSIONS, "Access denied by security policy"));
		};
	}

	private static void write(HttpServletResponse response, int status, String title, String detail, String code)
			throws IOException {
		response.setStatus(status);
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		response.getWriter().write("{\"status\":" + status + ",\"title\":\"" + title + "\",\"detail\":\"" + detail
				+ "\",\"code\":\"" + code + "\"}");
	}

}
