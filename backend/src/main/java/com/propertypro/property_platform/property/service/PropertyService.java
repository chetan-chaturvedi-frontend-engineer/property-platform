package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.phone.PhoneNumberNormalizer;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.media.config.MediaProperties;
import com.propertypro.property_platform.media.service.MediaUploadService;
import com.propertypro.property_platform.property.domain.AreaUnit;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.domain.PublicationStatus;
import com.propertypro.property_platform.property.domain.StatusChangeAction;
import com.propertypro.property_platform.property.dto.CreatePropertyRequest;
import com.propertypro.property_platform.property.dto.PropertyFilter;
import com.propertypro.property_platform.property.dto.PropertyResponse;
import com.propertypro.property_platform.property.dto.PropertyStatsResponse;
import com.propertypro.property_platform.property.dto.PropertySummaryResponse;
import com.propertypro.property_platform.property.dto.UpdateMediaSettingsRequest;
import com.propertypro.property_platform.property.dto.UpdateProjectInfoRequest;
import com.propertypro.property_platform.property.dto.UpdatePropertyDetailsRequest;
import com.propertypro.property_platform.property.dto.UpdatePropertyLocationRequest;
import com.propertypro.property_platform.property.dto.UpdatePropertyRequest;
import com.propertypro.property_platform.property.dto.WizardResponse;
import com.propertypro.property_platform.property.exception.PropertyExceptions;
import com.propertypro.property_platform.property.mapper.PropertyResponseMapper;
import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectSummaryRepository;
import com.propertypro.property_platform.property.repository.PropertyStatusChangeRepository;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.user.dto.UserSummary;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.regex.Pattern;

import static com.propertypro.property_platform.security.Permissions.PROPERTY_LIST;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_RESTORE_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW_ANY;

/**
 * Property lifecycle: creation (wizard step 1), steps 2, 4 and 6, viewing, listing, deletion and
 * restore. Authorization goes through {@link PropertyAccessService}; creation eligibility through
 * {@link PropertyEligibilityService}.
 */
@Service
@RequiredArgsConstructor
public class PropertyService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("createdAt", "updatedAt", "projectName", "city",
			"publishedAt");
	private static final Pattern IDEMPOTENCY_KEY = Pattern.compile("^[A-Za-z0-9_-]{8,100}$");

	private final PropertyProjectRepository projectRepository;
	private final PropertyProjectSummaryRepository summaryRepository;
	private final PropertyAccessService access;
	private final PropertyEligibilityService eligibility;
	private final PropertyWizardService wizard;
	private final PropertyStatusHistoryService statusHistory;
	private final ProjectSlugGenerator slugGenerator;
	private final PropertyResponseMapper mapper;
	private final PhoneNumberNormalizer phoneNumberNormalizer;
	private final MediaUploadService mediaUploadService;
	private final MediaProperties mediaProperties;
	private final PropertyListExtras listExtras;
	private final PropertyStatusChangeRepository statusChangeRepository;
	private final PropertyBuilderService builders;
	private final Clock clock;

	/**
	 * Creates a draft from step 1. With an {@code idempotencyKey}, a retry returns the property the
	 * first request created ({@code created = false}) instead of creating, and counting, another one.
	 */
	@Transactional
	public CreateResult create(CurrentActor actor, CreatePropertyRequest request, String idempotencyKey) {
		if (idempotencyKey != null) {
			if (!IDEMPOTENCY_KEY.matcher(idempotencyKey).matches()) {
				throw new FieldValidationException("Idempotency-Key", "must be 8-100 letters, digits, '-' or '_'");
			}
			projectRepository.lockIdempotencyKey(actor.userId(), idempotencyKey);
			Optional<Long> existingId = projectRepository.findIdByIdempotencyKeyIncludingDeleted(actor.userId(),
					idempotencyKey);
			if (existingId.isPresent()) {
				PropertyProject existing = projectRepository.findById(existingId.get())
					.orElseThrow(PropertyExceptions::idempotencyKeyReused);
				return new CreateResult(mapper.toResponse(existing), false);
			}
		}
		eligibility.requireCanCreate(actor);
		UserSummary builder = request.builderUserId() == null ? null : linkableBuilder(actor, request.builderUserId());
		String projectName = request.projectName().strip();
		PropertyProject project = new PropertyProject(actor.userId(), slugGenerator.generate(projectName, null),
				idempotencyKey);
		project.setPropertyType(PropertyType.fromValue(request.propertyType()));
		project.setProjectName(projectName);
		project.setBuilderCompanyName(builder != null ? builder.fullName() : request.builderCompanyName().strip());
		project.setBuilderUserId(builder != null ? builder.id() : null);
		project.setReraNumber(stripToNull(request.reraNumber()));
		project.setGstNumber(stripToNull(request.gstNumber()));
		project.setProjectEmail(request.projectEmail().strip().toLowerCase(Locale.ROOT));
		project.setProjectPhone(normalizePhone(request.projectPhone()));
		projectRepository.saveAndFlush(project);
		statusHistory.record(project.getId(), actor.userId(), StatusChangeAction.CREATED, null,
				PublicationStatus.DRAFT, null);
		wizard.afterChange(project, actor, true);
		return new CreateResult(mapper.toResponse(project), true);
	}

	@Transactional(readOnly = true)
	public PropertyResponse get(Long id, CurrentActor actor) {
		return mapper.toResponse(access.requireViewable(id, actor));
	}

	/** Admin detail: owner contact details and audit actors; requires {@code PROPERTY_VIEW_ANY}. */
	@Transactional(readOnly = true)
	public PropertyResponse getAsAdmin(Long id, CurrentActor actor) {
		requirePermission(actor, PROPERTY_VIEW_ANY);
		return mapper.toAdminResponse(access.requireViewable(id, actor));
	}

	@Transactional(readOnly = true)
	public WizardResponse wizard(Long id, CurrentActor actor) {
		return wizard.evaluate(access.requireViewable(id, actor));
	}

	/** The actor's own properties only; owner and deletion filters are rejected. */
	@Transactional(readOnly = true)
	public PageResponse<PropertySummaryResponse> listOwn(CurrentActor actor, PropertyFilter filter, Pageable pageable) {
		requirePermission(actor, PROPERTY_LIST);
		if (filter.ownerId() != null) {
			throw new FieldValidationException("ownerId", "is not allowed");
		}
		if (filter.deleted() != null) {
			throw new FieldValidationException("deleted", "is not allowed");
		}
		Specification<PropertyProjectSummary> spec = matching(filter)
			.and((root, query, cb) -> cb.equal(root.get("userId"), actor.userId()));
		return list(spec, pageable, PropertySummaryResponse::forOwner);
	}

	/** Every owner's properties; requires {@code PROPERTY_LIST_ANY} (checked by the controller). */
	@Transactional(readOnly = true)
	public PageResponse<PropertySummaryResponse> listAll(PropertyFilter filter, Pageable pageable) {
		Specification<PropertyProjectSummary> spec = matching(filter);
		if (filter.ownerId() != null) {
			spec = spec.and((root, query, cb) -> cb.equal(root.get("userId"), filter.ownerId()));
		}
		Page<PropertyProjectSummary> found = summaryRepository.findAll(spec, pageRequest(pageable));
		return PageResponse.of(found, listExtras.adminSummaries(found.getContent()));
	}

	private static final Duration RECENT_SUBMISSION_WINDOW = Duration.ofDays(7);

	/** Counts for the admin dashboard; requires {@code PROPERTY_LIST_ANY} (checked by the controller). */
	@Transactional(readOnly = true)
	public PropertyStatsResponse stats() {
		Map<String, Long> byPublication = new LinkedHashMap<>();
		for (PublicationStatus status : PublicationStatus.values()) {
			byPublication.put(status.getValue(), 0L);
		}
		Map<String, Long> byLegal = new LinkedHashMap<>();
		for (LegalApprovalStatus status : LegalApprovalStatus.values()) {
			byLegal.put(status.getValue(), 0L);
		}
		long total = 0;
		long deleted = 0;
		for (PropertyProjectSummaryRepository.StatusCount count : summaryRepository.countByStatus()) {
			if (count.isDeleted()) {
				deleted += count.getTotal();
				continue;
			}
			total += count.getTotal();
			byPublication.merge(count.getPublicationStatus(), count.getTotal(), Long::sum);
			byLegal.merge(count.getLegalApprovalStatus(), count.getTotal(), Long::sum);
		}
		long submittedRecently = statusChangeRepository.countProjectsWithActionSince(StatusChangeAction.SUBMITTED,
				clock.instant().minus(RECENT_SUBMISSION_WINDOW));
		return new PropertyStatsResponse(total, byPublication, byLegal, deleted, submittedRecently);
	}

	/** Step 1. The slug stays the same when the project name changes, so published URLs keep working. */
	@Transactional
	public PropertyResponse updateDetails(Long id, CurrentActor actor, UpdatePropertyDetailsRequest request,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(id, actor, expectedVersion);
		applyDetails(project, request, actor);
		return saved(project, actor);
	}

	/** Step 2. */
	@Transactional
	public PropertyResponse updateLocation(Long id, CurrentActor actor, UpdatePropertyLocationRequest request,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(id, actor, expectedVersion);
		applyLocation(project, request);
		return saved(project, actor);
	}

	/** Step 4. The legal approval status is changed only through the legal review endpoint. */
	@Transactional
	public PropertyResponse updateProjectInfo(Long id, CurrentActor actor, UpdateProjectInfoRequest request,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(id, actor, expectedVersion);
		applyProjectInfo(project, request);
		return saved(project, actor);
	}

	/** Step 6 settings: the 3D tour link. Media items have their own endpoints. */
	@Transactional
	public PropertyResponse updateMediaSettings(Long id, CurrentActor actor, UpdateMediaSettingsRequest request,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(id, actor, expectedVersion);
		applyMediaSettings(project, request);
		return saved(project, actor);
	}

	/** Several steps' fields in one atomic update; sections left out are not touched. */
	@Transactional
	public PropertyResponse update(Long id, CurrentActor actor, UpdatePropertyRequest request, Long expectedVersion) {
		PropertyProject project = access.requireEditable(id, actor, expectedVersion);
		if (request.getDetails() != null) {
			applyDetails(project, request.getDetails(), actor);
		}
		if (request.getLocation() != null) {
			applyLocation(project, request.getLocation());
		}
		if (request.getProjectInfo() != null) {
			applyProjectInfo(project, request.getProjectInfo());
		}
		if (request.getMediaSettings() != null) {
			applyMediaSettings(project, request.getMediaSettings());
		}
		return saved(project, actor);
	}

	private void applyDetails(PropertyProject project, UpdatePropertyDetailsRequest request, CurrentActor actor) {
		apply(request.getPropertyType(), value -> project.setPropertyType(PropertyType.fromValue(value)));
		apply(request.getProjectName(), value -> project.setProjectName(value.strip()));
		// A typed name replaces a linked builder; a builder link (applied after) sets the name.
		apply(request.getBuilderCompanyName(), value -> {
			project.setBuilderCompanyName(value.strip());
			project.setBuilderUserId(null);
		});
		apply(request.getBuilderUserId(), value -> {
			if (value == null) {
				project.setBuilderUserId(null);
				return;
			}
			UserSummary builder = linkableBuilder(actor, value);
			project.setBuilderUserId(builder.id());
			project.setBuilderCompanyName(builder.fullName());
		});
		apply(request.getReraNumber(), value -> project.setReraNumber(stripToNull(value)));
		apply(request.getGstNumber(), value -> project.setGstNumber(stripToNull(value)));
		apply(request.getProjectEmail(), value -> project.setProjectEmail(value.strip().toLowerCase(Locale.ROOT)));
		apply(request.getProjectPhone(), value -> project.setProjectPhone(normalizePhone(value)));
	}

	private static void applyLocation(PropertyProject project, UpdatePropertyLocationRequest request) {
		apply(request.getProjectAddress(), value -> project.setProjectAddress(value.strip()));
		apply(request.getCity(), value -> project.setCity(value.strip()));
		apply(request.getLocality(), value -> project.setLocality(value.strip()));
		apply(request.getPincode(), value -> project.setPincode(value.strip()));
		apply(request.getState(), value -> project.setState(value.strip()));
		apply(request.getLandmark(), value -> project.setLandmark(stripToNull(value)));
		BigDecimal latitude = request.getLatitude() == null ? project.getLatitude() : request.getLatitude().orElse(null);
		BigDecimal longitude = request.getLongitude() == null ? project.getLongitude()
				: request.getLongitude().orElse(null);
		if ((latitude == null) != (longitude == null)) {
			throw new FieldValidationException(latitude == null ? "latitude" : "longitude",
					"latitude and longitude must be provided together");
		}
		project.setLocation(latitude, longitude);
	}

	private static void applyProjectInfo(PropertyProject project, UpdateProjectInfoRequest request) {
		apply(request.getTotalTowersBlocks(), project::setTotalTowersBlocks);
		apply(request.getTotalUnitsFlats(), project::setTotalUnitsFlats);
		apply(request.getProjectStatus(), value -> project.setProjectStatus(ProjectStatus.fromValue(value)));
		apply(request.getLandArea(), project::setLandArea);
		apply(request.getLandAreaUnit(), value -> project.setLandAreaUnit(value == null ? null : AreaUnit.fromValue(value)));
		apply(request.getPossessionStartDate(), project::setPossessionStartDate);
		apply(request.getPossessionEndDate(), project::setPossessionEndDate);
		apply(request.getProjectDescription(), value -> project.setProjectDescription(stripToNull(value)));
		apply(request.getProjectHighlights(), value -> project.setProjectHighlights(
				value == null ? null : new ArrayList<>(value.stream().map(String::strip).toList())));
		if (project.getLandArea() != null && project.getLandAreaUnit() == null) {
			throw new FieldValidationException("landAreaUnit", "is required when landArea is set");
		}
		if (project.getPossessionStartDate() != null && project.getPossessionEndDate() != null
				&& project.getPossessionEndDate().isBefore(project.getPossessionStartDate())) {
			throw new FieldValidationException("possessionEndDate", "must not be before possessionStartDate");
		}
	}

	private void applyMediaSettings(PropertyProject project, UpdateMediaSettingsRequest request) {
		apply(request.getThreeDTourUrl(), value -> project.setThreeDTourUrl(value == null || value.isBlank() ? null
				: mediaUploadService.requireAllowedUrl(value, mediaProperties.allowedTourHosts(), "threeDTourUrl")));
	}

	/**
	 * Soft delete: the property disappears from every list and URL, its children and files are kept,
	 * and it no longer counts toward the owner's property limit.
	 */
	@Transactional
	public void delete(Long id, CurrentActor actor, Long expectedVersion) {
		PropertyProject project = access.requireDeletable(id, actor, expectedVersion);
		statusHistory.record(project.getId(), actor.userId(), StatusChangeAction.DELETED,
				project.getPublicationStatus(), project.getPublicationStatus(), null);
		projectRepository.delete(project);
		projectRepository.flush();
	}

	/**
	 * Undoes a soft delete. The property takes one of its owner's slots again, so the owner's
	 * subscription limit applies; its publication status is unchanged.
	 */
	@Transactional
	public PropertyResponse restore(Long id, CurrentActor actor) {
		requirePermission(actor, PROPERTY_RESTORE_ANY);
		PropertyProjectSummary summary = summaryRepository.findById(id).orElseThrow(PropertyExceptions::notFound);
		if (summary.getDeletedAt() == null) {
			throw new ApiException(HttpStatus.CONFLICT, "property_not_deleted", "The property is not deleted.");
		}
		eligibility.requireOwnerCapacityForRestore(summary.getUserId());
		if (projectRepository.restore(id) == 0) {
			throw new ApiException(HttpStatus.CONFLICT, "property_not_deleted", "The property is not deleted.");
		}
		statusHistory.record(id, actor.userId(), StatusChangeAction.RESTORED, summary.getPublicationStatus(),
				summary.getPublicationStatus(), null);
		return mapper.toAdminResponse(projectRepository.findById(id).orElseThrow(PropertyExceptions::notFound));
	}

	private PropertyResponse saved(PropertyProject project, CurrentActor actor) {
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return mapper.toResponse(project);
	}

	private String normalizePhone(String phone) {
		return phoneNumberNormalizer.normalize(phone)
			.orElseThrow(() -> new FieldValidationException("projectPhone", "must be a valid phone number"));
	}

	private PageResponse<PropertySummaryResponse> list(Specification<PropertyProjectSummary> spec, Pageable pageable,
			Function<PropertyProjectSummary, PropertySummaryResponse> mapping) {
		return PageResponse.of(summaryRepository.findAll(spec, pageRequest(pageable)), mapping);
	}

	private static PageRequest pageRequest(Pageable pageable) {
		return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), stableSort(pageable.getSort()));
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw PropertyExceptions.actionForbidden();
		}
	}

	/** PATCH field: {@code null} = omitted (skip); otherwise set the value, or null for an explicit JSON null. */
	/** Only the admin dashboard links builder accounts; app users type the builder's name. */
	private UserSummary linkableBuilder(CurrentActor actor, Long builderUserId) {
		if (!actor.has(PROPERTY_VIEW_ANY)) {
			throw new FieldValidationException("builderUserId", "is not allowed");
		}
		return builders.require(builderUserId);
	}

	private static <T> void apply(Optional<T> field, Consumer<T> setter) {
		if (field != null) {
			setter.accept(field.orElse(null));
		}
	}

	private static String stripToNull(String value) {
		return value == null || value.isBlank() ? null : value.strip();
	}

	private static Sort stableSort(Sort requested) {
		for (Sort.Order order : requested) {
			if (!SORTABLE_FIELDS.contains(order.getProperty())) {
				throw new FieldValidationException("sort", "must be one of " + String.join(", ", SORTABLE_FIELDS));
			}
		}
		// Unique tiebreaker, so rows with equal sort values never repeat or go missing across pages.
		return requested.and(Sort.by(Sort.Direction.DESC, "id"));
	}

	/** Filters shared by the owner and admin lists; soft-deleted rows are excluded unless asked for. */
	static Specification<PropertyProjectSummary> matching(PropertyFilter filter) {
		requireOrdered(filter.createdFrom(), filter.createdTo(), "createdTo");
		requireOrdered(filter.updatedFrom(), filter.updatedTo(), "updatedTo");
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			String deleted = filter.deleted() == null ? "exclude" : filter.deleted();
			if (deleted.equals("exclude")) {
				predicates.add(cb.isNull(root.get("deletedAt")));
			}
			else if (deleted.equals("only")) {
				predicates.add(cb.isNotNull(root.get("deletedAt")));
			}
			if (filter.search() != null && !filter.search().isBlank()) {
				String pattern = "%" + escapeLike(filter.search().strip().toLowerCase(Locale.ROOT)) + "%";
				predicates.add(cb.or(cb.like(cb.lower(root.get("projectName")), pattern, '\\'),
						cb.like(cb.lower(root.get("builderCompanyName")), pattern, '\\'),
						cb.like(root.get("slug"), pattern, '\\')));
			}
			equalsIgnoreCase(predicates, cb, root.get("city"), filter.city());
			equalsIgnoreCase(predicates, cb, root.get("state"), filter.state());
			equalsIgnoreCase(predicates, cb, root.get("locality"), filter.locality());
			if (filter.pincode() != null) {
				predicates.add(cb.equal(root.get("pincode"), filter.pincode()));
			}
			if (filter.propertyType() != null) {
				predicates.add(cb.equal(root.get("propertyType"), PropertyType.fromValue(filter.propertyType())));
			}
			if (filter.projectStatus() != null) {
				predicates.add(cb.equal(root.get("projectStatus"), ProjectStatus.fromValue(filter.projectStatus())));
			}
			if (filter.publicationStatus() != null) {
				predicates.add(cb.equal(root.get("publicationStatus"),
						PublicationStatus.fromValue(filter.publicationStatus())));
			}
			range(predicates, cb, root.get("createdAt"), filter.createdFrom(), filter.createdTo());
			range(predicates, cb, root.get("updatedAt"), filter.updatedFrom(), filter.updatedTo());
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	private static void equalsIgnoreCase(List<Predicate> predicates, CriteriaBuilder cb,
			Path<String> path, String value) {
		if (value != null && !value.isBlank()) {
			predicates.add(cb.equal(cb.lower(path), value.strip().toLowerCase(Locale.ROOT)));
		}
	}

	private static void range(List<Predicate> predicates, CriteriaBuilder cb,
			Path<Instant> path, Instant from, Instant to) {
		if (from != null) {
			predicates.add(cb.greaterThanOrEqualTo(path, from));
		}
		if (to != null) {
			predicates.add(cb.lessThanOrEqualTo(path, to));
		}
	}

	private static void requireOrdered(Instant from, Instant to, String field) {
		if (from != null && to != null && to.isBefore(from)) {
			throw new FieldValidationException(field, "must not be before the start of the range");
		}
	}

	static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

	/** @param created false when an earlier request with the same Idempotency-Key created the property */
	public record CreateResult(PropertyResponse property, boolean created) {
	}

}
