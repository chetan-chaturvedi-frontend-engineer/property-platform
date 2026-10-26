package com.propertypro.property_platform.property.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Wizard step 3 (apartment configurations), step 5 (amenities) and nearby places. */
class PropertyApartmentTests extends PropertyApiTestSupport {

	private RequestPostProcessor owner;
	private long id;
	private String path;

	@BeforeEach
	void createDraft() throws Exception {
		owner = owner(subscribedOwner("owner@example.com"));
		id = createProperty(owner);
		path = BASE + "/" + id;
	}

	@Test
	void severalLayoutsOfTheSameTypeAreSupported() throws Exception {
		send(post(path + "/apartments"), owner, APARTMENT_2BHK_A)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.apartmentType").value("2bhk"))
			.andExpect(jsonPath("$.currency").value("INR"))
			.andExpect(jsonPath("$.areaUnit").value("sq_ft"))
			.andExpect(jsonPath("$.carParking").value(0))
			.andExpect(jsonPath("$.highlights", contains("Corner unit")))
			.andExpect(jsonPath("$.displayOrder").value(0));
		send(post(path + "/apartments"), owner, APARTMENT_2BHK_B)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.displayOrder").value(1));

		getAs(path + "/apartments", owner)
			.andExpect(jsonPath("$[*].apartmentName", contains("2 BHK Type A", "2 BHK Type B")));
	}

