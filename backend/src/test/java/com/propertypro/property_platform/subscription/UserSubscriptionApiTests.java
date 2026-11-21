package com.propertypro.property_platform.subscription;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Public plans and the caller's own subscription through real logins and the seeded user role. */
class UserSubscriptionApiTests extends AbstractIntegrationTest {

	private static final String PLANS = "/api/v1/public/subscription-plans";
	private static final String SUBSCRIPTIONS = "/api/v1/subscriptions";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private String alice;
	private long freePlan;
	private long paidPlan;
	private long inactivePlan;

	@BeforeEach
	void setUp() throws Exception {
		originalRoles = jdbc.queryForList("SELECT slug, permissions::text AS permissions FROM roles WHERE slug = 'user'");
		jdbc.execute("TRUNCATE subscription_plans RESTART IDENTITY CASCADE");
		freePlan = plan("Free", "free", 0, "active", 3, 2);
		paidPlan = plan("Premium", "premium", 999, "active", null, 1);
		inactivePlan = plan("Retired", "retired", 0, "inactive", 1, 3);
		account("alice@example.com");
		alice = accessToken(postJson("/api/v1/auth/login",
				"{\"identifier\":\"alice@example.com\",\"password\":\"%s\"}".formatted(PASSWORD)));
	}

	@AfterEach
	void restoreRoles() {
		originalRoles.forEach(role -> jdbc.update("UPDATE roles SET permissions = ?::jsonb WHERE slug = ?",
				role.get("permissions"), role.get("slug")));
	}

	@Test
	void publicPlanListShowsOnlyActivePlansInDisplayOrderWithoutLogin() throws Exception {
		mvc.perform(get(PLANS))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$", hasSize(2)))
			.andExpect(jsonPath("$[*].slug", contains("premium", "free")))
			.andExpect(jsonPath("$[0].noOfProperties").value(nullValue()))
			.andExpect(jsonPath("$[1].noOfProperties").value(3))
			.andExpect(jsonPath("$[0].status").doesNotExist())
			.andExpect(jsonPath("$[0].createdAt").doesNotExist());
	}

	@Test
	void unauthenticatedRequestsAreRejected() throws Exception {
		mvc.perform(get(SUBSCRIPTIONS + "/me")).andExpect(status().isUnauthorized());
		mvc.perform(post(SUBSCRIPTIONS).contentType(MediaType.APPLICATION_JSON).content(planBody(freePlan)))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void callerWithoutAPlanHasNoSubscription() throws Exception {
		getWithToken(SUBSCRIPTIONS + "/me", alice)
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("subscription_not_found"));
	}

	@Test
	void takingAFreePlanActivatesItWithTheTermsOfThePlan() throws Exception {
		send(post(SUBSCRIPTIONS), alice, planBody(freePlan))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.planId").value(freePlan))
			.andExpect(jsonPath("$.planTitle").value("Free"))
			.andExpect(jsonPath("$.status").value("active"))
			.andExpect(jsonPath("$.noOfProperties").value(3))
			.andExpect(jsonPath("$.noOfTeamMembers").value(0))
			.andExpect(jsonPath("$.startsAt").isNotEmpty())
			.andExpect(jsonPath("$.userId").doesNotExist());

		getWithToken(SUBSCRIPTIONS + "/me", alice)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.planTitle").value("Free"));
	}

	@Test
	void aPaidPlanNeedsPaymentWhileNoGatewayIsConfigured() throws Exception {
		send(post(SUBSCRIPTIONS), alice, planBody(paidPlan))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("payment_required"));

		assertThat(subscriptions()).isZero();
	}

	@Test
	void aSecondSubscriptionIsRejected() throws Exception {
		send(post(SUBSCRIPTIONS), alice, planBody(freePlan)).andExpect(status().isCreated());

		send(post(SUBSCRIPTIONS), alice, planBody(freePlan))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("subscription_already_active"));

		assertThat(subscriptions()).isOne();
	}

	@Test
	void anInactiveOrUnknownPlanCannotBeTaken() throws Exception {
		send(post(SUBSCRIPTIONS), alice, planBody(inactivePlan))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("subscription_plan_unavailable"));
		send(post(SUBSCRIPTIONS), alice, planBody(99_999))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("subscription_plan_not_found"));
	}

	@Test
	void invalidBodiesAreRejected() throws Exception {
		send(post(SUBSCRIPTIONS), alice, "{}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.planId").exists());
		send(post(SUBSCRIPTIONS), alice, "{\"planId\": 0}").andExpect(status().isBadRequest());
		send(post(SUBSCRIPTIONS), alice, "{\"planId\": %d, \"userId\": 1}".formatted(freePlan))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.userId").exists());
	}

	@Test
	void usersAreNeverShownAnotherUsersSubscription() throws Exception {
		send(post(SUBSCRIPTIONS), alice, planBody(freePlan)).andExpect(status().isCreated());
		account("bob@example.com");
		String bob = accessToken(postJson("/api/v1/auth/login",
				"{\"identifier\":\"bob@example.com\",\"password\":\"%s\"}".formatted(PASSWORD)));

		getWithToken(SUBSCRIPTIONS + "/me", bob).andExpect(status().isNotFound());
	}

	@Test
	void missingPermissionsAreForbidden() throws Exception {
		jdbc.update("UPDATE roles SET permissions = permissions - 'subscription' WHERE slug = 'user'");

		getWithToken(SUBSCRIPTIONS + "/me", alice)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("subscription_action_forbidden"));
		send(post(SUBSCRIPTIONS), alice, planBody(freePlan))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("subscription_action_forbidden"));
		assertThat(subscriptions()).isZero();
	}

	private long plan(String title, String slug, int price, String status, Integer properties, int sortOrder) {
		return jdbc.queryForObject("""
				INSERT INTO subscription_plans (title, slug, price, status, no_of_properties, sort_order)
				VALUES (?, ?, ?, ?, ?, ?) RETURNING id""", Long.class, title, slug, price, status, properties,
				sortOrder);
	}

	private void account(String email) {
		jdbc.update("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Test', 'active', 'user', now())""", email, passwordEncoder.encode(PASSWORD));
	}

	private static String planBody(long planId) {
		return "{\"planId\": %d}".formatted(planId);
	}

	private ResultActions send(MockHttpServletRequestBuilder request, String token, String body) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private int subscriptions() {
		return jdbc.queryForObject("SELECT count(*) FROM user_subscriptions", Integer.class);
	}

}
