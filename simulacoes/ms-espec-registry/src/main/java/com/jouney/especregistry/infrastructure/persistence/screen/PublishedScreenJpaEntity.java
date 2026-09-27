package com.jouney.especregistry.infrastructure.persistence.screen;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Tela publicada de uma User Task — tabela deste serviço (schema espec_registry, migrada pelo
 * Flyway daqui), ao contrário de journey_version/journey_publication, que são do admin/back. */
@Entity
@Table(schema = "espec_registry", name = "published_screen")
public class PublishedScreenJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "screen_id")
    private UUID id;

    @Column(name = "journey_id", nullable = false)
    private UUID journeyId;

    @Column(name = "journey_version", nullable = false)
    private int journeyVersion;

    @Column(name = "ui_step_id", nullable = false)
    private String uiStepId;

    @Column(nullable = false)
    private String status;

    @Column(name = "integrity_hash", nullable = false)
    private String integrityHash;

    @Column(name = "published_at", nullable = false)
    private OffsetDateTime publishedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String envelope;

    protected PublishedScreenJpaEntity() {
    }

    public PublishedScreenJpaEntity(UUID journeyId, int journeyVersion, String uiStepId, String integrityHash,
                                    OffsetDateTime publishedAt, String envelope) {
        this.journeyId = journeyId;
        this.journeyVersion = journeyVersion;
        this.uiStepId = uiStepId;
        this.status = "published";
        this.integrityHash = integrityHash;
        this.publishedAt = publishedAt;
        this.envelope = envelope;
    }

    public String getEnvelope() {
        return envelope;
    }
}
