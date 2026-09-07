package com.jouney.especregistry.sdui;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recebe do admin/back, na hora do publish de uma jornada, um envelope por User Task com tela
 * (seção 14.1 do catálogo) e grava no Strapi via {@link SnapshotRepository}. O GET
 * {@code .../latest} é só pra testar a leitura isolada — quem de fato consome em runtime é
 * StepResolver/FormSpecController.
 */
@RestController
@RequestMapping("/api/v1/sdui-snapshots")
public class SduiSnapshotController {

    private final SnapshotRepository snapshotRepository;

    public SduiSnapshotController(SnapshotRepository snapshotRepository) {
        this.snapshotRepository = snapshotRepository;
    }

    @PostMapping
    public ResponseEntity<Void> receive(@RequestBody List<SduiScreenEnvelope> envelopes) {
        envelopes.forEach(snapshotRepository::save);
        return ResponseEntity.noContent().build();
    }

    // Chamado pelo admin/back antes de publicar de verdade (EspecRegistrySduiAdapter.isAvailable())
    // — falha rápido com uma mensagem clara em vez de só descobrir depois de já ter feito o deploy
    // no runtime.
    @GetMapping("/health")
    public ResponseEntity<Void> health() {
        return snapshotRepository.isReachable()
                ? ResponseEntity.ok().build()
                : ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }

    @GetMapping("/{journeyId}/{screenId}/latest")
    public SduiScreenEnvelope latest(@PathVariable UUID journeyId, @PathVariable String screenId) {
        return snapshotRepository.findLatestPublished(journeyId, screenId)
                .orElseThrow(() -> new IllegalStateException(
                        "Nenhum snapshot publicado encontrado para " + journeyId + "/" + screenId));
    }
}
