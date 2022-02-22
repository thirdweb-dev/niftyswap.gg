import { ethers } from "hardhat";
import { expect } from "chai";

// Types
import { NiftySwap } from "../typechain/NiftySwap"; 
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Test swaps", function() {

    // Signers
    let deployer: SignerWithAddress;
    let tokenOwnerA: SignerWithAddress;
    let tokenOwnerB: SignerWithAddress;

    // Contracts
    let mock721: any;
    let mock20: any;
    let niftyswap: NiftySwap;

    // Tets params
    let wrappedContentsOffered: any;
    let wrappedContentsWanted: any;

    before(async () => {
        [deployer, tokenOwnerA, tokenOwnerB] = await ethers.getSigners();
    })

    beforeEach(async () => {

        niftyswap = await (await ethers.getContractFactory("NiftySwap")).deploy() as NiftySwap;

        // Deploy Mock ERC721 + mint
        mock721 = await (await ethers.getContractFactory("MockERC721")).deploy();
        
        await mock721.connect(tokenOwnerA).mint(1);
        await mock721.connect(tokenOwnerA).setApprovalForAll(niftyswap.address, true);

        await mock721.connect(tokenOwnerB).mint(1);
        await mock721.connect(tokenOwnerB).setApprovalForAll(niftyswap.address, true);

        // Deploy Mock ERC20 + mint
        mock20 = await (await ethers.getContractFactory("MockERC20")).deploy();
        await mock20.connect(tokenOwnerA).mint(tokenOwnerA.address, ethers.utils.parseEther("10"));
        await mock20.connect(tokenOwnerA).increaseAllowance(niftyswap.address, ethers.utils.parseEther("10"));

        wrappedContentsOffered = {
            erc1155AssetContracts: [],
            erc1155TokensToWrap: [],
            erc1155AmountsToWrap: [],
            erc721AssetContracts: [mock721.address],
            erc721TokensToWrap: [[0]],
            erc20AssetContracts: [mock20.address],
            erc20AmountsToWrap: [ethers.utils.parseEther("10")]
        }

        wrappedContentsWanted = {
            erc1155AssetContracts: [],
            erc1155TokensToWrap: [],
            erc1155AmountsToWrap: [],
            erc721AssetContracts: [mock721.address],
            erc721TokensToWrap: [[1]],
            erc20AssetContracts: [],
            erc20AmountsToWrap: []
        }
    })

    it("It should swap", async () => {

        expect(await mock721.ownerOf(0)).to.equal(tokenOwnerA.address);
        expect(await mock721.ownerOf(1)).to.equal(tokenOwnerB.address);

        expect(await mock20.balanceOf(tokenOwnerA.address)).to.equal(ethers.utils.parseEther("10"));
        expect(await mock20.balanceOf(tokenOwnerB.address)).to.equal(0);

        const swapId = await niftyswap.nextSwapId();
        await niftyswap.connect(tokenOwnerA).offer(
            tokenOwnerA.address,
            wrappedContentsOffered,
            wrappedContentsWanted
        )

        await niftyswap.connect(tokenOwnerB).swap(swapId);

        expect(await mock721.ownerOf(0)).to.equal(tokenOwnerB.address);
        expect(await mock721.ownerOf(1)).to.equal(tokenOwnerA.address);

        expect(await mock20.balanceOf(tokenOwnerB.address)).to.equal(ethers.utils.parseEther("10"));
        expect(await mock20.balanceOf(tokenOwnerA.address)).to.equal(0);
    })
})