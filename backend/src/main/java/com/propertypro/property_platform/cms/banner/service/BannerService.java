package com.propertypro.property_platform.cms.banner.service;

import com.propertypro.property_platform.cms.banner.domain.Banner;
import com.propertypro.property_platform.cms.banner.domain.BannerLinkType;
import com.propertypro.property_platform.cms.banner.domain.BannerStatus;
import com.propertypro.property_platform.cms.banner.dto.BannerFilter;
import com.propertypro.property_platform.cms.banner.dto.BannerResponse;
import com.propertypro.property_platform.cms.banner.dto.CreateBannerForm;
import com.propertypro.property_platform.cms.banner.dto.PublicBannerFilter;
import com.propertypro.property_platform.cms.banner.dto.PublicBannerResponse;
import com.propertypro.property_platform.cms.banner.dto.UpdateBannerRequest;
import com.propertypro.property_platform.cms.banner.exception.BannerExceptions;
import com.propertypro.property_platform.cms.banner.repository.BannerRepository;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.media.service.MediaFileType;
import com.propertypro.property_platform.media.service.MediaUploadService;
import com.propertypro.property_platform.media.service.StoredMedia;
import com.propertypro.property_platform.media.storage.MediaStorage;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.Permissions;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

/**
 * Banners for the admin dashboard (all banners, by permission) and the public app/website list (live
 * banners only). Banners are global content without an owner, so access is decided by the admin
 * controller's permissions; changing a status additionally needs {@code BANNER_CHANGE_STATUS}.
 * "Now" is always the server clock, never a client value.
 */
