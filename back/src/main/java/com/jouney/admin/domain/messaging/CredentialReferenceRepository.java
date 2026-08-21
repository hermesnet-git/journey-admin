package com.jouney.admin.domain.messaging;

import com.jouney.admin.domain.Status;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CredentialReferenceRepository {

    CredentialReference save(CredentialReference credential);

    Optional<CredentialReference> findById(UUID id);

    List<CredentialReference> search(String query, UUID clusterId, Status status);
}
