package com.propertypro.property_platform.activitylog.web;

import com.propertypro.property_platform.activitylog.service.SystemLogEntry;
import com.propertypro.property_platform.activitylog.service.SystemLogModules;
import com.propertypro.property_platform.activitylog.service.SystemLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.lang.reflect.RecordComponent;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Logs API activity without code in each module: every successful write, every {@code @SystemLogged}
 * read and every 403. Failed writes are not logged. The module is the first path segment, the
 * reference type comes from the controller name, and the reference id from the response's {@code id}
 * or else the last numeric path variable. Authentication endpoints log explicitly and are excluded
 * in {@code WebConfig}.
 */
@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class SystemLogInterceptor implements HandlerInterceptor, ResponseBodyAdvice<Object> {

	private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
	private static final String RESPONSE_ID = SystemLogInterceptor.class.getName() + ".responseId";

	private final SystemLogService systemLogService;

	@Override
	public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
		return true;
	}

	/** Created records have no id in the path, so it is read here while the response object still exists. */
	@Override
	public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
			Class<? extends HttpMessageConverter<?>> selectedConverterType, ServerHttpRequest request,
			ServerHttpResponse response) {
		if (body != null && body.getClass().isRecord() && request instanceof ServletServerHttpRequest servlet) {
			Long id = recordId(body);
			if (id != null) {
				servlet.getServletRequest().setAttribute(RESPONSE_ID, id);
			}
		}
		return body;
	}

	@Override
	public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
			Exception ex) {
		if (ex != null || !(handler instanceof HandlerMethod method)) {
			return;
		}
		try {
			logRequest(request, response.getStatus(), method);
		}
		catch (RuntimeException failure) {
			log.warn("Automatic system log failed uri={}", request.getRequestURI(), failure);
		}
	}

	private void logRequest(HttpServletRequest request, int status, HandlerMethod method) {
		SystemLogged annotation = method.getMethodAnnotation(SystemLogged.class);
		boolean write = WRITE_METHODS.contains(request.getMethod());
		String action = action(method, annotation);
		Map<String, Object> data = new LinkedHashMap<>(pathVariables(request));
		data.put("status", status);
		if (status == 403) {
			systemLogService.record(SystemLogEntry.warning(SystemLogModules.PERMISSIONS, "Access denied: " + action)
				.withAdditionalData(data));
		}
		else if (status >= 200 && status < 300 && (write || annotation != null)
				&& (annotation == null || annotation.logSuccess())) {
			String module = module(request);
			systemLogService.record((write ? SystemLogEntry.success(module, action) : SystemLogEntry.info(module, action))
				.withReference(referenceType(method), referenceId(request))
				.withAdditionalData(data));
		}
	}

	private static String action(HandlerMethod method, SystemLogged annotation) {
		if (annotation != null && !annotation.action().isEmpty()) {
			return annotation.action();
		}
		return StringUtils.capitalize(words(referenceType(method))) + ": " + words(method.getMethod().getName());
	}

	private static String module(HttpServletRequest request) {
		String pattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
		return pattern.replaceFirst("^/api/v1/(admin/)?", "").split("/")[0].replace('-', '_');
	}

	/** AdminBlogCategoryController -> BlogCategory. */
	private static String referenceType(HandlerMethod method) {
		return method.getBeanType().getSimpleName().replaceFirst("^Admin", "").replaceFirst("Controller$", "");
	}

	private static Long referenceId(HttpServletRequest request) {
		if (request.getAttribute(RESPONSE_ID) instanceof Long id) {
			return id;
		}
		Long last = null;
		for (String value : pathVariables(request).values()) {
			if (value.chars().allMatch(Character::isDigit) && value.length() < 19) {
				last = Long.valueOf(value);
			}
		}
		return last;
	}

	@SuppressWarnings("unchecked")
	private static Map<String, String> pathVariables(HttpServletRequest request) {
		Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
		return variables == null ? Map.of() : (Map<String, String>) variables;
	}

	private static Long recordId(Object body) {
		for (RecordComponent component : body.getClass().getRecordComponents()) {
			if (component.getName().equals("id") && component.getType() == Long.class) {
				try {
					return (Long) component.getAccessor().invoke(body);
				}
				catch (ReflectiveOperationException ex) {
					return null;
				}
			}
		}
		return null;
	}

	private static String words(String camelCase) {
		return camelCase.replaceAll("([a-z0-9])([A-Z])", "$1 $2").toLowerCase(Locale.ROOT);
	}

}
