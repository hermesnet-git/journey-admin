package com.jouney.mockapirest;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MockEndpointConfigRepository extends JpaRepository<MockEndpointConfig, String> {
}
