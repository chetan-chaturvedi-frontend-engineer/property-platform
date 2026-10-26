package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.config.ClockConfig;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlan;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlanStatus;
import com.propertypro.property_platform.subscription.domain.UserSubscription;
import com.propertypro.property_platform.subscription.repository.SubscriptionPlanRepository;
import com.propertypro.property_platform.subscription.repository.UserSubscriptionRepository;
import com.propertypro.property_platform.subscription.service.SubscriptionService;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Property limit by subscription. Runs against PostgreSQL; each test is rolled back. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import({ PropertyLimitGuard.class, SubscriptionService.class, ClockConfig.class })
class PropertyLimitGuardTests {

	private static final Instant NOW = Instant.now();

	@Autowired
	private PropertyLimitGuard guard;

	@Autowired
	private PropertyProjectRepository projectRepository;

	@Autowired
	private SubscriptionPlanRepository planRepository;

	@Autowired
	private UserSubscriptionRepository subscriptionRepository;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private PlatformTransactionManager transactionManager;

	private Long userId;
	private int projectCounter;

	@BeforeEach
	void createUser() {
		userId = user("owner@example.com");
	}

	@Test
	void allowsCreationBelowTheLimit() {
		subscribe(userId, plan("Basic", 5), NOW.minus(1, ChronoUnit.DAYS));
		createProjects(userId, 4);

		createWithGuard(userId);

		assertThat(projectRepository.countByUserId(userId)).isEqualTo(5);
	}

	@Test
	void rejectsAtTheExactLimitWithTheUsersOwnNumbers() {
		UserSubscription subscription = subscribe(userId, plan("Basic", 5), NOW.minus(1, ChronoUnit.DAYS));
		createProjects(userId, 5);
		Map<String, Object> before = subscriptionRow(subscription.getId());

		assertThatThrownBy(() -> guard.requireCapacityForNewProject(userId))
			.isInstanceOfSatisfying(ApiException.class, ex -> {
				assertThat(ex.getCode()).isEqualTo("property_limit_reached");
				assertThat(ex.getProperties()).containsExactly(Map.entry("plan", "Basic"),
						Map.entry("propertyLimit", 5), Map.entry("currentProperties", 5L),
						Map.entry("remainingProperties", 0L));
			});

		// Reaching the limit is not expiry: the subscription itself is unchanged.
		assertThat(subscriptionRow(subscription.getId())).isEqualTo(before).containsEntry("status", "active");
	}

	@Test
	void rejectsWhenAlreadyOverTheLimit() {
		createProjects(userId, 6);
		subscribe(userId, plan("Basic", 5), NOW.minus(1, ChronoUnit.DAYS));

		assertRejected(() -> guard.requireCapacityForNewProject(userId), "property_limit_reached");
		assertThatThrownBy(() -> guard.requireCapacityForNewProject(userId))
			.isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getProperties())
				.containsEntry("currentProperties", 6L).containsEntry("remainingProperties", 0L));
	}

	@Test
	void zeroLimitAllowsNothing() {
		subscribe(userId, plan("Listing paused", 0), NOW.minus(1, ChronoUnit.DAYS));

		assertRejected(() -> guard.requireCapacityForNewProject(userId), "property_limit_reached");
	}

	@Test
	void nullLimitIsUnlimited() {
		subscribe(userId, plan("Enterprise", null), NOW.minus(1, ChronoUnit.DAYS));
		createProjects(userId, 30);

		createWithGuard(userId);

		assertThat(projectRepository.countByUserId(userId)).isEqualTo(31);
	}

	@Test
	void requiresASubscriptionInForce() {
		assertRejected(() -> guard.requireCapacityForNewProject(userId), "subscription_required");

		UserSubscription pending = new UserSubscription(userId, plan("Basic", 5), NOW.minus(1, ChronoUnit.DAYS));
		subscriptionRepository.saveAndFlush(pending);
		assertRejected(() -> guard.requireCapacityForNewProject(userId), "subscription_required");

		jdbc.update("UPDATE user_subscriptions SET status = 'cancelled' WHERE id = ?", pending.getId());
		assertRejected(() -> guard.requireCapacityForNewProject(userId), "subscription_required");
	}

	@Test
	void subscriptionStartingLaterIsNotYetInForce() {
		subscribe(userId, plan("Basic", 5), NOW.plus(1, ChronoUnit.DAYS));

		assertRejected(() -> guard.requireCapacityForNewProject(userId), "subscription_required");
	}

	@Test
	void expiryIsReportedSeparatelyFromTheLimit() {
		UserSubscription subscription = subscribe(userId, plan("Basic", 5), NOW.minus(40, ChronoUnit.DAYS));
		// Still marked active, but its month is over: the dates decide.
		assertThat(subscription.getEndsAt()).isBefore(NOW);

		assertRejected(() -> guard.requireCapacityForNewProject(userId), "subscription_expired");

		jdbc.update("UPDATE user_subscriptions SET status = 'expired' WHERE id = ?", subscription.getId());
		assertRejected(() -> guard.requireCapacityForNewProject(userId), "subscription_expired");
	}

	@Test
	void usesOnlyTheUsersOwnSubscriptionAndProjects() {
		Long other = user("other@example.com");
		subscribe(other, plan("Enterprise", null), NOW.minus(1, ChronoUnit.DAYS));
		createProjects(other, 10);

		assertRejected(() -> guard.requireCapacityForNewProject(userId), "subscription_required");

		subscribe(userId, plan("Starter", 1), NOW.minus(1, ChronoUnit.DAYS));
		// The other user's ten projects do not count against this user.
		createWithGuard(userId);
		assertRejected(() -> guard.requireCapacityForNewProject(userId), "property_limit_reached");
	}

	@Test
	void softDeletedProjectsDoNotCountAndDeletingFreesASlot() {
		subscribe(userId, plan("Basic", 3), NOW.minus(1, ChronoUnit.DAYS));
		createProjects(userId, 3);
		assertRejected(() -> guard.requireCapacityForNewProject(userId), "property_limit_reached");

		projectRepository.delete(projectRepository.findByUserId(userId, Pageable.unpaged())
			.getContent().get(0));
		projectRepository.flush();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM property_projects WHERE user_id = ?", Integer.class, userId))
			.as("soft delete keeps the row").isEqualTo(3);

		createWithGuard(userId);
		assertRejected(() -> guard.requireCapacityForNewProject(userId), "property_limit_reached");
	}

	@Test
	void draftAndUnpublishedProjectsCount() {
		subscribe(userId, plan("Basic", 2), NOW.minus(1, ChronoUnit.DAYS));
		createProjects(userId, 2);
		jdbc.update("UPDATE property_projects SET publication_status = 'rejected' WHERE user_id = ?", userId);

		assertRejected(() -> guard.requireCapacityForNewProject(userId), "property_limit_reached");
	}

	@Test
	void existingProjectsStayEditableAtTheLimit() {
		subscribe(userId, plan("Basic", 1), NOW.minus(1, ChronoUnit.DAYS));
		createProjects(userId, 1);
		assertRejected(() -> guard.requireCapacityForNewProject(userId), "property_limit_reached");

		PropertyProject project = projectRepository.findByUserId(userId, Pageable.unpaged())
			.getContent().get(0);
		project.setProjectName("Renamed");
		projectRepository.saveAndFlush(project);
		entityManager.clear();

		assertThat(projectRepository.findById(project.getId()).orElseThrow().getProjectName()).isEqualTo("Renamed");
	}

	@Test
	void planEditsAndDeactivationDoNotChangeExistingSubscriptions() {
		SubscriptionPlan plan = plan("Basic", 5);
		UserSubscription subscription = subscribe(userId, plan, NOW.minus(1, ChronoUnit.DAYS));
		createProjects(userId, 3);

		plan.setNoOfProperties(1);
		plan.setPrice(new BigDecimal("1.00"));
		plan.setStatus(SubscriptionPlanStatus.INACTIVE);
		planRepository.saveAndFlush(plan);
		entityManager.clear();

		// The subscriber keeps the terms copied at subscription time.
		createWithGuard(userId);
		UserSubscription reloaded = subscriptionRepository.findById(subscription.getId()).orElseThrow();
		assertThat(reloaded.getNoOfProperties()).isEqualTo(5);
		assertThat(reloaded.getPrice()).isEqualByComparingTo("499.00");
		assertThat(reloaded.getStatus()).isEqualTo(subscription.getStatus());

		// But nobody can start a new subscription to the inactive plan.
		Long newcomer = user("newcomer@example.com");
		SubscriptionPlan inactive = planRepository.findById(plan.getId()).orElseThrow();
		assertRejected(() -> new UserSubscription(newcomer, inactive, NOW), "subscription_plan_unavailable");
	}

	@Test
	void databaseAllowsOneActiveSubscriptionPerUser() {
		subscribe(userId, plan("Basic", 5), NOW.minus(1, ChronoUnit.DAYS));

		assertThatThrownBy(() -> subscribe(userId, plan("Pro", 10), NOW.minus(1, ChronoUnit.DAYS)))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void mustRunInTheInsertingTransaction() {
		TransactionTemplate withoutTransaction = new TransactionTemplate(transactionManager);
		withoutTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_NOT_SUPPORTED);

		assertThatThrownBy(() -> withoutTransaction.executeWithoutResult(
				status -> guard.requireCapacityForNewProject(userId)))
			.isInstanceOf(IllegalTransactionStateException.class);
	}

	private Map<String, Object> subscriptionRow(Long id) {
		return jdbc.queryForMap("SELECT * FROM user_subscriptions WHERE id = ?", id);
	}

	private void createWithGuard(Long ownerId) {
		assertThatCode(() -> guard.requireCapacityForNewProject(ownerId)).doesNotThrowAnyException();
		createProjects(ownerId, 1);
	}

	private static void assertRejected(ThrowingCallable call, String code) {
		assertThatThrownBy(call).isInstanceOfSatisfying(ApiException.class,
				ex -> assertThat(ex.getCode()).isEqualTo(code));
	}

	private Long user(String email) {
		return jdbc.queryForObject("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'hash', 'Owner') RETURNING id",
				Long.class, email);
	}

	private SubscriptionPlan plan(String title, Integer limit) {
		SubscriptionPlan plan = new SubscriptionPlan(title, "plan-" + System.nanoTime(), new BigDecimal("499"));
		plan.setNoOfProperties(limit);
		plan.setStatus(SubscriptionPlanStatus.ACTIVE);
		return planRepository.saveAndFlush(plan);
	}

	private UserSubscription subscribe(Long ownerId, SubscriptionPlan plan, Instant startsAt) {
		UserSubscription subscription = new UserSubscription(ownerId, plan, startsAt);
		subscription.activate();
		return subscriptionRepository.saveAndFlush(subscription);
	}

	private void createProjects(Long ownerId, int count) {
		for (int i = 0; i < count; i++) {
			PropertyProject project = new PropertyProject(ownerId, "limit-project-" + ++projectCounter);
			project.setPropertyType(PropertyType.APARTMENT);
			project.setProjectName("Project " + projectCounter);
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
	}

}