@Service
@RequiredArgsConstructor
public class BannerService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("createdAt", "updatedAt", "title", "type", "placement",
			"status", "startDate", "endDate");
	static final Set<MediaFileType> IMAGE_TYPES = EnumSet.of(MediaFileType.JPEG, MediaFileType.PNG, MediaFileType.WEBP);
	private static final String KEY_PREFIX = "banners";

	private final BannerRepository bannerRepository;
	private final BannerRules rules;
	private final MediaUploadService uploadService;
	private final MediaStorage storage;
	private final Clock clock;

	/** Validates every field before the image is stored; the stored file is removed if the transaction fails. */
	@Transactional
	public BannerResponse create(CreateBannerForm form, MultipartFile image, CurrentActor actor) {
		BannerStatus status = form.status() == null ? BannerStatus.INACTIVE : BannerStatus.fromValue(form.status());
		if (status != BannerStatus.INACTIVE) {
			requireStatusPermission(actor);
		}
		String type = rules.requireType(form.type());
		String placement = rules.requirePlacement(form.placement());
		BannerLinkType linkType = form.linkType() == null ? null : BannerLinkType.fromValue(form.linkType());
		String link = rules.requireValidLink(linkType, form.link());
		rules.requireValidSchedule(form.startDate(), form.endDate());

		StoredMedia stored = uploadService.store(image, IMAGE_TYPES, KEY_PREFIX, "image");
		Banner banner = new Banner(form.title().strip(), type, placement, stored.storageKey());
		banner.changeLink(linkType, link);
		banner.reschedule(form.startDate(), form.endDate());
		banner.setStatus(status);
		return BannerResponse.from(save(banner), clock.instant());
	}

	/** Explicit nulls for required fields are already rejected by validation of the request. */
	@Transactional
	public BannerResponse update(Long id, UpdateBannerRequest request, CurrentActor actor) {
		Banner banner = find(id);
		if (request.getStatus() != null) {
			BannerStatus status = BannerStatus.fromValue(request.getStatus().orElseThrow());
			if (status != banner.getStatus()) {
				requireStatusPermission(actor);
				banner.setStatus(status);
			}
		}
		apply(request.getTitle(), title -> banner.setTitle(title.strip()));
		apply(request.getType(), type -> banner.setType(rules.requireType(type)));
		apply(request.getPlacement(), placement -> banner.setPlacement(rules.requirePlacement(placement)));
		// Either half of the link pair changes: validate the pair as it will be saved.
		if (request.getLinkType() != null || request.getLink() != null) {
			BannerLinkType linkType = request.getLinkType() == null ? banner.getLinkType()
					: request.getLinkType().map(BannerLinkType::fromValue).orElse(null);
			String link = request.getLink() == null ? banner.getLink() : request.getLink().orElse(null);
			banner.changeLink(linkType, rules.requireValidLink(linkType, link));
		}
		if (request.getStartDate() != null || request.getEndDate() != null) {
			Instant startDate = request.getStartDate() == null ? banner.getStartDate() : request.getStartDate().orElse(null);
			Instant endDate = request.getEndDate() == null ? banner.getEndDate() : request.getEndDate().orElse(null);
			rules.requireValidSchedule(startDate, endDate);
			banner.reschedule(startDate, endDate);
		}
		return BannerResponse.from(save(banner), clock.instant());
	}

	/** The old file is deleted only after the change commits, and only when no banner row still uses it. */
	@Transactional
	public BannerResponse replaceImage(Long id, MultipartFile image) {
		Banner banner = find(id);
		String previous = banner.getImage();
		StoredMedia stored = uploadService.store(image, IMAGE_TYPES, KEY_PREFIX, "image");
		banner.setImage(stored.storageKey());
		Banner saved = save(banner);
		if (bannerRepository.countAllByImageIncludingDeleted(previous) == 0) {
			uploadService.deleteAfterCommit(previous);
		}
		return BannerResponse.from(saved, clock.instant());
	}

	/** Soft delete: sets delete_at; the row and its image file are kept. */
	@Transactional
	public void delete(Long id) {
		bannerRepository.delete(find(id));
		bannerRepository.flush();
	}

	@Transactional(readOnly = true)
	public BannerResponse get(Long id) {
		return BannerResponse.from(find(id), clock.instant());
	}

	@Transactional(readOnly = true)
	public PageResponse<BannerResponse> list(BannerFilter filter, Pageable pageable) {
		requireOrdered(filter.startDateFrom(), filter.startDateTo(), "startDateTo", "must not be before startDateFrom");
		requireOrdered(filter.endDateFrom(), filter.endDateTo(), "endDateTo", "must not be before endDateFrom");
		PageRequest page = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				stableSort(pageable.getSort()));
		Instant now = clock.instant();
		return PageResponse.of(bannerRepository.findAll(matching(filter), page), banner -> BannerResponse.from(banner, now));
	}

	@Transactional(readOnly = true)
	public BannerImage image(Long id, String fileName) {
		return content(find(id), fileName);
	}

	/** Live banners only; the client chooses placement and page, never the eligibility rules or order. */
	@Transactional(readOnly = true)
	public PageResponse<PublicBannerResponse> listLive(PublicBannerFilter filter, Pageable pageable) {
		String placement = filter.placement() == null || filter.placement().isBlank() ? null
				: rules.requirePlacement(filter.placement());
		return PageResponse.of(bannerRepository.findDisplayable(placement, clock.instant(), pageable),
				PublicBannerResponse::from);
	}

	/** 404 unless the banner is live right now, so inactive, scheduled or deleted banners stay hidden. */
	@Transactional(readOnly = true)
	public BannerImage liveImage(Long id, String fileName) {
		Banner banner = bannerRepository.findById(id)
			.filter(candidate -> candidate.isDisplayableAt(clock.instant()))
			.orElseThrow(BannerExceptions::notFound);
		return content(banner, fileName);
	}

	private Banner find(Long id) {
		return bannerRepository.findById(id).orElseThrow(BannerExceptions::notFound);
	}

	/** Flushes so database checks fail inside this call and the response has the new updatedAt. */
	private Banner save(Banner banner) {
		return bannerRepository.saveAndFlush(banner);
	}

	private static void requireStatusPermission(CurrentActor actor) {
		if (!actor.has(Permissions.BANNER_CHANGE_STATUS)) {
			throw BannerExceptions.statusChangeForbidden();
		}
	}

	private BannerImage content(Banner banner, String fileName) {
		String stored = banner.imageFileName();
		if (!stored.equals(fileName)) {
			throw BannerExceptions.imageNotFound();
		}
		MediaFileType type = MediaFileType.byExtension(stored.substring(stored.lastIndexOf('.') + 1))
			.filter(IMAGE_TYPES::contains)
			.orElseThrow(BannerExceptions::imageNotFound);
		Resource resource = storage.get(banner.getImage());
		if (!resource.exists()) {
			throw BannerExceptions.imageNotFound();
		}
		return new BannerImage(resource, type.getMimeType());
	}

	/** PATCH field: {@code null} = omitted (skip); otherwise set the value, or null for an explicit JSON null. */
	private static <T> void apply(Optional<T> field, Consumer<T> setter) {
		if (field != null) {
			setter.accept(field.orElse(null));
		}
	}

	private static <T extends Comparable<? super T>> void requireOrdered(T from, T to, String field, String message) {
		if (from != null && to != null && to.compareTo(from) < 0) {
			throw new FieldValidationException(field, message);
		}
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

	/** Soft-deleted banners are excluded by {@code @SoftDelete}. */
	private static Specification<Banner> matching(BannerFilter filter) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.search() != null && !filter.search().isBlank()) {
				String pattern = "%" + escapeLike(filter.search().strip().toLowerCase(Locale.ROOT)) + "%";
				predicates.add(cb.like(cb.lower(root.get("title")), pattern, '\\'));
			}
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), BannerStatus.fromValue(filter.status())));
			}
			if (filter.type() != null) {
				predicates.add(cb.equal(root.get("type"), filter.type()));
			}
			if (filter.placement() != null) {
				predicates.add(cb.equal(root.get("placement"), filter.placement()));
			}
			if (filter.linkType() != null) {
				predicates.add(cb.equal(root.get("linkType"), BannerLinkType.fromValue(filter.linkType())));
			}
			if (filter.startDateFrom() != null) {
				predicates.add(cb.greaterThanOrEqualTo(root.<Instant>get("startDate"), filter.startDateFrom()));
			}
			if (filter.startDateTo() != null) {
				predicates.add(cb.lessThanOrEqualTo(root.<Instant>get("startDate"), filter.startDateTo()));
			}
			if (filter.endDateFrom() != null) {
				predicates.add(cb.greaterThanOrEqualTo(root.<Instant>get("endDate"), filter.endDateFrom()));
			}
			if (filter.endDateTo() != null) {
				predicates.add(cb.lessThanOrEqualTo(root.<Instant>get("endDate"), filter.endDateTo()));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	private static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

	/** A stored banner image to stream. */
	public record BannerImage(Resource resource, String mimeType) {
	}

}
