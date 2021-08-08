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
  const nftAddr: string = ""
  const createTx = await niftyswapFactory.createNiftySwap(nftAddr);
  console.log("Creating NiftySwap: ", createTx.hash);
  await createTx.wait()

  // Get NiftySwap address
  const niftyswapAddr: string = await niftyswapFactory.registry(nftAddr);
  console.log("NiftySwap deployed at: ", niftyswapAddr);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });