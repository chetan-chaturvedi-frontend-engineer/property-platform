package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.media.config.MediaProperties;
import com.propertypro.property_platform.media.service.MediaFileType;
import com.propertypro.property_platform.media.service.MediaUploadService;
import com.propertypro.property_platform.media.service.StoredMedia;
import com.propertypro.property_platform.media.storage.MediaStorage;
import com.propertypro.property_platform.property.domain.ApartmentMediaType;
import com.propertypro.property_platform.property.domain.ProjectMediaType;
import com.propertypro.property_platform.property.domain.PropertyApartment;
import com.propertypro.property_platform.property.domain.PropertyApartmentMedia;
import com.propertypro.property_platform.property.domain.PropertyMediaFile;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PropertyProjectMedia;
import com.propertypro.property_platform.property.dto.ExternalMediaRequest;
import com.propertypro.property_platform.property.dto.MediaOrderRequest;
import com.propertypro.property_platform.property.dto.MediaResponse;
import com.propertypro.property_platform.property.dto.MediaUploadForm;
import com.propertypro.property_platform.property.dto.UpdateMediaRequest;
import com.propertypro.property_platform.property.exception.PropertyExceptions;
import com.propertypro.property_platform.property.mapper.PropertyResponseMapper;
import com.propertypro.property_platform.property.repository.PropertyApartmentMediaRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectMediaRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Project media (wizard step 6) and apartment media. Uploads are verified by content and stored under
 * random keys in private storage; downloads are authorized like the property itself. A file is removed
 * from storage only after its row's deletion commits, and an upload whose transaction fails is removed.
 */
@Service
@RequiredArgsConstructor
public class PropertyMediaService {

	private static final Set<MediaFileType> IMAGES = EnumSet.of(MediaFileType.JPEG, MediaFileType.PNG,
			MediaFileType.WEBP);

	private final PropertyProjectMediaRepository projectMediaRepository;
	private final PropertyApartmentMediaRepository apartmentMediaRepository;
	private final PropertyAccessService access;
	private final PropertyWizardService wizard;
	private final PropertyResponseMapper mapper;
	private final MediaUploadService uploadService;
	private final MediaStorage storage;
	private final MediaProperties properties;

	// ---- Project media ----

	@Transactional(readOnly = true)
	public List<MediaResponse> listProjectMedia(Long propertyId, CurrentActor actor) {
		return mapper.toProjectMediaResponses(access.requireViewable(propertyId, actor));
	}

	@Transactional
	public MediaResponse uploadProjectMedia(Long propertyId, CurrentActor actor, MultipartFile file,
			MediaUploadForm form, Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		ProjectMediaType type = parse(form.mediaType(), ProjectMediaType.VALUES, ProjectMediaType::fromValue);
		requireProjectCapacity(project, type);
		boolean primary = Boolean.TRUE.equals(form.primary());
		if (primary && type != ProjectMediaType.PHOTO) {
			throw new FieldValidationException("primary", "only a photo can be the cover");
		}
		StoredMedia stored = uploadService.store(file, allowedFiles(type), "projects/" + project.getId(), "file");
		PropertyProjectMedia media = PropertyProjectMedia.storedFile(project.getId(), type, stored.storageKey(),
				stored.type().getMimeType(), stored.size(), stored.originalFilename());
		describe(media, form.title(), form.description(), projectMediaRepository.maxSortOrder(project.getId()) + 1);
		// The first photo becomes the cover, so a property with photos always has one.
		if (type == ProjectMediaType.PHOTO
				&& (primary || projectMediaRepository.findFirstByPropertyProjectIdAndPrimaryTrue(project.getId()).isEmpty())) {
			makeProjectCover(project, media);
		}
		projectMediaRepository.saveAndFlush(media);
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return mapper.toMediaResponse(media, project);
	}

	/** A video hosted elsewhere (allowed video hosts only). */
	@Transactional
	public MediaResponse addExternalProjectMedia(Long propertyId, CurrentActor actor, ExternalMediaRequest request,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		ProjectMediaType type = ProjectMediaType.fromValue(request.mediaType());
		requireProjectCapacity(project, type);
		String url = uploadService.requireAllowedUrl(request.url(), properties.allowedVideoHosts(), "url");
		PropertyProjectMedia media = PropertyProjectMedia.externalUrl(project.getId(), type, url);
		describe(media, request.title(), request.description(), projectMediaRepository.maxSortOrder(project.getId()) + 1);
		projectMediaRepository.saveAndFlush(media);
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return mapper.toMediaResponse(media, project);
	}

	@Transactional
	public MediaResponse updateProjectMedia(Long propertyId, Long mediaId, CurrentActor actor,
			UpdateMediaRequest request, Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		PropertyProjectMedia media = projectMedia(project, mediaId);
		applyText(media, request);
		if (request.getPrimary() != null) {
			boolean primary = request.getPrimary().orElseThrow();
			if (primary && media.getMediaType() != ProjectMediaType.PHOTO) {
				throw new FieldValidationException("primary", "only a photo can be the cover");
			}
			if (primary) {
				makeProjectCover(project, media);
			}
			else if (media.isPrimary()) {
				throw new FieldValidationException("primary", "choose another photo as the cover instead");
			}
		}
		projectMediaRepository.saveAndFlush(media);
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return mapper.toMediaResponse(media, project);
	}

	@Transactional
	public void deleteProjectMedia(Long propertyId, Long mediaId, CurrentActor actor, Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		PropertyProjectMedia media = projectMedia(project, mediaId);
		projectMediaRepository.delete(media);
		projectMediaRepository.flush();
		deleteFileAfterCommit(media);
		if (media.isPrimary()) {
			projectMediaRepository.findFirstByPropertyProjectIdAndMediaTypeOrderBySortOrderAscIdAsc(project.getId(),
					ProjectMediaType.PHOTO).ifPresent(next -> {
						next.setPrimary(true);
						projectMediaRepository.saveAndFlush(next);
					});
		}
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
	}

	@Transactional
	public List<MediaResponse> reorderProjectMedia(Long propertyId, CurrentActor actor, MediaOrderRequest request,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		reorder(projectMediaRepository.findByPropertyProjectIdOrderBySortOrderAscIdAsc(project.getId()),
				request.mediaIds());
		projectMediaRepository.flush();
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return mapper.toProjectMediaResponses(project);
	}

	@Transactional(readOnly = true)
	public MediaContent projectMediaContent(Long propertyId, Long mediaId, CurrentActor actor) {
		return content(projectMedia(access.requireViewable(propertyId, actor), mediaId));
	}

	/** For the public API: the caller has already checked that the project is published. */
	@Transactional(readOnly = true)
	public MediaContent publicProjectMediaContent(PropertyProject project, Long mediaId) {
		return content(projectMedia(project, mediaId));
	}

	// ---- Apartment media ----

	@Transactional(readOnly = true)
	public List<MediaResponse> listApartmentMedia(Long propertyId, Long apartmentId, CurrentActor actor) {
		PropertyProject project = access.requireViewable(propertyId, actor);
		PropertyApartment apartment = access.requireApartment(project, apartmentId);
		return apartmentMediaRepository.findByPropertyApartmentIdOrderBySortOrderAscIdAsc(apartment.getId()).stream()
			.map(m -> mapper.toMediaResponse(m, project)).toList();
	}

