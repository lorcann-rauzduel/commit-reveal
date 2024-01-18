// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;
import "@openzeppelin/contracts/access/Ownable.sol";

contract VotingSystem is Ownable {
    mapping(address => bytes32) private voteHashes;
    mapping(bytes32 => uint256) public voteCounts;
    uint256 private highestVotes;
    string public winner;
    mapping(string => bool) public validOptions; 

    uint256 public votingStart;
    uint256 public votingEnd;

    bytes32[] public options;

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

    function commit(bytes32 _hash) public {
        if (block.timestamp < votingStart) revert VotingNotStarted();
        if (block.timestamp > votingEnd) revert VotingEnded();
        if (voteHashes[msg.sender] != 0) revert VoteAlreadyCommitted();

        voteHashes[msg.sender] = _hash;

        emit VoteCommitted(msg.sender, _hash);
    }

    function reveal(string memory _vote, string calldata _salt) public {
        if (block.timestamp < votingEnd) revert VotingNotEnded();
        if (!isOptionValid(_vote)) revert InvalidVote();
        bytes32 voteHash = keccak256(abi.encodePacked(_vote, _salt));
        if (voteHashes[msg.sender] != voteHash) revert InvalidVote();
        voteHashes[msg.sender] = 0;

        voteCounts[voteHash]++;
        if (voteCounts[voteHash] > highestVotes) {
            highestVotes = voteCounts[voteHash];
            winner = _vote;
            emit WinnerUpdated(voteHash);
        }

        emit VoteRevealed(msg.sender, voteHash);
    }

    function addOption(string memory option) public onlyOwner {
        validOptions[option] = true;
    }

    function isOptionValid(string memory option) public view returns (bool) {
        return validOptions[option];
    }
}
