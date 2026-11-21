package com.propertypro.property_platform.role.service;

import com.propertypro.property_platform.security.Permissions;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class PermissionCatalogTests {

	@Test
	void catalogHoldsExactlyThePermissionConstants() {
		Set<String> constants = Arrays.stream(Permissions.class.getDeclaredFields())
			.filter(field -> Modifier.isStatic(field.getModifiers()) && field.getType() == String.class)
			.map(PermissionCatalogTests::value)
			.collect(Collectors.toSet());

		assertThat(PermissionCatalog.codes()).containsExactlyInAnyOrderElementsOf(constants);
	}

	@Test
	void moduleAndActionKeysAreUniqueAndValid() {
		assertThat(PermissionCatalog.MODULES).extracting(PermissionCatalog.Module::key).doesNotHaveDuplicates();
		PermissionCatalog.MODULES.forEach(module -> {
			assertThat(module.key()).matches("^[a-z][a-z0-9_]{0,49}$");
			assertThat(module.actions()).doesNotHaveDuplicates().allMatch(action -> action.matches("^[a-z][a-z0-9_]{0,49}$"));
		});
		assertThat(PermissionCatalog.contains("site_visit", "list_any")).isTrue();
		assertThat(PermissionCatalog.contains("site_visit", "launch")).isFalse();
		assertThat(PermissionCatalog.contains("secret", "read")).isFalse();
	}

	private static String value(Field field) {
		try {
			return (String) field.get(null);
		}
		catch (IllegalAccessException ex) {
			throw new IllegalStateException(ex);
		}
	}

}
