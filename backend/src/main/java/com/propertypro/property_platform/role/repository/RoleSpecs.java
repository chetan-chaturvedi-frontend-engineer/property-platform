package com.propertypro.property_platform.role.repository;

import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.domain.RoleStatus;
import com.propertypro.property_platform.role.dto.RoleFilter;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Admin role list filters. Values are always bound parameters; soft-deleted roles are excluded by {@code @SoftDelete}. */
public final class RoleSpecs {

	private RoleSpecs() {
	}

	public static Specification<Role> matching(RoleFilter filter) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), RoleStatus.fromValue(filter.status())));
			}
			String search = filter.search() == null ? "" : filter.search().strip();
			if (!search.isEmpty()) {
				String pattern = "%" + escapeLike(search.toLowerCase(Locale.ROOT)) + "%";
				predicates.add(cb.or(
						cb.like(cb.lower(root.get("name")), pattern, '\\'),
						cb.like(root.get("slug"), pattern, '\\'),
						cb.like(cb.lower(cb.coalesce(root.get("description"), "")), pattern, '\\')));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	private static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

}
