import { ethers } from "hardhat"
import { Contract } from 'ethers';

async function main(): Promise<void> {
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying NiftySwapFactory with account: ", await deployer.getAddress())

  // Deploy contract
  const niftyswapFactoryAddr: string = ""
  const niftyswapFactory: Contract = await ethers.getContractAt("NiftySwap", niftyswapFactoryAddr);
  
  // Create NiftySwap for NFT
  const createTx = await niftyswapFactory.createCrossSwap();
  console.log("Creating NiftySwap: ", createTx.hash);
  await createTx.wait()

  // Get NiftySwap address
  const crossSwapAddr: string = await niftyswapFactory.crossNiftySwap();
  console.log("NiftySwap deployed at: ", crossSwapAddr);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });