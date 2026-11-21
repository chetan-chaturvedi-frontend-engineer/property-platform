package com.propertypro.property_platform.notification;

import com.propertypro.property_platform.property.event.PropertyStatusChangedEvent;
import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The caller's notifications, and the ones the server creates from site visit and property status events. */
class NotificationApiTests extends AbstractIntegrationTest {

	private static final String NOTIFICATIONS = "/api/v1/notifications";

	@Autowired
	private PasswordEncoder passwordEncoder;
	@Autowired
	private ApplicationEventPublisher publisher;
	@Autowired
	private TransactionTemplate transactions;

	private List<Map<String, Object>> originalRoles;
	private long aliceId;
	private long bobId;
	private String alice;
	private String bob;

	@BeforeEach
	void setUp() throws Exception {
		originalRoles = jdbc.queryForList("SELECT slug, permissions::text AS permissions FROM roles WHERE slug = 'user'");
		aliceId = account("alice@example.com");
		bobId = account("bob@example.com");
		alice = signIn("alice@example.com");
		bob = signIn("bob@example.com");
	}

	@AfterEach
	void restoreRoles() {
		originalRoles.forEach(role -> jdbc.update("UPDATE roles SET permissions = ?::jsonb WHERE slug = ?",
				role.get("permissions"), role.get("slug")));
		// Leaves no properties, subscriptions or notifications behind for classes that do not clean up themselves.
		jdbc.execute("TRUNCATE system_logs, users RESTART IDENTITY CASCADE");
	}

	@Test
	void unauthenticatedRequestsAreRejected() throws Exception {
		mvc.perform(get(NOTIFICATIONS)).andExpect(status().isUnauthorized());
		mvc.perform(get(NOTIFICATIONS + "/unread-count")).andExpect(status().isUnauthorized());
		mvc.perform(patch(NOTIFICATIONS + "/1/read")).andExpect(status().isUnauthorized());
		mvc.perform(post(NOTIFICATIONS + "/read-all")).andExpect(status().isUnauthorized());
		mvc.perform(delete(NOTIFICATIONS + "/1")).andExpect(status().isUnauthorized());
	}

	@Test
	void listsNewestFirstCountsUnreadAndMarksRead() throws Exception {
		long older = notification(aliceId, "Older", false);
		long newer = notification(aliceId, "Newer", false);
		notification(bobId, "Bob's", false);

		getWithToken(NOTIFICATIONS, alice)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[*].title", contains("Newer", "Older")))
			.andExpect(jsonPath("$.content[0].read").value(false))
			.andExpect(jsonPath("$.totalElements").value(2));
		getWithToken(NOTIFICATIONS + "/unread-count", alice).andExpect(jsonPath("$.unread").value(2));

		withToken(patch(NOTIFICATIONS + "/" + newer + "/read"), alice)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.read").value(true));
		withToken(patch(NOTIFICATIONS + "/" + newer + "/read"), alice).andExpect(status().isOk());
		getWithToken(NOTIFICATIONS + "/unread-count", alice).andExpect(jsonPath("$.unread").value(1));
		getWithToken(NOTIFICATIONS + "?unread=true", alice)
			.andExpect(jsonPath("$.content", hasSize(1)))
			.andExpect(jsonPath("$.content[0].id").value(older));

		withToken(post(NOTIFICATIONS + "/read-all"), alice).andExpect(status().isNoContent());
		getWithToken(NOTIFICATIONS + "/unread-count", alice).andExpect(jsonPath("$.unread").value(0));
		getWithToken(NOTIFICATIONS + "/unread-count", bob).andExpect(jsonPath("$.unread").value(1));
	}

	@Test
	void usersNeverTouchAnotherUsersNotifications() throws Exception {
		long id = notification(aliceId, "Private", false);

		withToken(patch(NOTIFICATIONS + "/" + id + "/read"), bob).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("notification_not_found"));
		withToken(delete(NOTIFICATIONS + "/" + id), bob).andExpect(status().isNotFound());
		getWithToken(NOTIFICATIONS, bob).andExpect(jsonPath("$.content", hasSize(0)));
		withToken(patch(NOTIFICATIONS + "/0/read"), alice).andExpect(status().isBadRequest());
		assertThat(rowsOf(aliceId)).isOne();
	}

	@Test
	void usersDeleteTheirOwn() throws Exception {
		long id = notification(aliceId, "Gone soon", false);

		withToken(delete(NOTIFICATIONS + "/" + id), alice).andExpect(status().isNoContent());
		withToken(delete(NOTIFICATIONS + "/" + id), alice).andExpect(status().isNotFound());
		assertThat(rowsOf(aliceId)).isZero();
	}

	@Test
	void missingPermissionsAreForbidden() throws Exception {
		jdbc.update("UPDATE roles SET permissions = permissions - 'notification' WHERE slug = 'user'");

		getWithToken(NOTIFICATIONS, alice).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("notification_action_forbidden"));
		getWithToken(NOTIFICATIONS + "/unread-count", alice).andExpect(status().isForbidden());
		withToken(post(NOTIFICATIONS + "/read-all"), alice).andExpect(status().isForbidden());
	}

	@Test
	void bookingASiteVisitNotifiesTheBuilderAndTheVisitor() throws Exception {
		long property = property(bobId, "green-acres");
		String date = LocalDate.now().plusDays(2).toString();

		mvc.perform(post("/api/v1/site-visits").header(HttpHeaders.AUTHORIZATION, "Bearer " + alice)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"propertyId": %d, "visitDate": "%s", "visitTime": "14:00", "name": "Alice Kumar",
						 "mobile": "9876543210"}""".formatted(property, date)))
			.andExpect(status().isCreated());

		await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
			assertThat(rowsOf(bobId)).isOne();
			assertThat(rowsOf(aliceId)).isOne();
		});
		getWithToken(NOTIFICATIONS, bob)
			.andExpect(jsonPath("$.content[0].title").value("New site visit booked"))
			.andExpect(jsonPath("$.content[0].type").value("site_visit_booked"))
			.andExpect(jsonPath("$.content[0].data.propertyId").value(property));
		getWithToken(NOTIFICATIONS, alice).andExpect(jsonPath("$.content[0].title").value("Site visit booked"));
	}

	@Test
	void usersWhoSwitchedNotificationsOffAreNotNotified() throws Exception {
		jdbc.update("INSERT INTO user_settings (user_id, notification_enabled) VALUES (?, false)", bobId);

		publish(new PropertyStatusChangedEvent(1L, bobId, "Green Acres", "rejected", "Blurry photos.", aliceId));
		publish(new PropertyStatusChangedEvent(1L, aliceId, "Blue Hills", "rejected", "Blurry photos.", bobId));

		await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> assertThat(rowsOf(aliceId)).isOne());
		assertThat(rowsOf(bobId)).isZero();
	}

	@Test
	void ownersAreToldAboutReviewDecisionsButNotAboutTheirOwnChanges() throws Exception {
		publish(new PropertyStatusChangedEvent(1L, aliceId, "Green Acres", "rejected", "Blurry photos.", bobId));
		publish(new PropertyStatusChangedEvent(1L, aliceId, "Green Acres", "pending_review", null, aliceId));
		publish(new PropertyStatusChangedEvent(1L, aliceId, "Green Acres", "pending_review", null, bobId));

		await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> assertThat(rowsOf(aliceId)).isOne());
		getWithToken(NOTIFICATIONS, alice)
			.andExpect(jsonPath("$.content[0].title").value("Your property was rejected"))
			.andExpect(jsonPath("$.content[0].body").value("Green Acres: Blurry photos."))
			.andExpect(jsonPath("$.content[0].type").value("property_status_changed"));
	}

	private void publish(Object event) {
		transactions.executeWithoutResult(status -> publisher.publishEvent(event));
	}

	private ResultActions withToken(MockHttpServletRequestBuilder request, String token) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private long account(String email) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Test', 'active', 'user', now()) RETURNING id""", Long.class, email,
				passwordEncoder.encode(PASSWORD));
	}

	private String signIn(String email) throws Exception {
		return accessToken(postJson("/api/v1/auth/login",
				"{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD)));
	}

	private long notification(long userId, String title, boolean read) {
		return jdbc.queryForObject("""
				INSERT INTO notifications (user_id, type, title, body, read_at, created_at)
				VALUES (?, 'site_visit_booked', ?, 'Body', CASE WHEN ? THEN now() END, clock_timestamp())
				RETURNING id""", Long.class, userId, title, read);
	}

	private long property(long ownerId, String slug) {
		return jdbc.queryForObject("""
				INSERT INTO property_projects (user_id, slug, property_type, project_name, builder_company_name,
					project_email, project_phone, city, publication_status, published_at)
				VALUES (?, ?, 'apartment', ?, 'Builder', 'sales@example.com', '+919999999999', 'Pune', 'published',
					now()) RETURNING id""", Long.class, ownerId, slug, slug);
	}

	private int rowsOf(long userId) {
		return jdbc.queryForObject("SELECT count(*) FROM notifications WHERE user_id = ?", Integer.class, userId);
	}

}
