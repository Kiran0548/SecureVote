package com.securevote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.securevote.model.VoteLog;

public interface VoteRepository extends JpaRepository<VoteLog, Long> {
}