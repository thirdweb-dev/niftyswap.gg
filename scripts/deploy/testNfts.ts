import { ethers } from "hardhat"
import { Contract, ContractFactory } from 'ethers';

async function main(): Promise<void> {

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account: ", await deployer.getAddress())

  // Deploy contract
  const factory: ContractFactory = await ethers.getContractFactory("CoolCats");
  const cooCats: Contract = await factory.deploy();
  console.log("Deployed test NFT CoolCats.sol at: ", cooCats.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });