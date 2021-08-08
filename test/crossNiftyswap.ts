import { ethers } from 'hardhat';
import { expect } from 'chai';
import { BigNumber, Contract, ContractFactory, Signer } from 'ethers';

describe("Trade NFTs using NiftySwap", function() {

  // Signers
  let deployer: Signer;
  let trader1: Signer;
  let trader2: Signer;
  let trader3: Signer;

  // Contract
  let niftySwap: Contract;
  let apes: Contract;
  let punks: Contract;

  // (Expected) NFT tokenId for both Apes and Punks.
  let nftTokenId: BigNumber = BigNumber.from(0);
  
  beforeEach(async () => {

    // Get signers
    [deployer, trader1, trader2, trader3] = await ethers.getSigners()

    // Deply NiftySwap
    const NiftySwapFactory_Factory: ContractFactory = await ethers.getContractFactory("NiftySwapFactory");
    const niftySwapFactory = await NiftySwapFactory_Factory.connect(deployer).deploy();

    // Initialize CrossNiftySwap
    await niftySwapFactory.connect(deployer).createCrossSwap()
    const crossSwapAddress: string = await niftySwapFactory.crossNiftySwap();
    niftySwap = await ethers.getContractAt("CrossNiftySwap", crossSwapAddress);

    // Deploy test NFT contracts
    const Apes_Factory: ContractFactory = await ethers.getContractFactory("Apes");
    apes = await Apes_Factory.connect(trader1).deploy()

    // Mint NFT to trader1
    await apes.mint(await trader1.getAddress());

    const Punks_Factory: ContractFactory = await ethers.getContractFactory("Punks");
    punks = await Punks_Factory.connect(trader2).deploy()

    // Mint NFT to trader2
    await punks.mint(await trader2.getAddress());
  })

  describe("Put NFT up for trade", function() {

    describe("Revert cases", function() {
      
      it("Should revert if someone other than the owner puts the NFT up for trade", async () => {
        // Trader2 tries to trade an NFT they don't own.
        await expect(niftySwap.connect(trader2).putUpForTrade(apes.address, nftTokenId))
        .to.be.revertedWith("NiftySwap: Must own the NFT to trade it.")
      })

      it("Should revert if NiftySwap is not approved to transfer the NFT", async () => {
        await expect(niftySwap.connect(trader1).putUpForTrade(apes.address, nftTokenId))
          .to.be.revertedWith("NiftySwap: Must approve this contract to transfer the NFT.");
      })
    })

    describe("Event", function() {
      beforeEach(async () => {
        // Approve NiftySwap to transfer NFT.
        await apes.connect(trader1).setApprovalForAll(niftySwap.address, true)
        await punks.connect(trader2).setApprovalForAll(niftySwap.address, true);
      })

      it("Should emit AvailableForTrade on putting up NFT for trade", async () => {
        // Get next swap ID
        const swapId: BigNumber = await niftySwap.nextSwapId()

        expect(await niftySwap.connect(trader1).putUpForTrade(apes.address, nftTokenId))
          .to.emit(niftySwap, "AvailableForTrade")
          .withArgs(await trader1.getAddress(), apes.address, nftTokenId, swapId)
      })
    })

    describe("ERC 721 balances", function() {
      beforeEach(async () => {
        // Approve NiftySwap to transfer NFT.
        await apes.connect(trader1).setApprovalForAll(niftySwap.address, true)
        await punks.connect(trader2).setApprovalForAll(niftySwap.address, true)

        // Put up Apes NFT for trade.
        await niftySwap.connect(trader1).putUpForTrade(apes.address, nftTokenId)
      })

      it("Should not change the NFT balance of the trader", async () => {
        expect(await apes.ownerOf(nftTokenId)).to.equal(await trader1.getAddress());
      })
    })

    describe("Contract state changes", function() {
      beforeEach(async () => {
        // Approve NiftySwap to transfer NFT.
        await apes.connect(trader1).setApprovalForAll(niftySwap.address, true)
        await punks.connect(trader2).setApprovalForAll(niftySwap.address, true)

        // Put up Apes NFT for trade.
        await niftySwap.connect(trader1).putUpForTrade(apes.address, nftTokenId)
      })

      it("Should update the `swapId` mapping with the swapId of the NFT", async () => {
        const expectedSwapId: BigNumber = BigNumber.from(0);

        expect(await niftySwap.swapId(apes.address, nftTokenId)).to.equal(expectedSwapId);
      })

      it("Should update the `tradeableNFT` mapping with the relevant NFT info", async () => {
        const swapId: BigNumber = await niftySwap.swapId(apes.address, nftTokenId);
        const tradeableNFT = await niftySwap.tradeableNFT(swapId);

        expect(tradeableNFT.ownerAtTrade).to.equal(await trader1.getAddress())
        expect(tradeableNFT.nftContract).to.equal(apes.address)
        expect(tradeableNFT.nftTokenId).to.equal(nftTokenId);
      })
    })
  })

  describe("Signal interest in trading NFTs", function() {

    let apesSwapId: BigNumber;
    let punksSwapId: BigNumber;

    beforeEach(async () => {
      // Approve NiftySwap to transfer NFT.
      await apes.connect(trader1).setApprovalForAll(niftySwap.address, true)
      await punks.connect(trader2).setApprovalForAll(niftySwap.address, true)

      // Put up Apes NFT for trade.
      await niftySwap.connect(trader1).putUpForTrade(apes.address, nftTokenId)
      // Put up Punks NFT for trade.
      await niftySwap.connect(trader2).putUpForTrade(punks.address, nftTokenId)

      apesSwapId = await niftySwap.swapId(apes.address, nftTokenId);
      punksSwapId = await niftySwap.swapId(punks.address, nftTokenId);
    })

    describe("Revert cases", function() {

      it("Should revert if an invalid swap Id is provided", async () => {
        const nextSwapId: BigNumber = await niftySwap.nextSwapId();

        await expect(niftySwap.connect(trader1).signalInterest(nextSwapId, apesSwapId, true))
          .to.be.revertedWith("NiftySwap: Invalid swap ID provided.");
      })

      it("Should revert if the sender was not the NFT owner when the NFT was put up for trade", async () => {        

        // Transfer Punks NFT to trader3
        await punks.connect(trader2).transferFrom(
          await trader2.getAddress(),
          await trader3.getAddress(),
          nftTokenId,
          ethers.utils.toUtf8Bytes("")
        );

        // Trader 3 tries to directly trade the NFT
        await expect(niftySwap.connect(trader3).signalInterest(apesSwapId, punksSwapId, true))
          .to.be.revertedWith("NiftySwap: Cannot signal interest to trade an NFT you do not own or did not put up for sale.");
      })
    })
    
    describe("Events", function() {

      it("Should emit InterestInTrade upon signaling interest in trading the NFTs", async () => {
        expect(await niftySwap.connect(trader2).signalInterest(apesSwapId, punksSwapId, true))
          .to.emit(niftySwap, "InterestInTrade")
          .withArgs(apesSwapId, punksSwapId)
      })
    })

    describe("ERC 721 balances", function() {

      beforeEach(async () => {
        // Signal interest to trade NFTs.
        await niftySwap.connect(trader2).signalInterest(apesSwapId, punksSwapId, true)
      })

      it("Should not change the NFT balance of the trader", async () => {
        expect(await apes.ownerOf(nftTokenId)).to.equal(await trader1.getAddress());
        expect(await punks.ownerOf(nftTokenId)).to.equal(await trader2.getAddress());
      })
    })

    describe("Contract state changes", function() {
      beforeEach(async () => {
        // Signal interest to trade NFTs.
        await niftySwap.connect(trader2).signalInterest(apesSwapId, punksSwapId, true)
      })

      it("Should update the `interestInTrade` mapping with the right interest value", async () => {
        expect(await niftySwap.interestInTrade(punksSwapId, apesSwapId)).to.equal(true);
      })
    })
  })

  describe("Trade NFTs", function() {

    let apesSwapId: BigNumber;
    let punksSwapId: BigNumber;

    beforeEach(async () => {
      // Approve NiftySwap to transfer NFT.
      await apes.connect(trader1).setApprovalForAll(niftySwap.address, true)
      await punks.connect(trader2).setApprovalForAll(niftySwap.address, true)

      // Put up Apes NFT for trade.
      await niftySwap.connect(trader1).putUpForTrade(apes.address, nftTokenId)
      // Put up Punks NFT for trade.
      await niftySwap.connect(trader2).putUpForTrade(punks.address, nftTokenId)

      apesSwapId = await niftySwap.swapId(apes.address, nftTokenId);
      punksSwapId = await niftySwap.swapId(punks.address, nftTokenId);

      // Signal interest to trade NFTs.
      await niftySwap.connect(trader2).signalInterest(apesSwapId, punksSwapId, true)
    })

    describe("Revert cases", function() {

      it("Should revert if the NFT wanted has changed owners", async () => {
        // Transfer Punks NFT to trader3
        await punks.connect(trader2).transferFrom(
          await trader2.getAddress(),
          await trader3.getAddress(),
          nftTokenId,
          ethers.utils.toUtf8Bytes("")
        );

        await expect(niftySwap.connect(trader1).signalInterest(punksSwapId, apesSwapId, true))
          .to.be.revertedWith("NiftySwap: The owner of the NFT wanted has transfered away their NFT.")
      })

      it("Should revert if NiftySwap is no longer approved for transfer the NFT wanted", async () => {
        // Trader2 removes approval to transfer the Punk NFT
        await punks.connect(trader2).setApprovalForAll(niftySwap.address, false);

        await expect(niftySwap.connect(trader1).signalInterest(punksSwapId, apesSwapId, true))
          .to.be.revertedWith("NiftySwap: This contract is no longer approved to transfer the NFT wanted.")
      })

      it("Should revert if the trader was not the owner of the NFT when it was put up to trade", async () => {
        // Trader1 transfers Ape NFT to Trader3
        await apes.connect(trader1).transferFrom(
          await trader1.getAddress(),
          await trader3.getAddress(),
          nftTokenId,
          ethers.utils.toUtf8Bytes("")
        );

        await expect(niftySwap.connect(trader3).signalInterest(punksSwapId, apesSwapId, true))
          .to.be.revertedWith("NiftySwap: Cannot signal interest to trade an NFT you do not own or did not put up for sale.")
      })

      it("Should revert if NiftySwap is not approved to transfer the NFT to trade", async () => {
        // Trader1 removes approval to transfer the Ape NFT
        await apes.connect(trader1).setApprovalForAll(niftySwap.address, false);

        await expect(niftySwap.connect(trader1).signalInterest(punksSwapId, apesSwapId, true))
          .to.be.revertedWith("NiftySwap: Must approve this contract to transfer the NFT to trade it.")
      })
    })

    describe("Events", function() {

      it("Should emit the Trade event upon a trade", async () => {
        expect(await niftySwap.connect(trader1).signalInterest(punksSwapId, apesSwapId, true))
          .to.emit(niftySwap, "Trade")
          .withArgs(
            punks.address,
            nftTokenId,
            await trader2.getAddress(),
            punksSwapId,

            apes.address,
            nftTokenId,
            await trader1.getAddress(),
            apesSwapId
          )
      })
    })

    describe("ERC 721 balances", function() {
      it("Should change the owners of the NFTs", async () => {
        await niftySwap.connect(trader1).signalInterest(punksSwapId, apesSwapId, true)

        expect(await apes.ownerOf(nftTokenId)).to.equal(await trader2.getAddress());
        expect(await punks.ownerOf(nftTokenId)).to.equal(await trader1.getAddress());
      })
    })

    describe("Contract state changes", function() {
      it("Should revert the `interestInTrade` mapping for both swapIDs", async () => {
        await niftySwap.connect(trader1).signalInterest(punksSwapId, apesSwapId, true)
        
        expect(await niftySwap.interestInTrade(apesSwapId, punksSwapId)).to.equal(false);
        expect(await niftySwap.interestInTrade(punksSwapId, apesSwapId)).to.equal(false);
      })
    })
  })
})