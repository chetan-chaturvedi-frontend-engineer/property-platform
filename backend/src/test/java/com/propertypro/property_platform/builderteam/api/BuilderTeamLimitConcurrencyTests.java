package com.propertypro.property_platform.builderteam.api;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/** Concurrent invitations by one builder cannot exceed the subscription's team member limit. */
class BuilderTeamLimitConcurrencyTests extends BuilderTeamApiTestSupport {

	private static final int THREADS = 4;

	@Test
	void concurrentInvitationsCannotExceedTheLimit() throws Exception {
		subscribe(bobId, 1);
		List<String> emails = new ArrayList<>(List.of("alice@example.com", "carol@example.com", "dave@example.com"));
		account("erin@example.com", "user");
		emails.add("erin@example.com");
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(THREADS);
		try {
			List<Future<Integer>> results = new ArrayList<>();
			for (String email : emails) {
				results.add(executor.submit(() -> {
					start.await();
					return postAs(APP, bob, invitation(email)).andReturn().getResponse().getStatus();
				}));
			}
			start.countDown();

			List<Integer> statuses = new ArrayList<>();
			for (Future<Integer> result : results) {
				statuses.add(result.get(30, TimeUnit.SECONDS));
			}
			assertThat(statuses).containsOnlyOnce(201).filteredOn(code -> code != 201).containsOnly(403);
			assertThat(count("SELECT count(*) FROM builder_teams WHERE builder_id = ?", bobId)).isOne();
		}
		finally {
			executor.shutdownNow();
		}
	}

	@Test
	void concurrentDuplicateInvitationsCreateOneMembership() throws Exception {
		subscribe(bobId, 10);
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(THREADS);
		try {
			List<Future<Integer>> results = new ArrayList<>();
			for (int i = 0; i < THREADS; i++) {
				results.add(executor.submit(() -> {
					start.await();
					return postAs(APP, bob, invitation("alice@example.com")).andReturn().getResponse().getStatus();
				}));
			}
			start.countDown();

			List<Integer> statuses = new ArrayList<>();
			for (Future<Integer> result : results) {
				statuses.add(result.get(30, TimeUnit.SECONDS));
			}
			assertThat(statuses).containsOnlyOnce(201).filteredOn(code -> code != 201).containsOnly(409);
			assertThat(count("SELECT count(*) FROM builder_teams WHERE employee_id = ?", aliceId)).isOne();
		}
		finally {
			executor.shutdownNow();
		}
	}

}
