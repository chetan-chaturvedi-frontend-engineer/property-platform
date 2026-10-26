package com.propertypro.property_platform.user.repository;

import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.domain.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

// Runs against the test PostgreSQL database with Flyway migrations; each test is rolled back.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class UserRepositoryTests {

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void newUserGetsDefaultsAndStoresLowercaseValues() {
		User user = userRepository.saveAndFlush(new User("repo-test@example.com", null, "hash", "Repo Test"));
		entityManager.clear();

		User loaded = userRepository.findById(user.getId()).orElseThrow();
		assertThat(loaded.getStatus()).isEqualTo(UserStatus.PENDING);
		assertThat(loaded.getUserType()).isEqualTo(User.DEFAULT_USER_TYPE);
		assertThat(loaded.isNotificationsEnabled()).isTrue();
		assertThat(loaded.getEmailVerifiedAt()).isNull();
		assertThat(loaded.getUpdatedAt()).isNotNull();

		Map<String, Object> row = jdbcTemplate.queryForMap(
				"SELECT status, user_type FROM users WHERE id = ?", user.getId());
		assertThat(row).containsEntry("status", "pending").containsEntry("user_type", "user");
	}

	@Test
	void deleteIsSoftDeleteAndIdentifiersStayReserved() {
		User user = userRepository.saveAndFlush(
				new User("soft-delete@example.com", "+919812345678", "hash", "Soft Delete"));

		userRepository.delete(user);
		userRepository.flush();
		entityManager.clear();

		assertThat(userRepository.findById(user.getId())).isEmpty();
		assertThat(userRepository.findByEmail("soft-delete@example.com")).isEmpty();
		assertThat(userRepository.existsByEmailOrPhoneIncludingDeleted("soft-delete@example.com", "+910000000000"))
				.isTrue();
		assertThat(userRepository.existsByEmailOrPhoneIncludingDeleted("other@example.com", "+919812345678"))
				.isTrue();
		Integer softDeleted = jdbcTemplate.queryForObject(
				"SELECT count(*) FROM users WHERE id = ? AND deleted_at IS NOT NULL", Integer.class, user.getId());
		assertThat(softDeleted).isEqualTo(1);
	}

}
