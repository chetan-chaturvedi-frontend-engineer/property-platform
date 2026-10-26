package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.config.ClockConfig;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import com.propertypro.property_platform.subscription.service.SubscriptionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

// Real commits from several threads, so this class manages its own transactions and cleans up after itself.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import({ PropertyLimitGuard.class, SubscriptionService.class, ClockConfig.class })
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PropertyLimitConcurrencyTests {

	private static final String EMAIL = "limit-race@example.com";
	private static final String PLAN_SLUG = "limit-race-plan";
	private static final int THREADS = 4;

	@Autowired
	private PropertyLimitGuard guard;

	@Autowired
	private PropertyProjectRepository projectRepository;

	@Autowired
	private TransactionTemplate transactionTemplate;

	@Autowired
	private JdbcTemplate jdbc;

	private Long ownerId;

	@BeforeEach
	void createSubscribedOwnerWithOneSlotLeft() {
		cleanUp();
		ownerId = jdbc.queryForObject(
				"INSERT INTO users (email, password_hash, full_name) VALUES (?, 'hash', 'Owner') RETURNING id",
				Long.class, EMAIL);
		Long planId = jdbc.queryForObject("""
				INSERT INTO subscription_plans (title, slug, price, status, no_of_properties)
				VALUES ('Basic', ?, 10, 'active', 2) RETURNING id""", Long.class, PLAN_SLUG);
		jdbc.update("""
				INSERT INTO user_subscriptions (user_id, subscription_plan_id, status, plan_title, price, currency,
				    billing_interval, billing_interval_count, no_of_properties, starts_at, ends_at)
				VALUES (?, ?, 'active', 'Basic', 10, 'INR', 'month', 1, 2, now() - interval '1 day', now() + interval '29 days')""",
				ownerId, planId);
		transactionTemplate.executeWithoutResult(status -> insertProject("limit-race-existing"));
	}

	@AfterEach
	void cleanUp() {
		jdbc.update("DELETE FROM property_projects WHERE user_id IN (SELECT id FROM users WHERE email = ?)", EMAIL);
		jdbc.update("DELETE FROM user_subscriptions WHERE user_id IN (SELECT id FROM users WHERE email = ?)", EMAIL);
		jdbc.update("DELETE FROM subscription_plans WHERE slug = ?", PLAN_SLUG);
		jdbc.update("DELETE FROM users WHERE email = ?", EMAIL);
	}

	@Test
	void concurrentCreationsCannotExceedTheLimit() throws Exception {
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(THREADS);
		try {
			List<Future<String>> results = new ArrayList<>();
			for (int i = 0; i < THREADS; i++) {
				String slug = "limit-race-" + i;
				results.add(executor.submit(() -> create(start, slug)));
			}
			start.countDown();

			List<String> outcomes = new ArrayList<>();
			for (Future<String> result : results) {
				outcomes.add(result.get(30, TimeUnit.SECONDS));
			}
			assertThat(outcomes).containsOnlyOnce("created")
				.filteredOn(outcome -> !outcome.equals("created")).containsOnly("property_limit_reached");
			assertThat(projectRepository.countByUserId(ownerId)).isEqualTo(2);
		}
		finally {
			executor.shutdownNow();
		}
	}

	private String create(CountDownLatch start, String slug) throws InterruptedException {
		start.await();
		try {
			transactionTemplate.executeWithoutResult(status -> {
				guard.requireCapacityForNewProject(ownerId);
				// Widen the race window: without the lock every thread would see one free slot.
				sleep();
				insertProject(slug);
			});
			return "created";
		}
		catch (ApiException ex) {
			return ex.getCode();
		}
	}

	private void insertProject(String slug) {
		PropertyProject project = new PropertyProject(ownerId, slug);
		project.setPropertyType(PropertyType.APARTMENT);
		project.setProjectName("Race " + slug);
		project.setBuilderCompanyName("Builder");
		project.setProjectEmail("sales@example.com");
		project.setProjectPhone("+912212345678");
		project.setProjectAddress("Andheri East");
		project.setCity("Mumbai");
		project.setLocality("Andheri");
		project.setPincode("400069");
		project.setState("Maharashtra");
		projectRepository.saveAndFlush(project);
	}

	private static void sleep() {
		try {
			Thread.sleep(300);
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
		}
	}

}
