// SPDX-License-Identifier: GPL 3.0
pragma solidity ^0.8.0;


// ######## ##     ## #### ########  ########  ##      ## ######## ########  
//    ##    ##     ##  ##  ##     ## ##     ## ##  ##  ## ##       ##     ## 
//    ##    ##     ##  ##  ##     ## ##     ## ##  ##  ## ##       ##     ## 
//    ##    #########  ##  ########  ##     ## ##  ##  ## ######   ########  
//    ##    ##     ##  ##  ##   ##   ##     ## ##  ##  ## ##       ##     ## 
//    ##    ##     ##  ##  ##    ##  ##     ## ##  ##  ## ##       ##     ## 
//    ##    ##     ## #### ##     ## ########   ###  ###  ######## ########

// ##     ##    ###     ######  ##    ## ##      ## ######## ######## ##    ## 
// ##     ##   ## ##   ##    ## ##   ##  ##  ##  ## ##       ##       ##   ##  
// ##     ##  ##   ##  ##       ##  ##   ##  ##  ## ##       ##       ##  ##   
// ######### ##     ## ##       #####    ##  ##  ## ######   ######   #####    
// ##     ## ######### ##       ##  ##   ##  ##  ## ##       ##       ##  ##   
// ##     ## ##     ## ##    ## ##   ##  ##  ##  ## ##       ##       ##   ##  
// ##     ## ##     ##  ######  ##    ##  ###  ###  ######## ######## ##    ## 


import { IMultiwrap } from "@thirdweb-dev/contracts/contracts/interfaces/IMultiwrap.sol";

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "@thirdweb-dev/contracts/contracts/lib/CurrencyTransferLib.sol";

interface INiftySwap {

    struct Swap {
        IMultiwrap.WrappedContents bundleOffered;
        IMultiwrap.WrappedContents bundleWanted;
        address offeror;
        address ownerOfWanted;
        bool swapCompleted;
    }

    event Swapped(uint256 swapId, Swap swapInfo);
    event Offered(uint256 indexed swapId, address indexed _offeror, IMultiwrap.WrappedContents _bundleOffered, IMultiwrap.WrappedContents _bundleWanted);

    /// @dev Performs a swap between two bundles.
    function swap(uint256 _swapId) external;

    /// @dev Stores an offer.
    function offer(
        address ownerOfWanted,
        IMultiwrap.WrappedContents memory _bundleOffered,
        IMultiwrap.WrappedContents memory _bundleWanted
    ) external;
}

