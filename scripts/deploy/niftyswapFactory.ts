import { ethers } from "hardhat"
import { Contract, ContractFactory } from 'ethers';

async function main(): Promise<void> {

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying NiftySwapFactory with account: ", await deployer.getAddress())

  // Deploy contract
  const factory: ContractFactory = await ethers.getContractFactory("NiftySwapFactory");
  const niftyswapFactory: Contract = await factory.deploy();
  console.log("Deployed NiftySwapFactory.sol at: ", niftyswapFactory.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });