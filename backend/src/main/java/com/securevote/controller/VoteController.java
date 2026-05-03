package com.securevote.controller;

import com.securevote.model.VoteLog;
import com.securevote.repository.VoteRepository;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/vote")
@CrossOrigin("*")
public class VoteController {

    private final VoteRepository voteRepository;

    public VoteController(VoteRepository voteRepository) {
        this.voteRepository = voteRepository;
    }

    // Cast Vote
    @PostMapping
    public VoteLog castVote(@RequestBody VoteLog vote) {
        if (vote.getVoter() != null) {
            vote.setVoter(vote.getVoter().trim().toLowerCase());
        }
        if (vote.getCandidate() != null) {
            vote.setCandidate(vote.getCandidate().trim());
        }
        if (vote.getCreatedAt() == null) {
            vote.setCreatedAt(Instant.now());
        }
        return voteRepository.save(vote);
    }

    // Get All Votes
    @GetMapping
    public List<VoteLog> getVotes() {
        return voteRepository.findAll();
    }

    @GetMapping("/summary")
    public Map<String, Object> getVoteSummary() {
        List<VoteLog> votes = voteRepository.findAll();

        Map<String, Long> candidateBreakdown = votes.stream()
            .filter(vote -> vote.getCandidate() != null && !vote.getCandidate().isBlank())
            .collect(Collectors.groupingBy(
                VoteLog::getCandidate,
                LinkedHashMap::new,
                Collectors.counting()
            ));

        List<Map<String, Object>> recentVotes = votes.stream()
            .filter(vote -> vote.getCreatedAt() != null)
            .sorted(Comparator.comparing(VoteLog::getCreatedAt).reversed())
            .limit(5)
            .map(vote -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", vote.getId());
                item.put("candidate", Objects.toString(vote.getCandidate(), ""));
                item.put("electionId", vote.getElectionId());
                item.put("createdAt", vote.getCreatedAt().toString());
                item.put("voterPreview", maskWallet(vote.getVoter()));
                return item;
            })
            .toList();

        return Map.of(
            "totalVotes", votes.size(),
            "uniqueVoters", votes.stream()
                .map(VoteLog::getVoter)
                .filter(Objects::nonNull)
                .map(String::toLowerCase)
                .distinct()
                .count(),
            "candidateBreakdown", candidateBreakdown,
            "recentVotes", recentVotes
        );
    }

    private String maskWallet(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String normalized = value.trim();
        if (normalized.length() <= 10) {
            return normalized;
        }

        return normalized.substring(0, 6) + "..." + normalized.substring(normalized.length() - 4);
    }
}