	@Transactional
	public MediaResponse uploadApartmentMedia(Long propertyId, Long apartmentId, CurrentActor actor,
			MultipartFile file, MediaUploadForm form, Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		PropertyApartment apartment = access.requireApartment(project, apartmentId);
		ApartmentMediaType type = parse(form.mediaType(), ApartmentMediaType.VALUES, ApartmentMediaType::fromValue);
		int limit = apartmentLimit(type);
		if (apartmentMediaRepository.countByPropertyApartmentIdAndMediaType(apartment.getId(), type) >= limit) {
			throw PropertyExceptions.mediaLimitReached(type.getValue(), limit);
		}
		boolean primary = Boolean.TRUE.equals(form.primary());
		if (primary && type == ApartmentMediaType.PLAN_PDF) {
			throw new FieldValidationException("primary", "a plan PDF cannot be the primary image");
		}
		Set<MediaFileType> allowed = type == ApartmentMediaType.PLAN_PDF ? EnumSet.of(MediaFileType.PDF) : IMAGES;
		StoredMedia stored = uploadService.store(file, allowed,
				"projects/" + project.getId() + "/apartments/" + apartment.getId(), "file");
		PropertyApartmentMedia media = PropertyApartmentMedia.storedFile(apartment.getId(), type, stored.storageKey(),
				stored.type().getMimeType(), stored.size(), stored.originalFilename());
		describe(media, form.title(), form.description(), apartmentMediaRepository.maxSortOrder(apartment.getId()) + 1);
		if (type != ApartmentMediaType.PLAN_PDF && (primary
				|| apartmentMediaRepository.findFirstByPropertyApartmentIdAndPrimaryTrue(apartment.getId()).isEmpty())) {
			apartmentMediaRepository.findFirstByPropertyApartmentIdAndPrimaryTrue(apartment.getId()).ifPresent(current -> {
				current.setPrimary(false);
				apartmentMediaRepository.saveAndFlush(current);
			});
			media.setPrimary(true);
		}
		apartmentMediaRepository.saveAndFlush(media);
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return mapper.toMediaResponse(media, project);
	}

	@Transactional
	public void deleteApartmentMedia(Long propertyId, Long apartmentId, Long mediaId, CurrentActor actor,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		PropertyApartment apartment = access.requireApartment(project, apartmentId);
		PropertyApartmentMedia media = apartmentMedia(apartment, mediaId);
		apartmentMediaRepository.delete(media);
		apartmentMediaRepository.flush();
		deleteFileAfterCommit(media);
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
	}

	@Transactional
	public List<MediaResponse> reorderApartmentMedia(Long propertyId, Long apartmentId, CurrentActor actor,
			MediaOrderRequest request, Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		PropertyApartment apartment = access.requireApartment(project, apartmentId);
		List<PropertyApartmentMedia> media = apartmentMediaRepository
			.findByPropertyApartmentIdOrderBySortOrderAscIdAsc(apartment.getId());
		reorder(media, request.mediaIds());
		apartmentMediaRepository.flush();
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return apartmentMediaRepository.findByPropertyApartmentIdOrderBySortOrderAscIdAsc(apartment.getId()).stream()
			.map(m -> mapper.toMediaResponse(m, project)).toList();
	}

	@Transactional(readOnly = true)
	public MediaContent apartmentMediaContent(Long propertyId, Long apartmentId, Long mediaId, CurrentActor actor) {
		PropertyProject project = access.requireViewable(propertyId, actor);
		return content(apartmentMedia(access.requireApartment(project, apartmentId), mediaId));
	}

	/** For the public API: the caller has already checked that the project is published. */
	@Transactional(readOnly = true)
	public MediaContent publicApartmentMediaContent(PropertyProject project, Long apartmentId, Long mediaId) {
		return content(apartmentMedia(access.requireApartment(project, apartmentId), mediaId));
	}

	// ---- Helpers ----

	private PropertyProjectMedia projectMedia(PropertyProject project, Long mediaId) {
		return projectMediaRepository.findByIdAndPropertyProjectId(mediaId, project.getId())
			.orElseThrow(PropertyExceptions::mediaNotFound);
	}

	private PropertyApartmentMedia apartmentMedia(PropertyApartment apartment, Long mediaId) {
		return apartmentMediaRepository.findByIdAndPropertyApartmentId(mediaId, apartment.getId())
			.orElseThrow(PropertyExceptions::mediaNotFound);
	}

