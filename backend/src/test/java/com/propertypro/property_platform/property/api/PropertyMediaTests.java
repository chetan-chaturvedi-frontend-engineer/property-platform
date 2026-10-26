package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.media.config.MediaProperties;
import com.propertypro.property_platform.media.service.MediaFileType;
import com.propertypro.property_platform.media.service.MediaUploadService;
import com.propertypro.property_platform.media.service.StoredMedia;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.EnumSet;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Wizard step 6: upload validation, storage consistency, ordering, cover photo and download access. */
class PropertyMediaTests extends PropertyApiTestSupport {

	@Autowired
	private MediaProperties mediaProperties;

	@Autowired
	private MediaUploadService uploadService;

	@Autowired
	private TransactionTemplate transactionTemplate;

	private long ownerId;
	private RequestPostProcessor owner;
	private long id;
	private String path;

	@BeforeEach
	void createDraft() throws Exception {
		ownerId = subscribedOwner("owner@example.com");
		owner = owner(ownerId);
		id = createProperty(owner);
		path = BASE + "/" + id;
	}

	@Test
	void photosAreStoredPrivatelyAndFirstBecomesCover() throws Exception {
		String body = upload(id, owner, "photo", "IMG 001.JPG", JPEG, "title", "Front view")
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.mimeType").value("image/jpeg"))
			.andExpect(jsonPath("$.primary").value(true))
			.andExpect(jsonPath("$.originalFilename").value("IMG 001.JPG"))
			.andExpect(jsonPath("$.title").value("Front view"))
			.andExpect(jsonPath("$.filePath").doesNotExist())
			.andReturn().getResponse().getContentAsString();
		upload(id, owner, "photo", "b.png", PNG).andExpect(jsonPath("$.primary").value(false));

		String key = jdbc.queryForObject("SELECT file_path FROM property_project_media WHERE id = ?", String.class,
				Long.parseLong(json(body, "$.id")));
		assertThat(key).matches("projects/" + id + "/[0-9a-f-]{36}\\.jpg");
		assertThat(Files.exists(stored(key))).isTrue();
		mvc.perform(get(json(body, "$.url")).with(owner))
			.andExpect(status().isOk())
			.andExpect(header().string("Content-Type", "image/jpeg"))
			.andExpect(header().string("X-Content-Type-Options", "nosniff"))
			.andExpect(content().bytes(JPEG));
	}

	@Test
	void spoofedAndUnsupportedFilesAreRejected() throws Exception {
		upload(id, owner, "photo", "photo.jpg", HTML).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.file").exists());
		upload(id, owner, "photo", "photo.jpg", PNG).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.file").value("file extension does not match its content"));
		upload(id, owner, "photo", "doc.pdf", PDF).andExpect(status().isBadRequest());
		upload(id, owner, "brochure", "brochure.pdf.jpg", JPEG).andExpect(status().isBadRequest());
		upload(id, owner, "photo", "../../etc/passwd.jpg", JPEG).andExpect(status().isCreated())
			.andExpect(jsonPath("$.originalFilename").value("passwd.jpg"));
		upload(id, owner, "hologram", "a.jpg", JPEG).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.mediaType").exists());
		upload(id, owner, "photo", "empty.jpg", new byte[0]).andExpect(status().isBadRequest());
		assertThat(mediaCount()).isEqualTo(1);
	}

	@Test
	void oversizedFilesAreRejectedWithoutBeingStored() throws Exception {
		byte[] big = new byte[(int) mediaProperties.maxImageSize().toBytes() + 1];
		System.arraycopy(JPEG, 0, big, 0, JPEG.length);
		long filesBefore = storedFileCount();

		upload(id, owner, "photo", "big.jpg", big)
			.andExpect(status().isContentTooLarge())
			.andExpect(jsonPath("$.code").value("file_too_large"));
		assertThat(mediaCount()).isZero();
		assertThat(storedFileCount()).isEqualTo(filesBefore);
	}

