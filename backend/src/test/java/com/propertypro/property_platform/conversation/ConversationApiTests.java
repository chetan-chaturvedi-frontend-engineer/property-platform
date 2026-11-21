package com.propertypro.property_platform.conversation;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Enquiry chat between a buyer and a property owner, through real logins and the seeded user role. */
class ConversationApiTests extends AbstractIntegrationTest {

	private static final String CONVERSATIONS = "/api/v1/conversations";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private long ownerId;
	private long aliceId;
	private String owner;
	private String alice;
	private String carol;
	private long published;
	private long draft;
	private long ownersSecondProperty;

	@BeforeEach
	void setUp() throws Exception {
		originalRoles = jdbc.queryForList("SELECT slug, permissions::text AS permissions FROM roles WHERE slug = 'user'");
		ownerId = account("owner@example.com", "Olivia Owner");
		aliceId = account("alice@example.com", "Alice Buyer");
		account("carol@example.com", "Carol Other");
		owner = signIn("owner@example.com");
		alice = signIn("alice@example.com");
		carol = signIn("carol@example.com");
		published = property("green-acres", "published");
		draft = property("grey-draft", "draft");
		ownersSecondProperty = property("blue-hills", "published");
	}

	@AfterEach
	void restoreRoles() {
		originalRoles.forEach(role -> jdbc.update("UPDATE roles SET permissions = ?::jsonb WHERE slug = ?",
				role.get("permissions"), role.get("slug")));
		jdbc.execute("TRUNCATE system_logs, users RESTART IDENTITY CASCADE");
	}

	@Test
	void unauthenticatedRequestsAreRejected() throws Exception {
		mvc.perform(get(CONVERSATIONS)).andExpect(status().isUnauthorized());
		mvc.perform(get(CONVERSATIONS + "/unread-count")).andExpect(status().isUnauthorized());
		mvc.perform(post(CONVERSATIONS).contentType(MediaType.APPLICATION_JSON).content(start(published, "Hi")))
			.andExpect(status().isUnauthorized());
		mvc.perform(get(CONVERSATIONS + "/1/messages")).andExpect(status().isUnauthorized());
		mvc.perform(post(CONVERSATIONS + "/1/read")).andExpect(status().isUnauthorized());
	}

	@Test
	void aBuyerStartsAConversationAndTheOwnerSeesItUnread() throws Exception {
		send(post(CONVERSATIONS), alice, start(published, "  Is it still available? "))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.role").value("buyer"))
			.andExpect(jsonPath("$.property.projectName").value("green-acres"))
			.andExpect(jsonPath("$.otherParty.fullName").value("Olivia Owner"))
			.andExpect(jsonPath("$.otherParty.email").doesNotExist())
			.andExpect(jsonPath("$.lastMessage.body").value("Is it still available?"))
			.andExpect(jsonPath("$.lastMessage.mine").value(true))
			.andExpect(jsonPath("$.unread").value(0));

		getWithToken(CONVERSATIONS, owner)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content", hasSize(1)))
			.andExpect(jsonPath("$.content[0].role").value("seller"))
			.andExpect(jsonPath("$.content[0].otherParty.fullName").value("Alice Buyer"))
			.andExpect(jsonPath("$.content[0].lastMessage.mine").value(false))
			.andExpect(jsonPath("$.content[0].unread").value(1));
		getWithToken(CONVERSATIONS + "/unread-count", owner).andExpect(jsonPath("$.unread").value(1));
		getWithToken(CONVERSATIONS + "/unread-count", alice).andExpect(jsonPath("$.unread").value(0));
	}

	@Test
	void askingAgainAboutTheSamePropertyReusesTheConversation() throws Exception {
		long first = idOf(send(post(CONVERSATIONS), alice, start(published, "First")).andExpect(status().isCreated()));
		long second = idOf(send(post(CONVERSATIONS), alice, start(published, "Second")).andExpect(status().isOk()));

		assertThat(second).isEqualTo(first);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM conversations", Integer.class)).isOne();
		getWithToken(CONVERSATIONS + "/" + first + "/messages", alice).andExpect(jsonPath("$", hasSize(2)));
		send(post(CONVERSATIONS), alice, start(ownersSecondProperty, "Other property")).andExpect(status().isCreated());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM conversations", Integer.class)).isEqualTo(2);
	}

