package com.propertypro.property_platform.notification.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * The executor behind {@code NotificationEventListener}: small and separate, so a burst of notifications cannot
 * starve OTP delivery or other background work. {@code app.notification.async=false} (the test profile) runs
 * them on the calling thread, which keeps tests deterministic and free of races with their own cleanup.
 */
@Configuration(proxyBeanMethods = false)
public class NotificationAsyncConfig {

	public static final String EXECUTOR = "notificationExecutor";

	@Bean(EXECUTOR)
	@ConditionalOnProperty(name = "app.notification.async", havingValue = "true", matchIfMissing = true)
	TaskExecutor asyncNotificationExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(2);
		executor.setMaxPoolSize(4);
		executor.setQueueCapacity(500);
		executor.setThreadNamePrefix("notify-");
		return executor;
	}

	@Bean(EXECUTOR)
	@ConditionalOnProperty(name = "app.notification.async", havingValue = "false")
	TaskExecutor synchronousNotificationExecutor() {
		return new SyncTaskExecutor();
	}

}
