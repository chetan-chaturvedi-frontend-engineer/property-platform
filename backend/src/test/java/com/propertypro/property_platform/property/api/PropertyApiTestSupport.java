package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import static com.propertypro.property_platform.security.Permissions.ADMIN_PANEL_ACCESS;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_CREATE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_CREATE_WITHOUT_SUBSCRIPTION;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_DELETE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_DELETE_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_LEGAL_REVIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_LIST;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_LIST_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_PUBLISH;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_RESTORE_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_REVIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_SUSPEND;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_UPDATE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_UPDATE_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW_ANY;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Property API tests. Requests carry a test JWT whose subject is a real user row and whose authorities
 * are the permissions the user's role would grant (the seeded {@code user} and {@code admin} roles);
 * {@code PropertyCreationTests} also covers a real login. Users, subscriptions and properties are
 * reset before every test.
 */
abstract class PropertyApiTestSupport extends AbstractIntegrationTest {

	static final String BASE = "/api/v1/properties";
	/** Permissions of the seeded {@code user} role's property module. */
	static final String[] OWNER_PERMISSIONS = { PROPERTY_CREATE, PROPERTY_LIST, PROPERTY_VIEW, PROPERTY_UPDATE,
			PROPERTY_DELETE };
	/** Permissions of the seeded {@code admin} role's property module. */
	static final String[] ADMIN_PERMISSIONS = { ADMIN_PANEL_ACCESS, PROPERTY_CREATE,
			PROPERTY_CREATE_WITHOUT_SUBSCRIPTION, PROPERTY_LIST_ANY, PROPERTY_VIEW_ANY, PROPERTY_UPDATE_ANY,
			PROPERTY_DELETE_ANY, PROPERTY_RESTORE_ANY, PROPERTY_REVIEW, PROPERTY_PUBLISH, PROPERTY_SUSPEND,
			PROPERTY_LEGAL_REVIEW };

	static final String DETAILS = """
			{"propertyType":"apartment","projectName":"Green Valley Residency","builderCompanyName":"Green Builders",
			 "reraNumber":"P52100012345","gstNumber":"27AAPFU0939F1ZV","projectEmail":"Sales@GreenBuilders.example.com",
			 "projectPhone":"98765 43210"}""";
	static final String LOCATION = """
			{"projectAddress":"Plot 12, Baner Road","city":"Pune","locality":"Baner","pincode":"411045",
			 "state":"Maharashtra","landmark":"Near Baner Hill","latitude":18.559,"longitude":73.7868}""";
	static final String APARTMENT_2BHK_A = """
			{"apartmentName":"2 BHK Type A","apartmentType":"2bhk","startingPrice":7500000,"bedrooms":2,
			 "bathrooms":2,"balconies":1,"areaMin":950,"areaMax":1100,"carpetArea":800,"highlights":["Corner unit"]}""";
	static final String APARTMENT_2BHK_B = """
			{"apartmentName":"2 BHK Type B","apartmentType":"2bhk","startingPrice":7900000,"bedrooms":2,
			 "bathrooms":2,"areaMin":1000,"areaMax":1150}""";
	static final String PROJECT_INFO = """
			{"totalTowersBlocks":4,"totalUnitsFlats":320,"projectStatus":"under_construction","landArea":5.5,
			 "landAreaUnit":"acre","possessionStartDate":"2027-01-01","possessionEndDate":"2027-12-31",
			 "projectDescription":"Lake-facing homes in Baner.","projectHighlights":["Lake view","Near IT park"]}""";

