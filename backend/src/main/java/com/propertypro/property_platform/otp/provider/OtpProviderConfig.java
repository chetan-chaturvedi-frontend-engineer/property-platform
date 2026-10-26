package com.propertypro.property_platform.otp.provider;

import com.propertypro.property_platform.otp.config.OtpProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Selects the email and SMS providers from {@code app.otp.delivery.email-provider} and
 * {@code sms-provider}. Without a configured provider, delivery fails (and is marked failed)
 * rather than pretending the code was sent.
 */
@Slf4j
@Configuration
public class OtpProviderConfig {

	private static final String EMAIL = "app.otp.delivery.email-provider";
	private static final String SMS = "app.otp.delivery.sms-provider";

	@Bean
	@ConditionalOnProperty(name = EMAIL, havingValue = "none", matchIfMissing = true)
	EmailOtpProvider unconfiguredEmailOtpProvider() {
		return message -> {
			throw new OtpDeliveryException("No email provider configured (" + EMAIL + ")");
		};
	}

	@Bean
	@ConditionalOnProperty(name = EMAIL, havingValue = "smtp")
	EmailOtpProvider smtpEmailOtpProvider(JavaMailSender mailSender, OtpProperties properties) {
		return message -> {
			SimpleMailMessage mail = new SimpleMailMessage();
			mail.setFrom(properties.delivery().emailFrom());
			mail.setTo(message.destination());
			mail.setSubject(OtpMessageTemplates.subject(message));
			mail.setText(OtpMessageTemplates.body(message));
			try {
				mailSender.send(mail);
			}
			catch (MailException ex) {
				throw new OtpDeliveryException("SMTP delivery failed: " + ex.getClass().getSimpleName());
			}
		};
	}

	@Bean
	@ConditionalOnProperty(name = EMAIL, havingValue = "log")
	EmailOtpProvider devLogEmailOtpProvider(Environment environment) {
		requireDevProfile(environment, EMAIL);
		return message -> log.warn("[DEV ONLY - NOT SENT] email {} code for {}: {}",
				message.purpose().getValue(), message.destination(), message.code());
	}

	@Bean
	@ConditionalOnProperty(name = SMS, havingValue = "none", matchIfMissing = true)
	SmsOtpProvider unconfiguredSmsOtpProvider() {
		return message -> {
			throw new OtpDeliveryException("No SMS provider configured (" + SMS + ")");
		};
	}

	@Bean
	@ConditionalOnProperty(name = SMS, havingValue = "log")
	SmsOtpProvider devLogSmsOtpProvider(Environment environment) {
		requireDevProfile(environment, SMS);
		return message -> log.warn("[DEV ONLY - NOT SENT] SMS {} code for {}: {}",
				message.purpose().getValue(), message.destination(), message.code());
	}

	// The log providers print codes, so they must never run outside local development.
	private static void requireDevProfile(Environment environment, String property) {
		if (!environment.acceptsProfiles(Profiles.of("dev")) || environment.acceptsProfiles(Profiles.of("prod"))) {
			throw new IllegalStateException(property + "=log is only allowed with the 'dev' profile");
		}
	}

}
