// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SkillRegistry {
    struct Skill {
        address provider;
        string endpoint;
        address paymentToken;
        uint256 pricePerCallBps;
    }

    uint256 public totalSkills;
    mapping(uint256 => Skill) internal skills;

    function registerSkill(
        string calldata endpoint,
        address paymentToken,
        uint256 pricePerCallBps
    ) external returns (uint256 skillId) {
        skillId = ++totalSkills;
        skills[skillId] = Skill({
            provider: msg.sender,
            endpoint: endpoint,
            paymentToken: paymentToken,
            pricePerCallBps: pricePerCallBps
        });
    }

    function getSkill(uint256 skillId) external view returns (Skill memory) {
        return skills[skillId];
    }
}
