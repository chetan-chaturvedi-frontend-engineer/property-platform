package com.propertypro.property_platform.property.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static com.propertypro.property_platform.security.Permissions.PROPERTY_LIST;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Who may create properties: role permission, account state, subscription, quota and idempotency. */
class PropertyCreationTests extends PropertyApiTestSupport {

	@Test
	void eligibleUserCreatesDraftFromStep1() throws Exception {
		long ownerId = subscribedOwner("owner@example.com");

		send(post(BASE), owner(ownerId), DETAILS)
			.andExpect(status().isCreated())
			.andExpect(header().string("ETag", "\"1\""))
			.andExpect(jsonPath("$.slug").value("green-valley-residency"))
			.andExpect(jsonPath("$.publicationStatus").value("draft"))
			.andExpect(jsonPath("$.details.projectEmail").value("sales@greenbuilders.example.com"))
			.andExpect(jsonPath("$.details.projectPhone").value("+919876543210"))
			.andExpect(jsonPath("$.projectInfo.legalApprovalStatus").value("pending"))
			.andExpect(jsonPath("$.wizard.currentStep").value(2))
			.andExpect(jsonPath("$.wizard.completedSteps", contains(1)))
			.andExpect(jsonPath("$.statusHistory[0].action").value("created"))
			.andExpect(jsonPath("$.statusHistory[0].actorUserId").doesNotExist())
			.andExpect(jsonPath("$.owner").doesNotExist());
		assertThat(jdbc.queryForObject("SELECT user_id FROM property_projects", Long.class)).isEqualTo(ownerId);
	}

	@Test
	void draftsEndpointCreatesTheSameWay() throws Exception {
		long ownerId = subscribedOwner("owner@example.com");

		send(post(BASE + "/drafts"), owner(ownerId), DETAILS).andExpect(status().isCreated())
			.andExpect(jsonPath("$.publicationStatus").value("draft"));
	}

	@Test
	void realLoginResolvesPermissionsFromTheUserRole() throws Exception {
		registerActiveUser();
		long userId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, EMAIL);
		subscribe(userId, null);
		String token = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

