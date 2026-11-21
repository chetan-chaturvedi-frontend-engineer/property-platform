package com.propertypro.property_platform.conversation.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.conversation.domain.Conversation;
import com.propertypro.property_platform.conversation.domain.Message;
import com.propertypro.property_platform.conversation.dto.ConversationResponse;
import com.propertypro.property_platform.conversation.dto.MessageResponse;
import com.propertypro.property_platform.conversation.dto.SendMessageRequest;
import com.propertypro.property_platform.conversation.dto.StartConversationRequest;
import com.propertypro.property_platform.conversation.dto.UnreadMessagesResponse;
import com.propertypro.property_platform.conversation.event.MessageSentEvent;
import com.propertypro.property_platform.conversation.exception.ConversationExceptions;
import com.propertypro.property_platform.conversation.repository.ConversationRepository;
import com.propertypro.property_platform.conversation.repository.MessageRepository;
import com.propertypro.property_platform.property.dto.PropertyReference;
import com.propertypro.property_platform.property.service.PropertyReferenceService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.user.dto.UserSummary;
import com.propertypro.property_platform.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static com.propertypro.property_platform.security.Permissions.CONVERSATION_CREATE;
import static com.propertypro.property_platform.security.Permissions.CONVERSATION_LIST;
import static com.propertypro.property_platform.security.Permissions.CONVERSATION_UPDATE;
import static com.propertypro.property_platform.security.Permissions.MESSAGE_CREATE;
import static com.propertypro.property_platform.security.Permissions.MESSAGE_LIST;