	@Test
	void onlyPublishedPropertiesThatAreNotYoursCanBeAskedAbout() throws Exception {
		send(post(CONVERSATIONS), alice, start(draft, "Hi")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.propertyId").exists());
		send(post(CONVERSATIONS), alice, start(99_999, "Hi")).andExpect(status().isBadRequest());
		send(post(CONVERSATIONS), owner, start(published, "Hi me")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.propertyId").exists());
		send(post(CONVERSATIONS), alice, start(published, "  ")).andExpect(status().isBadRequest());
		send(post(CONVERSATIONS), alice, "{\"propertyId\": %d, \"message\": \"Hi\", \"sellerId\": 1}".formatted(published))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.sellerId").exists());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM conversations", Integer.class)).isZero();
	}

	@Test
	void messagesAreOrderedPerViewerAndPagedByCursor() throws Exception {
		long conversation = idOf(send(post(CONVERSATIONS), alice, start(published, "m1")));
		send(post(CONVERSATIONS + "/" + conversation + "/messages"), owner, "{\"body\": \"m2\"}")
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.mine").value(true));
		send(post(CONVERSATIONS + "/" + conversation + "/messages"), alice, "{\"body\": \"m3\"}").andExpect(status().isCreated());

		getWithToken(CONVERSATIONS + "/" + conversation + "/messages", alice)
			.andExpect(jsonPath("$[*].body", contains("m1", "m2", "m3")))
			.andExpect(jsonPath("$[*].mine", contains(true, false, true)))
			.andExpect(jsonPath("$[0].senderId").doesNotExist());
		getWithToken(CONVERSATIONS + "/" + conversation + "/messages", owner)
			.andExpect(jsonPath("$[*].mine", contains(false, true, false)));

		long m2 = jdbc.queryForObject("SELECT id FROM messages WHERE body = 'm2'", Long.class);
		getWithToken(CONVERSATIONS + "/" + conversation + "/messages?after=" + m2, alice)
			.andExpect(jsonPath("$[*].body", contains("m3")));
		getWithToken(CONVERSATIONS + "/" + conversation + "/messages?before=" + m2, alice)
			.andExpect(jsonPath("$[*].body", contains("m1")));
		getWithToken(CONVERSATIONS + "/" + conversation + "/messages?size=2", alice)
			.andExpect(jsonPath("$[*].body", contains("m2", "m3")));
		getWithToken(CONVERSATIONS + "/" + conversation + "/messages?after=0", alice).andExpect(status().isBadRequest());
	}

	@Test
	void unreadCountsFollowTheReadMarker() throws Exception {
		long conversation = idOf(send(post(CONVERSATIONS), alice, start(published, "m1")));
		send(post(CONVERSATIONS + "/" + conversation + "/messages"), alice, "{\"body\": \"m2\"}");

		getWithToken(CONVERSATIONS, owner).andExpect(jsonPath("$.content[0].unread").value(2));
		send(post(CONVERSATIONS + "/" + conversation + "/read"), owner, "").andExpect(status().isNoContent());
		send(post(CONVERSATIONS + "/" + conversation + "/read"), owner, "").andExpect(status().isNoContent());
		getWithToken(CONVERSATIONS, owner).andExpect(jsonPath("$.content[0].unread").value(0));
		getWithToken(CONVERSATIONS + "/unread-count", owner).andExpect(jsonPath("$.unread").value(0));

		send(post(CONVERSATIONS + "/" + conversation + "/messages"), owner, "{\"body\": \"reply\"}");
		getWithToken(CONVERSATIONS, alice).andExpect(jsonPath("$.content[0].unread").value(1));
		getWithToken(CONVERSATIONS, owner).andExpect(jsonPath("$.content[0].unread").value(0));
	}