		mvc.perform(post(BASE).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
				.content(DETAILS))
			.andExpect(status().isCreated());
		// The user role grants no admin permissions: the admin list is closed.
		mvc.perform(get("/api/v1/admin/properties").header("Authorization", "Bearer " + token))
			.andExpect(status().isForbidden());
	}

	@Test
	void unauthenticatedRequestsAreRejected() throws Exception {
		mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(DETAILS))
			.andExpect(status().isUnauthorized());
		mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
		mvc.perform(get(BASE + "/1")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/amenities")).andExpect(status().isUnauthorized());
		assertThat(propertyCount()).isZero();
	}

	@Test
	void roleWithoutCreatePermissionIsForbidden() throws Exception {
		long userId = subscribedOwner("viewer@example.com");

		send(post(BASE), as(userId, PROPERTY_LIST, PROPERTY_VIEW), DETAILS)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("property_action_forbidden"));
		assertThat(propertyCount()).isZero();
	}

	@ParameterizedTest(name = "status={0} verified={1} -> {2}")
	@CsvSource({ "pending, false, account_verification_required", "active, false, account_verification_required",
			"suspended, true, account_inactive", "inactive, true, account_inactive", "closed, true, account_inactive" })
	void ineligibleAccountsCannotCreate(String accountStatus, boolean verified, String code) throws Exception {
		long userId = insertUser("user@example.com", accountStatus, verified);
		subscribe(userId, null);

		send(post(BASE), owner(userId), DETAILS)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value(code));
		assertThat(propertyCount()).isZero();
	}

	@Test
	void userWithoutSubscriptionCannotCreate() throws Exception {
		long userId = insertUser("user@example.com");

		send(post(BASE), owner(userId), DETAILS)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("subscription_required"));
	}

	@ParameterizedTest(name = "{0}")
	@CsvSource(delimiter = '|', value = {
			"expired by date    | active    | now() - interval '40 days' | now() - interval '10 days' | subscription_expired",
			"marked expired     | expired   | now() - interval '40 days' | now() - interval '10 days' | subscription_expired",
			"cancelled          | cancelled | now() - interval '1 day'   | now() + interval '29 days' | subscription_required",
			"pending payment    | pending   | now() - interval '1 day'   | now() + interval '29 days' | subscription_required",
			"not started yet    | active    | now() + interval '1 day'   | now() + interval '31 days' | subscription_required" })
	void subscriptionNotInForceCannotCreate(String name, String subscriptionStatus, String startsAt, String endsAt,
			String code) throws Exception {
		long userId = insertUser("user@example.com");
		subscribe(userId, null, subscriptionStatus, startsAt, endsAt);

		send(post(BASE), owner(userId), DETAILS)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value(code));
		assertThat(propertyCount()).isZero();
	}

	@Test
	void propertyLimitCountsDraftsAndIsEnforced() throws Exception {
		long userId = insertUser("user@example.com");
		subscribe(userId, 2);
		createProperty(owner(userId));
		createProperty(owner(userId));

		send(post(BASE), owner(userId), DETAILS)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("property_limit_reached"))
			.andExpect(jsonPath("$.propertyLimit").value(2))
			.andExpect(jsonPath("$.currentProperties").value(2))
			.andExpect(jsonPath("$.remainingProperties").value(0));
		assertThat(propertyCount()).isEqualTo(2);
	}

	@Test
	void editingDoesNotUseAnotherSlot() throws Exception {
		long userId = insertUser("user@example.com");
		subscribe(userId, 1);
		long id = createProperty(owner(userId));

		send(patch(BASE + "/" + id + "/steps/1"), owner(userId), "{\"projectName\":\"Renamed\"}")
			.andExpect(status().isOk());
		send(patch(BASE + "/" + id + "/steps/2"), owner(userId), LOCATION).andExpect(status().isOk());
		assertThat(propertyCount()).isEqualTo(1);
	}

	@Test
	void deletingFreesASlotAndRestoreNeedsOneAgain() throws Exception {
		long userId = insertUser("user@example.com");
		subscribe(userId, 1);
		long adminId = insertUser("admin@example.com");
		long first = createProperty(owner(userId));

		mvc.perform(delete(BASE + "/" + first).with(owner(userId))).andExpect(status().isNoContent());
		long second = createProperty(owner(userId));

		// The deleted property would exceed the owner's limit again.
		mvc.perform(post("/api/v1/admin/properties/" + first + "/restore").with(admin(adminId)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("property_limit_reached"));
		mvc.perform(delete(BASE + "/" + second).with(owner(userId))).andExpect(status().isNoContent());
		mvc.perform(post("/api/v1/admin/properties/" + first + "/restore").with(admin(adminId)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(first))
			.andExpect(jsonPath("$.statusHistory[-1].action").value("restored"));
	}

	@Test
	void unlimitedPlanHasNoPropertyLimit() throws Exception {
		long userId = insertUser("user@example.com");
		subscribe(userId, null);

		for (int i = 0; i < 5; i++) {
			createProperty(owner(userId));
		}
		assertThat(propertyCount()).isEqualTo(5);
	}

	@Test
	void zeroLimitPlanAllowsNoProperties() throws Exception {
		long userId = insertUser("user@example.com");
		subscribe(userId, 0);

		send(post(BASE), owner(userId), DETAILS).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("property_limit_reached"));
	}

	@Test
	void adminCreatesWithoutSubscription() throws Exception {
		long adminId = insertUser("admin@example.com");

		send(post(BASE), admin(adminId), DETAILS).andExpect(status().isCreated());
		send(post(BASE), admin(adminId), DETAILS).andExpect(status().isCreated());
		assertThat(propertyCount()).isEqualTo(2);
	}

	@ParameterizedTest(name = "{0}")
	@ValueSource(strings = { "\"userId\":99", "\"slug\":\"my-slug\"", "\"publicationStatus\":\"published\"",
			"\"legalApprovalStatus\":\"approved\"", "\"subscriptionId\":1", "\"role\":\"admin\"" })
	void protectedFieldsAreRejected(String field) throws Exception {
		long userId = subscribedOwner("user@example.com");
		String name = field.substring(1, field.indexOf('"', 1));

		send(post(BASE), owner(userId), DETAILS.replaceFirst("\\{", "{" + field + ","))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"))
			.andExpect(jsonPath("$.errors." + name).value("is not allowed"));
		assertThat(propertyCount()).isZero();
	}

	@Test
	void requiredFieldsAndFormatsAreValidated() throws Exception {
		long userId = subscribedOwner("user@example.com");

		send(post(BASE), owner(userId), "{}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.propertyType").exists())
			.andExpect(jsonPath("$.errors.projectName").exists())
			.andExpect(jsonPath("$.errors.builderCompanyName").exists())
			.andExpect(jsonPath("$.errors.projectEmail").exists())
			.andExpect(jsonPath("$.errors.projectPhone").exists());
		send(post(BASE), owner(userId), """
				{"propertyType":"castle","projectName":"X","builderCompanyName":"Y","gstNumber":"123",
				 "projectEmail":"not-an-email","projectPhone":"12"}""")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.propertyType").exists())
			.andExpect(jsonPath("$.errors.gstNumber").value("must be a valid GSTIN"))
			.andExpect(jsonPath("$.errors.projectEmail").exists())
			.andExpect(jsonPath("$.errors.projectPhone").exists());
		assertThat(propertyCount()).isZero();
	}

	@Test
	void duplicateNamesGetUniqueSlugsAndRenamingKeepsTheSlug() throws Exception {
		long userId = subscribedOwner("user@example.com");
		long first = createProperty(owner(userId));
		long second = createProperty(owner(userId));
		long other = createProperty(owner(userId), DETAILS.replace("Green Valley Residency", "गृह प्रकल्प"));

		assertThat(column(first, "slug")).isEqualTo("green-valley-residency");
		assertThat(column(second, "slug")).isEqualTo("green-valley-residency-2");
		assertThat(column(other, "slug")).isEqualTo("project");

		send(patch(BASE + "/" + first + "/steps/1"), owner(userId), "{\"projectName\":\"Blue Lake Towers\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.details.projectName").value("Blue Lake Towers"))
			.andExpect(jsonPath("$.slug").value("green-valley-residency"));
	}

	@Test
	void retryWithSameIdempotencyKeyReturnsTheFirstProperty() throws Exception {
		long userId = insertUser("user@example.com");
		subscribe(userId, 1);
		RequestPostProcessor owner = owner(userId);

		String first = send(post(BASE).header("Idempotency-Key", "create-0001"), owner, DETAILS)
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		// The limit (1) is used up, but a retry is not a new property.
		send(post(BASE).header("Idempotency-Key", "create-0001"), owner, DETAILS)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(Long.parseLong(json(first, "$.id"))));
		assertThat(propertyCount()).isEqualTo(1);

		send(post(BASE).header("Idempotency-Key", "bad key!"), owner, DETAILS)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors['Idempotency-Key']").exists());
	}

	@Test
	void idempotencyKeyOfADeletedPropertyIsNotReused() throws Exception {
		long userId = subscribedOwner("user@example.com");
		String body = send(post(BASE).header("Idempotency-Key", "create-0002"), owner(userId), DETAILS)
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		mvc.perform(delete(BASE + "/" + json(body, "$.id")).with(owner(userId))).andExpect(status().isNoContent());

		send(post(BASE).header("Idempotency-Key", "create-0002"), owner(userId), DETAILS)
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("idempotency_key_reused"));
	}

	@Test
	void sameIdempotencyKeyOfAnotherUserIsIndependent() throws Exception {
		long a = subscribedOwner("a@example.com");
		long b = subscribedOwner("b@example.com");

		send(post(BASE).header("Idempotency-Key", "shared-key-1"), owner(a), DETAILS).andExpect(status().isCreated());
		send(post(BASE).header("Idempotency-Key", "shared-key-1"), owner(b), DETAILS)
			.andExpect(status().isCreated())
			.andExpect(content().string(not(containsString("\"owner\""))));
		assertThat(propertyCount()).isEqualTo(2);
	}

	private int propertyCount() {
		return jdbc.queryForObject("SELECT count(*) FROM property_projects WHERE deleted_at IS NULL", Integer.class);
	}

}
