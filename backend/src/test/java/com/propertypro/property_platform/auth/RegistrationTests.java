package com.propertypro.property_platform.auth;

import com.propertypro.property_platform.otp.domain.OtpChannel;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.support.AbstractIntegrationTest;
import com.propertypro.property_platform.support.FakeOtpOutbox;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RegistrationTests extends AbstractIntegrationTest {

	@Autowired
	private RateLimitProperties limits;

	@Test
	void validRegistrationCreatesPendingUserWithHashedPassword() throws Exception {
		register("Jane@Example.COM", PHONE)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("pending"))
			.andExpect(jsonPath("$.emailVerified").value(false))
			.andExpect(jsonPath("$.phoneVerified").value(false))
			.andExpect(content().string(not(containsString(PASSWORD))))
			.andExpect(content().string(not(containsString("$2a$"))));

		Map<String, Object> user = jdbc.queryForMap("SELECT * FROM users");
		assertThat(user).containsEntry("email", EMAIL)
			.containsEntry("phone", PHONE_E164)
			.containsEntry("status", "pending")
			.containsEntry("user_type", "user")
			.containsEntry("email_verified", null)
			.containsEntry("phone_verified", null);
		assertThat((String) user.get("password_hash")).startsWith("$2a$").doesNotContain(PASSWORD);
	}

	@Test
	void clientCannotChooseTypeStatusOrVerificationFlags() throws Exception {
		postJson("/api/v1/auth/register", """
				{"fullName":"Eve","email":"eve@example.com","phone":"+919811111111","password":"%s",
				 "passwordConfirmation":"%s","userType":"admin","status":"active",
				 "emailVerified":true,"phoneVerified":true}""".formatted(PASSWORD, PASSWORD))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("pending"));

		Map<String, Object> user = jdbc.queryForMap("SELECT user_type, status, email_verified FROM users");
		assertThat(user).containsEntry("user_type", "user").containsEntry("status", "pending")
			.containsEntry("email_verified", null);
	}

	@Test
	void createsSeparateEmailAndPhoneChallenges() throws Exception {
		register(EMAIL, PHONE).andExpect(status().isCreated());

		List<Map<String, Object>> challenges = jdbc.queryForList(
				"SELECT purpose, channel, destination, otp_hash FROM otp_challenges ORDER BY purpose");
		assertThat(challenges).hasSize(2);
		assertThat(challenges.get(0)).containsEntry("purpose", "email_verification").containsEntry("channel", "email")
			.containsEntry("destination", EMAIL);
		assertThat(challenges.get(1)).containsEntry("purpose", "phone_verification").containsEntry("channel", "sms")
			.containsEntry("destination", PHONE_E164);
		assertThat(challenges.get(0).get("otp_hash")).isNotEqualTo(challenges.get(1).get("otp_hash"));

		String emailCode = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		String phoneCode = outbox.awaitCode(PHONE_E164, OtpPurpose.PHONE_VERIFICATION);
		assertThat(emailCode).matches("\\d{6}");
		assertThat(phoneCode).matches("\\d{6}");
		// Stored hashes never equal the code.
		assertThat(challenges).extracting(c -> c.get("otp_hash")).doesNotContain(emailCode, phoneCode);
		assertThat(outbox.sent()).extracting(FakeOtpOutbox.Sent::channel)
			.containsExactlyInAnyOrder(OtpChannel.EMAIL, OtpChannel.SMS);
	}

	@Test
	void duplicateNormalizedEmailOrPhoneIsRejected() throws Exception {
		register(EMAIL, PHONE).andExpect(status().isCreated());

		register("JANE@example.com", "+919800000001")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("account_exists"));
		register("other@example.com", "+91 98765-43210")
			.andExpect(status().isConflict());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(1);
	}

	@Test
	void identifiersOfSoftDeletedAccountsStayReserved() throws Exception {
		register(EMAIL, PHONE).andExpect(status().isCreated());
		jdbc.update("UPDATE users SET deleted_at = now()");

		register(EMAIL, "+919800000002").andExpect(status().isConflict());
		assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM users", Boolean.class)).isTrue();
	}

	@Test
	void invalidInputReturnsFieldErrors() throws Exception {
		postJson("/api/v1/auth/register", """
				{"fullName":" ","email":"not-an-email","phone":"12","password":"weakpass",
				 "passwordConfirmation":"different"}""")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"))
			.andExpect(jsonPath("$.errors.fullName").exists())
			.andExpect(jsonPath("$.errors.email").exists())
			.andExpect(jsonPath("$.errors.phone").exists())
			.andExpect(jsonPath("$.errors.password").value(containsString("uppercase")))
			.andExpect(jsonPath("$.errors.passwordConfirmation").value("must match password"));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isZero();
	}

	@Test
	void rejectsNonJsonContentTypeAndOversizedBodies() throws Exception {
		mvc.perform(post("/api/v1/auth/register").contentType(MediaType.TEXT_PLAIN).content("x"))
			.andExpect(status().isUnsupportedMediaType());
		postJson("/api/v1/auth/register", "{\"fullName\":\"" + "a".repeat(70_000) + "\"}")
			.andExpect(status().isContentTooLarge());
	}

	@Test
	void deliveryFailureLeavesRecoverablePendingAccount() throws Exception {
		outbox.failDeliveriesTo(EMAIL);
		register(EMAIL, PHONE).andExpect(status().isCreated());

		await().atMost(Duration.ofSeconds(5)).until(() -> "failed".equals(jdbc.queryForObject(
				"SELECT delivery_status FROM otp_challenges WHERE channel = 'email'", String.class)));
		assertThat(jdbc.queryForObject("SELECT delivery_attempts FROM otp_challenges WHERE channel = 'email'",
				Integer.class)).isEqualTo(3);
		assertThat(jdbc.queryForObject("SELECT status FROM users", String.class)).isEqualTo("pending");

		// Recovery: once the provider works again, the user requests a new code and verifies.
		outbox.restoreDeliveriesTo(EMAIL);
		expireResendCooldown();
		resend(EMAIL, "email_verification").andExpect(status().isAccepted());
		verify(EMAIL, outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION), "email_verification")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("active"));
	}

	@Test
	void registrationIsRateLimitedPerIp() throws Exception {
		// The test profile allows 10000 registrations per IP; use up the counter directly.
		for (int i = 0; i < 10000; i++) {
			rateLimiter.acquire("register:ip:127.0.0.1", limits.registerIp());
		}
		register(EMAIL, PHONE)
			.andExpect(status().isTooManyRequests())
			.andExpect(header().exists("Retry-After"))
			.andExpect(jsonPath("$.code").value("rate_limited"));
	}

}
