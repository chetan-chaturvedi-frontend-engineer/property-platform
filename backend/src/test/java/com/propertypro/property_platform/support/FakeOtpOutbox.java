package com.propertypro.property_platform.support;

import com.propertypro.property_platform.otp.domain.OtpChannel;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.otp.provider.EmailOtpProvider;
import com.propertypro.property_platform.otp.provider.OtpDeliveryException;
import com.propertypro.property_platform.otp.provider.OtpMessage;
import com.propertypro.property_platform.otp.provider.SmsOtpProvider;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.awaitility.Awaitility.await;

/** Test-only email and SMS provider: records codes instead of sending them. */
public class FakeOtpOutbox {

	public record Sent(OtpChannel channel, String destination, OtpPurpose purpose, String code) {
	}

	private final List<Sent> sent = new CopyOnWriteArrayList<>();
	private final Set<String> failingDestinations = ConcurrentHashMap.newKeySet();

	public void clear() {
		sent.clear();
		failingDestinations.clear();
	}

	public void failDeliveriesTo(String destination) {
		failingDestinations.add(destination);
	}

	public void restoreDeliveriesTo(String destination) {
		failingDestinations.remove(destination);
	}

	public List<Sent> sent() {
		return List.copyOf(sent);
	}

	/** Waits for the latest code delivered to the destination for the purpose (delivery is async). */
	public String awaitCode(String destination, OtpPurpose purpose, int expectedCount) {
		await().atMost(Duration.ofSeconds(5)).until(() -> matching(destination, purpose).size() >= expectedCount);
		List<Sent> matches = matching(destination, purpose);
		return matches.get(matches.size() - 1).code();
	}

	public String awaitCode(String destination, OtpPurpose purpose) {
		return awaitCode(destination, purpose, 1);
	}

	private List<Sent> matching(String destination, OtpPurpose purpose) {
		return sent.stream().filter(s -> s.destination().equals(destination) && s.purpose() == purpose).toList();
	}

	private void record(OtpChannel channel, OtpMessage message) throws OtpDeliveryException {
		if (failingDestinations.contains(message.destination())) {
			throw new OtpDeliveryException("Simulated provider outage");
		}
		sent.add(new Sent(channel, message.destination(), message.purpose(), message.code()));
	}

	@TestConfiguration(proxyBeanMethods = false)
	public static class Config {

		@Bean
		FakeOtpOutbox fakeOtpOutbox() {
			return new FakeOtpOutbox();
		}

		@Bean
		@Primary
		EmailOtpProvider fakeEmailOtpProvider(FakeOtpOutbox outbox) {
			return message -> outbox.record(OtpChannel.EMAIL, message);
		}

		@Bean
		@Primary
		SmsOtpProvider fakeSmsOtpProvider(FakeOtpOutbox outbox) {
			return message -> outbox.record(OtpChannel.SMS, message);
		}

	}

}
