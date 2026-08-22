package com.jouney.admin.interfaces.messaging;

import com.jouney.admin.application.messaging.CreateCluster;
import com.jouney.admin.application.messaging.DeleteCluster;
import com.jouney.admin.application.messaging.FindClusters;
import com.jouney.admin.application.messaging.GetCluster;
import com.jouney.admin.application.messaging.UpdateCluster;
import com.jouney.admin.domain.messaging.ClusterType;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Catálogo de clusters/brokers de mensageria corporativos (FT-14, US-14.01). Leitura liberada pra
 * qualquer papel autenticado (o desenhista de jornada seleciona um cluster já cadastrado);
 * escrita restrita a ADMIN (REQ-14.03.001).
 */
@RestController
@RequestMapping("/api/v1/messaging-clusters")
public class MessagingClusterController {

    private final CreateCluster createCluster;
    private final UpdateCluster updateCluster;
    private final GetCluster getCluster;
    private final FindClusters findClusters;
    private final DeleteCluster deleteCluster;

    public MessagingClusterController(CreateCluster createCluster, UpdateCluster updateCluster,
                                       GetCluster getCluster, FindClusters findClusters,
                                       DeleteCluster deleteCluster) {
        this.createCluster = createCluster;
        this.updateCluster = updateCluster;
        this.getCluster = getCluster;
        this.findClusters = findClusters;
        this.deleteCluster = deleteCluster;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping
    public List<ClusterResponse> list(@RequestParam(required = false) String q,
                                       @RequestParam(required = false) ClusterType type) {
        return findClusters.execute(q, type).stream().map(ClusterResponse::from).toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ClusterResponse> create(@Valid @RequestBody ClusterInput input) {
        var cluster = createCluster.execute(input.name(), input.type(), input.connectionAddress());
        return ResponseEntity.status(HttpStatus.CREATED).body(ClusterResponse.from(cluster));
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/{clusterId}")
    public ClusterResponse get(@PathVariable UUID clusterId) {
        return ClusterResponse.from(getCluster.execute(clusterId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{clusterId}")
    public ClusterResponse update(@PathVariable UUID clusterId, @Valid @RequestBody ClusterInput input) {
        return ClusterResponse.from(
                updateCluster.execute(clusterId, input.name(), input.type(), input.connectionAddress()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{clusterId}")
    public ResponseEntity<Void> delete(@PathVariable UUID clusterId) {
        deleteCluster.execute(clusterId);
        return ResponseEntity.noContent().build();
    }
}
