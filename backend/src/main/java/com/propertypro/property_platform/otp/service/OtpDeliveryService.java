package com.propertypro.property_platform.otp.service;

import com.propertypro.property_platform.otp.config.OtpProperties;
import com.propertypro.property_platform.otp.domain.OtpChannel;
import com.propertypro.property_platform.otp.domain.OtpDeliveryStatus;
import com.propertypro.property_platform.otp.event.OtpIssuedEvent;
import com.propertypro.property_platform.otp.provider.EmailOtpProvider;
import com.propertypro.property_platform.otp.provider.OtpDeliveryException;
import com.propertypro.property_platform.otp.provider.OtpMessage;
import com.propertypro.property_platform.otp.provider.SmsOtpProvider;
import com.propertypro.property_platform.otp.repository.OtpChallengeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Delivers issued codes after the issuing transaction commits, on a background thread, with
 * retries. If every attempt fails the challenge is marked {@code failed}; the user recovers by
 * requesting a new code (resend-otp), since plaintext codes are never stored.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OtpDeliveryService {

	private final EmailOtpProvider emailProvider;
	private final SmsOtpProvider smsProvider;
	private final OtpChallengeRepository repository;
	private final OtpProperties properties;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onOtpIssued(OtpIssuedEvent event) {
		OtpMessage message = new OtpMessage(event.destination(), event.code(), event.purpose(), properties.ttl());
		int maxAttempts = properties.delivery().maxAttempts();
		for (int attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				send(event.channel(), message);
				repository.updateDelivery(event.challengeId(), OtpDeliveryStatus.SENT, attempt);
				return;
			}
			catch (OtpDeliveryException | RuntimeException ex) {
				log.warn("OTP delivery failed challengeId={} channel={} attempt={}/{}: {}", event.challengeId(),
						event.channel().getValue(), attempt, maxAttempts, ex.getMessage());
				if (attempt < maxAttempts && !sleep(attempt)) {
					break;
				}
			}
		}
		repository.updateDelivery(event.challengeId(), OtpDeliveryStatus.FAILED, maxAttempts);
		log.error("OTP delivery gave up challengeId={} channel={}", event.challengeId(), event.channel().getValue());
	}

	private void send(OtpChannel channel, OtpMessage message) throws OtpDeliveryException {
		switch (channel) {
			case EMAIL -> emailProvider.send(message);
			case SMS -> smsProvider.send(message);
		}
	}

	private boolean sleep(int attempt) {
		try {
			Thread.sleep(properties.delivery().retryDelay().multipliedBy(attempt).toMillis());
			return true;
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
			return false;
		}
	}

}
