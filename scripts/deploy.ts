import hre, { ethers } from "hardhat";
import { NiftySwap } from "../typechain/NiftySwap";

async function verify(address: string, args: any[]) {
  try {
    return await hre.run("verify:verify", {
      address: address,
      constructorArguments: args,
    });
  } catch (e) {
    console.log(address, args, e);
  }
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const niftyswap: NiftySwap = await (await ethers.getContractFactory("NiftySwap")).connect(deployer).deploy() as NiftySwap;

    console.log("NiftySwap deployed at tx: ", niftyswap.deployTransaction.hash);

    await niftyswap.deployTransaction.wait();

    console.log("NiftySwap address: ", niftyswap.address);

    await verify(niftyswap.address, []);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    })