	@Test
	void invalidConfigurationsAreRejected() throws Exception {
		send(post(path + "/apartments"), owner, APARTMENT_2BHK_A.replace("\"areaMax\":1100", "\"areaMax\":900"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.areaMax").value("must not be less than areaMin"));
		send(post(path + "/apartments"), owner, """
				{"apartmentName":"","apartmentType":"5bhk","startingPrice":-1,"bedrooms":-1,"bathrooms":2,
				 "areaMin":0,"areaMax":10,"balconyArea":-5,"areaUnit":"acre","currency":"rupees"}""")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.apartmentName").exists())
			.andExpect(jsonPath("$.errors.apartmentType").exists())
			.andExpect(jsonPath("$.errors.startingPrice").exists())
			.andExpect(jsonPath("$.errors.bedrooms").exists())
			.andExpect(jsonPath("$.errors.areaMin").exists())
			.andExpect(jsonPath("$.errors.balconyArea").exists())
			.andExpect(jsonPath("$.errors.areaUnit").exists())
			.andExpect(jsonPath("$.errors.currency").exists());
		send(post(path + "/apartments"), owner, "{\"apartmentName\":\"X\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.areaMin").exists())
			.andExpect(jsonPath("$.errors.areaMax").exists());
		assertThat(apartmentCount()).isZero();
	}

	@Test
	void syncCreatesUpdatesAndDeletesAtomically() throws Exception {
		String first = send(put(path + "/apartments"), owner,
				"{\"apartments\":[" + APARTMENT_2BHK_A + "," + APARTMENT_2BHK_B + "]}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$", hasSize(2)))
			.andReturn().getResponse().getContentAsString();
		long typeA = Long.parseLong(json(first, "$[0].id"));
		long typeB = Long.parseLong(json(first, "$[1].id"));

		// Keep B (renamed, moved first), drop A, add a 3 BHK.
		send(put(path + "/apartments"), owner, "{\"apartments\":["
				+ APARTMENT_2BHK_B.replaceFirst("\\{", "{\"id\":" + typeB + ",").replace("2 BHK Type B", "2 BHK Premium")
				+ "," + APARTMENT_2BHK_A.replace("2 BHK Type A", "3 BHK").replace("\"2bhk\"", "\"3bhk\"") + "]}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[*].apartmentName", contains("2 BHK Premium", "3 BHK")))
			.andExpect(jsonPath("$[0].id").value(typeB));
		assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM property_apartments WHERE id = ?",
				Boolean.class, typeA)).isTrue();

		// One invalid item rejects the whole set; nothing changes.
		send(put(path + "/apartments"), owner, "{\"apartments\":[" + APARTMENT_2BHK_A + ","
				+ APARTMENT_2BHK_B.replace("\"areaMin\":1000", "\"areaMin\":2000") + "]}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors['apartments[1].areaMax']").exists());
		send(put(path + "/apartments"), owner, "{\"apartments\":["
				+ APARTMENT_2BHK_A.replaceFirst("\\{", "{\"id\":" + typeB + ",") + ","
				+ APARTMENT_2BHK_B.replaceFirst("\\{", "{\"id\":" + typeB + ",") + "]}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors['apartments[1].id']").value("is listed more than once"));
		assertThat(apartmentCount()).isEqualTo(2);
	}

	@Test
	void updateGetAndDeleteOneConfiguration() throws Exception {
		long apartmentId = Long.parseLong(json(send(post(path + "/apartments"), owner, APARTMENT_2BHK_A)
			.andReturn().getResponse().getContentAsString(), "$.id"));

		send(put(path + "/apartments/" + apartmentId), owner, APARTMENT_2BHK_B)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.apartmentName").value("2 BHK Type B"))
			.andExpect(jsonPath("$.carpetArea").doesNotExist())
			.andExpect(jsonPath("$.highlights", hasSize(0)));
		getAs(path + "/apartments/" + apartmentId, owner).andExpect(jsonPath("$.areaMin").value(1000));
		mvc.perform(delete(path + "/apartments/" + apartmentId).with(owner)).andExpect(status().isNoContent());
		getAs(path + "/apartments/" + apartmentId, owner).andExpect(status().isNotFound());
		getAs(path + "/wizard", owner).andExpect(jsonPath("$.steps[2].missing", contains("apartments")));
	}

	@Test
	void apartmentAmenitiesAndMediaBelongToTheApartment() throws Exception {
		long apartmentId = Long.parseLong(json(send(post(path + "/apartments"), owner, APARTMENT_2BHK_A)
			.andReturn().getResponse().getContentAsString(), "$.id"));
		String apartmentPath = path + "/apartments/" + apartmentId;

		send(put(apartmentPath + "/amenities"), owner, "{\"amenityIds\":[" + amenityId("covered-parking") + "]}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[*].slug", contains("covered-parking")));
		uploadApartment(apartmentPath, "floor_plan_image", "plan-1.png", PNG).andExpect(status().isCreated())
			.andExpect(jsonPath("$.primary").value(true));
		uploadApartment(apartmentPath, "floor_plan_image", "plan-2.png", PNG).andExpect(status().isCreated())
			.andExpect(jsonPath("$.primary").value(false));
		uploadApartment(apartmentPath, "plan_pdf", "plan.pdf", PDF).andExpect(status().isCreated())
			.andExpect(jsonPath("$.mimeType").value("application/pdf"));
		uploadApartment(apartmentPath, "plan_pdf", "plan2.pdf", PDF).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("property_media_limit_reached"));
		uploadApartment(apartmentPath, "floor_plan_image", "plan.pdf", PDF).andExpect(status().isBadRequest());

		getAs(apartmentPath, owner)
			.andExpect(jsonPath("$.amenities[*].slug", contains("covered-parking")))
			.andExpect(jsonPath("$.media", hasSize(3)));
		assertThat(jdbc.queryForObject("""
				SELECT count(*) FROM property_apartment_media m JOIN property_apartments a ON a.id = m.property_apartment_id
				WHERE a.property_project_id = ? AND m.file_path LIKE ?""", Integer.class, id,
				"projects/" + id + "/apartments/" + apartmentId + "/%")).isEqualTo(3);
		// The project's own amenities are separate.
		getAs(path + "/amenities", owner).andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void amenityIdsMustBeActiveAndUnique() throws Exception {
		long pool = amenityId("swimming-pool");
		long gym = amenityId("gymnasium");
		jdbc.update("UPDATE property_amenities SET is_active = false WHERE slug = 'lift'");
		try {
			send(put(path + "/amenities"), owner, "{\"amenityIds\":[" + pool + "," + gym + "]}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[*].slug", contains("gymnasium", "swimming-pool")));

			for (String ids : new String[] { pool + "," + pool, pool + ",999999", String.valueOf(amenityId("lift")),
					"0", "\"abc\"" }) {
				send(put(path + "/amenities"), owner, "{\"amenityIds\":[" + ids + "]}")
					.andExpect(status().isBadRequest());
			}
			// Failed requests changed nothing; a valid one replaces the set.
			getAs(path + "/amenities", owner).andExpect(jsonPath("$", hasSize(2)));
			send(put(path + "/amenities"), owner, "{\"amenityIds\":[" + gym + "]}")
				.andExpect(jsonPath("$[*].slug", contains("gymnasium")));
			getAs("/api/v1/amenities", owner)
				.andExpect(jsonPath("$", hasSize(11)))
				.andExpect(jsonPath("$[?(@.slug == 'lift')]", hasSize(0)));
		}
		finally {
			jdbc.update("UPDATE property_amenities SET is_active = true WHERE slug = 'lift'");
		}
	}

	@Test
	void amenityCatalogCannotBeChangedThroughPropertyEndpoints() throws Exception {
		send(put(path + "/amenities"), owner, "{\"amenityIds\":[],\"amenities\":[{\"name\":\"Helipad\"}]}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.amenities").value("is not allowed"));
		send(post("/api/v1/amenities"), owner, "{\"name\":\"Helipad\"}").andExpect(status().isMethodNotAllowed());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM property_amenities", Integer.class)).isEqualTo(12);
	}

	@Test
	void nearbyPlacesAreReplacedAndValidated() throws Exception {
		send(put(path + "/nearby-places"), owner, """
				{"places":[{"placeName":"City Hospital","placeType":"hospital","distanceKm":2.5,
				            "latitude":18.56,"longitude":73.78},
				           {"placeName":"Baner Metro","placeType":"metro_station","distanceKm":0.8}]}""")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[*].placeName", contains("Baner Metro", "City Hospital")))
			.andExpect(jsonPath("$[0].distanceSource").value("manual"));
		send(put(path + "/nearby-places"), owner, """
				{"places":[{"placeName":"","placeType":"castle","distanceKm":-1,"latitude":95}]}""")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors['places[0].placeName']").exists())
			.andExpect(jsonPath("$.errors['places[0].placeType']").exists())
			.andExpect(jsonPath("$.errors['places[0].distanceKm']").exists())
			.andExpect(jsonPath("$.errors['places[0].latitude']").exists());
		send(put(path + "/nearby-places"), owner,
				"{\"places\":[{\"placeName\":\"School\",\"placeType\":\"school\",\"distanceKm\":1,\"latitude\":18.5}]}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors['places[0].longitude']").exists());
		getAs(path + "/nearby-places", owner).andExpect(jsonPath("$", hasSize(2)));
		send(put(path + "/nearby-places"), owner, "{\"places\":[]}").andExpect(jsonPath("$", hasSize(0)));
	}

	private org.springframework.test.web.servlet.ResultActions uploadApartment(String apartmentPath, String mediaType,
			String filename, byte[] content) throws Exception {
		return mvc.perform(multipart(apartmentPath + "/media")
			.file(new MockMultipartFile("file", filename, "application/octet-stream", content))
			.param("mediaType", mediaType).with(owner));
	}

	private int apartmentCount() {
		return jdbc.queryForObject("SELECT count(*) FROM property_apartments WHERE deleted_at IS NULL", Integer.class);
	}

}
