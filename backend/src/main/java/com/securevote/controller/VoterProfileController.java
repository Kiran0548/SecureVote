package com.securevote.controller;

import com.securevote.model.VoterProfile;
import com.securevote.repository.VoterProfileRepository;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/voters/profile")
@CrossOrigin("*")
public class VoterProfileController {

    private final VoterProfileRepository voterProfileRepository;

    public VoterProfileController(VoterProfileRepository voterProfileRepository) {
        this.voterProfileRepository = voterProfileRepository;
    }

    @GetMapping("/all")
    public List<VoterProfile> getAllProfiles() {
        return voterProfileRepository.findAll();
    }

    @GetMapping("/{walletAddress}")
    public VoterProfile getProfile(@PathVariable String walletAddress) {
        return voterProfileRepository.findById(walletAddress.toLowerCase()).orElse(null);
    }

    @PostMapping
    public VoterProfile saveProfile(@RequestBody VoterProfile profile) {
        profile.setWalletAddress(profile.getWalletAddress().toLowerCase());
        return voterProfileRepository.save(profile);
    }

    @DeleteMapping("/{walletAddress}")
    public void deleteProfile(@PathVariable String walletAddress) {
        voterProfileRepository.deleteById(walletAddress.toLowerCase());
    }

    @GetMapping("/summary")
    public Map<String, Object> getProfileSummary() {
        List<VoterProfile> profiles = voterProfileRepository.findAll();

        Map<String, Long> byDistrict = profiles.stream()
            .map(VoterProfile::getDistrict)
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .collect(Collectors.groupingBy(
                value -> value,
                LinkedHashMap::new,
                Collectors.counting()
            ));

        Map<String, Long> byWard = profiles.stream()
            .filter(profile -> profile.getDistrict() != null && !profile.getDistrict().isBlank())
            .filter(profile -> profile.getWardNumber() != null && !profile.getWardNumber().isBlank())
            .collect(Collectors.groupingBy(
                profile -> profile.getDistrict().trim() + " / Ward " + profile.getWardNumber().trim(),
                LinkedHashMap::new,
                Collectors.counting()
            ));

        return Map.of(
            "totalProfiles", profiles.size(),
            "districtCoverage", byDistrict,
            "wardCoverage", byWard,
            "profilesWithMaskedId", profiles.stream()
                .filter(profile -> profile.getIdReferenceMasked() != null && !profile.getIdReferenceMasked().isBlank())
                .count()
        );
    }
}
