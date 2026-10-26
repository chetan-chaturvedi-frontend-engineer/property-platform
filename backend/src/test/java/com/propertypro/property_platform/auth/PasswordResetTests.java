package com.propertypro.property_platform.auth;

import com.propertypro.property_platform.otp.domain.OtpChannel;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.support.AbstractIntegrationTest;
import com.propertypro.property_platform.support.FakeOtpOutbox;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PasswordResetTests extends AbstractIntegrationTest {

	private static final String NEW_PASSWORD = "N3w!Password";

	@Test
	void resetCodeIsSentThroughTheIdentifiersChannel() throws Exception {
		registerActiveUser();
		forgot(EMAIL).andExpect(status().isAccepted());
		outbox.awaitCode(EMAIL, OtpPurpose.PASSWORD_RESET);

		// Phone is only usable after it is verified.
		verify(PHONE_E164, outbox.awaitCode(PHONE_E164, OtpPurpose.PHONE_VERIFICATION), "phone_verification")
			.andExpect(status().isOk());
		forgot(PHONE).andExpect(status().isAccepted());
		outbox.awaitCode(PHONE_E164, OtpPurpose.PASSWORD_RESET);

		assertThat(outbox.sent()).filteredOn(s -> s.purpose() == OtpPurpose.PASSWORD_RESET)
			.extracting(FakeOtpOutbox.Sent::channel)
			.containsExactlyInAnyOrder(OtpChannel.EMAIL, OtpChannel.SMS);
	}

	@Test
	void unknownOrIneligibleIdentifiersGetTheSameResponseAndNoCode() throws Exception {
		registerActiveUser();
		outbox.clear();
		String known = forgot(EMAIL).andReturn().getResponse().getContentAsString();
		String unknown = forgot("ghost@example.com").andExpect(status().isAccepted())
			.andReturn().getResponse().getContentAsString();
		// Registered but unverified phone: no reset through an unproven channel.
		String unverifiedPhone = forgot(PHONE).andExpect(status().isAccepted())
			.andReturn().getResponse().getContentAsString();

		assertThat(unknown).isEqualTo(known).isEqualTo(unverifiedPhone);
		outbox.awaitCode(EMAIL, OtpPurpose.PASSWORD_RESET);
		Thread.sleep(200);
		assertThat(outbox.sent()).hasSize(1);
	}

	@Test
	void successfulResetChangesPasswordAndRevokesSessions() throws Exception {
		registerActiveUser();
		String session = loginBody(EMAIL, PASSWORD);
		forgot(EMAIL);
		String code = outbox.awaitCode(EMAIL, OtpPurpose.PASSWORD_RESET);

		reset(EMAIL, code, NEW_PASSWORD, NEW_PASSWORD)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.accessToken").doesNotExist());

		login(EMAIL, PASSWORD).andExpect(status().isUnauthorized());
		login(EMAIL, NEW_PASSWORD).andExpect(status().isOk());
		getWithToken("/api/v1/auth/me", json(session, "$.accessToken")).andExpect(status().isUnauthorized());
		postJson("/api/v1/auth/refresh", "{\"refreshToken\":\"%s\"}".formatted(json(session, "$.refreshToken")))
			.andExpect(status().isUnauthorized());
		assertThat(jdbc.queryForObject("SELECT status FROM users", String.class)).isEqualTo("active");
	}

	@Test
	void invalidExpiredOrConsumedCodesAreRejected() throws Exception {
		registerActiveUser();
		forgot(EMAIL);
		String code = outbox.awaitCode(EMAIL, OtpPurpose.PASSWORD_RESET);

		reset(EMAIL, code.equals("000000") ? "111111" : "000000", NEW_PASSWORD, NEW_PASSWORD)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("invalid_otp"));
		reset("ghost@example.com", code, NEW_PASSWORD, NEW_PASSWORD).andExpect(status().isBadRequest());

		jdbc.update("UPDATE otp_challenges SET expires_at = now() - interval '1 second' WHERE purpose = 'password_reset'");
		reset(EMAIL, code, NEW_PASSWORD, NEW_PASSWORD).andExpect(status().isBadRequest());
		login(EMAIL, PASSWORD).andExpect(status().isOk());

		expireResendCooldown();
		forgot(EMAIL);
		String fresh = outbox.awaitCode(EMAIL, OtpPurpose.PASSWORD_RESET, 2);
		reset(EMAIL, fresh, NEW_PASSWORD, NEW_PASSWORD).andExpect(status().isOk());
		reset(EMAIL, fresh, "An0ther!Pass", "An0ther!Pass").andExpect(status().isBadRequest());
		login(EMAIL, NEW_PASSWORD).andExpect(status().isOk());
	}

	@Test
	void passwordConfirmationAndPolicyAreEnforced() throws Exception {
		registerActiveUser();
		forgot(EMAIL);
		String code = outbox.awaitCode(EMAIL, OtpPurpose.PASSWORD_RESET);

		reset(EMAIL, code, NEW_PASSWORD, "Different!1")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.passwordConfirmation").exists());
		reset(EMAIL, code, "short", "short")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.password").exists());
		// Validation failures do not use up the code.
		reset(EMAIL, code, NEW_PASSWORD, NEW_PASSWORD).andExpect(status().isOk());
	}

	@Test
	void resetDoesNotWorkForOrReactivateBlockedAccounts() throws Exception {
		registerActiveUser();
		forgot(EMAIL);
		String code = outbox.awaitCode(EMAIL, OtpPurpose.PASSWORD_RESET);
		setStatus(EMAIL, "suspended");

		reset(EMAIL, code, NEW_PASSWORD, NEW_PASSWORD).andExpect(status().isBadRequest());
		assertThat(jdbc.queryForObject("SELECT status FROM users", String.class)).isEqualTo("suspended");

		outbox.clear();
		expireResendCooldown();
		forgot(EMAIL).andExpect(status().isAccepted());
		Thread.sleep(200);
		assertThat(outbox.sent()).isEmpty();
	}

	@Test
	void resetCodeCannotVerifyEmailOrPhone() throws Exception {
		register(EMAIL, PHONE);
		verify(PHONE_E164, outbox.awaitCode(PHONE_E164, OtpPurpose.PHONE_VERIFICATION), "phone_verification")
			.andExpect(status().isOk());
		forgot(PHONE);
		String resetCode = outbox.awaitCode(PHONE_E164, OtpPurpose.PASSWORD_RESET);

		verify(PHONE_E164, resetCode, "phone_verification").andExpect(status().isBadRequest());
		String emailCode = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		if (!emailCode.equals(resetCode)) {
			verify(EMAIL, resetCode, "email_verification").andExpect(status().isBadRequest());
		}
		assertThat(jdbc.queryForObject("SELECT email_verified FROM users", Object.class)).isNull();
	}

	private ResultActions forgot(String identifier) throws Exception {
		return postJson("/api/v1/auth/forgot-password", "{\"identifier\":\"%s\"}".formatted(identifier));
	}

	private ResultActions reset(String identifier, String otp, String password, String confirmation)
			throws Exception {
		return postJson("/api/v1/auth/reset-password", """
				{"identifier":"%s","otp":"%s","password":"%s","passwordConfirmation":"%s"}"""
				.formatted(identifier, otp, password, confirmation));
	}

}