/**
 * Enquiry conversations between a buyer and a property's owner. Only the two participants can see or write to one;
 * everyone else gets 404, so conversation ids cannot be probed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationService {

	static final int DEFAULT_PAGE_SIZE = 50;
	static final int MAX_PAGE_SIZE = 100;
	private static final int PREVIEW_LENGTH = 100;

	private final ConversationRepository conversations;
	private final MessageRepository messages;
	private final PropertyReferenceService properties;
	private final UserAccountService users;
	private final ApplicationEventPublisher events;
	private final Clock clock;

	/** Result of {@link #start}: {@code created} is false when the buyer already had a conversation about it. */
	public record Started(ConversationResponse conversation, boolean created) {
	}

	/**
	 * "Enquire now": starts the conversation with the owner (or reuses the buyer's existing one) and sends the first
	 * message. Only published properties, and never one's own.
	 */
	@Transactional
	public Started start(CurrentActor actor, StartConversationRequest request) {
		requirePermission(actor, CONVERSATION_CREATE);
		requirePermission(actor, MESSAGE_CREATE);
		PropertyReference property = properties.findActive(request.propertyId()).filter(PropertyReference::isPublished)
			.orElseThrow(() -> new FieldValidationException("propertyId", "must be a published property"));
		if (property.ownerId().equals(actor.userId())) {
			throw new FieldValidationException("propertyId", "must not be your own property");
		}
		boolean created = false;
		Conversation conversation = conversations.findByPropertyIdAndBuyerId(property.id(), actor.userId()).orElse(null);
		if (conversation == null) {
			try {
				conversation = conversations.saveAndFlush(
						new Conversation(property.id(), actor.userId(), property.ownerId(), clock.instant()));
				created = true;
			}
			catch (DataIntegrityViolationException ex) {
				// A parallel request started it first: use that one.
				conversation = conversations.findByPropertyIdAndBuyerId(property.id(), actor.userId())
					.orElseThrow(() -> ex);
			}
		}
		Conversation locked = lock(conversation.getId(), actor);
		addMessage(locked, actor, request.message(), property);
		return new Started(summarise(List.of(locked), actor.userId()).get(0), created);
	}

	@Transactional(readOnly = true)
	public PageResponse<ConversationResponse> list(CurrentActor actor, Pageable pageable) {
		requirePermission(actor, CONVERSATION_LIST);
		Page<Conversation> page = conversations.findOfParticipant(actor.userId(),
				PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
		List<ConversationResponse> content = summarise(page.getContent(), actor.userId());
		return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(),
				page.getTotalPages());
	}

	/**
	 * Messages of one conversation, oldest first. No cursor: the newest {@code size}. {@code after}: messages newer
	 * than that id (polling). {@code before}: the {@code size} messages older than that id (scrolling back).
	 */
	@Transactional(readOnly = true)
	public List<MessageResponse> messages(CurrentActor actor, Long conversationId, Long before, Long after,
			Integer size) {
		requirePermission(actor, MESSAGE_LIST);
		Conversation conversation = find(conversationId, actor);
		PageRequest page = PageRequest.of(0, clampSize(size));
		List<Message> found;
		if (after != null) {
			found = messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(conversation.getId(), after, page);
		}
		else {
			List<Message> newestFirst = before != null
					? messages.findByConversationIdAndIdLessThanOrderByIdDesc(conversation.getId(), before, page)
					: messages.findByConversationIdOrderByIdDesc(conversation.getId(), page);
			found = new ArrayList<>(newestFirst);
			Collections.reverse(found);
		}
		return found.stream().map(m -> MessageResponse.from(m, actor.userId())).toList();
	}

	@Transactional
	public MessageResponse send(CurrentActor actor, Long conversationId, SendMessageRequest request) {
		requirePermission(actor, MESSAGE_CREATE);
		Conversation conversation = lock(conversationId, actor);
		PropertyReference property = properties.findAll(Set.of(conversation.getPropertyId()))
			.get(conversation.getPropertyId());
		return MessageResponse.from(addMessage(conversation, actor, request.body(), property), actor.userId());
	}

	/** Marks everything in the conversation as read by the caller. Idempotent; never moves the marker back. */
	@Transactional
	public void markRead(CurrentActor actor, Long conversationId) {
		requirePermission(actor, CONVERSATION_UPDATE);
		Conversation conversation = lock(conversationId, actor);
		conversation.markRead(actor.userId(), messages.maxIdOf(conversation.getId()));
		conversations.save(conversation);
	}

	@Transactional(readOnly = true)
	public UnreadMessagesResponse unreadCount(CurrentActor actor) {
		requirePermission(actor, CONVERSATION_LIST);
		return new UnreadMessagesResponse(messages.countUnread(actor.userId()));
	}

	/** Saves the message, moves the conversation up both inboxes and tells the recipient if this is their first unread. */
	private Message addMessage(Conversation conversation, CurrentActor actor, String body, PropertyReference property) {
		Long recipientId = conversation.otherPartyOf(actor.userId());
		boolean recipientHadUnread = !messages.countUnreadByConversation(recipientId, List.of(conversation.getId()))
			.isEmpty();
		Message message = messages.saveAndFlush(new Message(conversation.getId(), actor.userId(), body.strip()));
		conversation.touch(message.getCreatedAt());
		conversation.markRead(actor.userId(), message.getId());
		conversations.save(conversation);
		if (!recipientHadUnread) {
			String senderName = users.findSummaries(Set.of(actor.userId())).getOrDefault(actor.userId(),
					new UserSummary(actor.userId(), "Someone", null, null)).fullName();
			events.publishEvent(new MessageSentEvent(conversation.getId(), conversation.getPropertyId(),
					property == null ? "a property" : property.projectName(), recipientId, senderName,
					preview(message.getBody())));
		}
		log.info("Message sent conversationId={} messageId={} senderId={}", conversation.getId(), message.getId(),
				actor.userId());
		return message;
	}

	private List<ConversationResponse> summarise(List<Conversation> found, Long viewerId) {
		if (found.isEmpty()) {
			return List.of();
		}
		List<Long> ids = found.stream().map(Conversation::getId).toList();
		Map<Long, PropertyReference> propertyRefs = properties
			.findAll(found.stream().map(Conversation::getPropertyId).collect(Collectors.toSet()));
		Map<Long, UserSummary> names = users
			.findSummaries(found.stream().map(c -> c.otherPartyOf(viewerId)).collect(Collectors.toSet()));
		Map<Long, Message> latest = messages.findLatestOf(ids).stream()
			.collect(Collectors.toMap(Message::getConversationId, m -> m));
		Map<Long, Long> unread = new HashMap<>();
		messages.countUnreadByConversation(viewerId, ids).forEach(row -> unread.put((Long) row[0], (Long) row[1]));
		return found.stream().map(c -> {
			PropertyReference property = propertyRefs.get(c.getPropertyId());
			UserSummary other = names.get(c.otherPartyOf(viewerId));
			Message last = latest.get(c.getId());
			return new ConversationResponse(c.getId(),
					new ConversationResponse.PropertyInfo(c.getPropertyId(),
							property == null ? null : property.projectName(), property == null ? null : property.slug()),
					new ConversationResponse.Party(c.otherPartyOf(viewerId), other == null ? null : other.fullName()),
					c.isBuyer(viewerId) ? "buyer" : "seller",
					last == null ? null : new ConversationResponse.LastMessage(last.getId(), last.getBody(),
							last.getSenderId().equals(viewerId), last.getCreatedAt()),
					unread.getOrDefault(c.getId(), 0L), c.getLastMessageAt());
		}).toList();
	}

	private Conversation find(Long id, CurrentActor actor) {
		return conversations.findForParticipant(id, actor.userId()).orElseThrow(ConversationExceptions::notFound);
	}

	private Conversation lock(Long id, CurrentActor actor) {
		return conversations.findForParticipantForUpdate(id, actor.userId())
			.orElseThrow(ConversationExceptions::notFound);
	}

	private static int clampSize(Integer size) {
		return size == null ? DEFAULT_PAGE_SIZE : Math.max(1, Math.min(size, MAX_PAGE_SIZE));
	}

	private static String preview(String body) {
		String oneLine = body.replaceAll("\\s+", " ");
		return oneLine.length() <= PREVIEW_LENGTH ? oneLine : oneLine.substring(0, PREVIEW_LENGTH - 1) + "…";
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw ConversationExceptions.actionForbidden();
		}
	}

}
