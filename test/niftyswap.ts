import { ethers } from 'hardhat';
import { expect } from 'chai';
import { BigNumber, Contract, ContractFactory, Signer } from 'ethers';

describe("Trade NFTs using NiftySwap", function() {

  // Signers
  let deployer: Signer;
  let trader1: Signer;
  let trader2: Signer;

  // Contract
  let niftySwap: Contract;
  let apes: Contract;

  // (Expected) NFT tokenId for both Apes and Punks.
  let nftTokenId1: BigNumber = BigNumber.from(0);
  let nftTokenId2: BigNumber = BigNumber.from(1);
  
  beforeEach(async () => {

    // Get signers
    [deployer, trader1, trader2] = await ethers.getSigners()

    // Deply NiftySwap
    const NiftySwapFactory_Factory: ContractFactory = await ethers.getContractFactory("NiftySwapFactory");
    const niftySwapFactory = await NiftySwapFactory_Factory.connect(deployer).deploy();

    // Deploy test NFT contracts
    const Apes_Factory: ContractFactory = await ethers.getContractFactory("Apes");
    apes = await Apes_Factory.connect(trader1).deploy()

    // Mint NFT to trader1 and trader2
    await apes.connect(trader1).mint(await trader1.getAddress());
    await apes.connect(trader1).mint(await trader2.getAddress());

    // Initialize CrossNiftySwap
    await niftySwapFactory.connect(deployer).createNiftySwap(apes.address)
    const niftySwapAddress: string = await niftySwapFactory.swapRegistry(apes.address);
    niftySwap = await ethers.getContractAt("NiftySwap", niftySwapAddress);

    // Approve `NiftySwap` to trade apes
    await apes.connect(trader1).setApprovalForAll(niftySwap.address, true)
    await apes.connect(trader2).setApprovalForAll(niftySwap.address, true)
  })

  it("Should emit `InterestInTrade` on signaling interest", async () => {
    expect(await niftySwap.connect(trader1).signalInterest(nftTokenId2, nftTokenId1, true))
      .to.emit(niftySwap, "InterestInTrade")
      .withArgs(nftTokenId2, nftTokenId1, await trader1.getAddress())
  })

  it("Should emit `Trade` on both trade executing", async () => {

    await niftySwap.connect(trader1).signalInterest(nftTokenId2, nftTokenId1, true)
    
    expect(await niftySwap.connect(trader2).signalInterest(nftTokenId1, nftTokenId2, true))
      .to.emit(niftySwap, "Trade")
      .withArgs(await trader2.getAddress(), nftTokenId2, await trader1.getAddress(), nftTokenId1)
  })

  it("Should change ownership of the NFT upon executing the trade", async () => {
    await niftySwap.connect(trader1).signalInterest(nftTokenId2, nftTokenId1, true)
    await niftySwap.connect(trader2).signalInterest(nftTokenId1, nftTokenId2, true)

    expect(await apes.ownerOf(nftTokenId1)).to.equal(await trader2.getAddress())
    expect(await apes.ownerOf(nftTokenId2)).to.equal(await trader1.getAddress())
  })
})