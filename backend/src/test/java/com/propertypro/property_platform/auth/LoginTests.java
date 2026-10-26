package com.propertypro.property_platform.auth;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LoginTests extends AbstractIntegrationTest {

	@Test
	void loginWithEmailReturnsTokensAndSafeProfile() throws Exception {
		registerActiveUser();
		login("JANE@example.com ", PASSWORD)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.tokenType").value("Bearer"))
			.andExpect(jsonPath("$.accessToken").isNotEmpty())
			.andExpect(jsonPath("$.refreshToken").isNotEmpty())
			.andExpect(jsonPath("$.expiresIn").value(900))
			.andExpect(jsonPath("$.user.email").value(EMAIL))
			.andExpect(jsonPath("$.user.status").value("active"))
			.andExpect(jsonPath("$.user.userType").value("user"))
			.andExpect(jsonPath("$.user.passwordHash").doesNotExist())
			.andExpect(jsonPath("$.user.aadharCard").doesNotExist())
			.andExpect(jsonPath("$.user.notificationToken").doesNotExist())
			.andExpect(content().string(not(containsString("$2a$"))));
	}

	@Test
	void loginWithPhoneInAnyFormatWorks() throws Exception {
		registerActiveUser();
		login("+91 98765 43210", PASSWORD).andExpect(status().isOk());
		login("09876543210", PASSWORD).andExpect(status().isOk());
	}

	@Test
	void wrongPasswordAndUnknownIdentifierGetTheSameResponse() throws Exception {
		registerActiveUser();
		String wrongPassword = login(EMAIL, "Wrong!Pass1").andExpect(status().isUnauthorized())
			.andReturn().getResponse().getContentAsString();
		String unknown = login("ghost@example.com", PASSWORD).andExpect(status().isUnauthorized())
			.andReturn().getResponse().getContentAsString();
		assertThat(json(wrongPassword, "$.code")).isEqualTo("invalid_credentials");
		assertThat(json(unknown, "$.detail")).isEqualTo(json(wrongPassword, "$.detail"));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_sessions", Integer.class)).isZero();
	}

	@Test
	void pendingUserCannotLogIn() throws Exception {
		register(EMAIL, PHONE);
		login(EMAIL, PASSWORD)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("verification_required"));
	}

	@Test
	void activeUserWithoutAnyVerifiedChannelCannotLogIn() throws Exception {
		register(EMAIL, PHONE);
		setStatus(EMAIL, "active");
		login(EMAIL, PASSWORD)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("verification_required"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "suspended", "rejected", "inactive", "closed" })
	void blockedUsersCannotLogIn(String blockedStatus) throws Exception {
		registerActiveUser();
		setStatus(EMAIL, blockedStatus);
		login(EMAIL, PASSWORD)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("account_inactive"));
	}

	@Test
	void blockedUserWithWrongPasswordLearnsNothingAboutStatus() throws Exception {
		registerActiveUser();
		setStatus(EMAIL, "suspended");
		login(EMAIL, "Wrong!Pass1")
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("invalid_credentials"));
	}

	@Test
	void softDeletedUserCannotLogIn() throws Exception {
		registerActiveUser();
		jdbc.update("UPDATE users SET deleted_at = now()");
		login(EMAIL, PASSWORD)
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("invalid_credentials"));
	}

	@Test
	void adminAccountCannotUseUserLogin() throws Exception {
		registerActiveUser();
		jdbc.update("UPDATE users SET user_type = 'admin'");
		login(EMAIL, PASSWORD)
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("invalid_credentials"));
	}

	@Test
	void failedLoginsAreRateLimitedPerIdentifier() throws Exception {
		registerActiveUser();
		for (int i = 0; i < 5; i++) {
			login(EMAIL, "Wrong!Pass1").andExpect(status().isUnauthorized());
		}
		// Even the correct password is refused until the window passes.
		login(EMAIL, PASSWORD)
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("rate_limited"));
		// Other accounts are unaffected.
		login("other@example.com", PASSWORD).andExpect(status().isUnauthorized());
	}

	@Test
	void successfulLoginsDoNotCountTowardsTheFailureLimit() throws Exception {
		registerActiveUser();
		for (int i = 0; i < 7; i++) {
			login(EMAIL, PASSWORD).andExpect(status().isOk());
		}
	}

}