	@Test
	void outsidersNeverSeeOrWriteToAConversation() throws Exception {
		long conversation = idOf(send(post(CONVERSATIONS), alice, start(published, "Private")));

		getWithToken(CONVERSATIONS, carol).andExpect(jsonPath("$.content", hasSize(0)));
		getWithToken(CONVERSATIONS + "/" + conversation + "/messages", carol).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("conversation_not_found"));
		send(post(CONVERSATIONS + "/" + conversation + "/messages"), carol, "{\"body\": \"intruder\"}")
			.andExpect(status().isNotFound());
		send(post(CONVERSATIONS + "/" + conversation + "/read"), carol, "").andExpect(status().isNotFound());
		getWithToken(CONVERSATIONS + "/0/messages", alice).andExpect(status().isBadRequest());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM messages", Integer.class)).isOne();
	}

	@Test
	void theRecipientIsNotifiedOncePerUnreadStretch() throws Exception {
		long conversation = idOf(send(post(CONVERSATIONS), alice, start(published, "m1")));
		send(post(CONVERSATIONS + "/" + conversation + "/messages"), alice, "{\"body\": \"m2\"}");

		assertThat(notifications(ownerId)).isOne();
		getWithToken("/api/v1/notifications", owner)
			.andExpect(jsonPath("$.content[0].type").value("new_message"))
			.andExpect(jsonPath("$.content[0].title").value("New message"))
			.andExpect(jsonPath("$.content[0].body").value("Alice Buyer (green-acres): m1"))
			.andExpect(jsonPath("$.content[0].data.conversationId").value(conversation));

		send(post(CONVERSATIONS + "/" + conversation + "/read"), owner, "");
		send(post(CONVERSATIONS + "/" + conversation + "/messages"), alice, "{\"body\": \"m3\"}");
		assertThat(notifications(ownerId)).isEqualTo(2);
		assertThat(notifications(aliceId)).isZero();
	}

	@Test
	void missingPermissionsAreForbidden() throws Exception {
		long conversation = idOf(send(post(CONVERSATIONS), alice, start(published, "Hi")));
		jdbc.update("UPDATE roles SET permissions = permissions - 'conversation' - 'message' WHERE slug = 'user'");

		getWithToken(CONVERSATIONS, alice).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("conversation_action_forbidden"));
		getWithToken(CONVERSATIONS + "/unread-count", alice).andExpect(status().isForbidden());
		getWithToken(CONVERSATIONS + "/" + conversation + "/messages", alice).andExpect(status().isForbidden());
		send(post(CONVERSATIONS), alice, start(published, "again")).andExpect(status().isForbidden());
		send(post(CONVERSATIONS + "/" + conversation + "/messages"), alice, "{\"body\": \"x\"}")
			.andExpect(status().isForbidden());
		send(post(CONVERSATIONS + "/" + conversation + "/read"), alice, "").andExpect(status().isForbidden());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM messages", Integer.class)).isOne();
	}

	private static String start(long propertyId, String message) {
		return "{\"propertyId\": %d, \"message\": \"%s\"}".formatted(propertyId, message);
	}

	private long idOf(ResultActions result) throws Exception {
		return Long.parseLong(json(result.andReturn().getResponse().getContentAsString(), "$.id"));
	}

	private ResultActions send(MockHttpServletRequestBuilder request, String token, String body) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private long account(String email, String fullName) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, ?, 'active', 'user', now()) RETURNING id""", Long.class, email,
				passwordEncoder.encode(PASSWORD), fullName);
	}

	private String signIn(String email) throws Exception {
		return accessToken(postJson("/api/v1/auth/login",
				"{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD)));
	}

	private long property(String slug, String publicationStatus) {
		return jdbc.queryForObject("""
				INSERT INTO property_projects (user_id, slug, property_type, project_name, builder_company_name,
					project_email, project_phone, city, publication_status, published_at)
				VALUES (?, ?, 'apartment', ?, 'Builder', 'sales@example.com', '+919999999999', 'Pune', ?,
					CASE WHEN ? = 'published' THEN now() END) RETURNING id""", Long.class, ownerId, slug, slug,
				publicationStatus, publicationStatus);
	}

	private int notifications(long userId) {
		return jdbc.queryForObject("SELECT count(*) FROM notifications WHERE user_id = ?", Integer.class, userId);
	}

}
