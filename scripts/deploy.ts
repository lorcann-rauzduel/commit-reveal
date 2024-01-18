import { ethers } from 'hardhat';

async function main() {
	const votingPeriodInMinutes = 10; // 10 minute

	const VotingSystemFactory = await ethers.getContractFactory('VotingSystem');
	const votingSystem = await VotingSystemFactory.deploy(votingPeriodInMinutes);

	await votingSystem.waitForDeployment();

	const contractAddress = votingSystem.getAddress();

	console.log(`VotingSystem deployed to: ${contractAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
