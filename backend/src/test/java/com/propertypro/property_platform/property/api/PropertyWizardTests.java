package com.propertypro.property_platform.property.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static com.propertypro.property_platform.security.Permissions.PROPERTY_REVIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW_ANY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The seven wizard steps, partial updates, completion, submission and the publication workflow. */
class PropertyWizardTests extends PropertyApiTestSupport {

	private long ownerId;
	private long adminId;
	private RequestPostProcessor owner;
	private RequestPostProcessor admin;
	private long id;
	private String path;

	@BeforeEach
	void createDraft() throws Exception {
		ownerId = subscribedOwner("owner@example.com");
		adminId = insertUser("admin@example.com");
		owner = owner(ownerId);
		admin = admin(adminId);
		id = createProperty(owner);
		path = BASE + "/" + id;
	}

	@Test
	void incompleteDraftIsSavedAndResumable() throws Exception {
		send(patch(path + "/steps/2"), owner, "{\"city\":\"Pune\"}").andExpect(status().isOk());

		getAs(path + "/wizard", owner)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.currentStep").value(2))
			.andExpect(jsonPath("$.completedSteps", contains(1)))
			.andExpect(jsonPath("$.readyToSubmit").value(false))
			.andExpect(jsonPath("$.steps[1].missing", contains("projectAddress", "locality", "pincode", "state")))
			.andExpect(jsonPath("$.steps[2].missing", contains("apartments")))
			.andExpect(jsonPath("$.steps[3].missing", contains("projectDescription")))
			.andExpect(jsonPath("$.steps[4].missing", contains("amenities")))
			.andExpect(jsonPath("$.steps[5].missing", contains("photos")));
		getAs(BASE, owner).andExpect(jsonPath("$.content[0].wizardStep").value(2));
		getAs(path, owner).andExpect(jsonPath("$.location.city").value("Pune"));
	}

	@Test
	void completionIsComputedFromSavedData() throws Exception {
		send(patch(path + "/steps/2"), owner, LOCATION).andExpect(jsonPath("$.wizard.currentStep").value(3));
		send(put(path + "/apartments"), owner, "{\"apartments\":[" + APARTMENT_2BHK_A + "]}").andExpect(status().isOk());
		send(patch(path + "/steps/4"), owner, PROJECT_INFO).andExpect(jsonPath("$.wizard.currentStep").value(5));
		send(put(path + "/amenities"), owner, "{\"amenityIds\":[" + amenityId("gymnasium") + "]}")
			.andExpect(status().isOk());
		getAs(path + "/wizard", owner).andExpect(jsonPath("$.currentStep").value(6));
		upload(id, owner, "photo", "cover.jpg", JPEG).andExpect(status().isCreated());

		getAs(path + "/wizard", owner)
			.andExpect(jsonPath("$.currentStep").value(7))
			.andExpect(jsonPath("$.completedSteps", contains(1, 2, 3, 4, 5, 6)))
			.andExpect(jsonPath("$.readyToSubmit").value(true));
		// Removing the only photo makes step 6 incomplete again.
		long mediaId = Long.parseLong(json(getAs(path + "/media", owner).andReturn().getResponse().getContentAsString(),
				"$[0].id"));
		mvc.perform(delete(path + "/media/" + mediaId).with(owner)).andExpect(status().isNoContent());
		getAs(path + "/wizard", owner).andExpect(jsonPath("$.currentStep").value(6));
	}