	/** Minimal files recognized by their signatures. */
	static final byte[] JPEG = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F', 0, 1 };
	static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13 };
	static final byte[] PDF = "%PDF-1.4\n%test\n".getBytes(StandardCharsets.US_ASCII);
	static final byte[] HTML = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.US_ASCII);

	private int planCounter;

	@BeforeEach
	void resetPropertyData() {
		// users are truncated by AbstractIntegrationTest, cascading to properties and subscriptions.
		jdbc.execute("TRUNCATE subscription_plans RESTART IDENTITY CASCADE");
	}

	/** Leaves no committed rows behind for tests that do not truncate first (e.g. @DataJpaTest classes). */
	@AfterEach
	void removePropertyData() {
		jdbc.execute("TRUNCATE system_logs, subscription_plans, users RESTART IDENTITY CASCADE");
	}

	// ---- Users and subscriptions ----

	/** An active user with a verified email. */
	long insertUser(String email) {
		return insertUser(email, "active", true);
	}

	long insertUser(String email, String status, boolean emailVerified) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, email_verified)
				VALUES (?, 'hash', 'Test User', ?, CASE WHEN ? THEN now() END) RETURNING id""",
				Long.class, email, status, emailVerified);
	}

	/** An active subscription in force; {@code limit} null means unlimited. */
	void subscribe(long userId, Integer limit) {
		subscribe(userId, limit, "active", "now() - interval '1 day'", "now() + interval '29 days'");
	}

	void subscribe(long userId, Integer limit, String status, String startsAt, String endsAt) {
		Long planId = jdbc.queryForObject("""
				INSERT INTO subscription_plans (title, slug, price, status, no_of_properties)
				VALUES ('Basic', ?, 10, 'active', ?) RETURNING id""", Long.class, "plan-" + (++planCounter), limit);
		jdbc.update("""
				INSERT INTO user_subscriptions (user_id, subscription_plan_id, status, plan_title, price, currency,
				    billing_interval, billing_interval_count, no_of_properties, starts_at, ends_at)
				VALUES (?, ?, ?, 'Basic', 10, 'INR', 'month', 1, ?, %s, %s)""".formatted(startsAt, endsAt),
				userId, planId, status, limit);
	}

	/** A verified, active user with an unlimited subscription. */
	long subscribedOwner(String email) {
		long id = insertUser(email);
		subscribe(id, null);
		return id;
	}

	// ---- Authentication ----

	static RequestPostProcessor owner(long userId) {
		return as(userId, OWNER_PERMISSIONS);
	}

	static RequestPostProcessor admin(long userId) {
		return as(userId, ADMIN_PERMISSIONS);
	}

	static RequestPostProcessor as(long userId, String... permissions) {
		List<GrantedAuthority> authorities = Arrays.stream(permissions)
			.<GrantedAuthority>map(SimpleGrantedAuthority::new).toList();
		return jwt().jwt(token -> token.subject(String.valueOf(userId))).authorities(authorities);
	}

	static String[] with(String[] base, String... more) {
		return Stream.concat(Arrays.stream(base), Arrays.stream(more)).toArray(String[]::new);
	}

	// ---- Requests ----

	ResultActions send(MockHttpServletRequestBuilder request, RequestPostProcessor who, String json) throws Exception {
		return mvc.perform(request.with(who).contentType(MediaType.APPLICATION_JSON).content(json));
	}

	ResultActions sendIfMatch(MockHttpServletRequestBuilder request, RequestPostProcessor who, String json,
			long version) throws Exception {
		return send(request.header(HttpHeaders.IF_MATCH, "\"" + version + "\""), who, json);
	}

	ResultActions getAs(String path, RequestPostProcessor who) throws Exception {
		return mvc.perform(get(path).with(who));
	}

	long createProperty(RequestPostProcessor who) throws Exception {
		return createProperty(who, DETAILS);
	}

	long createProperty(RequestPostProcessor who, String details) throws Exception {
		String body = send(post(BASE), who, details).andExpect(status().isCreated()).andReturn().getResponse()
			.getContentAsString();
		return Long.parseLong(json(body, "$.id"));
	}

	ResultActions upload(long propertyId, RequestPostProcessor who, String mediaType, String filename, byte[] content,
			String... extraParams) throws Exception {
		MockMultipartFile file = new MockMultipartFile("file", filename, "application/octet-stream", content);
		var request = multipart(BASE + "/" + propertyId + "/media").file(file).param("mediaType", mediaType);
		for (int i = 0; i + 1 < extraParams.length; i += 2) {
			request.param(extraParams[i], extraParams[i + 1]);
		}
		return mvc.perform(request.with(who));
	}

	long amenityId(String slug) {
		return jdbc.queryForObject("SELECT id FROM property_amenities WHERE slug = ?", Long.class, slug);
	}

	long version(long propertyId) {
		return jdbc.queryForObject("SELECT version FROM property_projects WHERE id = ?", Long.class, propertyId);
	}

	String column(long propertyId, String column) {
		return jdbc.queryForObject("SELECT " + column + "::text FROM property_projects WHERE id = ?", String.class,
				propertyId);
	}

	/** Saves steps 2-6 so the property can be submitted. */
	void completeWizard(long propertyId, RequestPostProcessor who) throws Exception {
		String path = BASE + "/" + propertyId;
		send(patch(path + "/steps/2"), who, LOCATION).andExpect(status().isOk());
		send(put(path + "/apartments"), who, "{\"apartments\":[" + APARTMENT_2BHK_A + "]}").andExpect(status().isOk());
		send(patch(path + "/steps/4"), who, PROJECT_INFO).andExpect(status().isOk());
		send(put(path + "/amenities"), who, "{\"amenityIds\":[" + amenityId("swimming-pool") + "]}")
			.andExpect(status().isOk());
		upload(propertyId, who, "photo", "cover.jpg", JPEG).andExpect(status().isCreated());
	}

	/** Created by {@code owner}, completed, submitted, approved and published by {@code admin}. */
	long publishedProperty(RequestPostProcessor owner, RequestPostProcessor admin) throws Exception {
		long id = createProperty(owner);
		completeWizard(id, owner);
		mvc.perform(post(BASE + "/" + id + "/submit").with(owner)).andExpect(status().isOk());
		send(patch(BASE + "/" + id + "/status"), admin, "{\"action\":\"approve\"}").andExpect(status().isOk());
		mvc.perform(post(BASE + "/" + id + "/publish").with(admin)).andExpect(status().isOk());
		return id;
	}

}
