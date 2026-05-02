// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ISemaphore } from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

contract SecureVote {
    // Owner of the contract
    address public owner;

    ISemaphore public semaphore;
    uint256 public groupId;

    // Whitelist mapping (Managed by admin)
    mapping(address => bool) public whitelist;

    // Track if address has registered an identity
    mapping(address => bool) public hasRegisteredIdentity;

    // Candidate struct to hold name and logo image URL
    struct Candidate {
        string name;
        string logoUrl;
        string manifestoHash;
        string videoHash;
    }

    // Election struct to hold metadata
    struct Election {
        uint256 id;
        string title;
        Candidate[] candidates;
        ElectionState state;
        uint256 startTime;
        uint256 endTime;
    }

    enum ElectionType { Global, WardBased }

    struct ElectionMetadata {
        ElectionType electionType;
        string district;
        string localBody;
        string wardNumber;
        bool exists;
    }

    struct VoterWardProfile {
        bool exists;
        string district;
        string localBody;
        string wardNumber;
    }

    // Mapping from election ID to Election data
    mapping(uint256 => Election) public elections;
    mapping(uint256 => ElectionMetadata) private electionMetadataById;
    mapping(address => VoterWardProfile) private voterWardProfiles;
    
    // Mapping from election ID => candidate index => votes
    mapping(uint256 => mapping(uint256 => uint256)) private electionVotes;

    // Election lifecycle tracking
    enum ElectionState { NotStarted, Ongoing, Ended }
    uint256 public electionCount;

    // Historical Election Summary (Simplified for results page)
    struct PastElection {
        uint256 id;
        string title;
        string winnerName;
        uint256 winnerVotes;
        uint256 totalVotes;
    }
    
    PastElection[] public pastElections;

    // Events
    event Whitelisted(address indexed user);
    event Voted(address indexed voter, uint256 indexed electionId, uint256 indexed candidateIndex);
    event ElectionCreated(uint256 indexed electionId, string title);
    event ElectionStateChanged(uint256 indexed electionId, ElectionState newState);
    event ElectionMetadataStored(uint256 indexed electionId, ElectionType electionType, string district, string localBody, string wardNumber);
    event VoterProfileUpdated(address indexed user, string district, string localBody, string wardNumber);

    constructor(address _semaphoreAddress) {
        owner = msg.sender;
        semaphore = ISemaphore(_semaphoreAddress);
        groupId = semaphore.createGroup(address(this));
    }

    // Add address to whitelist
    function addToWhitelist(address _user) public {
        require(msg.sender == owner, "Only owner can whitelist");
        whitelist[_user] = true;
        emit Whitelisted(_user);
    }

    function approveVoter(
        address _user,
        string memory _district,
        string memory _localBody,
        string memory _wardNumber
    ) public {
        require(msg.sender == owner, "Only owner can whitelist");

        whitelist[_user] = true;
        voterWardProfiles[_user] = VoterWardProfile({
            exists: true,
            district: _district,
            localBody: _localBody,
            wardNumber: _wardNumber
        });

        emit Whitelisted(_user);
        emit VoterProfileUpdated(_user, _district, _localBody, _wardNumber);
    }

    function setVoterProfile(
        address _user,
        string memory _district,
        string memory _localBody,
        string memory _wardNumber
    ) public {
        require(msg.sender == owner, "Only owner can update profiles");

        voterWardProfiles[_user] = VoterWardProfile({
            exists: true,
            district: _district,
            localBody: _localBody,
            wardNumber: _wardNumber
        });

        emit VoterProfileUpdated(_user, _district, _localBody, _wardNumber);
    }

    // Check if address is whitelisted
    function isWhitelisted(address _user) public view returns (bool) {
        return whitelist[_user];
    }

    // Voter registers their cryptographic identity
    function registerIdentity(uint256 identityCommitment) public {
        require(whitelist[msg.sender], "Not whitelisted by Admin");
        require(!hasRegisteredIdentity[msg.sender], "Already registered an identity");
        
        hasRegisteredIdentity[msg.sender] = true;
        semaphore.addMember(groupId, identityCommitment);
    }

    // Create a new election
    function createElection(
        string memory _title,
        string[] memory _candidates, 
        string[] memory _logoUrls, 
        string[] memory _manifestos, 
        string[] memory _videos, 
        uint256 _startTime, 
        uint256 _endTime
    ) public {
        _createElection(
            _title,
            _candidates,
            _logoUrls,
            _manifestos,
            _videos,
            _startTime,
            _endTime,
            ElectionType.Global,
            "",
            "",
            ""
        );
    }

    function createElectionWithMetadata(
        string memory _title,
        string[] memory _candidates,
        string[] memory _logoUrls,
        string[] memory _manifestos,
        string[] memory _videos,
        uint256 _startTime,
        uint256 _endTime,
        uint8 _electionType,
        string memory _district,
        string memory _localBody,
        string memory _wardNumber
    ) public {
        require(_electionType <= uint8(ElectionType.WardBased), "Invalid election type");
        _createElection(
            _title,
            _candidates,
            _logoUrls,
            _manifestos,
            _videos,
            _startTime,
            _endTime,
            ElectionType(_electionType),
            _district,
            _localBody,
            _wardNumber
        );
    }

    function _createElection(
        string memory _title,
        string[] memory _candidates,
        string[] memory _logoUrls,
        string[] memory _manifestos,
        string[] memory _videos,
        uint256 _startTime,
        uint256 _endTime,
        ElectionType _electionType,
        string memory _district,
        string memory _localBody,
        string memory _wardNumber
    ) internal {
        require(msg.sender == owner, "Only owner can create elections");
        require(_candidates.length == _logoUrls.length, "Mismatch: candidates/logos");
        require(_candidates.length == _manifestos.length, "Mismatch: candidates/manifestos");
        require(_candidates.length == _videos.length, "Mismatch: candidates/videos");
        require(_startTime < _endTime, "Invalid time range");
        if (_electionType == ElectionType.WardBased) {
            require(bytes(_district).length > 0, "District required");
            require(bytes(_localBody).length > 0, "Local body required");
            require(bytes(_wardNumber).length > 0, "Ward number required");
        }

        electionCount++;
        Election storage newElection = elections[electionCount];
        newElection.id = electionCount;
        newElection.title = _title;
        newElection.state = ElectionState.Ongoing;
        newElection.startTime = _startTime;
        newElection.endTime = _endTime;

        for (uint i = 0; i < _candidates.length; i++) {
            newElection.candidates.push(Candidate(_candidates[i], _logoUrls[i], _manifestos[i], _videos[i]));
        }

        electionMetadataById[electionCount] = ElectionMetadata({
            electionType: _electionType,
            district: _district,
            localBody: _localBody,
            wardNumber: _wardNumber,
            exists: true
        });

        emit ElectionCreated(electionCount, _title);
        emit ElectionStateChanged(electionCount, ElectionState.Ongoing);
        emit ElectionMetadataStored(electionCount, _electionType, _district, _localBody, _wardNumber);
    }

    // Manual termination of a specific election
    function terminateElection(uint256 _electionId) public {
        require(msg.sender == owner, "Only owner can terminate");
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        require(elections[_electionId].state == ElectionState.Ongoing, "Election not ongoing");
        
        elections[_electionId].state = ElectionState.Ended;
        
        // Save to history
        _archiveElection(_electionId);
        
        emit ElectionStateChanged(_electionId, ElectionState.Ended);
    }

    function _archiveElection(uint256 _electionId) internal {
        Election storage e = elections[_electionId];
        uint256 highestVotes = 0;
        uint256 winnerIdx = 0;
        uint256 total = 0;
        
        for (uint i = 0; i < e.candidates.length; i++) {
            uint256 v = electionVotes[_electionId][i];
            total += v;
            if (v > highestVotes) {
                highestVotes = v;
                winnerIdx = i;
            }
        }
        
        pastElections.push(PastElection({
            id: _electionId,
            title: e.title,
            winnerName: e.candidates.length > 0 ? e.candidates[winnerIdx].name : "N/A",
            winnerVotes: highestVotes,
            totalVotes: total
        }));
    }

    // Get election metadata and candidates
    function getElectionCandidates(uint256 _electionId) public view returns (Candidate[] memory) {
        return elections[_electionId].candidates;
    }

    // Get votes for a specific candidate in an election
    function getVotes(uint256 _electionId, uint256 _candidateIndex) public view returns (uint256) {
        return electionVotes[_electionId][_candidateIndex];
    }

    function getElectionMetadata(uint256 _electionId) public view returns (uint8, string memory, string memory, string memory) {
        ElectionMetadata storage meta = electionMetadataById[_electionId];
        return (uint8(meta.electionType), meta.district, meta.localBody, meta.wardNumber);
    }

    function getVoterProfile(address _user) public view returns (bool, string memory, string memory, string memory) {
        VoterWardProfile storage profile = voterWardProfiles[_user];
        return (profile.exists, profile.district, profile.localBody, profile.wardNumber);
    }

    function canVoteInElection(address _user, uint256 _electionId) public view returns (bool) {
        if (!whitelist[_user]) {
            return false;
        }

        ElectionMetadata storage meta = electionMetadataById[_electionId];
        if (!meta.exists || meta.electionType == ElectionType.Global) {
            return true;
        }

        VoterWardProfile storage profile = voterWardProfiles[_user];
        if (!profile.exists) {
            return false;
        }

        return (
            keccak256(bytes(profile.district)) == keccak256(bytes(meta.district)) &&
            keccak256(bytes(profile.localBody)) == keccak256(bytes(meta.localBody)) &&
            keccak256(bytes(profile.wardNumber)) == keccak256(bytes(meta.wardNumber))
        );
    }

    // Cast vote anonymously using zk-SNARKs
    function vote(
        uint256 _electionId,
        uint256 _candidateIndex,
        ISemaphore.SemaphoreProof calldata proof
    ) public {
        Election storage e = elections[_electionId];
        require(e.state == ElectionState.Ongoing, "Election is not active");
        require(block.timestamp >= e.startTime && block.timestamp <= e.endTime, "Outside voting window");
        require(_candidateIndex < e.candidates.length, "Invalid candidate index");
        require(canVoteInElection(msg.sender, _electionId), "Voter is not eligible for this election");
        
        // Strictly enforce one vote per voter per election using electionId as scope
        require(proof.scope == _electionId, "Proof scope must match election ID");
        require(proof.message == _candidateIndex, "Proof message must match candidate index");

        semaphore.validateProof(groupId, proof);

        electionVotes[_electionId][_candidateIndex] += 1;
        
        emit Voted(msg.sender, _electionId, _candidateIndex);
    }

    // Get all past election summaries
    function getPastElections() public view returns (PastElection[] memory) {
        return pastElections;
    }
}
