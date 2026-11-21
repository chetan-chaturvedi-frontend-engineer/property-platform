package com.propertypro.property_platform.conversation.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.conversation.dto.ConversationResponse;
import com.propertypro.property_platform.conversation.dto.MessageResponse;
import com.propertypro.property_platform.conversation.dto.SendMessageRequest;
import com.propertypro.property_platform.conversation.dto.StartConversationRequest;
import com.propertypro.property_platform.conversation.dto.UnreadMessagesResponse;
import com.propertypro.property_platform.conversation.service.ConversationService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The caller's enquiry conversations (mobile app): buyers asking owners, and owners answering. */
@RestController
@RequestMapping(path = "/api/v1/conversations", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Conversations", description = "Enquiry chat between a buyer and a property owner")
@Validated
@RequiredArgsConstructor
public class ConversationController {

	private final ConversationService conversationService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Enquire now (CONVERSATION_CREATE, MESSAGE_CREATE)", description = """
			Starts the caller's conversation with the owner of a published property and sends the first message. \
			201 when new; 200 when the caller already had one, which then just gets the message. 400 for an \
			unpublished or own property.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<ConversationResponse> start(CurrentActor actor,
			@Valid @RequestBody StartConversationRequest request) {
		rateLimiter.acquire("conversation:create:user:" + actor.userId(), limits.conversationCreateUser());
		ConversationService.Started started = conversationService.start(actor, request);
		return ResponseEntity.status(started.created() ? HttpStatus.CREATED : HttpStatus.OK)
			.body(started.conversation());
	}

	@Operation(summary = "My conversations (CONVERSATION_LIST)", description = """
			Conversations the caller takes part in, as buyer or owner, most recently active first, each with the \
			last message and the caller's unread count. page (zero-based) and size (max 100).""")
	@GetMapping
	public PageResponse<ConversationResponse> list(CurrentActor actor, Pageable pageable) {
		return conversationService.list(actor, pageable);
	}

	@Operation(summary = "Unread messages (CONVERSATION_LIST)", description = "Across all conversations, for the badge.")
	@GetMapping("/unread-count")
	public UnreadMessagesResponse unreadCount(CurrentActor actor) {
		return conversationService.unreadCount(actor);
	}

	@Operation(summary = "Messages (MESSAGE_LIST)", description = """
			Oldest first. No cursor: the newest `size`. `after=<id>`: newer than that message (polling). \
			`before=<id>`: the `size` older than it. size default 50, max 100. 404 unless the caller takes part.""")
	@GetMapping("/{id}/messages")
	public List<MessageResponse> messages(CurrentActor actor, @PathVariable @Positive Long id,
			@RequestParam(required = false) @Positive Long before, @RequestParam(required = false) @Positive Long after,
			@RequestParam(required = false) Integer size) {
		return conversationService.messages(actor, id, before, after, size);
	}

	@Operation(summary = "Send a message (MESSAGE_CREATE)", description = "Up to 2000 characters. 404 unless the caller takes part.")
	@PostMapping(path = "/{id}/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public MessageResponse send(CurrentActor actor, @PathVariable @Positive Long id,
			@Valid @RequestBody SendMessageRequest request) {
		rateLimiter.acquire("message:write:user:" + actor.userId(), limits.messageWriteUser());
		return conversationService.send(actor, id, request);
	}

	@Operation(summary = "Mark read (CONVERSATION_UPDATE)", description = """
			Everything in the conversation counts as read by the caller. Idempotent.""")
	@PostMapping("/{id}/read")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void markRead(CurrentActor actor, @PathVariable @Positive Long id) {
		rateLimiter.acquire("message:write:user:" + actor.userId(), limits.messageWriteUser());
		conversationService.markRead(actor, id);
	}

}
