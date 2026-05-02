package com.securevote.controller;

import com.securevote.model.ElectionMetadata;
import com.securevote.repository.ElectionMetadataRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
