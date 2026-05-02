package com.securevote.repository;

import com.securevote.model.ElectionMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ElectionMetadataRepository extends JpaRepository<ElectionMetadata, Long> {
}
