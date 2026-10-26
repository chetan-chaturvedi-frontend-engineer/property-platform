package com.propertypro.property_platform.property.api;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Parallel HTTP requests: quota, slugs, idempotency and status transitions stay consistent. */
class PropertyConcurrencyTests extends PropertyApiTestSupport {

	private static final int THREADS = 6;

	@Test
	void parallelCreationsNeverExceedTheLimit() throws Exception {
		long userId = insertUser("user@example.com");
		subscribe(userId, 2);

		List<MvcResult> results = inParallel(() -> mvc.perform(json(post(BASE), owner(userId), DETAILS)).andReturn());

		assertThat(results.stream().filter(r -> r.getResponse().getStatus() == 201)).hasSize(2);
		assertThat(results.stream().filter(r -> r.getResponse().getStatus() == 403)).hasSize(THREADS - 2);
		assertThat(count("SELECT count(*) FROM property_projects")).isEqualTo(2);
	}

	@Test
	void parallelCreationsWithTheSameNameGetDistinctSlugs() throws Exception {
		long adminId = insertUser("admin@example.com");

		inParallel(() -> mvc.perform(json(post(BASE), admin(adminId), DETAILS)).andReturn());

		assertThat(count("SELECT count(*) FROM property_projects")).isEqualTo(THREADS);
		assertThat(count("SELECT count(DISTINCT slug) FROM property_projects")).isEqualTo(THREADS);
	}

	@Test
	void parallelRetriesWithOneIdempotencyKeyCreateOneProperty() throws Exception {
		long userId = subscribedOwner("user@example.com");

		List<MvcResult> results = inParallel(() -> mvc.perform(json(post(BASE).header("Idempotency-Key", "same-key-123"),
				owner(userId), DETAILS)).andReturn());

		assertThat(results.stream().filter(r -> r.getResponse().getStatus() == 201)).hasSize(1);
		assertThat(results.stream().filter(r -> r.getResponse().getStatus() == 200)).hasSize(THREADS - 1);
		assertThat(count("SELECT count(*) FROM property_projects")).isEqualTo(1);
	}

	@Test
	void parallelReviewDecisionsApplyOnce() throws Exception {
		RequestPostProcessor owner = owner(subscribedOwner("owner@example.com"));
		RequestPostProcessor admin = admin(insertUser("admin@example.com"));
		long id = createProperty(owner);
		completeWizard(id, owner);
		mvc.perform(post(BASE + "/" + id + "/submit").with(owner)).andReturn();

		inParallel(() -> mvc.perform(json(patch(BASE + "/" + id + "/status"), admin,
				"{\"action\":\"reject\",\"reason\":\"Incomplete documents\"}")).andReturn());

		assertThat(column(id, "publication_status")).isEqualTo("rejected");
		assertThat(count("SELECT count(*) FROM property_project_status_changes WHERE action = 'rejected'")).isEqualTo(1);
	}

	private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, RequestPostProcessor who,
			String body) {
		return request.with(who).contentType("application/json").content(body);
	}

	private static List<MvcResult> inParallel(Callable<MvcResult> call) throws Exception {
		ExecutorService executor = Executors.newFixedThreadPool(THREADS);
		CountDownLatch start = new CountDownLatch(1);
		try {
			List<Future<MvcResult>> futures = new ArrayList<>();
			for (int i = 0; i < THREADS; i++) {
				futures.add(executor.submit(() -> {
					start.await();
					return call.call();
				}));
			}
			start.countDown();
			List<MvcResult> results = new ArrayList<>();
			for (Future<MvcResult> future : futures) {
				results.add(future.get(60, TimeUnit.SECONDS));
			}
			return results;
		}
		finally {
			executor.shutdownNow();
		}
	}

	private int count(String sql) {
		return jdbc.queryForObject(sql, Integer.class);
	}

}
