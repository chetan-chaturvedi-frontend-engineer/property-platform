package com.propertypro.property_platform.transaction.repository;

import com.propertypro.property_platform.transaction.domain.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

	/** Locks the row so a verify call and the webhook for the same order cannot both activate it. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT p FROM Payment p WHERE p.providerOrderId = :orderId")
	Optional<Payment> findByProviderOrderIdForUpdate(String orderId);

}
