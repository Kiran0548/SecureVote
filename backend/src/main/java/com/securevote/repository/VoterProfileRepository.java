package com.securevote.repository;

import com.securevote.model.VoterProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoterProfileRepository extends JpaRepository<VoterProfile, String> {
}
