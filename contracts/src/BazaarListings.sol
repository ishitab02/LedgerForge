// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BazaarListings {
    enum Tier {
        FREE,
        BASIC,
        PRO
    }

    struct Listing {
        string name;
        Tier tier;
        bool active;
    }

    mapping(uint256 => Listing) public listings;

    function list(uint256 skillId, string calldata name, Tier tier) external {
        listings[skillId] = Listing({
            name: name,
            tier: tier,
            active: true
        });
    }
}
