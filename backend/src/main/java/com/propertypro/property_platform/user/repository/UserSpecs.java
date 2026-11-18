package com.propertypro.property_platform.user.repository;

import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.domain.UserStatus;
import com.propertypro.property_platform.user.dto.ManagedUserFilter;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Admin user list filters. Values are always bound parameters; soft-deleted users are excluded by the entity's
 * {@code @SoftDelete}.
 */
public final class UserSpecs {

	/** Fewer digits would match most phone numbers. */
	static final int MIN_PHONE_DIGITS = 3;

	private UserSpecs() {
	}

	public static Specification<User> matching(ManagedUserFilter filter) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), UserStatus.fromValue(filter.status())));
			}
			if (filter.userType() != null) {
				predicates.add(cb.equal(root.get("userType"), filter.userType()));
			}
			if (filter.createdFrom() != null) {
				predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"),
						filter.createdFrom().atStartOfDay().toInstant(ZoneOffset.UTC)));
			}
			if (filter.createdTo() != null) {
				predicates.add(cb.lessThan(root.get("createdAt"),
						filter.createdTo().plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
			}
			String search = filter.search() == null ? "" : filter.search().strip();
			if (!search.isEmpty()) {
				String pattern = "%" + escapeLike(search.toLowerCase(Locale.ROOT)) + "%";
				List<Predicate> any = new ArrayList<>(List.of(
						cb.like(cb.lower(root.get("fullName")), pattern, '\\'),
						cb.like(cb.lower(root.get("email")), pattern, '\\')));
				String digits = search.replaceAll("\\D", "");
				if (digits.length() >= MIN_PHONE_DIGITS) {
					any.add(cb.like(root.get("phone"), "%" + digits + "%"));
				}
				predicates.add(cb.or(any.toArray(Predicate[]::new)));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	private static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

}
