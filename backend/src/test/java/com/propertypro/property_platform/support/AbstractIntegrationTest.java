package com.propertypro.property_platform.support;

import com.jayway.jsonpath.JsonPath;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.security.ratelimit.InMemoryRateLimiter;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full application against the {@code property_app_test} database with fake OTP providers.
 * Every test starts with empty auth tables and fresh rate-limit counters.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(FakeOtpOutbox.Config.class)
public abstract class AbstractIntegrationTest {

	protected static final String PASSWORD = "Str0ng!Pass";
	protected static final String EMAIL = "jane@example.com";
	/** National format input; stored as {@link #PHONE_E164}. */
	protected static final String PHONE = "98765 43210";
	protected static final String PHONE_E164 = "+919876543210";
	/** HttpOnly cookies set by the admin login (see {@code app.security.auth-cookies}). */
	protected static final String ADMIN_ACCESS_COOKIE = "admin_access_token";
	protected static final String ADMIN_REFRESH_COOKIE = "admin_refresh_token";
	protected static final String CSRF_COOKIE = "XSRF-TOKEN";
	protected static final String CSRF_HEADER = "X-XSRF-TOKEN";
	private static final String CSRF_TOKEN = "11111111-2222-3333-4444-555555555555";
	private static final SecureRandom RANDOM = new SecureRandom();

	@Autowired
	protected MockMvc mvc;

	@Autowired
	protected JdbcTemplate jdbc;

	@Autowired
	protected FakeOtpOutbox outbox;

	@Autowired
	protected InMemoryRateLimiter rateLimiter;

	/**
	 * System logs are written in the background and lock system_logs before users. Listing system_logs
	 * first in a TRUNCATE keeps that order, so a late write from the previous test cannot deadlock it.
	 */
	@BeforeEach
	void resetState() {
		jdbc.execute("TRUNCATE system_logs, refresh_tokens, auth_sessions, otp_challenges, users RESTART IDENTITY CASCADE");
		rateLimiter.reset();
		outbox.clear();
	}

	/** Includes a valid CSRF token, as the admin dashboard does; CSRF rules are tested in AdminAuthTests. */
	protected ResultActions postJson(String path, String json) throws Exception {
		return mvc.perform(withCsrf(post(path)).contentType(MediaType.APPLICATION_JSON).content(json));
	}

	/**
	 * A real double-submit CSRF token: the XSRF-TOKEN cookie plus the masked token in X-XSRF-TOKEN, exactly
	 * what the browser sends after {@code GET /api/v1/admin/csrf}. (Spring Security Test's {@code csrf()}
	 * replaces the application's token repository, so it would not test the real configuration.)
	 */
	protected static AbstractMockHttpServletRequestBuilder<?> withCsrf(AbstractMockHttpServletRequestBuilder<?> request) {
		return request.cookie(new Cookie(CSRF_COOKIE, CSRF_TOKEN)).header(CSRF_HEADER, maskCsrfToken(CSRF_TOKEN));
	}

	/** The BREACH-safe form Spring Security hands out: random bytes followed by token XOR random. */
	protected static String maskCsrfToken(String token) {
		byte[] tokenBytes = token.getBytes(StandardCharsets.UTF_8);
		byte[] random = new byte[tokenBytes.length];
		RANDOM.nextBytes(random);
		byte[] masked = new byte[tokenBytes.length * 2];
		System.arraycopy(random, 0, masked, 0, random.length);
		for (int i = 0; i < tokenBytes.length; i++) {
			masked[tokenBytes.length + i] = (byte) (tokenBytes[i] ^ random[i]);
		}
		return Base64.getUrlEncoder().encodeToString(masked);
	}

	/**
	 * The access token of a successful login: from the body for the app login, from the HttpOnly cookie for
	 * the admin login. Either works as a Bearer token.
	 */
	protected static String accessToken(ResultActions login) throws Exception {
		var response = login.andExpect(status().isOk()).andReturn().getResponse();
		Cookie cookie = response.getCookie(ADMIN_ACCESS_COOKIE);
		if (cookie != null) {
			return cookie.getValue();
		}
		String token = json(response.getContentAsString(), "$.accessToken");
		assertThat(token).isNotBlank();
		return token;
	}

	protected ResultActions getWithToken(String path, String accessToken) throws Exception {
		return mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken));
	}

	protected ResultActions register(String email, String phone) throws Exception {
		return postJson("/api/v1/auth/register", """
				{"fullName":"Jane Doe","email":"%s","phone":"%s","password":"%s","passwordConfirmation":"%s"}"""
				.formatted(email, phone, PASSWORD, PASSWORD));
	}

	protected ResultActions verify(String identifier, String otp, String purpose) throws Exception {
		return postJson("/api/v1/auth/verify-otp", """
				{"identifier":"%s","otp":"%s","purpose":"%s"}""".formatted(identifier, otp, purpose));
	}

	protected ResultActions resend(String identifier, String purpose) throws Exception {
		return postJson("/api/v1/auth/resend-otp", """
				{"identifier":"%s","purpose":"%s"}""".formatted(identifier, purpose));
	}

	protected ResultActions login(String identifier, String password) throws Exception {
		return postJson("/api/v1/auth/login", """
				{"identifier":"%s","password":"%s"}""".formatted(identifier, password));
	}

	/** Registers {@link #EMAIL}/{@link #PHONE} and verifies the email, leaving an active account. */
	protected void registerActiveUser() throws Exception {
		register(EMAIL, PHONE).andExpect(status().isCreated());
		verify(EMAIL, outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION), "email_verification")
				.andExpect(status().isOk());
	}

	/** Logs in and returns the response body. */
	protected String loginBody(String identifier, String password) throws Exception {
		return login(identifier, password).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
	}

	protected static String json(String body, String path) {
		return JsonPath.read(body, path).toString();
	}

	protected void setStatus(String email, String status) {
		jdbc.update("UPDATE users SET status = ? WHERE email = ?", status, email);
	}

	/** Moves the user's challenges into the past so the resend cooldown no longer applies. */
	protected void expireResendCooldown() {
		jdbc.update("UPDATE otp_challenges SET created_at = created_at - interval '10 minutes'");
		rateLimiter.reset();
	}

}
