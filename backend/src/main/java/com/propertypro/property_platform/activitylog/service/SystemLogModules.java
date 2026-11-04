package com.propertypro.property_platform.activitylog.service;

/** Module names of explicit logs. Automatic logs use the first API path segment (see {@code SystemLogInterceptor}). */
public final class SystemLogModules {

	public static final String AUTHENTICATION = "authentication";
	public static final String PERMISSIONS = "permissions";
	public static final String SYSTEM = "system";

	private SystemLogModules() {
	}

}
