package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

// Real commits from two threads, so this class manages its own transactions and cleans up after itself.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(ProjectSlugGenerator.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ProjectSlugConcurrencyTests {

	private static final String EMAIL = "slug-race@example.com";

	@Autowired
	private ProjectSlugGenerator slugGenerator;

	@Autowired
	private PropertyProjectRepository projectRepository;

	@Autowired
	private TransactionTemplate transactionTemplate;

	@Autowired
	private JdbcTemplate jdbc;

	private Long ownerId;

	@BeforeEach
	void createOwner() {
		cleanUp();
		ownerId = jdbc.queryForObject(
				"INSERT INTO users (email, password_hash, full_name) VALUES (?, 'hash', 'Owner') RETURNING id",
				Long.class, EMAIL);
	}

	@AfterEach
	void cleanUp() {
		jdbc.update("DELETE FROM property_projects WHERE user_id IN (SELECT id FROM users WHERE email = ?)", EMAIL);
		jdbc.update("DELETE FROM users WHERE email = ?", EMAIL);
	}

	@Test
	void concurrentCreationsWithSameNameGetDistinctSlugs() throws Exception {
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(2);
		try {
			List<Future<String>> results = List.of(executor.submit(() -> create(start)),
					executor.submit(() -> create(start)));
			start.countDown();

			assertThat(List.of(results.get(0).get(30, TimeUnit.SECONDS), results.get(1).get(30, TimeUnit.SECONDS)))
					.containsExactlyInAnyOrder("skyline-towers-mumbai", "skyline-towers-mumbai-2");
		}
		finally {
			executor.shutdownNow();
		}
	}

	private String create(CountDownLatch start) throws InterruptedException {
		start.await();
		return transactionTemplate.execute(status -> {
			String slug = slugGenerator.generate("Skyline Towers", "Mumbai");
			// Widen the race window: without the lock both threads would pick the same free slug.
			sleep();
			PropertyProject project = new PropertyProject(ownerId, slug);
			project.setPropertyType(PropertyType.APARTMENT);
			project.setProjectName("Skyline Towers");
			project.setBuilderCompanyName("Skyline Builders");
			project.setProjectEmail("sales@skyline.example.com");
			project.setProjectPhone("+912212345678");
			project.setProjectAddress("Andheri East");
			project.setCity("Mumbai");
			project.setLocality("Andheri");
			project.setPincode("400069");
			project.setState("Maharashtra");
			projectRepository.saveAndFlush(project);
			return slug;
		});
	}

	private static void sleep() {
		try {
			Thread.sleep(300);
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
		}
	}

}
