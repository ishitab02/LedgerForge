// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract x402Escrow {
    struct Job {
        address consumer;
        address provider;
        address token;
        uint256 amount;
        bool settled;
    }

    uint256 public nextJobId;
    mapping(uint256 => Job) public jobs;

    function createJob(address provider, address token, uint256 amount) external returns (uint256 jobId) {
        jobId = ++nextJobId;
        jobs[jobId] = Job({
            consumer: msg.sender,
            provider: provider,
            token: token,
            amount: amount,
            settled: false
        });
    }

    function completeJob(uint256 jobId) external {
        jobs[jobId].settled = true;
    }
}
