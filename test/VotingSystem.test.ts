import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { hashCombined } from '../utils/hash';

describe('VotingSystem', function () {
	async function deployVotingSystemFixture() {
		const [owner, voter1, voter2, voter3] = await ethers.getSigners();
		const votingPeriodInMinutes = 1;

		const VotingSystemFactory = await ethers.getContractFactory('VotingSystem');
		const votingSystem = await VotingSystemFactory.deploy(
			votingPeriodInMinutes
		);
		await votingSystem.waitForDeployment();
		return {
			votingSystem,
			owner,
			voter1,
			voter2,
			voter3,
			votingPeriodInMinutes,
		};
	}

	describe('Deployment', function () {
		it('Should set the correct voting period', async function () {
			const { votingSystem, votingPeriodInMinutes } = await loadFixture(
				deployVotingSystemFixture
			);

			const currentTime = Math.floor(Date.now() / 1000);
			const votingStart = await votingSystem.votingStart();
			const votingEnd = await votingSystem.votingEnd();

			expect(Number(votingStart)).to.be.closeTo(currentTime, 60); // 60 seconds tolerance
			expect(Number(votingEnd)).to.equal(
				Number(votingStart) + votingPeriodInMinutes * 60
			);
		});
	});

	describe('Voting Process', function () {
		it('Should allow a user to commit a vote', async function () {
			const { votingSystem, owner } = await loadFixture(
				deployVotingSystemFixture
			);
			const vote = hashCombined('candidate1', 'salt1');

			await expect(votingSystem.commit(vote))
				.to.emit(votingSystem, 'VoteCommitted')
				.withArgs(owner.address, vote);
		});

		it('Should allow multiple users to commit a vote and reveal it', async function () {
			const { votingSystem, owner, voter1, voter2, voter3 } = await loadFixture(
				deployVotingSystemFixture
			);
			const vote1 = hashCombined('candidate1', 'salt1');
			const vote2 = hashCombined('candidate2', 'salt2');
			const vote3 = hashCombined('candidate2', 'salt3');
			await votingSystem.addOption('candidate1');
			await votingSystem.addOption('candidate2');

			await votingSystem.connect(voter1).commit(vote2);
			await votingSystem.connect(voter2).commit(vote1);
			await votingSystem.connect(voter3).commit(vote3);

			await time.increase(time.duration.minutes(1));

			await votingSystem.connect(voter1).reveal('candidate2', 'salt2');
			await votingSystem.connect(voter2).reveal('candidate1', 'salt1');
			await votingSystem.connect(voter3).reveal('candidate2', 'salt3');

			expect(await votingSystem.winner()).to.equal('candidate2');
		});

		it('Should allow a user to reveal a vote after the voting period', async function () {
			const { votingSystem, owner, votingPeriodInMinutes } = await loadFixture(
				deployVotingSystemFixture
			);
			const vote = hashCombined('candidate1', 'salt1');
			await votingSystem.addOption('candidate1');
			await votingSystem.commit(vote);
			await time.increase(time.duration.minutes(votingPeriodInMinutes + 1));
			await expect(votingSystem.reveal('candidate1', 'salt1'))
				.to.emit(votingSystem, 'VoteRevealed')
				.withArgs(owner.address, vote);
		});

		it('Should update the winner correctly', async function () {
			const { votingSystem, voter1, votingPeriodInMinutes } = await loadFixture(
				deployVotingSystemFixture
			);
			const vote1 = 'candidate1';
			const salt1 = 'salt1';
			const voteHash1 = hashCombined(vote1, salt1);
			await votingSystem.addOption('candidate1');
			await votingSystem.commit(voteHash1);
			await time.increase(time.duration.minutes(votingPeriodInMinutes + 1));
			await votingSystem.reveal(vote1, salt1);

			expect(await votingSystem.winner()).to.equal(vote1);
		});

		it('Should revert if a user tries to reveal a vote before the voting period ends', async function () {
			const { votingSystem, owner } = await loadFixture(
				deployVotingSystemFixture
			);
			const vote = hashCombined('candidate1', 'salt1');
			await votingSystem.addOption('candidate1');
			await votingSystem.commit(vote);
			await expect(
				votingSystem.reveal('candidate1', 'salt1')
			).to.be.revertedWithCustomError(votingSystem, 'VotingNotEnded');
		});

		it('Should revert if a user tries to commit a vote after the voting period', async function () {
			const { votingSystem, votingPeriodInMinutes } = await loadFixture(
				deployVotingSystemFixture
			);
			await time.increase(time.duration.minutes(votingPeriodInMinutes + 1));
			const vote = hashCombined('candidate1', 'salt1');
			await expect(votingSystem.commit(vote)).to.be.revertedWithCustomError(
				votingSystem,
				'VotingEnded'
			);
		});

		it('Should revert if a user tries to reveal an invalid vote', async function () {
			const { votingSystem, votingPeriodInMinutes } = await loadFixture(
				deployVotingSystemFixture
			);
			const vote = hashCombined('candidate1', 'salt1');
			await votingSystem.addOption('candidate1');
			await votingSystem.commit(vote);
			await time.increase(time.duration.minutes(votingPeriodInMinutes + 1));
			await expect(
				votingSystem.reveal('candidate1', 'wrongsalt')
			).to.be.revertedWithCustomError(votingSystem, 'InvalidVote');
		});

		it('Should revert if a user tries to reveal a vote twice', async function () {
			const { votingSystem, votingPeriodInMinutes } = await loadFixture(
				deployVotingSystemFixture
			);
			const vote = hashCombined('candidate1', 'salt1');
			await votingSystem.addOption('candidate1');
			await votingSystem.commit(vote);
			await time.increase(time.duration.minutes(votingPeriodInMinutes + 1));
			await votingSystem.reveal('candidate1', 'salt1');
			await expect(
				votingSystem.reveal('candidate1', 'salt1')
			).to.be.revertedWithCustomError(votingSystem, 'InvalidVote');
		});
	});
});