	@Test
	void countLimitsPerTypeAreEnforced() throws Exception {
		upload(id, owner, "brochure", "brochure.pdf", PDF).andExpect(status().isCreated());
		upload(id, owner, "brochure", "brochure2.pdf", PDF).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("property_media_limit_reached"));
		for (int i = 0; i < 3; i++) {
			upload(id, owner, "photo", "p" + i + ".jpg", JPEG).andExpect(status().isCreated());
		}
		upload(id, owner, "photo", "p4.jpg", JPEG).andExpect(status().isConflict());
	}

	@Test
	void externalVideosMustUseAnAllowedHttpsHost() throws Exception {
		send(post(path + "/media"), owner, "{\"mediaType\":\"video\",\"url\":\"https://www.youtube.com/watch?v=abc\"}")
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.external").value(true))
			.andExpect(jsonPath("$.url").value("https://www.youtube.com/watch?v=abc"));
		for (String url : new String[] { "http://youtube.com/watch?v=1", "https://evil.com/v.mp4",
				"javascript:alert(1)", "https://youtube.com.evil.com/x", "file:///etc/passwd", "https://youtube.com:8443/x" }) {
			send(post(path + "/media"), owner, "{\"mediaType\":\"video\",\"url\":\"" + url + "\"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.url").exists());
		}
		send(post(path + "/media"), owner, "{\"mediaType\":\"photo\",\"url\":\"https://youtube.com/x\"}")
			.andExpect(status().isBadRequest());
		send(post(path + "/media"), owner,
				"{\"mediaType\":\"video\",\"url\":\"https://vimeo.com/1\",\"filePath\":\"projects/9/x.jpg\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.filePath").value("is not allowed"));
		assertThat(mediaCount()).isEqualTo(1);
	}

	@Test
	void reorderCoverChangeAndDelete() throws Exception {
		long a = mediaId(upload(id, owner, "photo", "a.jpg", JPEG));
		long b = mediaId(upload(id, owner, "photo", "b.jpg", JPEG));
		long c = mediaId(upload(id, owner, "brochure", "c.pdf", PDF));

		send(put(path + "/media/order"), owner, "{\"mediaIds\":[" + c + "," + a + "," + b + "]}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[*].id", contains((int) c, (int) a, (int) b)));
		send(put(path + "/media/order"), owner, "{\"mediaIds\":[" + a + "," + b + "]}")
			.andExpect(status().isBadRequest());
		send(patch(path + "/media/" + b), owner, "{\"primary\":true}")
			.andExpect(status().isOk()).andExpect(jsonPath("$.primary").value(true));
		send(patch(path + "/media/" + c), owner, "{\"primary\":true}").andExpect(status().isBadRequest());
		getAs(path + "/media", owner).andExpect(jsonPath("$[?(@.primary == true)].id", contains((int) b)));

		String key = jdbc.queryForObject("SELECT file_path FROM property_project_media WHERE id = ?", String.class, b);
		mvc.perform(delete(path + "/media/" + b).with(owner)).andExpect(status().isNoContent());
		assertThat(Files.exists(stored(key))).isFalse();
		// The remaining photo becomes the cover.
		getAs(path + "/media", owner).andExpect(jsonPath("$", hasSize(2)))
			.andExpect(jsonPath("$[?(@.primary == true)].id", contains((int) a)));
	}

	@Test
	void othersCannotDownloadOrChangeMediaOfThisProperty() throws Exception {
		long mediaId = mediaId(upload(id, owner, "photo", "a.jpg", JPEG));
		RequestPostProcessor stranger = owner(subscribedOwner("stranger@example.com"));

		mvc.perform(get(path + "/media/" + mediaId + "/content").with(stranger)).andExpect(status().isNotFound());
		mvc.perform(delete(path + "/media/" + mediaId).with(stranger)).andExpect(status().isNotFound());
		send(put(path + "/media/order"), stranger, "{\"mediaIds\":[" + mediaId + "]}").andExpect(status().isNotFound());
		// Not public while unpublished.
		mvc.perform(get("/api/v1/public/properties/green-valley-residency/media/" + mediaId + "/content"))
			.andExpect(status().isNotFound());
		assertThat(mediaCount()).isEqualTo(1);
	}

	@Test
	void publishedMediaIsPubliclyDownloadable() throws Exception {
		long adminId = insertUser("admin@example.com");
		long published = publishedProperty(owner, admin(adminId));
		String slug = column(published, "slug");
		long mediaId = jdbc.queryForObject("SELECT id FROM property_project_media WHERE property_project_id = ?",
				Long.class, published);

		mvc.perform(get("/api/v1/public/properties/" + slug + "/media/" + mediaId + "/content"))
			.andExpect(status().isOk())
			.andExpect(content().bytes(JPEG));
		// A media id of another property is not served under this slug.
		long otherMedia = mediaId(upload(id, owner, "photo", "x.jpg", JPEG));
		mvc.perform(get("/api/v1/public/properties/" + slug + "/media/" + otherMedia + "/content"))
			.andExpect(status().isNotFound());
	}

	@Test
	void uploadIsRemovedFromStorageWhenItsTransactionFails() {
		AtomicReference<StoredMedia> stored = new AtomicReference<>();

		assertThatThrownBy(() -> transactionTemplate.executeWithoutResult(status -> {
			stored.set(uploadService.store(new MockMultipartFile("file", "a.jpg", "image/jpeg", JPEG),
					EnumSet.of(MediaFileType.JPEG), "projects/test", "file"));
			assertThat(Files.exists(stored(stored.get().storageKey()))).isTrue();
			throw new IllegalStateException("database insert failed");
		})).isInstanceOf(IllegalStateException.class);

		assertThat(Files.exists(stored(stored.get().storageKey()))).isFalse();
	}

	@Test
	void deletingAPropertyKeepsItsFiles() throws Exception {
		long mediaId = mediaId(upload(id, owner, "photo", "a.jpg", JPEG));
		String key = jdbc.queryForObject("SELECT file_path FROM property_project_media WHERE id = ?", String.class,
				mediaId);

		mvc.perform(delete(path).with(owner)).andExpect(status().isNoContent());

		assertThat(Files.exists(stored(key))).isTrue();
		assertThat(mediaCount()).isEqualTo(1);
	}

	private long mediaId(org.springframework.test.web.servlet.ResultActions upload) throws Exception {
		return Long.parseLong(json(upload.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(),
				"$.id"));
	}

	private Path stored(String key) {
		return mediaProperties.storageRoot().resolve(key);
	}

	private long storedFileCount() throws Exception {
		Path root = mediaProperties.storageRoot();
		if (!Files.exists(root)) {
			return 0;
		}
		try (var files = Files.walk(root)) {
			return files.filter(Files::isRegularFile).count();
		}
	}

	private int mediaCount() {
		return jdbc.queryForObject("SELECT count(*) FROM property_project_media", Integer.class);
	}

}
