package com.propertypro.property_platform.auth;

import com.propertypro.property_platform.auth.dto.VerifyOtpRequest;
import com.propertypro.property_platform.auth.service.VerificationService;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.otp.exception.InvalidOtpException;
import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OtpVerificationTests extends AbstractIntegrationTest {

	@Autowired
	private VerificationService verificationService;

	@Test
	void emailOtpVerifiesOnlyEmailAndActivatesAccount() throws Exception {
		register(EMAIL, PHONE);
		verify(EMAIL, outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION), "email_verification")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("active"))
			.andExpect(jsonPath("$.emailVerified").value(true))
			.andExpect(jsonPath("$.phoneVerified").value(false));
	}

	@Test
	void phoneOtpVerifiesOnlyPhoneAndActivatesAccount() throws Exception {
		register(EMAIL, PHONE);
		verify("+91 98765 43210", outbox.awaitCode(PHONE_E164, OtpPurpose.PHONE_VERIFICATION), "phone_verification")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("active"))
			.andExpect(jsonPath("$.emailVerified").value(false))
			.andExpect(jsonPath("$.phoneVerified").value(true));
	}

	@Test
	void secondChannelCanBeVerifiedLater() throws Exception {
		registerActiveUser();
		verify(PHONE_E164, outbox.awaitCode(PHONE_E164, OtpPurpose.PHONE_VERIFICATION), "phone_verification")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.emailVerified").value(true))
			.andExpect(jsonPath("$.phoneVerified").value(true));
	}

	@Test
	void wrongCodeIsRejectedWithGenericError() throws Exception {
		register(EMAIL, PHONE);
		String code = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		verify(EMAIL, otherCode(code), "email_verification")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("invalid_otp"));
		verify("nobody@example.com", code, "email_verification")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("invalid_otp"));
		assertStatus("pending");
	}

	@Test
	void expiredCodeIsRejected() throws Exception {
		register(EMAIL, PHONE);
		String code = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		jdbc.update("UPDATE otp_challenges SET expires_at = now() - interval '1 second'");
		verify(EMAIL, code, "email_verification").andExpect(status().isBadRequest());
		assertStatus("pending");
	}

	@Test
	void consumedCodeCannotBeReused() throws Exception {
		register(EMAIL, PHONE);
		String code = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		verify(EMAIL, code, "email_verification").andExpect(status().isOk());
		verify(EMAIL, code, "email_verification").andExpect(status().isBadRequest());
	}

	@Test
	void supersededCodeIsRejectedAndNewCodeWorks() throws Exception {
		register(EMAIL, PHONE);
		String oldCode = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		expireResendCooldown();
		resend(EMAIL, "email_verification").andExpect(status().isAccepted());
		String newCode = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION, 2);

		if (!oldCode.equals(newCode)) {
			verify(EMAIL, oldCode, "email_verification").andExpect(status().isBadRequest());
		}
		verify(EMAIL, newCode, "email_verification").andExpect(status().isOk());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM otp_challenges WHERE purpose = 'email_verification'"
				+ " AND invalidated_at IS NOT NULL", Integer.class)).isEqualTo(1);
	}

	@Test
	void codeOnlyWorksForItsOwnPurposeAndChannel() throws Exception {
		register(EMAIL, PHONE);
		String emailCode = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		String phoneCode = outbox.awaitCode(PHONE_E164, OtpPurpose.PHONE_VERIFICATION);

		// Email code against the phone challenge.
		if (!emailCode.equals(phoneCode)) {
			verify(PHONE_E164, emailCode, "phone_verification").andExpect(status().isBadRequest());
		}
		// Identifier must match the purpose's channel.
		verify(EMAIL, emailCode, "phone_verification")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.identifier").exists());
		// password_reset is not accepted by verify-otp.
		verify(EMAIL, emailCode, "password_reset")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.purpose").exists());
		assertStatus("pending");
	}

	@Test
	void challengeLocksAfterMaxAttempts() throws Exception {
		register(EMAIL, PHONE);
		String code = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		for (int i = 0; i < 5; i++) {
			verify(EMAIL, otherCode(code), "email_verification").andExpect(status().isBadRequest());
		}
		verify(EMAIL, code, "email_verification").andExpect(status().isBadRequest());
		assertStatus("pending");
		assertThat(jdbc.queryForObject("SELECT attempt_count FROM otp_challenges WHERE channel = 'email'",
				Integer.class)).isEqualTo(5);
	}

	@Test
	void resendIsSubjectToCooldown() throws Exception {
		register(EMAIL, PHONE);
		// Registration just sent a code.
		resend(EMAIL, "email_verification").andExpect(status().isTooManyRequests());
		expireResendCooldown();
		resend(EMAIL, "email_verification").andExpect(status().isAccepted());
		resend(EMAIL, "email_verification")
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("rate_limited"));
	}

	@Test
	void resendForUnknownIdentifierLooksTheSameAndSendsNothing() throws Exception {
		String known = resend(EMAIL, "email_verification").andReturn().getResponse().getContentAsString();
		register(EMAIL, PHONE);
		outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		outbox.clear();

		String unknown = resend("ghost@example.com", "email_verification")
			.andExpect(status().isAccepted())
			.andReturn().getResponse().getContentAsString();
		assertThat(unknown).isEqualTo(known);
		Thread.sleep(200);
		assertThat(outbox.sent()).isEmpty();
	}

	@Test
	void resendDoesNotSendForAlreadyVerifiedDestination() throws Exception {
		registerActiveUser();
		outbox.clear();
		expireResendCooldown();
		resend(EMAIL, "email_verification").andExpect(status().isAccepted());
		Thread.sleep(200);
		assertThat(outbox.sent()).isEmpty();
	}

	@ParameterizedTest
	@ValueSource(strings = { "suspended", "rejected", "inactive", "closed" })
	void blockedAccountCannotBeReactivatedByOtp(String blockedStatus) throws Exception {
		register(EMAIL, PHONE);
		String code = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		setStatus(EMAIL, blockedStatus);

		verify(EMAIL, code, "email_verification").andExpect(status().isBadRequest());
		assertStatus(blockedStatus);
		assertThat(jdbc.queryForObject("SELECT email_verified FROM users", Object.class)).isNull();
	}

	@Test
	void concurrentVerificationConsumesCodeOnlyOnce() throws Exception {
		register(EMAIL, PHONE);
		String code = outbox.awaitCode(EMAIL, OtpPurpose.EMAIL_VERIFICATION);
		VerifyOtpRequest request = new VerifyOtpRequest(EMAIL, code, "email_verification");

		int threads = 4;
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService pool = Executors.newFixedThreadPool(threads);
		List<Future<Boolean>> results = new ArrayList<>();
		for (int i = 0; i < threads; i++) {
			Callable<Boolean> attempt = () -> {
				start.await();
				try {
					verificationService.verify(request, "10.0.0.1");
					return true;
				}
				catch (InvalidOtpException ex) {
					return false;
				}
			};
			results.add(pool.submit(attempt));
		}
		start.countDown();
		int successes = 0;
		for (Future<Boolean> result : results) {
			successes += result.get() ? 1 : 0;
		}
		pool.shutdown();

		assertThat(successes).isEqualTo(1);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM otp_challenges WHERE consumed_at IS NOT NULL",
				Integer.class)).isEqualTo(1);
	}

	private void assertStatus(String expected) {
		assertThat(jdbc.queryForObject("SELECT status FROM users", String.class)).isEqualTo(expected);
	}

	private static String otherCode(String code) {
		return code.equals("000000") ? "111111" : "000000";
	}

}
