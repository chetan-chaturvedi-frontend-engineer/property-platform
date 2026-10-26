package com.propertypro.property_platform.lead.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Request validation, normalization, status rules, filtering, sorting and search of leads. */
class LeadValidationTests extends LeadApiTestSupport {

	private static final String FULL = """
			{"leadName":"  Ravi Kumar ","phone":"+91 98765-43210","alternatePhone":"9123456789",
			 "email":"Ravi@Example.COM","source":"walk_in","status":"interested","priority":"high","purpose":"buy",
			 "propertyType":"independent_house","bhk":"2.5","budgetMin":5000000,"budgetMax":7500000.50,
			 "budgetCurrency":"INR","area":1200,"areaUnit":"sq_ft","preferredLocation":"Whitefield, Marathahalli",
			 "location":"Pune","possession":"within_6_months","moveInDate":"2027-03-01","floorPreference":"5-10",
			 "facing":"north_east","furnishing":"semi_furnished","parking":"four_wheeler",
			 "amenities":["gymnasium","Swimming-Pool","gymnasium"],"loanRequired":true,
			 "additionalNote":"Prefers a corner unit","nextFollowUpAt":"2026-11-01T10:00:00+05:30"}""";

	@Test
	void createsAFullLeadWithNormalizedValues() throws Exception {
		postAs(BASE, alice, FULL)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.leadName").value("Ravi Kumar"))
			.andExpect(jsonPath("$.phone").value("+919876543210"))
			.andExpect(jsonPath("$.alternatePhone").value("+919123456789"))
			.andExpect(jsonPath("$.email").value("ravi@example.com"))
			.andExpect(jsonPath("$.status").value("interested"))
			.andExpect(jsonPath("$.propertyType").value("independent_house"))
			.andExpect(jsonPath("$.budgetMax").value(7500000.50))
			.andExpect(jsonPath("$.areaUnit").value("sq_ft"))
			.andExpect(jsonPath("$.amenities", contains("gymnasium", "swimming-pool")))
			.andExpect(jsonPath("$.loanRequired").value(true))
			.andExpect(jsonPath("$.moveInDate").value("2027-03-01"))
			// Offsets are accepted; times are stored and returned in UTC.
			.andExpect(jsonPath("$.nextFollowUpAt").value("2026-11-01T04:30:00Z"));
	}