	/** Unsets the current cover first: the database allows only one per project. */
	private void makeProjectCover(PropertyProject project, PropertyProjectMedia media) {
		projectMediaRepository.findFirstByPropertyProjectIdAndPrimaryTrue(project.getId())
			.filter(current -> !current.getId().equals(media.getId()))
			.ifPresent(current -> {
				current.setPrimary(false);
				projectMediaRepository.saveAndFlush(current);
			});
		media.setPrimary(true);
	}

	private void requireProjectCapacity(PropertyProject project, ProjectMediaType type) {
		int limit = switch (type) {
			case PHOTO -> properties.limits().projectPhotos();
			case VIDEO -> properties.limits().projectVideos();
			case BROCHURE -> properties.limits().projectBrochures();
		};
		if (projectMediaRepository.countByPropertyProjectIdAndMediaType(project.getId(), type) >= limit) {
			throw PropertyExceptions.mediaLimitReached(type.getValue(), limit);
		}
	}

	private int apartmentLimit(ApartmentMediaType type) {
		return switch (type) {
			case FLOOR_PLAN_IMAGE -> properties.limits().apartmentFloorPlans();
			case PLAN_PDF -> properties.limits().apartmentPlanPdfs();
			case PHOTO -> properties.limits().apartmentPhotos();
		};
	}

	private static Set<MediaFileType> allowedFiles(ProjectMediaType type) {
		return switch (type) {
			case PHOTO -> IMAGES;
			case VIDEO -> EnumSet.of(MediaFileType.MP4);
			case BROCHURE -> EnumSet.of(MediaFileType.PDF);
		};
	}

	private static void describe(PropertyMediaFile media, String title, String description, int sortOrder) {
		media.setTitle(title == null || title.isBlank() ? null : title.strip());
		media.setDescription(description == null || description.isBlank() ? null : description.strip());
		media.setSortOrder(sortOrder);
	}

	private static void applyText(PropertyMediaFile media, UpdateMediaRequest request) {
		if (request.getTitle() != null) {
			String title = request.getTitle().orElse(null);
			media.setTitle(title == null || title.isBlank() ? null : title.strip());
		}
		if (request.getDescription() != null) {
			String description = request.getDescription().orElse(null);
			media.setDescription(description == null || description.isBlank() ? null : description.strip());
		}
	}

	/** {@code ids} must list every item exactly once. */
	private static <M extends PropertyMediaFile> void reorder(List<M> media, List<Long> ids) {
		Map<Long, M> byId = media.stream().collect(Collectors.toMap(PropertyMediaFile::getId, Function.identity()));
		if (ids.size() != byId.size() || !new HashSet<>(ids).equals(byId.keySet())) {
			throw new FieldValidationException("mediaIds", "must list every media item of this parent exactly once");
		}
		for (int i = 0; i < ids.size(); i++) {
			byId.get(ids.get(i)).setSortOrder(i);
		}
	}

	private void deleteFileAfterCommit(PropertyMediaFile media) {
		if (media.getFilePath() != null) {
			uploadService.deleteAfterCommit(media.getFilePath());
		}
	}

	private MediaContent content(PropertyMediaFile media) {
		if (media.getFilePath() == null) {
			// External media is linked directly through its URL.
			throw PropertyExceptions.mediaNotFound();
		}
		Resource resource = storage.get(media.getFilePath());
		if (!resource.exists()) {
			throw PropertyExceptions.mediaNotFound();
		}
		return new MediaContent(resource, media.getMimeType(), media.getFileSize(), media.getOriginalFilename());
	}

	private static <E> E parse(String value, String allowedValues, Function<String, E> parser) {
		if (value == null || !value.matches(allowedValues)) {
			throw new FieldValidationException("mediaType", "must be one of " + allowedValues.replace("|", ", "));
		}
		return parser.apply(value);
	}

	/** A stored file to stream; {@code filename} is the sanitized original name, or null. */
	public record MediaContent(Resource resource, String mimeType, Long size, String filename) {
	}

}
