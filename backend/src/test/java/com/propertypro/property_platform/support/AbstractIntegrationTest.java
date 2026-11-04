package com.propertypro.property_platform.support;

import com.jayway.jsonpath.JsonPath;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.security.ratelimit.InMemoryRateLimiter;
import org.junit.jupiter.api.BeforeEach;
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

	protected ResultActions postJson(String path, String json) throws Exception {
		return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json));
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
