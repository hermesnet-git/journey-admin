package com.jouney.especregistry.infrastructure.persistence.journey;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Mapeamento só-leitura de journey_publication — tabela de propriedade do admin/back, sem
 * migração nem escrita alguma aqui. */
@Entity
@Table(name = "journey_publication")
public class PublicationJpaEntity {

    @Id
    @Column(name = "publication_id")
    private UUID id;

    @Column(name = "journey_id", nullable = false)
    private UUID journeyId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String snapshot;

    protected PublicationJpaEntity() {
    }

    public UUID getJourneyId() {
        return journeyId;
    }

    public String getSnapshot() {
        return snapshot;
    }
}
