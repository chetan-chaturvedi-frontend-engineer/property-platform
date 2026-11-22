package com.propertypro.property_platform.property.api;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static com.propertypro.property_platform.security.Permissions.ADMIN_PANEL_ACCESS;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_LEGAL_REVIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_LIST_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_PUBLISH;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW_ANY;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The admin dashboard's property endpoints under {@code /api/v1/admin/properties}. Most requests carry a
 * test JWT with chosen permissions; {@link RealLogin} goes through a real admin login, the seeded role
 * permissions and the cookie session with its CSRF check.
 */
class AdminPropertyApiTests extends PropertyApiTestSupport {

	private static final String ADMIN_BASE = "/api/v1/admin/properties";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private long adminId;
	private RequestPostProcessor admin;

	@BeforeEach
	void setUpAdmin() {
		adminId = insertUser("admin@example.com");
		admin = admin(adminId);
	}

	@Nested
	class Statistics {

		@Test
		void countsNonDeletedPropertiesPerStatusAndDeletedSeparately() throws Exception {
			RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
			publishedProperty(owner, admin);
			createProperty(owner);
			long deleted = createProperty(owner);
			mvc.perform(delete(BASE + "/" + deleted).with(owner)).andExpect(status().isNoContent());

			getAs(ADMIN_BASE + "/stats", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(2))
				.andExpect(jsonPath("$.deleted").value(1))
				.andExpect(jsonPath("$.byPublicationStatus.published").value(1))
				.andExpect(jsonPath("$.byPublicationStatus.draft").value(1))
				.andExpect(jsonPath("$.byPublicationStatus.pending_review").value(0))
				.andExpect(jsonPath("$.byPublicationStatus.archived").value(0))
				.andExpect(jsonPath("$.byLegalApprovalStatus.pending").value(2))
				.andExpect(jsonPath("$.byLegalApprovalStatus.approved").value(0))
				.andExpect(jsonPath("$.submittedLast7Days").value(1));
		}

		@Test
		void requiresListAnyAndAuthentication() throws Exception {
			getAs(ADMIN_BASE + "/stats", as(adminId, ADMIN_PANEL_ACCESS, PROPERTY_VIEW_ANY))
				.andExpect(status().isForbidden());
			getAs(ADMIN_BASE + "/stats", as(adminId, PROPERTY_LIST_ANY)).andExpect(status().isForbidden());
			mvc.perform(get(ADMIN_BASE + "/stats")).andExpect(status().isUnauthorized());
		}

	}

	@Nested
	class Listing {

