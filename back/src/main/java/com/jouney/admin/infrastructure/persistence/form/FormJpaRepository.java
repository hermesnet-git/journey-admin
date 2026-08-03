package com.jouney.admin.infrastructure.persistence.form;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FormJpaRepository extends JpaRepository<FormJpaEntity, UUID> {
}