	@Test
	void missingRequiredFieldsAreReportedPerField() throws Exception {
		postAs(BASE, alice, "{}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"))
			.andExpect(jsonPath("$.errors.leadName").exists())
			.andExpect(jsonPath("$.errors.phone").exists())
			.andExpect(jsonPath("$.errors.purpose").exists());
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = {
			"\"phone\":\"12345\"                     | phone",
			"\"phone\":\"call me\"                   | phone",
			"\"alternatePhone\":\"abc\"              | alternatePhone",
			"\"email\":\"not-an-email\"              | email",
			"\"status\":\"closed\"                   | status",
			"\"source\":\"tv\"                       | source",
			"\"priority\":\"critical\"               | priority",
			"\"purpose\":\"steal\"                   | purpose",
			"\"propertyType\":\"castle\"             | propertyType",
			"\"bhk\":\"2 BHK\"                       | bhk",
			"\"budgetMin\":-1                        | budgetMin",
			"\"budgetMin\":\"lots\"                  | budgetMin",
			"\"budgetMin\":900,\"budgetMax\":100     | budgetMax",
			"\"budgetMax\":1.234                     | budgetMax",
			"\"budgetCurrency\":\"rupees\"           | budgetCurrency",
			"\"area\":0,\"areaUnit\":\"sq_ft\"       | area",
			"\"area\":100                            | areaUnit",
			"\"areaUnit\":\"sq_yd\"                  | areaUnit",
			"\"moveInDate\":\"2026-13-01\"           | moveInDate",
			"\"moveInDate\":\"next month\"           | moveInDate",
			"\"nextFollowUpAt\":\"2026-11-01 10:00\" | nextFollowUpAt",
			"\"facing\":\"up\"                       | facing",
			"\"amenities\":[\"helipad\"]             | amenities",
			"\"amenities\":\"gymnasium\"             | amenities",
			"\"status\":\"lost\"                     | lostReason",
			"\"leadName\":\"   \"                    | leadName",
			"\"assignedTo\":0                        | assignedTo" })
	void invalidValuesAreRejected(String field, String errorField) throws Exception {
		// Required defaults, except the one under test (JSON keeps the last duplicate key).
		String defaults = Stream.of("\"leadName\":\"Ravi\"", "\"phone\":\"9876543210\"", "\"purpose\":\"buy\"")
			.filter(entry -> !field.startsWith(entry.substring(0, entry.indexOf(':'))))
			.collect(Collectors.joining(", ", ", ", ""));
		postAs(BASE, admin, "{" + field + defaults + "}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors." + errorField).exists());
		assertThat(count("SELECT count(*) FROM leads")).isZero();
	}

	@Test
	void tooLongValuesAreRejected() throws Exception {
		postAs(BASE, alice, LEAD.replace("Ravi Kumar", "x".repeat(151)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.leadName").exists());
		postAs(BASE, alice, LEAD.replace("{", "{\"additionalNote\":\"" + "x".repeat(5001) + "\", "))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.additionalNote").exists());
	}

	@Test
	void partialUpdateKeepsOmittedFieldsAndClearsExplicitNulls() throws Exception {
		long leadId = createLead(alice, FULL);

		patchAs(BASE + "/" + leadId, alice, "{\"email\":null,\"bhk\":\"studio\",\"amenities\":null}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(nullValue()))
			.andExpect(jsonPath("$.bhk").value("studio"))
			.andExpect(jsonPath("$.amenities").isEmpty())
			.andExpect(jsonPath("$.phone").value("+919876543210"))
			.andExpect(jsonPath("$.budgetMin").value(5000000));
		patchAs(BASE + "/" + leadId, alice, "{\"leadName\":null}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.leadName").exists());
		patchAs(BASE + "/" + leadId, alice, "{\"status\":null}").andExpect(status().isBadRequest());
		// Checked against the saved minimum (5,000,000).
		patchAs(BASE + "/" + leadId, alice, "{\"budgetMax\":100}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.budgetMax").value("must not be less than budgetMin"));
		patchAs(BASE + "/" + leadId, alice, "{\"areaUnit\":null}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.areaUnit").exists());
		assertThat(column("leads", leadId, "budget_max")).isEqualTo("7500000.50");
	}

	@Test
	void lostNeedsAReasonAndReopeningClearsIt() throws Exception {
		long leadId = createLead(alice);

		patchAs(BASE + "/" + leadId, alice, "{\"status\":\"lost\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.lostReason").value("is required when status is lost"));
		patchAs(BASE + "/" + leadId, alice, "{\"status\":\"lost\",\"lostReason\":\"Bought elsewhere\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.lostReason").value("Bought elsewhere"));
		patchAs(BASE + "/" + leadId, alice, "{\"status\":\"contacted\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("contacted"))
			.andExpect(jsonPath("$.lostReason").value(nullValue()));
	}

	@Test
	void aConvertedLeadKeepsItsStatus() throws Exception {
		long leadId = createLead(alice);
		patchAs(BASE + "/" + leadId, alice, "{\"status\":\"converted\"}").andExpect(status().isOk());

		patchAs(BASE + "/" + leadId, admin, "{\"status\":\"new\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("lead_invalid_status_transition"));
		// Other fields stay editable.
		patchAs(BASE + "/" + leadId, alice, "{\"status\":\"converted\",\"priority\":\"low\"}")
			.andExpect(status().isOk());
		assertThat(column("leads", leadId, "status")).isEqualTo("converted");
	}

	@Test
	void listsAreFilteredWithinScope() throws Exception {
		createLead(alice, FULL);
		createLead(alice, """
				{"leadName":"Asha Rao","phone":"9000012345","purpose":"rent","status":"new","source":"facebook",
				 "budgetMin":20000,"budgetMax":30000,"preferredLocation":"Baner","email":"asha@example.com"}""");
		createLead(alice, """
				{"leadName":"No Budget","phone":"9000099999","purpose":"buy","priority":"urgent"}""");

		getAs(BASE + "?status=interested", alice).andExpect(jsonPath("$.content[*].leadName", contains("Ravi Kumar")));
		getAs(BASE + "?purpose=rent&source=facebook", alice).andExpect(jsonPath("$.totalElements").value(1));
		getAs(BASE + "?priority=urgent", alice).andExpect(jsonPath("$.content[0].leadName").value("No Budget"));
		getAs(BASE + "?propertyType=independent_house", alice).andExpect(jsonPath("$.totalElements").value(1));
		getAs(BASE + "?preferredLocation=whitefield", alice).andExpect(jsonPath("$.totalElements").value(1));
		// Budget ranges that overlap 25,000 - 6,000,000; leads without a budget never match.
		getAs(BASE + "?budgetMin=25000&budgetMax=6000000", alice).andExpect(jsonPath("$.totalElements").value(2));
		getAs(BASE + "?budgetMin=8000000", alice).andExpect(jsonPath("$.totalElements").value(0));
		getAs(BASE + "?createdFrom=2000-01-01T00:00:00Z&createdTo=2100-01-01T00:00:00Z", alice)
			.andExpect(jsonPath("$.totalElements").value(3));
		getAs(BASE + "?nextFollowUpFrom=2026-11-01T00:00:00Z&nextFollowUpTo=2026-11-02T00:00:00Z", alice)
			.andExpect(jsonPath("$.content[*].leadName", contains("Ravi Kumar")));
	}

	@Test
	void searchMatchesNameEmailAndPhoneDigits() throws Exception {
		createLead(alice, FULL);
		createLead(alice, """
				{"leadName":"Asha Rao","phone":"9000012345","purpose":"rent","email":"asha@example.com"}""");

		getAs(BASE + "?search=ASHA", alice).andExpect(jsonPath("$.content[*].leadName", contains("Asha Rao")));
		getAs(BASE + "?search=ravi@example", alice).andExpect(jsonPath("$.content[*].leadName", contains("Ravi Kumar")));
		getAs(BASE + "?search=98765 432", alice).andExpect(jsonPath("$.content[*].leadName", contains("Ravi Kumar")));
		// The alternate phone counts too.
		getAs(BASE + "?search=91234", alice).andExpect(jsonPath("$.content[*].leadName", contains("Ravi Kumar")));
	}

	@Test
	void searchAndFiltersAreNeverInterpretedAsSql() throws Exception {
		createLead(alice);
		createLead(bob);

		getAs(BASE + "?search=' OR '1'='1", alice).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
		getAs(BASE + "?search=%25", alice).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
		getAs(BASE + "?search=_", alice).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
		getAs(BASE + "?search=x'); DROP TABLE leads; --", alice).andExpect(status().isOk());
		getAs(BASE + "?sort=leadName;DROP TABLE leads", alice).andExpect(status().isBadRequest());
		getAs(BASE + "?status=new' OR 1=1 --", alice).andExpect(status().isBadRequest());
		assertThat(count("SELECT count(*) FROM leads")).isEqualTo(2);
	}

	@Test
	void sortingIsAllowListedAndPagingIsCapped() throws Exception {
		createLead(alice, LEAD.replace("Ravi Kumar", "Charlie"));
		createLead(alice, LEAD.replace("Ravi Kumar", "Bravo"));
		createLead(alice, LEAD.replace("Ravi Kumar", "Alpha"));

		getAs(BASE + "?sort=leadName,asc", alice)
			.andExpect(jsonPath("$.content[*].leadName", contains("Alpha", "Bravo", "Charlie")));
		getAs(BASE + "?sort=leadName,desc&page=1&size=2", alice)
			.andExpect(jsonPath("$.content[*].leadName", contains("Alpha")))
			.andExpect(jsonPath("$.page").value(1))
			.andExpect(jsonPath("$.totalElements").value(3))
			.andExpect(jsonPath("$.totalPages").value(2));
		getAs(BASE + "?sort=phone", alice)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.sort").exists());
		getAs(BASE + "?sort=createdBy.password", alice).andExpect(status().isBadRequest());
		getAs(BASE + "?size=500", alice).andExpect(status().isOk()).andExpect(jsonPath("$.size").value(100));
	}

	@Test
	void invalidFiltersAreRejected() throws Exception {
		getAs(BASE + "?status=closed", alice).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.status").exists());
		getAs(BASE + "?createdFrom=yesterday", alice).andExpect(status().isBadRequest());
		getAs(BASE + "?createdFrom=2026-10-02T00:00:00Z&createdTo=2026-10-01T00:00:00Z", alice)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.createdTo").exists());
		getAs(BASE + "?budgetMin=10&budgetMax=5", alice).andExpect(status().isBadRequest());
		getAs(BASE + "?assignedTo=abc", alice).andExpect(status().isBadRequest());
		getAs(BASE + "?search=" + "x".repeat(101), alice).andExpect(status().isBadRequest());
	}

}