		@Test
		void adminItemsCarryPriceTypesAndAdminCoverUrl() throws Exception {
			RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
			long id = createProperty(owner);
			completeWizard(id, owner);
			send(put(BASE + "/" + id + "/apartments"), owner,
					"{\"apartments\":[" + APARTMENT_2BHK_B + "," + APARTMENT_2BHK_A + "]}").andExpect(status().isOk());
			createProperty(owner, DETAILS.replace("Green Valley Residency", "Empty Draft"));

			getAs(ADMIN_BASE + "?sort=projectName,asc", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[*].projectName").value(contains("Empty Draft", "Green Valley Residency")))
				.andExpect(jsonPath("$.content[0].coverUrl").doesNotExist())
				.andExpect(jsonPath("$.content[0].startingPrice").doesNotExist())
				.andExpect(jsonPath("$.content[0].apartmentTypes", hasSize(0)))
				.andExpect(jsonPath("$.content[1].startingPrice").value(7500000))
				.andExpect(jsonPath("$.content[1].apartmentTypes", contains("2bhk")))
				.andExpect(jsonPath("$.content[1].coverUrl").value(startsWith(ADMIN_BASE + "/" + id + "/media/")));

			// The owner list stays as it was.
			getAs(BASE, owner).andExpect(jsonPath("$.content[0].coverUrl").doesNotExist())
				.andExpect(jsonPath("$.content[0].apartmentTypes").doesNotExist());
		}

		@Test
		void adminItemsCarryReraAddressAreaParkingMediaOwnerAndSubmission() throws Exception {
			RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
			long id = createProperty(owner);
			completeWizard(id, owner);
			send(put(BASE + "/" + id + "/apartments"), owner, "{\"apartments\":[" + APARTMENT_2BHK_B + ","
					+ APARTMENT_2BHK_A.replace("\"balconies\":1", "\"balconies\":1,\"carParking\":2") + "]}")
				.andExpect(status().isOk());
			createProperty(owner, DETAILS.replace("Green Valley Residency", "Empty Draft"));
			Long mediaFiles = jdbc.queryForObject(
					"SELECT count(*) FROM property_project_media WHERE property_project_id = ?", Long.class, id);

			getAs(ADMIN_BASE + "?sort=projectName,asc", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].mediaCount").value(0))
				.andExpect(jsonPath("$.content[0].startingArea").doesNotExist())
				.andExpect(jsonPath("$.content[0].carParkingMin").doesNotExist())
				.andExpect(jsonPath("$.content[0].submittedAt").doesNotExist())
				.andExpect(jsonPath("$.content[1].reraNumber").value("P52100012345"))
				.andExpect(jsonPath("$.content[1].projectAddress").value("Plot 12, Baner Road"))
				.andExpect(jsonPath("$.content[1].ownerName").value("Test User"))
				.andExpect(jsonPath("$.content[1].mediaCount").value(mediaFiles.intValue()))
				// Area of the cheapest configuration (Type A), so price per area compares like with like.
				.andExpect(jsonPath("$.content[1].startingPrice").value(7500000))
				.andExpect(jsonPath("$.content[1].startingArea").value(950))
				.andExpect(jsonPath("$.content[1].startingAreaUnit").value("sq_ft"))
				.andExpect(jsonPath("$.content[1].carParkingMin").value(0))
				.andExpect(jsonPath("$.content[1].carParkingMax").value(2))
				.andExpect(jsonPath("$.content[1].submittedAt").doesNotExist());

			mvc.perform(post(BASE + "/" + id + "/submit").with(owner)).andExpect(status().isOk());
			getAs(ADMIN_BASE + "?sort=projectName,asc", admin)
				.andExpect(jsonPath("$.content[1].submittedAt").isNotEmpty());

			getAs(BASE, owner).andExpect(jsonPath("$.content[0].reraNumber").doesNotExist())
				.andExpect(jsonPath("$.content[0].ownerName").doesNotExist())
				.andExpect(jsonPath("$.content[0].mediaCount").doesNotExist());
		}

	}

	@Nested
	class Builders {

		private long builder(String email, String name, String status) {
			return jdbc.queryForObject("""
					INSERT INTO users (email, password_hash, full_name, phone, status, email_verified, user_type)
					VALUES (?, 'hash', ?, ?, ?, now(), 'builder') RETURNING id""",
					Long.class, email, name, "+9198765" + String.format("%05d", Math.abs(email.hashCode()) % 100000), status);
		}

		@Test
		void createsWithALinkedBuilderWhoseNameAndContactsAreShown() throws Exception {
			long aurum = builder("aurum@example.com", "Aurum Developers", "active");
			String body = adminSend(post(ADMIN_BASE),
					DETAILS.replace("\"builderCompanyName\":\"Green Builders\",", "\"builderUserId\":" + aurum + ","))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.details.builderUserId").value(aurum))
				.andExpect(jsonPath("$.details.builderCompanyName").value("Aurum Developers"))
				.andExpect(jsonPath("$.details.builder.email").value("aurum@example.com"))
				.andReturn().getResponse().getContentAsString();
			long id = Long.parseLong(json(body, "$.id"));

			getAs(ADMIN_BASE, admin)
				.andExpect(jsonPath("$.content[0].builderUserId").value(aurum))
				.andExpect(jsonPath("$.content[0].builder.fullName").value("Aurum Developers"))
				.andExpect(jsonPath("$.content[0].builder.phone").value(startsWith("+9198765")));

			// A typed name replaces the link; linking again sets the name from the account.
			adminSendIfMatch(patch(ADMIN_BASE + "/" + id + "/steps/1"), "{\"builderCompanyName\":\"Typed Builders\"}",
					version(id))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.details.builderCompanyName").value("Typed Builders"))
				.andExpect(jsonPath("$.details.builderUserId").doesNotExist());
			adminSendIfMatch(patch(ADMIN_BASE + "/" + id + "/steps/1"), "{\"builderUserId\":" + aurum + "}", version(id))
				.andExpect(jsonPath("$.details.builderCompanyName").value("Aurum Developers"))
				.andExpect(jsonPath("$.details.builderUserId").value(aurum));
			adminSendIfMatch(patch(ADMIN_BASE + "/" + id + "/steps/1"), "{\"builderUserId\":null}", version(id))
				.andExpect(jsonPath("$.details.builderUserId").doesNotExist())
				.andExpect(jsonPath("$.details.builderCompanyName").value("Aurum Developers"));
		}

