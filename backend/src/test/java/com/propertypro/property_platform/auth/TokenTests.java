package com.propertypro.property_platform.auth;

import com.propertypro.property_platform.security.JwtProperties;
import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TokenTests extends AbstractIntegrationTest {

	@Autowired
	private JwtEncoder jwtEncoder;

	@Autowired
	private JwtProperties jwtProperties;

	@Test
	void meRequiresAuthentication() throws Exception {
		mvc.perform(get("/api/v1/auth/me"))
			.andExpect(status().isUnauthorized())
			.andExpect(header().exists(HttpHeaders.WWW_AUTHENTICATE))
			.andExpect(jsonPath("$.code").value("unauthorized"));
		mvc.perform(post("/api/v1/auth/logout")).andExpect(status().isUnauthorized());
	}

	@Test
	void meReturnsOwnSafeProfile() throws Exception {
		registerActiveUser();
		String session = loginBody(EMAIL, PASSWORD);
		getWithToken("/api/v1/auth/me", json(session, "$.accessToken"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(1))
			.andExpect(jsonPath("$.email").value(EMAIL))
			.andExpect(jsonPath("$.phone").value(PHONE_E164))
			.andExpect(jsonPath("$.status").value("active"))
			.andExpect(jsonPath("$.userType").value("user"))
			.andExpect(jsonPath("$.emailVerified").value(true))
			.andExpect(jsonPath("$.phoneVerified").value(false))
			.andExpect(jsonPath("$.passwordHash").doesNotExist())
			.andExpect(jsonPath("$.panCard").doesNotExist());
	}

	@Test
	void garbageTamperedAndForeignTokensAreRejected() throws Exception {
		registerActiveUser();
		String token = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

		getWithToken("/api/v1/auth/me", "not-a-jwt").andExpect(status().isUnauthorized());
		getWithToken("/api/v1/auth/me", token.substring(0, token.length() - 2) + "xx")
			.andExpect(status().isUnauthorized());
		String sessionId = jdbc.queryForObject("SELECT id::text FROM auth_sessions", String.class);
		getWithToken("/api/v1/auth/me", token(sessionId, Instant.now().plusSeconds(600), "other-issuer",
				jwtProperties.audience())).andExpect(status().isUnauthorized());
		getWithToken("/api/v1/auth/me", token(sessionId, Instant.now().plusSeconds(600), jwtProperties.issuer(),
				"other-audience")).andExpect(status().isUnauthorized());
	}

	@Test
	void expiredAccessTokenIsRejected() throws Exception {
		registerActiveUser();
		loginBody(EMAIL, PASSWORD);
		String sessionId = jdbc.queryForObject("SELECT id::text FROM auth_sessions", String.class);
		String valid = token(sessionId, Instant.now().plusSeconds(600), jwtProperties.issuer(), jwtProperties.audience());
		String expired = token(sessionId, Instant.now().minus(Duration.ofMinutes(5)), jwtProperties.issuer(),
				jwtProperties.audience());

		getWithToken("/api/v1/auth/me", valid).andExpect(status().isOk());
		getWithToken("/api/v1/auth/me", expired).andExpect(status().isUnauthorized());
	}

	@Test
	void tokenInQueryStringIsNotAccepted() throws Exception {
		registerActiveUser();
		String token = json(loginBody(EMAIL, PASSWORD), "$.accessToken");
		mvc.perform(get("/api/v1/auth/me").param("access_token", token)).andExpect(status().isUnauthorized());
	}

	@Test
	void logoutRevokesAccessAndRefreshTokens() throws Exception {
		registerActiveUser();
		String session = loginBody(EMAIL, PASSWORD);
		String other = loginBody(EMAIL, PASSWORD);
		String accessToken = json(session, "$.accessToken");

		mvc.perform(post("/api/v1/auth/logout").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.message").value("Logged out."));

		getWithToken("/api/v1/auth/me", accessToken).andExpect(status().isUnauthorized());
		refresh(json(session, "$.refreshToken")).andExpect(status().isUnauthorized());
		// Other sessions (devices) stay logged in.
		getWithToken("/api/v1/auth/me", json(other, "$.accessToken")).andExpect(status().isOk());
	}

	@Test
	void refreshRotatesTokens() throws Exception {
		registerActiveUser();
		String session = loginBody(EMAIL, PASSWORD);

		String rotated = refresh(json(session, "$.refreshToken"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.user.email").value(EMAIL))
			.andReturn().getResponse().getContentAsString();
		assertThat(json(rotated, "$.refreshToken")).isNotEqualTo(json(session, "$.refreshToken"));
		getWithToken("/api/v1/auth/me", json(rotated, "$.accessToken")).andExpect(status().isOk());
		refresh(json(rotated, "$.refreshToken")).andExpect(status().isOk());
	}

	@Test
	void reusedRefreshTokenRevokesTheWholeSession() throws Exception {
		registerActiveUser();
		String session = loginBody(EMAIL, PASSWORD);
		String rotated = refresh(json(session, "$.refreshToken")).andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();

		// The old token is replayed (e.g. it was stolen): reject and kill the session.
		refresh(json(session, "$.refreshToken"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("invalid_token"));
		refresh(json(rotated, "$.refreshToken")).andExpect(status().isUnauthorized());
		getWithToken("/api/v1/auth/me", json(rotated, "$.accessToken")).andExpect(status().isUnauthorized());
		assertThat(jdbc.queryForObject("SELECT revoked_reason FROM auth_sessions", String.class))
			.isEqualTo("refresh_token_reuse");
	}

	@Test
	void unknownAndExpiredRefreshTokensAreRejected() throws Exception {
		refresh("unknown-token").andExpect(status().isUnauthorized());

		registerActiveUser();
		String session = loginBody(EMAIL, PASSWORD);
		jdbc.update("UPDATE refresh_tokens SET expires_at = now() - interval '1 second'");
		refresh(json(session, "$.refreshToken")).andExpect(status().isUnauthorized());
	}

	@Test
	void blockingAUserInvalidatesExistingTokensImmediately() throws Exception {
		registerActiveUser();
		String session = loginBody(EMAIL, PASSWORD);
		setStatus(EMAIL, "suspended");

		getWithToken("/api/v1/auth/me", json(session, "$.accessToken")).andExpect(status().isUnauthorized());
		refresh(json(session, "$.refreshToken")).andExpect(status().isUnauthorized());
	}

	@Test
	void userCannotAccessAdminEndpoints() throws Exception {
		registerActiveUser();
		String token = json(loginBody(EMAIL, PASSWORD), "$.accessToken");
		getWithToken("/api/v1/admin/users", token)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("forbidden"));
		mvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());
	}

	@Test
	void tokenOnlyIdentifiesItsOwnUser() throws Exception {
		registerActiveUser();
		register("other@example.com", "+919811111111");
		verify("other@example.com", outbox.awaitCode("other@example.com",
				com.propertypro.property_platform.otp.domain.OtpPurpose.EMAIL_VERIFICATION), "email_verification");

		String janeToken = json(loginBody(EMAIL, PASSWORD), "$.accessToken");
		getWithToken("/api/v1/auth/me", janeToken).andExpect(jsonPath("$.email").value(EMAIL));
		// Even a correctly signed token is refused if its subject does not own the session.
		String janeSessionId = jdbc.queryForObject("SELECT id::text FROM auth_sessions", String.class);
		getWithToken("/api/v1/auth/me", tokenFor("2", janeSessionId)).andExpect(status().isUnauthorized());
	}

	private ResultActions refresh(String refreshToken) throws Exception {
		return postJson("/api/v1/auth/refresh", "{\"refreshToken\":\"%s\"}".formatted(refreshToken));
	}

	private String token(String sessionId, Instant expiresAt, String issuer, String audience) {
		return encode(JwtClaimsSet.builder().subject("1").claim("sid", sessionId).issuer(issuer)
				.audience(List.of(audience)).issuedAt(expiresAt.minusSeconds(900)).expiresAt(expiresAt).build());
	}

	/** Correctly signed token pairing a user with someone else's session. */
	private String tokenFor(String userId, String sessionId) {
		return encode(JwtClaimsSet.builder().subject(userId).claim("sid", sessionId).issuer(jwtProperties.issuer())
				.audience(List.of(jwtProperties.audience())).issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(600)).build());
	}

	private String encode(JwtClaimsSet claims) {
		return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
			.getTokenValue();
	}

}