contract NiftySwap is INiftySwap, ReentrancyGuard, ERC1155Holder {
    
    uint256 public nextSwapId;

    mapping(uint256 => Swap) public swapInfo;

    /// @dev Stores an offer.
    function offer(
        address _ownerOfWanted,
        IMultiwrap.WrappedContents memory _bundleOffered,
        IMultiwrap.WrappedContents memory _bundleWanted
    ) 
        external
    {

        verifyOwnership(msg.sender, _bundleOffered);
        verifyOwnership(_ownerOfWanted, _bundleWanted);

        uint256 id = nextSwapId;
        nextSwapId += 1;

        swapInfo[id] = Swap({
            bundleOffered: _bundleOffered,
            bundleWanted: _bundleWanted,
            offeror: msg.sender,
            ownerOfWanted: _ownerOfWanted,
            swapCompleted: false
        });

        emit Offered(id, msg.sender, _bundleOffered, _bundleWanted);
    }

    /// @dev Performs a swap between two bundles.
    function swap(uint256 _swapId) external {

        Swap memory swapInfoForTrade = swapInfo[_swapId];
        require(!swapInfoForTrade.swapCompleted, "already swapped");

        verifyOwnership(swapInfoForTrade.offeror, swapInfoForTrade.bundleOffered);
        verifyOwnership(swapInfoForTrade.ownerOfWanted, swapInfoForTrade.bundleWanted);

        require(msg.sender == swapInfoForTrade.ownerOfWanted, "not owner of wanted");

        swapInfoForTrade.swapCompleted = true;
        swapInfo[_swapId] = swapInfoForTrade;

        transferBundle(swapInfoForTrade.offeror, swapInfoForTrade.ownerOfWanted, swapInfoForTrade.bundleOffered);
        transferBundle(swapInfoForTrade.ownerOfWanted, swapInfoForTrade.offeror, swapInfoForTrade.bundleWanted);

        emit Swapped(_swapId, swapInfoForTrade);
    }

    /// @dev Returns all swaps; pending and non-pending.
    function getAllSwaps() external view returns (Swap[] memory allSwaps) {
        
        uint256 totalSwaps = nextSwapId;
        allSwaps = new Swap[](totalSwaps);

        for(uint256 i = 0; i < totalSwaps; i += 1) {
            allSwaps[i] = swapInfo[i];
        }
    }

    function transferBundle(
        address _from,
        address _to,
        IMultiwrap.WrappedContents memory _wrappedContents
    ) internal {
        transfer1155(_from, _to, _wrappedContents);
        transfer721(_from, _to, _wrappedContents);
        transfer20(_from, _to, _wrappedContents);
    }

    function transfer20(
        address _from,
        address _to,
        IMultiwrap.WrappedContents memory _wrappedContents
    ) internal {
        uint256 i;

        bool isValidData = _wrappedContents.erc20AssetContracts.length == _wrappedContents.erc20AmountsToWrap.length;
        require(isValidData, "invalid erc20 wrap");
        for (i = 0; i < _wrappedContents.erc20AssetContracts.length; i += 1) {
            CurrencyTransferLib.transferCurrency(
                _wrappedContents.erc20AssetContracts[i],
                _from,
                _to,
                _wrappedContents.erc20AmountsToWrap[i]
            );
        }
    }

    function transfer721(
        address _from,
        address _to,
        IMultiwrap.WrappedContents memory _wrappedContents
    ) internal {
        uint256 i;
        uint256 j;

        bool isValidData = _wrappedContents.erc721AssetContracts.length == _wrappedContents.erc721TokensToWrap.length;
        if (isValidData) {
            for (i = 0; i < _wrappedContents.erc721AssetContracts.length; i += 1) {
                IERC721 assetContract = IERC721(_wrappedContents.erc721AssetContracts[i]);

                for (j = 0; j < _wrappedContents.erc721TokensToWrap[i].length; j += 1) {
                    assetContract.safeTransferFrom(_from, _to, _wrappedContents.erc721TokensToWrap[i][j]);
                }
            }
        }
        require(isValidData, "invalid erc721 wrap");
    }

    function transfer1155(
        address _from,
        address _to,
        IMultiwrap.WrappedContents memory _wrappedContents
    ) internal {
        uint256 i;
        uint256 j;

        bool isValidData = _wrappedContents.erc1155AssetContracts.length ==
            _wrappedContents.erc1155TokensToWrap.length &&
            _wrappedContents.erc1155AssetContracts.length == _wrappedContents.erc1155AmountsToWrap.length;

        if (isValidData) {
            for (i = 0; i < _wrappedContents.erc1155AssetContracts.length; i += 1) {
                isValidData =
                    _wrappedContents.erc1155TokensToWrap[i].length == _wrappedContents.erc1155AmountsToWrap[i].length;

                if (!isValidData) {
                    break;
                }

                IERC1155 assetContract = IERC1155(_wrappedContents.erc1155AssetContracts[i]);

                for (j = 0; j < _wrappedContents.erc1155TokensToWrap[i].length; j += 1) {
                    assetContract.safeTransferFrom(
                        _from,
                        _to,
                        _wrappedContents.erc1155TokensToWrap[i][j],
                        _wrappedContents.erc1155AmountsToWrap[i][j],
                        ""
                    );
                }
            }
        }
        require(isValidData, "invalid erc1155 wrap");
    }

    /// @dev Verifies ownership of wrapped contents.
    function verifyOwnership(address _party, IMultiwrap.WrappedContents memory _bundle) public view {
        
        uint256 i;
        uint256 j;

        bool  isValidData = true;
        
        // ERC1155 tokens
        if(_bundle.erc1155AssetContracts.length != 0) {
            for(i = 0; i < _bundle.erc1155AssetContracts.length; i += 1) {
                if(!isValidData) {
                    break;
                }
                
                IERC1155 assetContract1155 = IERC1155(_bundle.erc1155AssetContracts[i]);
                for(j = 0; j < _bundle.erc1155TokensToWrap[i].length; j += 1) {
                    isValidData = assetContract1155.balanceOf(_party, _bundle.erc1155TokensToWrap[i][j]) >= _bundle.erc1155AmountsToWrap[i][j];
                }
                
                
            }
            require(isValidData, "not owned 1155");
        }

        // ERC721 tokens
        if(_bundle.erc721AssetContracts.length != 0) {
            for(i = 0; i < _bundle.erc721AssetContracts.length; i += 1) {
                
                if(!isValidData) {
                    break;
                }

                IERC721 assetContract721 = IERC721(_bundle.erc721AssetContracts[i]);
                
                for(j = 0; j < _bundle.erc721TokensToWrap[i].length; j += 1) {
                    address owner = assetContract721.ownerOf(_bundle.erc721TokensToWrap[i][j]);
                    isValidData = owner == _party;

                    if(!isValidData) {
                        break;
                    }
                }
            }
            require(isValidData, "not owned 721");
        }

        // ERC20 tokens
        if(_bundle.erc20AssetContracts.length != 0) {
            for(i = 0; i < _bundle.erc20AssetContracts.length; i += 1) {
                
                if(!isValidData) {
                    break;
                }

                IERC20 assetContract20 = IERC20(_bundle.erc20AssetContracts[i]);

                uint256 bal = assetContract20.balanceOf(_party);
                isValidData = bal >=  _bundle.erc20AmountsToWrap[i];
            }
            require(isValidData, "not owned 20");
        }
    }
}