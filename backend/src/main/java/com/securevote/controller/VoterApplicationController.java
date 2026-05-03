package com.securevote.controller;

import com.securevote.model.VoterApplication;
import com.securevote.model.VoterProfile;
import com.securevote.repository.VoterApplicationRepository;
import com.securevote.repository.VoterProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/voter-applications")
@CrossOrigin("*")
public class VoterApplicationController {

    private final VoterApplicationRepository voterApplicationRepository;
    private final VoterProfileRepository voterProfileRepository;

    public VoterApplicationController(
        VoterApplicationRepository voterApplicationRepository,
        VoterProfileRepository voterProfileRepository
    ) {
        this.voterApplicationRepository = voterApplicationRepository;
        this.voterProfileRepository = voterProfileRepository;
    }

    @GetMapping
    public List<VoterApplication> getAllApplications() {
        return voterApplicationRepository.findAllByOrderBySubmittedAtDesc();
    }

    @PostMapping
    public VoterApplication createApplication(@RequestBody VoterApplication application) {
        String walletAddress = normalizeWallet(application.getWalletAddress());
        if (walletAddress.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet address is required");
        }
        if (isBlank(application.getFullName()) || isBlank(application.getDistrict())
            || isBlank(application.getLocalBody()) || isBlank(application.getWardNumber())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "All voter details are required");
        }
        if (voterApplicationRepository.existsByWalletAddressIgnoreCaseAndStatus(walletAddress, "PENDING")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A pending application already exists for this wallet");
        }

        application.setWalletAddress(walletAddress);
        application.setFullName(application.getFullName().trim());
        application.setDistrict(application.getDistrict().trim());
        application.setLocalBody(application.getLocalBody().trim());
        application.setWardNumber(application.getWardNumber().trim());
        application.setIdReferenceMasked(trimValue(application.getIdReferenceMasked()));
        application.setIdProofPath(trimValue(application.getIdProofPath()));
        application.setReviewNote("");
        application.setStatus("PENDING");
        application.setSubmittedAt(Instant.now());
        application.setReviewedAt(null);

        return voterApplicationRepository.save(application);
    }

    @PutMapping("/{id}/approve")
    public VoterApplication approveApplication(@PathVariable Long id, @RequestBody(required = false) Map<String, String> payload) {
        VoterApplication application = voterApplicationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        application.setStatus("APPROVED");
        application.setReviewedAt(Instant.now());
        application.setReviewNote(payload != null ? trimValue(payload.get("reviewNote")) : "");

        VoterProfile profile = new VoterProfile();
        profile.setWalletAddress(application.getWalletAddress());
        profile.setFullName(application.getFullName());
        profile.setDistrict(application.getDistrict());
        profile.setLocalBody(application.getLocalBody());
        profile.setWardNumber(application.getWardNumber());
        profile.setIdReferenceMasked(application.getIdReferenceMasked());
        voterProfileRepository.save(profile);

        return voterApplicationRepository.save(application);
    }

    @PutMapping("/{id}/reject")
    public VoterApplication rejectApplication(@PathVariable Long id, @RequestBody(required = false) Map<String, String> payload) {
        VoterApplication application = voterApplicationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        application.setStatus("REJECTED");
        application.setReviewedAt(Instant.now());
        application.setReviewNote(payload != null ? trimValue(payload.get("reviewNote")) : "");

        return voterApplicationRepository.save(application);
    }

    private String normalizeWallet(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private String trimValue(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}
