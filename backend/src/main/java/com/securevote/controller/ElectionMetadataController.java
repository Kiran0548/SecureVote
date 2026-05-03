package com.securevote.controller;

import com.securevote.model.ElectionMetadata;
import com.securevote.repository.ElectionMetadataRepository;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/elections/metadata")
@CrossOrigin("*")
public class ElectionMetadataController {

    private final ElectionMetadataRepository electionMetadataRepository;

    public ElectionMetadataController(ElectionMetadataRepository electionMetadataRepository) {
        this.electionMetadataRepository = electionMetadataRepository;
    }

    @GetMapping
    public List<ElectionMetadata> getAllMetadata() {
        return electionMetadataRepository.findAll();
    }

    @GetMapping("/{electionId}")
    public ElectionMetadata getMetadata(@PathVariable Long electionId) {
        return electionMetadataRepository.findById(electionId).orElse(null);
    }

    @PostMapping
    public ElectionMetadata saveMetadata(@RequestBody ElectionMetadata metadata) {
        return electionMetadataRepository.save(metadata);
    }

    @GetMapping("/summary")
    public Map<String, Object> getMetadataSummary() {
        List<ElectionMetadata> items = electionMetadataRepository.findAll();

        Map<String, Long> byType = items.stream()
            .map(ElectionMetadata::getElectionType)
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .collect(Collectors.groupingBy(
                value -> value,
                LinkedHashMap::new,
                Collectors.counting()
            ));

        Map<String, Long> byDistrict = items.stream()
            .map(ElectionMetadata::getDistrict)
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .collect(Collectors.groupingBy(
                value -> value,
                LinkedHashMap::new,
                Collectors.counting()
            ));

        long wardScoped = items.stream()
            .filter(item -> item.getWardNumber() != null && !item.getWardNumber().isBlank())
            .count();

        return Map.of(
            "totalMetadataRecords", items.size(),
            "electionTypes", byType,
            "districtCoverage", byDistrict,
            "wardScopedElections", wardScoped
        );
    }
}
