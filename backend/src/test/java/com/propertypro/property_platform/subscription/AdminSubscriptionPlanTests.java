package com.propertypro.property_platform.subscription;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static com.propertypro.property_platform.security.Permissions.ADMIN_PANEL_ACCESS;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_CHANGE_STATUS;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_CREATE;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_LIST;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_UPDATE;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_VIEW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Admin plan management. Admin logins do not exist yet, so admin requests carry a test JWT with
 * the permissions under test; the app-user 403 case uses a real login.
 */
class AdminSubscriptionPlanTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/admin/subscription-plans";
	private static final RequestPostProcessor ADMIN = admin(SUBSCRIPTION_PLAN_LIST, SUBSCRIPTION_PLAN_VIEW,
			SUBSCRIPTION_PLAN_CREATE, SUBSCRIPTION_PLAN_UPDATE, SUBSCRIPTION_PLAN_CHANGE_STATUS);
	private static final String FULL_PLAN = """
			{"icon":"crown","photo":"plans/premium.png","title":"Premium","slug":"premium","price":999.50,
			 "currency":"USD","billingInterval":"month","billingIntervalCount":3,"description":"Best value",
			 "noOfProperties":25,"features":["Verified badge","Priority support"],"status":"active",
			 "popular":true,"sortOrder":2,"trialDays":14}""";

	@BeforeEach
	void cleanPlans() {
		jdbc.execute("TRUNCATE subscription_plans RESTART IDENTITY CASCADE");
	}

	@Nested
	class Create {

		@Test
		void appliesDefaultsForOmittedFields() throws Exception {
			send(post(BASE), """
					{"title":"  Premium Plus ","price":999}""")
				.andExpect(status().isCreated())
				.andExpect(content().string(containsString("\"price\":999.00")))
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.title").value("Premium Plus"))
				.andExpect(jsonPath("$.slug").value("premium-plus"))
				.andExpect(jsonPath("$.currency").value("INR"))
				.andExpect(jsonPath("$.billingInterval").value("month"))
				.andExpect(jsonPath("$.billingIntervalCount").value(1))
				.andExpect(jsonPath("$.noOfProperties").value(nullValue()))
				.andExpect(jsonPath("$.features", empty()))
				.andExpect(jsonPath("$.status").value("draft"))
				.andExpect(jsonPath("$.popular").value(false))
				.andExpect(jsonPath("$.sortOrder").value(0))
				.andExpect(jsonPath("$.trialDays").value(0))
				.andExpect(jsonPath("$.icon").value(nullValue()))
				.andExpect(jsonPath("$.createdAt").isNotEmpty())
				.andExpect(jsonPath("$.updatedAt").isNotEmpty());
			assertThat(column(1, "price")).isEqualTo("999.00");
			assertThat(column(1, "features")).isEqualTo("[]");
		}

		@Test
		void storesAllFields() throws Exception {
			send(post(BASE), FULL_PLAN)
				.andExpect(status().isCreated())
				.andExpect(content().string(containsString("\"price\":999.50")))
				.andExpect(jsonPath("$.icon").value("crown"))
				.andExpect(jsonPath("$.photo").value("plans/premium.png"))
				.andExpect(jsonPath("$.slug").value("premium"))
				.andExpect(jsonPath("$.currency").value("USD"))
				.andExpect(jsonPath("$.billingIntervalCount").value(3))
				.andExpect(jsonPath("$.description").value("Best value"))
				.andExpect(jsonPath("$.noOfProperties").value(25))
				.andExpect(jsonPath("$.features", contains("Verified badge", "Priority support")))
				.andExpect(jsonPath("$.status").value("active"))
				.andExpect(jsonPath("$.popular").value(true))
				.andExpect(jsonPath("$.sortOrder").value(2))
				.andExpect(jsonPath("$.trialDays").value(14));
			assertThat(column(1, "features")).isEqualTo("[\"Verified badge\", \"Priority support\"]");
		}

		@Test
		void generatesUniqueSlugsFromTitles() throws Exception {
			send(post(BASE), "{\"title\":\"Premium\",\"price\":1}").andExpect(jsonPath("$.slug").value("premium"));
			send(post(BASE), "{\"title\":\"PREMIUM\",\"price\":1}").andExpect(jsonPath("$.slug").value("premium-2"));
			send(post(BASE), "{\"title\":\"प्रीमियम\",\"price\":1}").andExpect(jsonPath("$.slug").value("plan"));
		}

		@Test
		void rejectsDuplicateSlug() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());
			send(post(BASE), "{\"title\":\"Other\",\"slug\":\"premium\",\"price\":1}")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("subscription_plan_slug_taken"));
			assertThat(planCount()).isEqualTo(1);
		}

		@Test
		void requiresTitleAndPrice() throws Exception {
			send(post(BASE), "{}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("validation_failed"))
				.andExpect(jsonPath("$.errors.title").exists())
				.andExpect(jsonPath("$.errors.price").exists());
		}

		@ParameterizedTest(name = "{0} -> {1}")
		@MethodSource("com.propertypro.property_platform.subscription.AdminSubscriptionPlanTests#invalidFields")
		void rejectsInvalidField(String fields, String errorField) throws Exception {
			send(post(BASE), "{\"title\":\"Plan\",\"price\":1," + fields + "}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors['" + errorField + "']").exists());
			assertThat(planCount()).isZero();
		}

		@Test
		void ignoresProtectedAndUnknownFields() throws Exception {
			send(post(BASE), """
					{"id":99,"createdAt":"2000-01-01T00:00:00Z","updatedAt":"2000-01-01T00:00:00Z",
					 "ownerId":7,"title":"Plan","price":1}""")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.createdAt", not(containsString("2000"))));
		}

	}

	/** Field values (JSON fragment) that must be rejected on create, with the reported error field. */
	static Stream<Arguments> invalidFields() {
		return Stream.of(
				Arguments.of("\"title\":\"   \"", "title"),
				Arguments.of("\"title\":\"" + "x".repeat(101) + "\"", "title"),
				Arguments.of("\"price\":-1", "price"),
				Arguments.of("\"price\":1.234", "price"),
				Arguments.of("\"price\":10000000000000", "price"),
				Arguments.of("\"price\":\"abc\"", "price"),
				Arguments.of("\"currency\":\"inr\"", "currency"),
				Arguments.of("\"currency\":\"ZZZ\"", "currency"),
				Arguments.of("\"billingInterval\":\"weekly\"", "billingInterval"),
				Arguments.of("\"billingIntervalCount\":0", "billingIntervalCount"),
				Arguments.of("\"billingIntervalCount\":37", "billingIntervalCount"),
				Arguments.of("\"billingInterval\":\"lifetime\",\"billingIntervalCount\":3", "billingIntervalCount"),
				Arguments.of("\"noOfProperties\":-1", "noOfProperties"),
				Arguments.of("\"trialDays\":-1", "trialDays"),
				Arguments.of("\"trialDays\":366", "trialDays"),
				Arguments.of("\"sortOrder\":-1", "sortOrder"),
				Arguments.of("\"status\":\"archived\"", "status"),
				Arguments.of("\"popular\":\"maybe\"", "popular"),
				Arguments.of("\"slug\":\"Bad Slug\"", "slug"),
				Arguments.of("\"slug\":\"\"", "slug"),
				Arguments.of("\"icon\":\"a b\"", "icon"),
				Arguments.of("\"photo\":\"../secret.png\"", "photo"),
				Arguments.of("\"photo\":\"http://cdn.example.com/a.png\"", "photo"),
				Arguments.of("\"description\":\"" + "x".repeat(5001) + "\"", "description"),
				Arguments.of("\"features\":\"Verified badge\"", "features"),
				Arguments.of("\"features\":[\"Support\",\" \"]", "features[1]"),
				Arguments.of("\"features\":[\"" + "x".repeat(201) + "\"]", "features[0]"),
				Arguments.of("\"features\":[\"Support\",\" support \"]", "features"),
				Arguments.of("\"features\":" + IntStream.range(0, 51).mapToObj(i -> "\"f" + i + "\"").toList(),
						"features"));
	}

	@Nested
	class Update {

		@Test
		void partialUpdateKeepsOmittedFields() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());
			jdbc.update("UPDATE subscription_plans SET updated_at = '2026-01-01T00:00:00Z'");

			send(patch(BASE + "/1"), "{\"price\":1499}")
				.andExpect(status().isOk())
				.andExpect(content().string(containsString("\"price\":1499.00")))
				.andExpect(jsonPath("$.title").value("Premium"))
				.andExpect(jsonPath("$.slug").value("premium"))
				.andExpect(jsonPath("$.noOfProperties").value(25))
				.andExpect(jsonPath("$.features", contains("Verified badge", "Priority support")))
				.andExpect(jsonPath("$.status").value("active"));
			assertThat(column(1, "updated_at > '2026-01-01T00:00:00Z'")).isEqualTo("true");
		}

		@Test
		void fullUpdateReplacesAllFields() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());

			send(patch(BASE + "/1"), """
					{"icon":"star","photo":"https://cdn.example.com/gold.png","title":"Gold","slug":"gold",
					 "price":0,"currency":"INR","billingInterval":"lifetime","billingIntervalCount":1,
					 "description":"Forever","noOfProperties":0,"features":["Lifetime access"],"status":"inactive",
					 "popular":false,"sortOrder":9,"trialDays":0}""")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.icon").value("star"))
				.andExpect(jsonPath("$.photo").value("https://cdn.example.com/gold.png"))
				.andExpect(jsonPath("$.title").value("Gold"))
				.andExpect(jsonPath("$.slug").value("gold"))
				.andExpect(content().string(containsString("\"price\":0.00")))
				.andExpect(jsonPath("$.currency").value("INR"))
				.andExpect(jsonPath("$.billingInterval").value("lifetime"))
				.andExpect(jsonPath("$.billingIntervalCount").value(1))
				.andExpect(jsonPath("$.description").value("Forever"))
				.andExpect(jsonPath("$.noOfProperties").value(0))
				.andExpect(jsonPath("$.features", contains("Lifetime access")))
				.andExpect(jsonPath("$.status").value("inactive"))
				.andExpect(jsonPath("$.popular").value(false))
				.andExpect(jsonPath("$.sortOrder").value(9))
				.andExpect(jsonPath("$.trialDays").value(0));
		}

		@Test
		void explicitNullClearsOptionalFields() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());

			send(patch(BASE + "/1"), "{\"icon\":null,\"description\":null,\"noOfProperties\":null}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.icon").value(nullValue()))
				.andExpect(jsonPath("$.description").value(nullValue()))
				.andExpect(jsonPath("$.noOfProperties").value(nullValue()))
				.andExpect(jsonPath("$.photo").value("plans/premium.png"));
		}

		@ParameterizedTest
		@MethodSource("com.propertypro.property_platform.subscription.AdminSubscriptionPlanTests#requiredFields")
		void explicitNullIsRejectedForRequiredFields(String field) throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());

			send(patch(BASE + "/1"), "{\"" + field + "\":null}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
		}

		@Test
		void validatesWithCreateRules() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());

			send(patch(BASE + "/1"), "{\"price\":-5,\"status\":\"archived\",\"features\":[\"\"]}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.price").exists())
				.andExpect(jsonPath("$.errors.status").exists())
				.andExpect(jsonPath("$.errors['features[0]']").exists());
			assertThat(column(1, "price")).isEqualTo("999.50");
		}

		@Test
		void replacesFeaturesOnlyWhenGiven() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());

			send(patch(BASE + "/1"), "{\"features\":[\" Unlimited leads \"]}")
				.andExpect(jsonPath("$.features", contains("Unlimited leads")));
			send(patch(BASE + "/1"), "{\"features\":[]}").andExpect(jsonPath("$.features", empty()));
		}

		@Test
		void appliesLifetimeRuleToMergedPlan() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());

			send(patch(BASE + "/1"), "{\"billingInterval\":\"lifetime\"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.billingIntervalCount").exists());
			send(patch(BASE + "/1"), "{\"billingInterval\":\"lifetime\",\"billingIntervalCount\":1}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.billingInterval").value("lifetime"));
		}

		@Test
		void slugMustBeUniqueAmongOtherPlans() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());
			send(post(BASE), "{\"title\":\"Basic\",\"price\":0}").andExpect(status().isCreated());

			send(patch(BASE + "/1"), "{\"slug\":\"premium\"}").andExpect(status().isOk());
			send(patch(BASE + "/2"), "{\"slug\":\"premium\"}")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("subscription_plan_slug_taken"));
			assertThat(column(2, "slug")).isEqualTo("basic");
		}

		@Test
		void titleChangeKeepsSlug() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());

			send(patch(BASE + "/1"), "{\"title\":\"Premium Max\"}")
				.andExpect(jsonPath("$.title").value("Premium Max"))
				.andExpect(jsonPath("$.slug").value("premium"));
		}

		@Test
		void leavesOtherPlansUnchanged() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());
			send(post(BASE), "{\"title\":\"Basic\",\"price\":0}").andExpect(status().isCreated());
			Map<String, Object> before = row(2);

			send(patch(BASE + "/1"), "{\"title\":\"Premium Max\",\"price\":5}").andExpect(status().isOk());

			assertThat(row(2)).isEqualTo(before);
		}

		@Test
		void ignoresProtectedFields() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());
			String createdAt = column(1, "created_at::text");

			send(patch(BASE + "/1"), "{\"id\":42,\"createdAt\":\"2000-01-01T00:00:00Z\",\"title\":\"Renamed\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(1));
			assertThat(column(1, "created_at::text")).isEqualTo(createdAt);
			assertThat(planCount()).isEqualTo(1);
		}

		@Test
		void returns404ForUnknownPlan() throws Exception {
			send(patch(BASE + "/99"), "{\"title\":\"X\"}")
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("subscription_plan_not_found"));
		}

	}

	static Stream<String> requiredFields() {
		return Stream.of("title", "slug", "price", "currency", "billingInterval", "billingIntervalCount", "features",
				"status", "popular", "sortOrder", "trialDays");
	}

	@Nested
	class ChangeStatus {

		@Test
		void changesOnlyTheStatus() throws Exception {
			send(post(BASE), FULL_PLAN.replace("\"status\":\"active\"", "\"status\":\"draft\"")).andExpect(status().isCreated());
			jdbc.update("UPDATE subscription_plans SET updated_at = '2026-01-01T00:00:00Z'");
			Map<String, Object> before = row(1);

			send(patch(BASE + "/1/status"), "{\"status\":\"active\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("active"))
				.andExpect(jsonPath("$.title").value("Premium"));

			Map<String, Object> after = row(1);
			assertThat(after.get("status")).isEqualTo("active");
			assertThat(after.get("updated_at")).isNotEqualTo(before.get("updated_at"));
			before.keySet().removeAll(List.of("status", "updated_at"));
			after.keySet().removeAll(List.of("status", "updated_at"));
			assertThat(after).isEqualTo(before);
		}

		@Test
		void supportsEveryStatus() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());
			for (String value : List.of("inactive", "draft", "active")) {
				send(patch(BASE + "/1/status"), "{\"status\":\"" + value + "\"}")
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.status").value(value));
			}
		}

		@Test
		void rejectsInvalidOrMissingStatus() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());

			send(patch(BASE + "/1/status"), "{\"status\":\"archived\"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.status").exists());
			send(patch(BASE + "/1/status"), "{}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.status").exists());
			send(patch(BASE + "/1/status"), "{\"status\":\"ACTIVE\"}").andExpect(status().isBadRequest());
			assertThat(column(1, "status")).isEqualTo("active");
		}

		@Test
		void returns404ForUnknownPlan() throws Exception {
			send(patch(BASE + "/99/status"), "{\"status\":\"active\"}")
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("subscription_plan_not_found"));
		}

	}

	@Nested
	class View {

		@Test
		void returnsAllFields() throws Exception {
			send(post(BASE), FULL_PLAN).andExpect(status().isCreated());

			mvc.perform(get(BASE + "/1").with(ADMIN))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.icon").value("crown"))
				.andExpect(jsonPath("$.photo").value("plans/premium.png"))
				.andExpect(jsonPath("$.title").value("Premium"))
				.andExpect(jsonPath("$.slug").value("premium"))
				.andExpect(content().string(containsString("\"price\":999.50")))
				.andExpect(jsonPath("$.currency").value("USD"))
				.andExpect(jsonPath("$.billingInterval").value("month"))
				.andExpect(jsonPath("$.billingIntervalCount").value(3))
				.andExpect(jsonPath("$.description").value("Best value"))
				.andExpect(jsonPath("$.noOfProperties").value(25))
				.andExpect(jsonPath("$.features", contains("Verified badge", "Priority support")))
				.andExpect(jsonPath("$.status").value("active"))
				.andExpect(jsonPath("$.popular").value(true))
				.andExpect(jsonPath("$.sortOrder").value(2))
				.andExpect(jsonPath("$.trialDays").value(14))
				.andExpect(jsonPath("$.createdAt").isNotEmpty())
				.andExpect(jsonPath("$.updatedAt").isNotEmpty());
		}

		@Test
		void showsDraftAndInactivePlansToAdmins() throws Exception {
			insertPlan("Draft", "draft-plan", "1", "draft", "month", false, 0, "2026-01-01T00:00:00Z");
			insertPlan("Old", "old-plan", "1", "inactive", "month", false, 0, "2026-01-01T00:00:00Z");

			mvc.perform(get(BASE + "/1").with(ADMIN)).andExpect(jsonPath("$.status").value("draft"));
			mvc.perform(get(BASE + "/2").with(ADMIN)).andExpect(jsonPath("$.status").value("inactive"));
		}

		@Test
		void returns404ForUnknownPlan() throws Exception {
			mvc.perform(get(BASE + "/99").with(ADMIN))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("subscription_plan_not_found"));
		}

		@Test
		void rejectsNonNumericId() throws Exception {
			mvc.perform(get(BASE + "/abc").with(ADMIN)).andExpect(status().isBadRequest());
		}

	}

	@Nested
	class ListPlans {

		@Test
		void sortsBySortOrderThenNewestFirstByDefault() throws Exception {
			insertPlan("Third", "third", "30", "active", "month", false, 2, "2026-03-01T00:00:00Z");
			insertPlan("Second", "second", "20", "draft", "month", false, 1, "2026-01-01T00:00:00Z");
			insertPlan("First", "first", "10", "inactive", "month", false, 1, "2026-02-01T00:00:00Z");

			list("")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[*].slug", contains("first", "second", "third")))
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(20))
				.andExpect(jsonPath("$.totalElements").value(3))
				.andExpect(jsonPath("$.totalPages").value(1));
		}

		@Test
		void paginates() throws Exception {
			for (int i = 1; i <= 5; i++) {
				insertPlan("Plan " + i, "plan-" + i, "1", "active", "month", false, i, "2026-01-01T00:00:00Z");
			}

			list("?page=1&size=2")
				.andExpect(jsonPath("$.content[*].slug", contains("plan-3", "plan-4")))
				.andExpect(jsonPath("$.page").value(1))
				.andExpect(jsonPath("$.size").value(2))
				.andExpect(jsonPath("$.totalElements").value(5))
				.andExpect(jsonPath("$.totalPages").value(3));
			list("?size=500").andExpect(jsonPath("$.size").value(100));
		}

		@Test
		void searchesTitleAndSlugIgnoringCase() throws Exception {
			insertPlan("Gold Plan", "gold-plan", "1", "active", "month", false, 0, "2026-01-01T00:00:00Z");
			insertPlan("Silver", "silver-annual", "1", "active", "year", false, 0, "2026-01-01T00:00:00Z");

			list("?search=GOLD").andExpect(jsonPath("$.content[*].slug", contains("gold-plan")));
			list("?search=annual").andExpect(jsonPath("$.content[*].slug", contains("silver-annual")));
			list("?search=%25").andExpect(jsonPath("$.totalElements").value(0));
			list("?search=_").andExpect(jsonPath("$.totalElements").value(0));
		}

		@Test
		void filtersByStatusIntervalPopularityPriceAndCreationTime() throws Exception {
			insertPlan("A", "a", "0", "active", "month", true, 0, "2026-01-01T00:00:00Z");
			insertPlan("B", "b", "500", "draft", "year", false, 0, "2026-02-01T00:00:00Z");
			insertPlan("C", "c", "1000", "inactive", "lifetime", true, 0, "2026-03-01T00:00:00Z");

			list("?status=draft").andExpect(jsonPath("$.content[*].slug", contains("b")));
			list("?billingInterval=lifetime").andExpect(jsonPath("$.content[*].slug", contains("c")));
			list("?popular=true&sort=price").andExpect(jsonPath("$.content[*].slug", contains("a", "c")));
			list("?minPrice=500&maxPrice=1000&sort=price").andExpect(jsonPath("$.content[*].slug", contains("b", "c")));
			list("?createdFrom=2026-02-01T00:00:00Z&createdTo=2026-02-01T00:00:00Z")
				.andExpect(jsonPath("$.content[*].slug", contains("b")));
			list("?status=active&popular=false").andExpect(jsonPath("$.totalElements").value(0));
		}

		@Test
		void sortsByAllowedField() throws Exception {
			insertPlan("Cheap", "cheap", "10", "active", "month", false, 0, "2026-01-01T00:00:00Z");
			insertPlan("Pricey", "pricey", "90", "active", "month", false, 1, "2026-01-01T00:00:00Z");

			list("?sort=price,desc").andExpect(jsonPath("$.content[*].slug", contains("pricey", "cheap")));
			list("?sort=title,asc").andExpect(jsonPath("$.content[*].slug", contains("cheap", "pricey")));
		}

		@Test
		void rejectsInvalidSortAndFilters() throws Exception {
			list("?sort=features").andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.sort").exists());
			list("?sort=id;DROP TABLE users").andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.sort").exists());
			list("?status=archived").andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.status").exists());
			list("?billingInterval=weekly").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.billingInterval").exists());
			list("?minPrice=abc").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.minPrice").value("has an invalid value"));
			list("?minPrice=-1").andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.minPrice").exists());
			list("?minPrice=10&maxPrice=5").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.maxPrice").exists());
			list("?createdFrom=yesterday").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.createdFrom").exists());
			list("?createdFrom=2026-03-01T00:00:00Z&createdTo=2026-01-01T00:00:00Z").andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.createdTo").exists());
		}

		@Test
		void returnsEmptyPage() throws Exception {
			list("")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content", empty()))
				.andExpect(jsonPath("$.totalElements").value(0))
				.andExpect(jsonPath("$.totalPages").value(0));
			insertPlan("A", "a", "1", "active", "month", false, 0, "2026-01-01T00:00:00Z");
			list("?page=5").andExpect(jsonPath("$.content", empty())).andExpect(jsonPath("$.totalElements").value(1));
		}

		private ResultActions list(String query) throws Exception {
			return mvc.perform(get(BASE + query).with(ADMIN));
		}

	}

	@Nested
	class Access {

		@Test
		void requiresAuthentication() throws Exception {
			for (MockHttpServletRequestBuilder request : allEndpoints()) {
				mvc.perform(request).andExpect(status().isUnauthorized());
			}
			mvc.perform(get(BASE).header(HttpHeaders.AUTHORIZATION, "Bearer not-a-token"))
				.andExpect(status().isUnauthorized());
			assertThat(planCount()).isZero();
		}

		@Test
		void rejectsAppUsers() throws Exception {
			registerActiveUser();
			String accessToken = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

			for (MockHttpServletRequestBuilder request : allEndpoints()) {
				mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
					.andExpect(status().isForbidden());
			}
		}

		@Test
		void requiresAdminPanelAccess() throws Exception {
			RequestPostProcessor noPanel = jwt().authorities(ALL_PLAN_PERMISSIONS.stream()
				.<GrantedAuthority>map(SimpleGrantedAuthority::new).toList());
			for (MockHttpServletRequestBuilder request : allEndpoints()) {
				mvc.perform(request.with(noPanel)).andExpect(status().isForbidden());
			}
		}

		/** Each endpoint needs exactly its own permission: every other plan permission is not enough. */
		@ParameterizedTest(name = "{0} needs {1}")
		@MethodSource("com.propertypro.property_platform.subscription.AdminSubscriptionPlanTests#endpointPermissions")
		void requiresEndpointPermission(String endpoint, String permission, int successStatus) throws Exception {
			insertPlan("A", "a", "1", "active", "month", false, 0, "2026-01-01T00:00:00Z");
			String[] allOthers = ALL_PLAN_PERMISSIONS.stream().filter(p -> !p.equals(permission)).toArray(String[]::new);

			mvc.perform(endpoint(endpoint).with(admin(allOthers))).andExpect(status().isForbidden());
			assertThat(column(1, "title")).isEqualTo("A");
			assertThat(column(1, "status")).isEqualTo("active");
			assertThat(planCount()).isEqualTo(1);

			mvc.perform(endpoint(endpoint).with(admin(permission))).andExpect(status().is(successStatus));
		}

		private List<MockHttpServletRequestBuilder> allEndpoints() {
			return endpointPermissions().map(arguments -> endpoint((String) arguments.get()[0])).toList();
		}

	}

	private static final List<String> ALL_PLAN_PERMISSIONS = List.of(SUBSCRIPTION_PLAN_LIST, SUBSCRIPTION_PLAN_VIEW,
			SUBSCRIPTION_PLAN_CREATE, SUBSCRIPTION_PLAN_UPDATE, SUBSCRIPTION_PLAN_CHANGE_STATUS);

	static Stream<Arguments> endpointPermissions() {
		return Stream.of(
				Arguments.of("list", SUBSCRIPTION_PLAN_LIST, 200),
				Arguments.of("view", SUBSCRIPTION_PLAN_VIEW, 200),
				Arguments.of("create", SUBSCRIPTION_PLAN_CREATE, 201),
				Arguments.of("update", SUBSCRIPTION_PLAN_UPDATE, 200),
				Arguments.of("change status", SUBSCRIPTION_PLAN_CHANGE_STATUS, 200));
	}

	/** A new request for one of the five endpoints, on plan 1. */
	private static MockHttpServletRequestBuilder endpoint(String name) {
		return switch (name) {
			case "list" -> get(BASE);
			case "view" -> get(BASE + "/1");
			case "create" -> post(BASE).contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"X\",\"price\":1}");
			case "update" -> patch(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"X\"}");
			case "change status" -> patch(BASE + "/1/status").contentType(MediaType.APPLICATION_JSON)
				.content("{\"status\":\"draft\"}");
			default -> throw new IllegalArgumentException(name);
		};
	}

	private static RequestPostProcessor admin(String... permissions) {
		return jwt().jwt(token -> token.subject("1")).authorities(Stream.concat(Stream.of(ADMIN_PANEL_ACCESS),
				Stream.of(permissions)).<GrantedAuthority>map(SimpleGrantedAuthority::new).toList());
	}

	private ResultActions send(MockHttpServletRequestBuilder request, String json) throws Exception {
		return send(request, json, ADMIN);
	}

	private ResultActions send(MockHttpServletRequestBuilder request, String json, RequestPostProcessor auth)
			throws Exception {
		return mvc.perform(request.with(auth).contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private void insertPlan(String title, String slug, String price, String status, String billingInterval,
			boolean popular, int sortOrder, String createdAt) {
		jdbc.update("""
				INSERT INTO subscription_plans (title, slug, price, status, billing_interval, is_popular, sort_order,
				    created_at, updated_at)
				VALUES (?, ?, CAST(? AS NUMERIC), ?, ?, ?, ?, CAST(? AS TIMESTAMPTZ), CAST(? AS TIMESTAMPTZ))""",
				title, slug, price, status, billingInterval, popular, sortOrder, createdAt, createdAt);
	}

	private int planCount() {
		return jdbc.queryForObject("SELECT count(*) FROM subscription_plans", Integer.class);
	}

	/** One column (or expression) of a plan, as text. */
	private String column(long id, String expression) {
		return jdbc.queryForObject("SELECT (" + expression + ")::text FROM subscription_plans WHERE id = ?",
				String.class, id);
	}

	private Map<String, Object> row(long id) {
		return jdbc.queryForMap("SELECT *, features::text AS features FROM subscription_plans WHERE id = ?", id);
	}

}
