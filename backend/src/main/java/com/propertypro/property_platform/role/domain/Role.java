package com.propertypro.property_platform.role.domain;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.role.exception.RoleExceptions;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreRemove;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SoftDelete;
import org.hibernate.annotations.SoftDeleteType;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Role with module-wise permissions. Users reference it by slug through {@code users.user_type}.
 * <p>
 * Every change goes through methods that take the grantor's own permission codes, so a caller can
 * never grant, remove or deactivate permissions they do not hold. The {@value #SUPER_ADMIN_SLUG}
 * role is managed only by reviewed migrations: the application can never create, deactivate,
 * delete or change its permissions, even for a grantor that holds all of them (e.g. an admin).
 * Bulk JPQL/SQL updates bypass these rules.
 */
@Entity
@Table(name = "roles")
// Deletes set deleted_at instead of removing the row; queries skip soft-deleted roles.
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "deleted_at")
@DynamicUpdate
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Role {

	public static final String SUPER_ADMIN_SLUG = "super-admin";

	public static final int NAME_MAX_LENGTH = 100;
	/** Same as {@code users.user_type}. */
	public static final int SLUG_MAX_LENGTH = 30;
	public static final int MAX_MODULES = 100;
	public static final int MAX_ACTIONS_PER_MODULE = 50;
	/** Same rule as {@code chk_roles_slug_format}. */
	public static final String SLUG_PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";
	/** Module and action keys, same rule as {@code chk_roles_permissions}. */
	public static final String KEY_PATTERN = "^[a-z][a-z0-9_]{0,49}$";

	private static final Pattern KEY = Pattern.compile(KEY_PATTERN);

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Setter
	@Column(nullable = false, length = NAME_MAX_LENGTH)
	private String name;

	/** Immutable: changing it would move every user of this role to another one. */
	@Column(nullable = false, length = SLUG_MAX_LENGTH, updatable = false)
	private String slug;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false)
	@Getter(AccessLevel.NONE)
	private Map<String, Map<String, Boolean>> permissions = new LinkedHashMap<>();

	@Column(nullable = false, length = 20)
	private RoleStatus status = RoleStatus.ACTIVE;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	/** {@code grantorPermissions}: permission codes of the user creating the role. */
	public Role(String name, String slug, Map<String, Map<String, Boolean>> permissions,
			Collection<String> grantorPermissions) {
		if (SUPER_ADMIN_SLUG.equals(slug)) {
			throw RoleExceptions.slugReserved();
		}
		Map<String, Map<String, Boolean>> validated = validate(permissions);
		requireHeldBy(grantorPermissions, codes(validated));
		this.name = name;
		this.slug = slug;
		this.permissions = validated;
	}

	public static String permissionCode(String module, String action) {
		return (module + "_" + action).toUpperCase(Locale.ROOT);
	}

	public boolean isSuperAdmin() {
		return SUPER_ADMIN_SLUG.equals(slug);
	}

	public boolean isActive() {
		return status == RoleStatus.ACTIVE;
	}

	/** True only for an active role whose JSON has {@code module.action == true}; anything else denies. */
	public boolean isGranted(String module, String action) {
		if (!isActive() || permissions == null) {
			return false;
		}
		Map<String, Boolean> actions = permissions.get(module);
		return actions != null && Boolean.TRUE.equals(actions.get(action));
	}

	/** Permission codes this role grants right now; empty while inactive. */
	public Set<String> grantedPermissions() {
		return isActive() ? codes(permissions) : Set.of();
	}

	/** Defensive copy of the stored JSON, including {@code false} entries. */
	public Map<String, Map<String, Boolean>> getPermissions() {
		Map<String, Map<String, Boolean>> copy = new LinkedHashMap<>();
		if (permissions != null) {
			permissions.forEach((module, actions) -> copy.put(module, Collections.unmodifiableMap(new LinkedHashMap<>(actions))));
		}
		return Collections.unmodifiableMap(copy);
	}

	/**
	 * Replaces all permissions. The grantor must hold every permission the role grants before and
	 * after the change, so it can neither escalate nor strip privileges above its own level.
	 */
	public void replacePermissions(Map<String, Map<String, Boolean>> proposed, Collection<String> grantorPermissions) {
		if (isSuperAdmin()) {
			throw RoleExceptions.superAdminProtected();
		}
		Map<String, Map<String, Boolean>> validated = validate(proposed);
		Set<String> touched = new LinkedHashSet<>(codes(permissions));
		touched.addAll(codes(validated));
		requireHeldBy(grantorPermissions, touched);
		this.permissions = validated;
	}

	public void changeStatus(RoleStatus newStatus, Collection<String> grantorPermissions) {
		if (isSuperAdmin() && newStatus != RoleStatus.ACTIVE) {
			throw RoleExceptions.superAdminProtected();
		}
		requireHeldBy(grantorPermissions, codes(permissions));
		this.status = newStatus;
	}

	/** Call before deleting through the repository; {@link #beforeRemove()} only guards super-admin. */
	public void checkDeletableBy(Collection<String> grantorPermissions) {
		if (isSuperAdmin()) {
			throw RoleExceptions.superAdminProtected();
		}
		requireHeldBy(grantorPermissions, codes(permissions));
	}

	@PreRemove
	void beforeRemove() {
		if (isSuperAdmin()) {
			throw RoleExceptions.superAdminProtected();
		}
	}

	private static void requireHeldBy(Collection<String> grantorPermissions, Set<String> required) {
		if (grantorPermissions == null || !grantorPermissions.containsAll(required)) {
			throw RoleExceptions.permissionEscalation();
		}
	}

	private static Set<String> codes(Map<String, Map<String, Boolean>> permissions) {
		Set<String> codes = new LinkedHashSet<>();
		if (permissions != null) {
			permissions.forEach((module, actions) -> {
				if (actions != null) {
					actions.forEach((action, granted) -> {
						if (Boolean.TRUE.equals(granted)) {
							codes.add(permissionCode(module, action));
						}
					});
				}
			});
		}
		return codes;
	}

	/** Same shape as {@code chk_roles_permissions}, checked before the database rejects it. */
	private static Map<String, Map<String, Boolean>> validate(Map<String, Map<String, Boolean>> permissions) {
		if (permissions == null) {
			return new LinkedHashMap<>();
		}
		if (permissions.size() > MAX_MODULES) {
			throw new FieldValidationException("permissions", "must contain at most " + MAX_MODULES + " modules");
		}
		Map<String, Map<String, Boolean>> copy = new LinkedHashMap<>();
		permissions.forEach((module, actions) -> {
			if (module == null || !KEY.matcher(module).matches() || actions == null
					|| actions.size() > MAX_ACTIONS_PER_MODULE) {
				throw new FieldValidationException("permissions", "has an invalid module: " + module);
			}
			actions.forEach((action, granted) -> {
				if (action == null || !KEY.matcher(action).matches() || granted == null) {
					throw new FieldValidationException("permissions", "has an invalid action in module " + module);
				}
			});
			copy.put(module, new LinkedHashMap<>(actions));
		});
		return copy;
	}

}
