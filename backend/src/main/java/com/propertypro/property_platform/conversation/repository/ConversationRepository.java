package com.propertypro.property_platform.conversation.repository;

import com.propertypro.property_platform.conversation.domain.Conversation;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

/** Every lookup is by a participant's user id; a conversation is never loaded by its own id alone. */
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

	Optional<Conversation> findByPropertyIdAndBuyerId(Long propertyId, Long buyerId);

	@Query("select c from Conversation c where c.id = :id and (c.buyerId = :userId or c.sellerId = :userId)")
	Optional<Conversation> findForParticipant(Long id, Long userId);

	/** Like {@link #findForParticipant}, row-locked until the transaction ends, so messages are numbered in order. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select c from Conversation c where c.id = :id and (c.buyerId = :userId or c.sellerId = :userId)")
	Optional<Conversation> findForParticipantForUpdate(Long id, Long userId);

	@Query(value = "select c from Conversation c where c.buyerId = :userId or c.sellerId = :userId "
			+ "order by c.lastMessageAt desc, c.id desc",
			countQuery = "select count(c) from Conversation c where c.buyerId = :userId or c.sellerId = :userId")
	Page<Conversation> findOfParticipant(Long userId, Pageable pageable);

}
