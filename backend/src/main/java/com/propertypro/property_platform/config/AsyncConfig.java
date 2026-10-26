package com.propertypro.property_platform.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Background work (OTP delivery, cleanup jobs). Async tasks use Spring Boot's task executor,
 * sized by {@code spring.task.execution.*}.
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {
}
