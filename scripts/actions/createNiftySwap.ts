import { ethers } from "hardhat"
import { Contract } from 'ethers';

async function main(): Promise<void> {
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Using account: ", await deployer.getAddress())

  // Deploy contract
  const niftyswapFactoryAddr: string = "0x07760bE646C48E6E6De9419DDc13439dF1049742"
  const niftyswapFactory: Contract = await ethers.getContractAt("NiftySwapFactory", niftyswapFactoryAddr);
  
  // Create NiftySwap for NFT
  const nftAddr: string = "0xF3934C55C99a252c9A87162c5b752950863ef23B"
  const createTx = await niftyswapFactory.createNiftySwap(nftAddr);
  console.log("Creating NiftySwap: ", createTx.hash);
  await createTx.wait()

  // Get NiftySwap address
  const niftyswapAddr: string = await niftyswapFactory.swapRegistry(nftAddr);
  console.log("NiftySwap deployed at: ", niftyswapAddr);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });