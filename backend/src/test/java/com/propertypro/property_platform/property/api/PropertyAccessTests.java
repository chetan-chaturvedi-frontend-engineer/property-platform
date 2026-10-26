package com.propertypro.property_platform.property.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static com.propertypro.property_platform.security.Permissions.ADMIN_PANEL_ACCESS;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_LIST_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW_ANY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Ownership and permission scope of every property endpoint. */
class PropertyAccessTests extends PropertyApiTestSupport {

	private long ownerId;
	private long strangerId;
	private long adminId;
	private long propertyId;
	private long apartmentId;
	private long mediaId;

	@BeforeEach
	void createPropertyOfOwner() throws Exception {
		ownerId = subscribedOwner("owner@example.com");
		strangerId = subscribedOwner("stranger@example.com");
		adminId = insertUser("admin@example.com");
		propertyId = createProperty(owner(ownerId));
		String apartments = send(put(BASE + "/" + propertyId + "/apartments"), owner(ownerId),
				"{\"apartments\":[" + APARTMENT_2BHK_A + "]}").andReturn().getResponse().getContentAsString();
		apartmentId = Long.parseLong(json(apartments, "$[0].id"));
		String media = upload(propertyId, owner(ownerId), "photo", "a.jpg", JPEG).andReturn().getResponse()
			.getContentAsString();
		mediaId = Long.parseLong(json(media, "$.id"));
	}

	@Test
	void anotherUsersPropertyIsNotFoundOnEveryEndpoint() throws Exception {
		RequestPostProcessor stranger = owner(strangerId);
		for (Endpoint endpoint : propertyEndpoints()) {
			mvc.perform(endpoint.build().with(stranger)).andExpect(status().isNotFound());
		}
		mvc.perform(MockMvcRequestBuilders.multipart(BASE + "/" + propertyId + "/media")
				.file("file", JPEG).param("mediaType", "photo").with(stranger))
			.andExpect(status().isNotFound());
		assertThat(column(propertyId, "project_name")).isEqualTo("Green Valley Residency");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM property_project_media", Integer.class)).isEqualTo(1);
		assertThat(column(propertyId, "deleted_at")).isNull();
	}

	@Test
	void unknownPropertyLooksTheSameAsAnotherUsersProperty() throws Exception {
		String foreign = getAs(BASE + "/" + propertyId, owner(strangerId)).andReturn().getResponse().getContentAsString();
		String missing = getAs(BASE + "/999999", owner(strangerId)).andReturn().getResponse().getContentAsString();

		assertThat(foreign.replace("/" + propertyId, "")).isEqualTo(missing.replace("/999999", ""));
	}

	@Test
	void childIdsOfAnotherPropertyAreNotFound() throws Exception {
		long otherProperty = createProperty(owner(ownerId));

		getAs(BASE + "/" + otherProperty + "/apartments/" + apartmentId, owner(ownerId)).andExpect(status().isNotFound());
		mvc.perform(delete(BASE + "/" + otherProperty + "/media/" + mediaId).with(owner(ownerId)))
			.andExpect(status().isNotFound());
		send(put(BASE + "/" + otherProperty + "/apartments"), owner(ownerId),
				"{\"apartments\":[" + APARTMENT_2BHK_A.replaceFirst("\\{", "{\"id\":" + apartmentId + ",") + "]}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors['apartments[0].id']").value("is not a configuration of this property"));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM property_apartments WHERE deleted_at IS NULL",
				Integer.class)).isEqualTo(1);
	}

	@Test
	void ownerListContainsOnlyOwnProperties() throws Exception {
		createProperty(owner(strangerId));

		getAs(BASE, owner(ownerId))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content", hasSize(1)))
			.andExpect(jsonPath("$.content[0].id").value(propertyId))
			.andExpect(jsonPath("$.content[0].ownerId").doesNotExist())
			.andExpect(jsonPath("$.totalElements").value(1));
		getAs(BASE + "?ownerId=" + strangerId, owner(ownerId))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.ownerId").value("is not allowed"));
		getAs(BASE + "?deleted=include", owner(ownerId)).andExpect(status().isBadRequest());
		getAs(BASE + "?sort=userId", owner(ownerId)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.sort").exists());
	}

	@Test
	void ownerListFilters() throws Exception {
		long villa = createProperty(owner(ownerId), DETAILS.replace("\"apartment\"", "\"villa\"")
			.replace("Green Valley Residency", "Palm Villas"));
		send(patch(BASE + "/" + villa + "/steps/2"), owner(ownerId), LOCATION.replace("Pune", "Mumbai"))
			.andExpect(status().isOk());

		getAs(BASE + "?propertyType=villa", owner(ownerId)).andExpect(jsonPath("$.content[*].id", contains((int) villa)));
		getAs(BASE + "?city=mumbai", owner(ownerId)).andExpect(jsonPath("$.content[*].id", contains((int) villa)));
		getAs(BASE + "?search=palm", owner(ownerId)).andExpect(jsonPath("$.content[*].id", contains((int) villa)));
		getAs(BASE + "?publicationStatus=draft&sort=projectName,asc", owner(ownerId))
			.andExpect(jsonPath("$.content[*].projectName", contains("Green Valley Residency", "Palm Villas")));
		getAs(BASE + "?propertyType=castle", owner(ownerId)).andExpect(status().isBadRequest());
	}

	@Test
	void adminAccessesEveryOwnersProperties() throws Exception {
		long strangerProperty = createProperty(owner(strangerId));

		getAs(BASE + "/" + propertyId, admin(adminId)).andExpect(status().isOk());
		send(patch(BASE + "/" + strangerProperty + "/steps/2"), admin(adminId), LOCATION).andExpect(status().isOk());
		getAs("/api/v1/admin/properties", admin(adminId))
			.andExpect(jsonPath("$.content[*].id", containsInAnyOrder((int) propertyId, (int) strangerProperty)))
			.andExpect(jsonPath("$.content[0].ownerId").exists());
		getAs("/api/v1/admin/properties?ownerId=" + strangerId, admin(adminId))
			.andExpect(jsonPath("$.content[*].id", contains((int) strangerProperty)));
		getAs("/api/v1/admin/properties/" + propertyId, admin(adminId))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.owner.email").value("owner@example.com"))
			.andExpect(jsonPath("$.statusHistory[0].actorUserId").value(ownerId));
	}

	@Test
	void adminListsDeletedPropertiesOnlyWhenAsked() throws Exception {
		mvc.perform(delete(BASE + "/" + propertyId).with(admin(adminId))).andExpect(status().isNoContent());

		getAs("/api/v1/admin/properties", admin(adminId)).andExpect(jsonPath("$.content", hasSize(0)));
		getAs("/api/v1/admin/properties?deleted=only", admin(adminId))
			.andExpect(jsonPath("$.content[0].id").value(propertyId))
			.andExpect(jsonPath("$.content[0].deletedAt").exists());
		getAs(BASE + "/" + propertyId, owner(ownerId)).andExpect(status().isNotFound());
	}

	@Test
	void managerWithViewOnlyPermissionsCannotChangeAnything() throws Exception {
		RequestPostProcessor manager = as(adminId, ADMIN_PANEL_ACCESS, PROPERTY_LIST_ANY, PROPERTY_VIEW_ANY);

		getAs(BASE + "/" + propertyId, manager).andExpect(status().isOk());
		getAs("/api/v1/admin/properties", manager).andExpect(status().isOk());
		send(patch(BASE + "/" + propertyId + "/steps/2"), manager, LOCATION)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("property_action_forbidden"));
		mvc.perform(delete(BASE + "/" + propertyId).with(manager)).andExpect(status().isForbidden());
		send(patch(BASE + "/" + propertyId + "/status"), manager, "{\"action\":\"archive\"}")
			.andExpect(status().isForbidden());
		mvc.perform(post("/api/v1/admin/properties/" + propertyId + "/restore").with(manager))
			.andExpect(status().isForbidden());
		send(post(BASE), manager, DETAILS).andExpect(status().isForbidden());
		assertThat(column(propertyId, "city")).isNull();
	}

	@Test
	void adminEndpointsNeedAdminPanelAccess() throws Exception {
		getAs("/api/v1/admin/properties", as(adminId, PROPERTY_LIST_ANY)).andExpect(status().isForbidden());
		getAs("/api/v1/admin/properties", owner(ownerId)).andExpect(status().isForbidden());
	}

	@Test
	void ownerCannotDeleteOrEditAfterAdminDeletion() throws Exception {
		mvc.perform(delete(BASE + "/" + propertyId).with(owner(ownerId))).andExpect(status().isNoContent());

		mvc.perform(delete(BASE + "/" + propertyId).with(owner(ownerId))).andExpect(status().isNotFound());
		send(patch(BASE + "/" + propertyId + "/steps/1"), owner(ownerId), "{\"projectName\":\"X\"}")
			.andExpect(status().isNotFound());
		// Children are kept for a possible restore.
		assertThat(jdbc.queryForObject("SELECT count(*) FROM property_apartments WHERE property_project_id = ?",
				Integer.class, propertyId)).isEqualTo(1);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM property_project_media WHERE property_project_id = ?",
				Integer.class, propertyId)).isEqualTo(1);
	}

	private List<Endpoint> propertyEndpoints() {
		String p = BASE + "/" + propertyId;
		String a = p + "/apartments/" + apartmentId;
		return List.of(new Endpoint(get(p), null), new Endpoint(get(p + "/wizard"), null),
				new Endpoint(get(p + "/preview"), null), new Endpoint(patch(p), "{}"),
				new Endpoint(patch(p + "/steps/1"), "{}"), new Endpoint(patch(p + "/steps/2"), "{}"),
				new Endpoint(patch(p + "/steps/4"), "{}"), new Endpoint(patch(p + "/steps/6"), "{}"),
				new Endpoint(delete(p), null), new Endpoint(post(p + "/submit"), null),
				new Endpoint(post(p + "/publish"), null), new Endpoint(patch(p + "/status"), "{\"action\":\"archive\"}"),
				new Endpoint(patch(p + "/legal-status"), "{\"status\":\"approved\"}"),
				new Endpoint(get(p + "/apartments"), null), new Endpoint(get(a), null),
				new Endpoint(put(a), APARTMENT_2BHK_B), new Endpoint(delete(a), null),
				new Endpoint(put(p + "/apartments"), "{\"apartments\":[]}"),
				new Endpoint(post(p + "/apartments"), APARTMENT_2BHK_B),
				new Endpoint(get(a + "/amenities"), null), new Endpoint(put(a + "/amenities"), "{\"amenityIds\":[]}"),
				new Endpoint(get(a + "/media"), null), new Endpoint(get(p + "/amenities"), null),
				new Endpoint(put(p + "/amenities"), "{\"amenityIds\":[]}"), new Endpoint(get(p + "/nearby-places"), null),
				new Endpoint(put(p + "/nearby-places"), "{\"places\":[]}"), new Endpoint(get(p + "/media"), null),
				new Endpoint(get(p + "/media/" + mediaId + "/content"), null),
				new Endpoint(patch(p + "/media/" + mediaId), "{\"title\":\"x\"}"),
				new Endpoint(delete(p + "/media/" + mediaId), null),
				new Endpoint(put(p + "/media/order"), "{\"mediaIds\":[" + mediaId + "]}"));
	}

	/** {@code body} null: no request body. */
	private record Endpoint(MockHttpServletRequestBuilder request, String body) {

		MockHttpServletRequestBuilder build() {
			return body == null ? request : request.contentType("application/json").content(body);
		}

	}

}
