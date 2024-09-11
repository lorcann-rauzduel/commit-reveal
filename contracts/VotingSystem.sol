// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";

contract VotingSystem is Ownable {
    uint256 private highestVotes;
    string public winner;
    uint256 public immutable votingStart;
    uint256 public immutable votingEnd;
    
    mapping(address => Vote) private votes;
    mapping(bytes32 => uint256) public voteCounts;
    mapping(string => bool) public validOptions;

    struct Vote {
        bytes32 hash;
        bool revealed;
    }

    error InvalidVote();
    error VoteAlreadyCommitted();
    error VotingNotStarted();
    error VotingEnded();
    error VotingNotEnded();
    error InvalidVoteOption();

    event VoteCommitted(address indexed voter, bytes32 indexed hash);
    event VoteRevealed(address indexed voter, bytes32 voteHash);
    event WinnerUpdated(bytes32 newWinnerHash);

    constructor(uint256 _votingPeriodInMinutes) Ownable(msg.sender) {
        votingStart = block.timestamp;
        votingEnd = votingStart + (_votingPeriodInMinutes * 1 minutes);
    }

    function commit(bytes32 _hash) external {
        require(block.timestamp > votingStart,  VotingNotStarted());
        require(block.timestamp < votingEnd, VotingEnded());
        require(votes[msg.sender].hash == 0, VoteAlreadyCommitted());

        votes[msg.sender].hash = _hash;
        emit VoteCommitted(msg.sender, _hash);
    }

    function reveal(string calldata _vote, string calldata salt) external {

        require(block.timestamp > votingEnd, VotingNotEnded());
        require(validOptions[_vote], InvalidVote());

        bytes32 voteHash = keccak256(abi.encodePacked(_vote, salt));
        require(votes[msg.sender].hash == voteHash && !votes[msg.sender].revealed, InvalidVote());

        votes[msg.sender].revealed = true;
        uint256 count = ++voteCounts[voteHash];

        if (count > highestVotes) {
            highestVotes = count;
            winner = _vote;
            emit WinnerUpdated(voteHash);
        }

        emit VoteRevealed(msg.sender, voteHash);
    }

    function addOption(string calldata option) external onlyOwner {
        validOptions[option] = true;
    }

    function isOptionValid(string calldata option) external view returns (bool) {
        return validOptions[option];
    }
}