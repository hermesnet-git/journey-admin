package com.jouney.admin.application.messaging;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.messaging.ClusterInUseException;
import com.jouney.admin.domain.messaging.CredentialInUseException;
import com.jouney.admin.domain.messaging.CredentialReference;
import com.jouney.admin.domain.messaging.CredentialReferenceRepository;
import com.jouney.admin.domain.messaging.MessagingCluster;
import com.jouney.admin.domain.messaging.MessagingClusterNotFoundException;
import com.jouney.admin.domain.messaging.MessagingClusterRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Exclui um cluster e, em cascata, todas as suas credenciais (REQ-14.01.004) — desde que nem o
 * cluster nem nenhuma de suas credenciais esteja referenciado pelo conector de uma jornada
 * publicada, caso em que a exclusão inteira é bloqueada com o motivo específico.
 */
@Service
public class DeleteCluster {

    private final MessagingClusterRepository clusterRepository;
    private final CredentialReferenceRepository credentialRepository;
    private final MessagingReferenceInUsePort referenceInUsePort;
    private final RecordAuditEvent recordAuditEvent;

    public DeleteCluster(MessagingClusterRepository clusterRepository,
                          CredentialReferenceRepository credentialRepository,
                          MessagingReferenceInUsePort referenceInUsePort, RecordAuditEvent recordAuditEvent) {
        this.clusterRepository = clusterRepository;
        this.credentialRepository = credentialRepository;
        this.referenceInUsePort = referenceInUsePort;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID id) {
        MessagingCluster cluster = clusterRepository.findById(id)
                .orElseThrow(() -> new MessagingClusterNotFoundException(id));

        Optional<String> clusterJourney = referenceInUsePort.findPublishedJourneyNameReferencingCluster(id);
        if (clusterJourney.isPresent()) {
            throw new ClusterInUseException("Não é possível excluir o cluster \"" + cluster.getName()
                    + "\": ele está associado à jornada publicada \"" + clusterJourney.get() + "\".");
        }

        List<CredentialReference> credentials = credentialRepository.search(null, id);
        for (CredentialReference credential : credentials) {
            Optional<String> credentialJourney =
                    referenceInUsePort.findPublishedJourneyNameReferencingCredential(credential.getReferenceName());
            if (credentialJourney.isPresent()) {
                throw new CredentialInUseException("Não é possível excluir o cluster \"" + cluster.getName()
                        + "\": a credencial \"" + credential.getReferenceName()
                        + "\" está associada à jornada publicada \"" + credentialJourney.get() + "\".");
            }
        }

        for (CredentialReference credential : credentials) {
            credentialRepository.deleteById(credential.getId());
            recordAuditEvent.record("CREDENTIAL_DELETE", "CREDENTIAL_REFERENCE", credential.getId(), AuditResult.SUCCESS);
        }

        clusterRepository.deleteById(id);
        recordAuditEvent.record("CLUSTER_DELETE", "MESSAGING_CLUSTER", id, AuditResult.SUCCESS);
    }
}
