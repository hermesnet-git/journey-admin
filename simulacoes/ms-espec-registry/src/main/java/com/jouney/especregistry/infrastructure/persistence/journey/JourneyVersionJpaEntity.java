package com.jouney.especregistry.infrastructure.persistence.journey;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Mapeamento só-leitura de journey_version — tabela de propriedade do admin/back, sem migração
 * nem escrita alguma aqui. version_snapshot usa o mesmo formato de journey_publication.snapshot
 * (ambos serializam PublicationSnapshotRecord no admin/back). */
@Entity
@Table(name = "journey_version")
public class JourneyVersionJpaEntity {

    @Id
    @Column(name = "version_id")
    private UUID id;

    @Column(name = "journey_id", nullable = false)
    private UUID journeyId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "version_snapshot", nullable = false)
    private String snapshot;

    protected JourneyVersionJpaEntity() {
    }

    public UUID getJourneyId() {
        return journeyId;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public String getSnapshot() {
        return snapshot;
    }
}