	@Test
	void stepUpdatesPreserveOtherDataAndNullClearsOptionalFields() throws Exception {
		send(patch(path + "/steps/2"), owner, LOCATION).andExpect(status().isOk());
		send(patch(path + "/steps/4"), owner, PROJECT_INFO).andExpect(status().isOk());

		send(patch(path + "/steps/2"), owner, "{\"landmark\":null,\"locality\":\"Balewadi\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.location.landmark").doesNotExist())
			.andExpect(jsonPath("$.location.locality").value("Balewadi"))
			.andExpect(jsonPath("$.location.city").value("Pune"))
			.andExpect(jsonPath("$.location.latitude").value(18.559))
			.andExpect(jsonPath("$.projectInfo.totalUnitsFlats").value(320))
			.andExpect(jsonPath("$.details.reraNumber").value("P52100012345"));
		send(patch(path + "/steps/2"), owner, "{\"city\":null}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.city").exists());
		send(patch(path + "/steps/1"), owner, "{\"gstNumber\":null}")
			.andExpect(jsonPath("$.details.gstNumber").doesNotExist())
			.andExpect(jsonPath("$.details.projectName").value("Green Valley Residency"));
		send(patch(path + "/steps/4"), owner, "{\"projectHighlights\":null,\"landArea\":null}")
			.andExpect(jsonPath("$.projectInfo.projectHighlights", empty()))
			.andExpect(jsonPath("$.projectInfo.landArea").doesNotExist())
			.andExpect(jsonPath("$.projectInfo.possessionStartDate").value("2027-01-01"));
	}

	@Test
	void combinedPatchUpdatesSeveralStepsAtomically() throws Exception {
		send(patch(path), owner, """
				{"details":{"projectName":"Renamed"},"location":{"city":"Mumbai"},
				 "projectInfo":{"projectStatus":"ready_to_move"}}""")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.details.projectName").value("Renamed"))
			.andExpect(jsonPath("$.location.city").value("Mumbai"))
			.andExpect(jsonPath("$.projectInfo.projectStatus").value("ready_to_move"));
		// One invalid section rejects the whole request.
		send(patch(path), owner, "{\"details\":{\"projectName\":\"Again\"},\"location\":{\"pincode\":\"12\"}}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors['location.pincode']").exists());
		assertThat(column(id, "project_name")).isEqualTo("Renamed");
	}

	@Test
	void locationRulesAreValidated() throws Exception {
		send(patch(path + "/steps/2"), owner, "{\"latitude\":18.5}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.longitude").value("latitude and longitude must be provided together"));
		send(patch(path + "/steps/2"), owner, "{\"latitude\":91,\"longitude\":73}")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.latitude").exists());
		send(patch(path + "/steps/2"), owner, "{\"latitude\":18,\"longitude\":-181}")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.longitude").exists());
		send(patch(path + "/steps/2"), owner, "{\"pincode\":\"0110\"}")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.pincode").exists());
		send(patch(path + "/steps/2"), owner, "{\"mapUrl\":\"javascript:alert(1)\"}")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.mapUrl").value("is not allowed"));
		// Clearing both coordinates together is fine.
		send(patch(path + "/steps/2"), owner, "{\"latitude\":18.5,\"longitude\":73.8}").andExpect(status().isOk());
		send(patch(path + "/steps/2"), owner, "{\"latitude\":null,\"longitude\":null}")
			.andExpect(status().isOk()).andExpect(jsonPath("$.location.latitude").doesNotExist());
	}

	@Test
	void projectInfoRulesAreValidated() throws Exception {
		send(patch(path + "/steps/4"), owner, "{\"possessionStartDate\":\"2027-06-01\",\"possessionEndDate\":\"2027-01-01\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.possessionEndDate").exists());
		send(patch(path + "/steps/4"), owner, "{\"landArea\":2}")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.landAreaUnit").exists());
		send(patch(path + "/steps/4"), owner, "{\"projectStatus\":\"sold_out\",\"totalUnitsFlats\":-1}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.projectStatus").exists())
			.andExpect(jsonPath("$.errors.totalUnitsFlats").exists());
		send(patch(path + "/steps/4"), owner, "{\"projectHighlights\":[\"" + "x".repeat(201) + "\"]}")
			.andExpect(status().isBadRequest());
		send(patch(path + "/steps/4"), owner, "{\"legalApprovalStatus\":\"approved\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.legalApprovalStatus").value("is not allowed"));
		assertThat(column(id, "legal_approval_status")).isEqualTo("pending");
	}

	@Test
	void threeDTourUrlMustBeOnAnAllowedHost() throws Exception {
		send(patch(path + "/steps/6"), owner, "{\"threeDTourUrl\":\"https://my.matterport.com/show/?m=abc\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.threeDTourUrl").value("https://my.matterport.com/show/?m=abc"));
		for (String url : new String[] { "http://my.matterport.com/x", "https://evil.example.com/x",
				"https://user:pass@matterport.com/x", "javascript:alert(1)", "https://matterport.com.evil.io/x" }) {
			send(patch(path + "/steps/6"), owner, "{\"threeDTourUrl\":\"" + url + "\"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.threeDTourUrl").exists());
		}
		send(patch(path + "/steps/6"), owner, "{\"threeDTourUrl\":null}")
			.andExpect(jsonPath("$.threeDTourUrl").doesNotExist());
	}

	@Test
	void incompletePropertyCannotBeSubmitted() throws Exception {
		mvc.perform(post(path + "/submit").with(owner))
			.andExpect(status().isUnprocessableContent())
			.andExpect(jsonPath("$.code").value("property_incomplete"))
			.andExpect(jsonPath("$.missing.2").exists())
			.andExpect(jsonPath("$.missing.6", contains("photos")));
		assertThat(column(id, "publication_status")).isEqualTo("draft");
	}

	@Test
	void fullWorkflowFromDraftToPublished() throws Exception {
		completeWizard(id, owner);

		mvc.perform(post(path + "/submit").with(owner))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.publicationStatus").value("pending_review"))
			.andExpect(jsonPath("$.wizard.completedSteps", contains(1, 2, 3, 4, 5, 6, 7)));
		// A retried submit changes nothing.
		mvc.perform(post(path + "/submit").with(owner)).andExpect(status().isOk())
			.andExpect(jsonPath("$.publicationStatus").value("pending_review"));
		send(patch(path + "/status"), admin, "{\"action\":\"approve\",\"reason\":\"Documents verified.\"}")
			.andExpect(status().isOk()).andExpect(jsonPath("$.publicationStatus").value("approved"));
		mvc.perform(post(path + "/publish").with(admin))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.publicationStatus").value("published"))
			.andExpect(jsonPath("$.publishedAt").exists());

		getAs(path, owner).andExpect(jsonPath("$.statusHistory[*].action",
				contains("created", "submitted", "approved", "published")));
		assertThat(jdbc.queryForObject("""
				SELECT actor_user_id FROM property_project_status_changes
				WHERE property_project_id = ? AND action = 'approved'""", Long.class, id)).isEqualTo(adminId);
	}

	@Test
	void ownersCannotApproveOrPublishTheirOwnProperty() throws Exception {
		completeWizard(id, owner);
		mvc.perform(post(path + "/submit").with(owner)).andExpect(status().isOk());

		for (String action : new String[] { "approve", "reject", "publish", "unpublish", "suspend", "resume" }) {
			send(patch(path + "/status"), owner, "{\"action\":\"" + action + "\",\"reason\":\"r\"}")
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("property_action_forbidden"));
		}
		mvc.perform(post(path + "/publish").with(owner)).andExpect(status().isForbidden());
		send(patch(path + "/legal-status"), owner, "{\"status\":\"approved\"}").andExpect(status().isForbidden());
		send(patch(path + "/status"), owner, "{\"action\":\"publish\",\"publicationStatus\":\"published\"}")
			.andExpect(status().isBadRequest());
		assertThat(column(id, "publication_status")).isEqualTo("pending_review");
		assertThat(column(id, "legal_approval_status")).isEqualTo("pending");
	}

	@Test
	void reviewerNeedsTheMatchingPermission() throws Exception {
		completeWizard(id, owner);
		mvc.perform(post(path + "/submit").with(owner)).andExpect(status().isOk());
		RequestPostProcessor reviewerOnly = as(adminId, with(OWNER_PERMISSIONS, PROPERTY_REVIEW, PROPERTY_VIEW_ANY));

		send(patch(path + "/status"), reviewerOnly, "{\"action\":\"approve\"}").andExpect(status().isOk());
		mvc.perform(post(path + "/publish").with(reviewerOnly)).andExpect(status().isForbidden());
	}

	@Test
	void invalidTransitionsAndMissingReasonsAreRejected() throws Exception {
		send(patch(path + "/status"), admin, "{\"action\":\"approve\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("property_invalid_status_transition"));
		send(patch(path + "/status"), admin, "{\"action\":\"publish\"}").andExpect(status().isConflict());
		send(patch(path + "/status"), admin, "{\"action\":\"launch\"}")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.action").exists());

		completeWizard(id, owner);
		mvc.perform(post(path + "/submit").with(owner)).andExpect(status().isOk());
		send(patch(path + "/status"), admin, "{\"action\":\"reject\"}")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.reason").exists());
		send(patch(path + "/status"), admin, "{\"action\":\"reject\",\"reason\":\"Blurry photos.\"}")
			.andExpect(status().isOk()).andExpect(jsonPath("$.publicationStatus").value("rejected"));
		// The owner sees the reason and can fix and resubmit.
		getAs(path, owner).andExpect(jsonPath("$.statusHistory[-1].reason").value("Blurry photos."));
		mvc.perform(post(path + "/submit").with(owner)).andExpect(status().isOk());
	}

	@Test
	void pendingReviewIsLockedForTheOwnerButNotForAdmins() throws Exception {
		completeWizard(id, owner);
		mvc.perform(post(path + "/submit").with(owner)).andExpect(status().isOk());

		send(patch(path + "/steps/1"), owner, "{\"projectName\":\"Sneaky change\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("property_not_editable"));
		send(patch(path + "/steps/1"), admin, "{\"projectName\":\"Typo fixed\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.publicationStatus").value("pending_review"));
	}

	@Test
	void ownerEditOfPublishedPropertyTakesItOfflineUntilReviewed() throws Exception {
		completeWizard(id, owner);
		mvc.perform(post(path + "/submit").with(owner)).andExpect(status().isOk());
		send(patch(path + "/status"), admin, "{\"action\":\"approve\"}").andExpect(status().isOk());
		mvc.perform(post(path + "/publish").with(admin)).andExpect(status().isOk());

		send(patch(path + "/steps/1"), owner, "{\"projectName\":\"New name\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.publicationStatus").value("draft"))
			.andExpect(jsonPath("$.statusHistory[-1].action").value("reverted_to_draft"));
		mvc.perform(get("/api/v1/public/properties/green-valley-residency")).andExpect(status().isNotFound());
	}

	@Test
	void archiveIsFinal() throws Exception {
		send(patch(path + "/status"), owner, "{\"action\":\"archive\"}")
			.andExpect(status().isOk()).andExpect(jsonPath("$.publicationStatus").value("archived"));

		send(patch(path + "/steps/1"), admin, "{\"projectName\":\"X\"}").andExpect(status().isConflict());
		mvc.perform(post(path + "/submit").with(owner)).andExpect(status().isConflict());
	}

	@Test
	void legalStatusIsChangedOnlyByLegalReviewers() throws Exception {
		send(patch(path + "/legal-status"), admin, "{\"status\":\"rejected\"}")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.reason").exists());
		send(patch(path + "/legal-status"), admin, "{\"status\":\"approved\",\"reason\":\"RERA verified\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.projectInfo.legalApprovalStatus").value("approved"))
			.andExpect(jsonPath("$.publicationStatus").value("draft"))
			.andExpect(jsonPath("$.statusHistory[-1].action").value("legal_status_changed"));
		send(patch(path + "/legal-status"), admin, "{\"status\":\"granted\"}").andExpect(status().isBadRequest());
	}

	@Test
	void staleIfMatchIsRejectedAndVersionAdvances() throws Exception {
		long before = version(id);

		sendIfMatch(patch(path + "/steps/1"), owner, "{\"projectName\":\"First\"}", before)
			.andExpect(status().isOk())
			.andExpect(header().string("ETag", "\"" + (before + 1) + "\""));
		// A second client still holding the old version must not overwrite the first change.
		sendIfMatch(patch(path + "/steps/1"), owner, "{\"projectName\":\"Second\"}", before)
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("property_version_conflict"))
			.andExpect(jsonPath("$.currentVersion").value(before + 1));
		assertThat(column(id, "project_name")).isEqualTo("First");
		// Child changes advance the version too.
		send(put(path + "/amenities"), owner, "{\"amenityIds\":[" + amenityId("lift") + "]}").andExpect(status().isOk());
		assertThat(version(id)).isEqualTo(before + 2);
		sendIfMatch(patch(path + "/steps/1"), owner, "{}", 1).andExpect(status().isConflict());
		send(patch(path + "/steps/1").header("If-Match", "abc"), owner, "{}").andExpect(status().isBadRequest());
	}

	@Test
	void previewContainsEverythingButNoPrivateData() throws Exception {
		completeWizard(id, owner);
		send(put(path + "/nearby-places"), owner, """
				{"places":[{"placeName":"Baner Metro","placeType":"metro_station","distanceKm":0.8}]}""")
			.andExpect(status().isOk());

		getAs(path + "/preview", owner)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.details.projectName").value("Green Valley Residency"))
			.andExpect(jsonPath("$.location.city").value("Pune"))
			.andExpect(jsonPath("$.apartments", hasSize(1)))
			.andExpect(jsonPath("$.projectInfo.projectDescription").exists())
			.andExpect(jsonPath("$.amenities[0].slug").value("swimming-pool"))
			.andExpect(jsonPath("$.media[0].primary").value(true))
			.andExpect(jsonPath("$.media[0].url").value(containsString("/api/v1/properties/" + id + "/media/")))
			.andExpect(jsonPath("$.nearbyPlaces[0].distanceSource").value("manual"))
			.andExpect(jsonPath("$.wizard.readyToSubmit").value(true))
			.andExpect(content().string(not(containsString("projects/"))))
			.andExpect(content().string(not(containsString("filePath"))))
			.andExpect(content().string(not(containsString("idempotency"))))
			.andExpect(content().string(not(containsString("passwordHash"))))
			.andExpect(content().string(not(containsString("subscription"))))
			.andExpect(content().string(not(containsString("owner@example.com"))))
			.andExpect(jsonPath("$.owner").doesNotExist());
	}

	@Test
	void publicListingShowsOnlyPublishedProperties() throws Exception {
		long published = publishedProperty(owner, admin);
		completeWizard(id, owner);
		mvc.perform(post(path + "/submit").with(owner)).andExpect(status().isOk());

		mvc.perform(get("/api/v1/public/properties"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content", hasSize(1)))
			.andExpect(jsonPath("$.content[0].slug").value("green-valley-residency-2"))
			.andExpect(jsonPath("$.content[0].id").value(published))
			.andExpect(jsonPath("$.content[0].startingPrice").isNumber())
			.andExpect(jsonPath("$.content[0].apartmentTypes[0]").value("2bhk"))
			.andExpect(jsonPath("$.content[0].coverUrl")
				.value(containsString("/api/v1/public/properties/green-valley-residency-2/media/")))
			.andExpect(jsonPath("$.content[0].userId").doesNotExist());
		mvc.perform(get("/api/v1/public/properties/green-valley-residency")).andExpect(status().isNotFound());
		String slug = column(published, "slug");
		mvc.perform(get("/api/v1/public/properties/" + slug))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(published))
			.andExpect(jsonPath("$.projectEmail").doesNotExist())
			.andExpect(jsonPath("$.gstNumber").doesNotExist())
			.andExpect(jsonPath("$.media[0].url").value(containsString("/api/v1/public/properties/" + slug + "/media/")));
		mvc.perform(get("/api/v1/public/properties?city=pune&apartmentType=2bhk&maxPrice=8000000"))
			.andExpect(jsonPath("$.content", hasSize(1)));
		mvc.perform(get("/api/v1/public/properties?maxPrice=100")).andExpect(jsonPath("$.content", hasSize(0)));

		mvc.perform(delete(BASE + "/" + published).with(owner)).andExpect(status().isNoContent());
		mvc.perform(get("/api/v1/public/properties")).andExpect(jsonPath("$.content", hasSize(0)));
	}


	@Test
	void publicSearchReturnsCoordinatesAndFiltersByBoundingBox() throws Exception {
		long published = publishedProperty(owner, admin);
		String slug = column(published, "slug");

		mvc.perform(get("/api/v1/public/properties"))
			.andExpect(jsonPath("$.content[0].latitude").value(18.559))
			.andExpect(jsonPath("$.content[0].longitude").value(73.7868));
		mvc.perform(get("/api/v1/public/properties/" + slug))
			.andExpect(jsonPath("$.location.latitude").value(18.559))
			.andExpect(jsonPath("$.location.longitude").value(73.7868));

		// Inside (edges included) and outside the box.
		mvc.perform(get("/api/v1/public/properties?minLat=18.5&maxLat=18.559&minLng=73.7&maxLng=73.8"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(1)));
		mvc.perform(get("/api/v1/public/properties?minLat=19&maxLat=20&minLng=73.7&maxLng=73.8"))
			.andExpect(jsonPath("$.content", hasSize(0)));
		mvc.perform(get("/api/v1/public/properties?minLat=18.5&maxLat=18.6&minLng=74&maxLng=75"))
			.andExpect(jsonPath("$.content", hasSize(0)));

		// Properties without coordinates never match a box but still show without one.
		jdbc.update("UPDATE property_projects SET latitude = NULL, longitude = NULL WHERE id = ?", published);
		mvc.perform(get("/api/v1/public/properties?minLat=-90&maxLat=90&minLng=-180&maxLng=180"))
			.andExpect(jsonPath("$.content", hasSize(0)));
		mvc.perform(get("/api/v1/public/properties"))
			.andExpect(jsonPath("$.content", hasSize(1)))
			.andExpect(jsonPath("$.content[0].latitude").value(nullValue()));
	}

	@Test
	void publicSearchRejectsInvalidBoundingBox() throws Exception {
		// Partial box, reversed edges, out-of-range values and an oversized page.
		mvc.perform(get("/api/v1/public/properties?minLat=18"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.maxLat").exists());
		mvc.perform(get("/api/v1/public/properties?minLat=19&maxLat=18&minLng=73&maxLng=74"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.maxLat").exists());
		mvc.perform(get("/api/v1/public/properties?minLat=18&maxLat=19&minLng=75&maxLng=74"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.maxLng").exists());
		mvc.perform(get("/api/v1/public/properties?minLat=-91&maxLat=19&minLng=73&maxLng=74"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.minLat").exists());
		mvc.perform(get("/api/v1/public/properties?minLat=abc&maxLat=19&minLng=73&maxLng=74"))
			.andExpect(status().isBadRequest());
		mvc.perform(get("/api/v1/public/properties?minLat=18&maxLat=19&minLng=73&maxLng=74&size=5000"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.size").value(100));
	}

}
