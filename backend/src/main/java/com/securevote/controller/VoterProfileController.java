package com.securevote.controller;

import com.securevote.model.VoterProfile;
import com.securevote.repository.VoterProfileRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
