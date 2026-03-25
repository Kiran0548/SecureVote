package com.securevote.controller;

import com.securevote.model.VoteLog;
import com.securevote.repository.VoteRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        return voteRepository.save(vote);
    }

    // Get All Votes
    @GetMapping
    public List<VoteLog> getVotes() {
        return voteRepository.findAll();
    }
}