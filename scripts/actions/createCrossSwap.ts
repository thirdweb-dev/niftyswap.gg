import { ethers } from "hardhat"
import { Contract } from 'ethers';

async function main(): Promise<void> {
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying NiftySwapFactory with account: ", await deployer.getAddress())

  // Deploy contract
  const niftyswapFactoryAddr: string = "0x07760bE646C48E6E6De9419DDc13439dF1049742"
  const niftyswapFactory: Contract = await ethers.getContractAt("NiftySwapFactory", niftyswapFactoryAddr);
  
  // Create NiftySwap for NFT
  const createTx = await niftyswapFactory.createCrossSwap();
  console.log("Creating NiftySwap: ", createTx.hash);
  await createTx.wait()

  // Get NiftySwap address
  const crossSwapAddr: string = await niftyswapFactory.crossNiftySwap();
  console.log("CrossSwap deployed at: ", crossSwapAddr);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });