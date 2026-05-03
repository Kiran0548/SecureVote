package com.securevote.repository;

import com.securevote.model.VoterApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VoterApplicationRepository extends JpaRepository<VoterApplication, Long> {
    boolean existsByWalletAddressIgnoreCaseAndStatus(String walletAddress, String status);
    List<VoterApplication> findAllByOrderBySubmittedAtDesc();
}