		@Test
		void rejectsAccountsThatAreNotActiveBuilders() throws Exception {
			long buyer = insertUser("buyer@example.com");
			long blocked = builder("blocked@example.com", "Blocked Builder", "suspended");
			for (long id : new long[] { buyer, blocked, 999_999 }) {
				adminSend(post(ADMIN_BASE), DETAILS.replace("\"builderCompanyName\":\"Green Builders\",",
						"\"builderUserId\":" + id + ","))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.errors.builderUserId").value("must be an active user with the builder role"));
			}
			adminSend(post(ADMIN_BASE), DETAILS.replace("\"builderCompanyName\":\"Green Builders\",", ""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.builderCompanyName").value("must not be blank"));
		}

		@Test
		void appUsersCannotLinkBuilderAccounts() throws Exception {
			long aurum = builder("aurum@example.com", "Aurum Developers", "active");
			RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
			send(post(BASE), owner, DETAILS.replace("\"builderCompanyName\":\"Green Builders\",",
					"\"builderUserId\":" + aurum + ","))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.builderUserId").value("is not allowed"));
		}

	}

	@Nested
	class Activity {

		@Test
		void listsEveryPropertysStatusChangesNewestFirstWithNamesAndActors() throws Exception {
			RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
			long id = publishedProperty(owner, admin);

			getAs(ADMIN_BASE + "/activity", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].action").value("published"))
				.andExpect(jsonPath("$.content[0].propertyId").value(id))
				.andExpect(jsonPath("$.content[0].projectName").value("Green Valley Residency"))
				.andExpect(jsonPath("$.content[0].actorName").value("Test User"))
				.andExpect(jsonPath("$.content[0].toStatus").value("published"))
				.andExpect(jsonPath("$.content[*].action", hasItems("submitted", "approved", "published")));

			getAs(ADMIN_BASE + "/activity?size=2", admin)
				.andExpect(jsonPath("$.content", hasSize(2)))
				.andExpect(jsonPath("$.size").value(2));
		}

		@Test
		void requiresListAnyAndAuthentication() throws Exception {
			getAs(ADMIN_BASE + "/activity", as(adminId, ADMIN_PANEL_ACCESS, PROPERTY_VIEW_ANY))
				.andExpect(status().isForbidden());
			mvc.perform(get(ADMIN_BASE + "/activity")).andExpect(status().isUnauthorized());
		}

	}

	@Nested
	class Wizard {

		@Test
		void createsCompletesSubmitsReviewsAndPublishesThroughAdminRoutes() throws Exception {
			String body = adminSend(post(ADMIN_BASE).header("Idempotency-Key", "admin-create-1"), DETAILS)
				.andExpect(status().isCreated())
				.andExpect(header().string(HttpHeaders.ETAG, "\"1\""))
				.andExpect(jsonPath("$.publicationStatus").value("draft"))
				.andExpect(jsonPath("$.owner.email").value("admin@example.com"))
				.andReturn().getResponse().getContentAsString();
			long id = Long.parseLong(json(body, "$.id"));
			String path = ADMIN_BASE + "/" + id;

			// A retry with the same key returns the same property instead of creating another one.
			adminSend(post(ADMIN_BASE).header("Idempotency-Key", "admin-create-1"), DETAILS)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id));

			adminSend(patch(path + "/steps/2"), LOCATION).andExpect(status().isOk())
				.andExpect(jsonPath("$.location.city").value("Pune"));
			adminSend(put(path + "/apartments"), "{\"apartments\":[" + APARTMENT_2BHK_A + "]}")
				.andExpect(jsonPath("$.apartments", hasSize(1)));
			adminSend(patch(path + "/steps/4"), PROJECT_INFO).andExpect(status().isOk());
			adminSend(put(path + "/amenities"), "{\"amenityIds\":[" + amenityId("swimming-pool") + "]}")
				.andExpect(jsonPath("$.amenities[0].slug").value("swimming-pool"));
			adminSend(put(path + "/nearby-places"),
					"{\"places\":[{\"placeName\":\"Baner Metro\",\"placeType\":\"metro_station\",\"distanceKm\":1.2}]}")
				.andExpect(jsonPath("$.nearbyPlaces[0].placeName").value("Baner Metro"));
			adminUpload(id, "photo", "cover.jpg", JPEG).andExpect(status().isCreated())
				.andExpect(jsonPath("$.media[0].url").value(startsWith(path + "/media/")))
				.andExpect(jsonPath("$.media[0].primary").value(true));
			adminSend(patch(path + "/steps/6"), "{\"threeDTourUrl\":\"https://my.matterport.com/show/?m=abc\"}")
				.andExpect(jsonPath("$.threeDTourUrl").value("https://my.matterport.com/show/?m=abc"));

			getAs(path + "/wizard", admin).andExpect(jsonPath("$.readyToSubmit").value(true));
			getAs(path + "/preview", admin).andExpect(jsonPath("$.wizard.currentStep").value(7));

			adminSend(post(path + "/submit"), "").andExpect(jsonPath("$.publicationStatus").value("pending_review"));
			adminSend(patch(path + "/legal-status"), "{\"status\":\"approved\",\"reason\":\"RERA verified\"}")
				.andExpect(jsonPath("$.projectInfo.legalApprovalStatus").value("approved"));
			adminSend(patch(path + "/status"), "{\"action\":\"approve\"}")
				.andExpect(jsonPath("$.publicationStatus").value("approved"));
			adminSend(post(path + "/publish"), "")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.publicationStatus").value("published"))
				.andExpect(jsonPath("$.statusHistory[-1].actorUserId").value(adminId));
		}

		@Test
		void mediaUrlsOfTheAdminViewDownloadThroughTheAdminPath() throws Exception {
			RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
			long id = createProperty(owner);
			upload(id, owner, "photo", "cover.jpg", JPEG).andExpect(status().isCreated());

			String body = getAs(ADMIN_BASE + "/" + id, admin).andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();
			String url = json(body, "$.media[0].url");
			mvc.perform(get(url).with(admin)).andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_JPEG));
		}

		@Test
		void rejectsStaleVersionsAndInvalidFields() throws Exception {
			RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
			long id = createProperty(owner);
			String path = ADMIN_BASE + "/" + id;
			adminSendIfMatch(patch(path + "/steps/2"), LOCATION, version(id)).andExpect(status().isOk());
			adminSendIfMatch(patch(path + "/steps/2"), LOCATION, 1)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("property_version_conflict"));
			adminSend(patch(path + "/steps/2"), "{\"pincode\":\"12\"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.pincode").exists());
			adminSend(post(path + "/submit"), "")
				.andExpect(status().isUnprocessableEntity())
				.andExpect(jsonPath("$.code").value("property_incomplete"));
		}

		@Test
		void softDeletesAndRestores() throws Exception {
			RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
			long id = createProperty(owner);
			mvc.perform(delete(ADMIN_BASE + "/" + id).with(admin)).andExpect(status().isNoContent());
			getAs(ADMIN_BASE + "/" + id, admin).andExpect(status().isNotFound());
			getAs(ADMIN_BASE + "?deleted=only", admin).andExpect(jsonPath("$.content[0].id").value(id));
			adminSend(post(ADMIN_BASE + "/" + id + "/restore"), "").andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id));
		}

	}

	@Nested
	class Authorization {

		@Test
		void workflowActionsNeedTheirOwnPermission() throws Exception {
			RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
			long id = createProperty(owner);
			completeWizard(id, owner);
			mvc.perform(post(BASE + "/" + id + "/submit").with(owner)).andExpect(status().isOk());
			RequestPostProcessor viewer = as(adminId, ADMIN_PANEL_ACCESS, PROPERTY_LIST_ANY, PROPERTY_VIEW_ANY);
			String path = ADMIN_BASE + "/" + id;

			send(patch(path + "/legal-status"), viewer, "{\"status\":\"approved\"}")
				.andExpect(status().isForbidden());
			send(patch(path + "/status"), viewer, "{\"action\":\"approve\"}")
				.andExpect(status().isForbidden());
			send(post(path + "/publish"), viewer, "").andExpect(status().isForbidden());
			send(patch(path + "/steps/2"), viewer, LOCATION).andExpect(status().isForbidden());
			mvc.perform(delete(path).with(viewer)).andExpect(status().isForbidden());
			send(post(ADMIN_BASE), viewer, DETAILS).andExpect(status().isForbidden());

			RequestPostProcessor legal = as(adminId, ADMIN_PANEL_ACCESS, PROPERTY_VIEW_ANY, PROPERTY_LEGAL_REVIEW);
			send(patch(path + "/legal-status"), legal, "{\"status\":\"rejected\",\"reason\":\"No NOC\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.projectInfo.legalApprovalStatus").value("rejected"));
			send(post(path + "/publish"), as(adminId, ADMIN_PANEL_ACCESS, PROPERTY_VIEW_ANY, PROPERTY_PUBLISH), "")
				.andExpect(status().isConflict());
		}

		@Test
		void everyRouteNeedsViewAnyAndThePanel() throws Exception {
			RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
			long id = createProperty(owner);
			getAs(ADMIN_BASE + "/" + id, owner).andExpect(status().isForbidden());
			getAs(ADMIN_BASE + "/amenities", owner).andExpect(status().isForbidden());
			send(put(ADMIN_BASE + "/" + id + "/amenities"), owner, "{\"amenityIds\":[]}")
				.andExpect(status().isForbidden());
			getAs(ADMIN_BASE + "/" + id + "/wizard", as(adminId, ADMIN_PANEL_ACCESS, PROPERTY_LIST_ANY))
				.andExpect(status().isForbidden());
			getAs(ADMIN_BASE + "/999999", admin).andExpect(status().isNotFound());
		}

	}

	/** A real admin login: permissions come from the seeded admin role, not from the test. */
	@Nested
	class RealLogin {

		@Test
		void seededAdminRoleCanUseTheModule() throws Exception {
			jdbc.update("""
					INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
					VALUES ('staff@example.com', ?, 'Staff', 'active', 'admin', now())""", passwordEncoder.encode(PASSWORD));
			String token = accessToken(postJson("/api/v1/admin/login",
					"{\"identifier\":\"staff@example.com\",\"password\":\"%s\"}".formatted(PASSWORD)));

			mvc.perform(get(ADMIN_BASE + "/stats").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
			mvc.perform(post(ADMIN_BASE).header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
					.contentType(MediaType.APPLICATION_JSON).content(DETAILS))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.owner.email").value("staff@example.com"));
		}

		@Test
		void cookieSessionReachesAdminRoutesAndWritesNeedTheCsrfToken() throws Exception {
			jdbc.update("""
					INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
					VALUES ('staff@example.com', ?, 'Staff', 'active', 'admin', now())""", passwordEncoder.encode(PASSWORD));
			Cookie session = new Cookie(ADMIN_ACCESS_COOKIE, accessToken(postJson("/api/v1/admin/login",
					"{\"identifier\":\"staff@example.com\",\"password\":\"%s\"}".formatted(PASSWORD))));

			mvc.perform(get(ADMIN_BASE + "/stats").cookie(session)).andExpect(status().isOk());
			mvc.perform(post(ADMIN_BASE).cookie(session).contentType(MediaType.APPLICATION_JSON).content(DETAILS))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("csrf_invalid"));
			mvc.perform(withCsrf(post(ADMIN_BASE)).cookie(session).contentType(MediaType.APPLICATION_JSON).content(DETAILS))
				.andExpect(status().isCreated());
		}

	}

	private ResultActions adminSend(MockHttpServletRequestBuilder request, String json) throws Exception {
		return send(request, admin, json);
	}

	private ResultActions adminSendIfMatch(MockHttpServletRequestBuilder request, String json, long version)
			throws Exception {
		return sendIfMatch(request, admin, json, version);
	}

	private ResultActions adminUpload(long propertyId, String mediaType, String filename, byte[] bytes)
			throws Exception {
		MockMultipartFile file = new MockMultipartFile("file", filename, "application/octet-stream", bytes);
		return mvc.perform(multipart(ADMIN_BASE + "/" + propertyId + "/media").file(file)
			.param("mediaType", mediaType).with(admin));
	}

}
